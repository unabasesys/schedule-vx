import { STAGE_ORDER } from '~/utils/constants'
import { useSettingsStore } from '~/stores/settings'

export function usePdfExport() {
  // Access settings once at composable setup time (safe Pinia context)
  const settingsStore = useSettingsStore()

  // ── Date helpers ────────────────────────────────────────────────────────────

  function shiftDate(d, n) {
    const dt = new Date(d + 'T12:00:00')
    dt.setDate(dt.getDate() + n)
    return dt.toISOString().slice(0, 10)
  }

  function eventEnd(ev) {
    const n = Math.max(1, ev.duration || 1) - 1
    if (n === 0) return ev.date
    if ((ev.durDayType || 'calendar') !== 'business') return shiftDate(ev.date, n)
    let count = 0, cur = ev.date
    while (count < n) {
      cur = shiftDate(cur, 1)
      const dow = new Date(cur + 'T12:00:00').getDay()
      if (dow !== 0 && dow !== 6) count++
    }
    return cur
  }

  function lighten(rgb, f = 0.45) {
    return rgb.map(c => Math.round(c + (255 - c) * f))
  }

  // ── Main export ──────────────────────────────────────────────────────────────

  async function exportPdf(projOrProjects, lang = 'es') {
    const { jsPDF } = await import('jspdf')

    const projList   = Array.isArray(projOrProjects) ? projOrProjects : [projOrProjects]
    const isMultiCal = projList.length > 1
    // Draft = multi-calendar OR any project with unsaved changes
    const isDraft    = isMultiCal || projList.some(p => p.hasChanges)

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const PW  = doc.internal.pageSize.getWidth()    // 210mm
    const PH  = doc.internal.pageSize.getHeight()   // 297mm
    const M   = 14                                   // page margin (generous for print)

    // ── Palette ──────────────────────────────────────────────────────────────
    const NAVY  = [26,  46,  74]
    const MUTED = [128, 150, 168]
    const BORDC = [228, 234, 240]
    const BGLOW = [248, 250, 251]
    const WHITE = [255, 255, 255]
    const ACCT  = [91,  191, 173]
    const WKEND = [249, 251, 252]

    const STAGE_CLR = {
      bid:  [124, 174, 255],
      pre:  [91,  191, 173],
      sht:  [249, 115,  22],
      vpst: [168,  85, 247],
      spst: [236,  72, 153],
    }
    // Project colors — used for multi-calendar differentiation
    const PROJ_CLR = [
      [91, 191, 173], [124, 174, 255], [249, 115, 22], [168, 85, 247], [236, 72, 153],
    ]

    // ── Locale strings ───────────────────────────────────────────────────────
    const MO_SHORT = {
      en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      es: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    }
    const MO_LONG = {
      en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
      es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    }
    const DAY_NAMES = {
      en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
      es: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
    }
    const LABELS = {
      en: { client: 'Client', agency: 'Agency', dir: 'Dir', ep: 'EP', phot: 'Phot', version: 'Version', draft: 'DRAFT' },
      es: { client: 'Cliente', agency: 'Agencia', dir: 'Dir', ep: 'EP', phot: 'Fot', version: 'Versión', draft: 'DRAFT' },
    }
    const L = (key) => (LABELS[lang] ?? LABELS.es)[key] ?? key

    // ── Tag all events with project info ─────────────────────────────────────
    const TODAY = new Date().toISOString().slice(0, 10)

    const tagged = projList.flatMap((proj, pi) =>
      (proj.events || [])
        .filter(e => e.active && e.date && !e.internal)
        .map(e => ({
          ...e,
          _proj: proj,
          _pi:   pi,
          // Multi-cal: project color differentiates calendars; single: stage color gives production context
          _clr:  isMultiCal
            ? PROJ_CLR[pi % PROJ_CLR.length]
            : (STAGE_CLR[e.stage] || PROJ_CLR[0]),
          _end:  eventEnd(e),
        }))
    )

    // ── Month range ──────────────────────────────────────────────────────────
    const allDates = tagged.flatMap(e => [e.date, e._end]).filter(Boolean).sort()
    const minDate  = allDates[0] || TODAY.slice(0, 7) + '-01'
    const maxDate  = allDates[allDates.length - 1] || minDate

    const months = []
    let [cy, cm] = minDate.slice(0, 7).split('-').map(Number)
    const [ey, em] = maxDate.slice(0, 7).split('-').map(Number)
    while (cy < ey || (cy === ey && cm <= em)) {
      months.push({ y: cy, m: cm - 1 })   // m is 0-indexed from here
      if (++cm > 12) { cm = 1; cy++ }
    }

    // ── Layout constants (Portrait A4) ────────────────────────────────────────
    const ORG_ROW_H   = 13                                  // Zone A: institutional header
    const PROJ_ROW_H  = 5.8                                 // per-project line height
    const PROJ_PAD    = 3                                   // padding top/bottom of Zone B
    const ZONE_B_H    = projList.length * PROJ_ROW_H + PROJ_PAD * 2
    const MONTH_LBL_H = 9                                   // Zone C: month label
    const DAY_HDR_H   = 6                                   // day-of-week header band
    const MINI_H      = 26                                  // Zone E: mini month strip
    const FOOTER_H    = 6                                   // Zone F: footer
    const SEP         = 0.3                                 // separator line weight

    // Y positions (computed top-down)
    const ZONE_A_Y  = M
    const ZONE_B_Y  = ZONE_A_Y + ORG_ROW_H + SEP
    const ZONE_C_Y  = ZONE_B_Y + ZONE_B_H  + SEP
    const DAY_HDR_Y = ZONE_C_Y + MONTH_LBL_H
    const GRID_TOP  = DAY_HDR_Y + DAY_HDR_H
    const ZONE_E_Y  = PH - M - FOOTER_H - SEP - MINI_H    // mini cals bottom
    const FOOTER_Y  = PH - M - FOOTER_H
    const GRID_H    = ZONE_E_Y - SEP - GRID_TOP            // dynamic grid height
    const COL_W     = (PW - M * 2) / 7

    // ── Mini-calendar helper (Zone E) ─────────────────────────────────────────
    function drawMiniCal(x, y, yr, mo, isCurrent) {
      const CS = 3.5    // cell size in mm
      const MW = 7 * CS // mini cal width ≈ 24.5mm

      // Highlight background for current month
      if (isCurrent) {
        doc.setFillColor(...BGLOW)
        doc.roundedRect(x - 1.5, y - 1, MW + 3, MINI_H - 1, 1.5, 1.5, 'F')
      }

      // Month name
      doc.setFont('helvetica', isCurrent ? 'bold' : 'normal')
      doc.setFontSize(5.2)
      doc.setTextColor(...(isCurrent ? NAVY : MUTED))
      doc.text(`${MO_SHORT[lang][mo]} ${yr}`, x + MW / 2, y + 3, { align: 'center' })

      // Day initials row
      const DI = lang === 'en'
        ? ['S','M','T','W','T','F','S']
        : ['D','L','M','X','J','V','S']
      doc.setFontSize(3.8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...MUTED)
      for (let d = 0; d < 7; d++) {
        doc.text(DI[d], x + d * CS + CS / 2, y + 6.5, { align: 'center' })
      }

      // Day numbers
      const firstDow = new Date(yr, mo, 1).getDay()
      const daysInMo = new Date(yr, mo + 1, 0).getDate()

      for (let day = 1; day <= daysInMo; day++) {
        const ci   = day + firstDow - 1
        const col  = ci % 7
        const row  = Math.floor(ci / 7)
        const cx   = x + col * CS + CS / 2
        const cy2  = y + 6.5 + (row + 1) * CS + 0.5
        const ds   = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const isT  = ds === TODAY
        const isWE = col === 0 || col === 6

        if (isT) {
          doc.setFillColor(...ACCT)
          doc.circle(cx, cy2 - 1.2, 1.4, 'F')
          doc.setTextColor(...WHITE)
        } else {
          doc.setTextColor(...(isCurrent ? (isWE ? MUTED : NAVY) : lighten(MUTED, 0.3)))
        }

        doc.setFont('helvetica', isT ? 'bold' : 'normal')
        doc.setFontSize(3.8)
        doc.text(String(day), cx, cy2, { align: 'center' })
      }

      // Border around current month
      if (isCurrent) {
        doc.setDrawColor(...NAVY)
        doc.setLineWidth(0.4)
        doc.roundedRect(x - 1.5, y - 1, MW + 3, MINI_H - 1, 1.5, 1.5)
      }
    }

    // ── Render each month (one page per month) ───────────────────────────────
    months.forEach(({ y: yr, m: mo }, pageIdx) => {
      if (pageIdx > 0) doc.addPage()

      // ┌─ ZONE A — INSTITUTIONAL HEADER ──────────────────────────────────────┐
      // Logo (left) — preserve aspect ratio, max height 9mm, max width 30mm
      const LOGO_MAX_H = 9
      const LOGO_MAX_W = 30
      let orgNameX = M
      if (settingsStore.logo) {
        try {
          const fmt = settingsStore.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG'
          const imgProps = doc.getImageProperties(settingsStore.logo)
          const ratio = imgProps.width / imgProps.height
          let logoW = LOGO_MAX_H * ratio
          let logoH = LOGO_MAX_H
          if (logoW > LOGO_MAX_W) { logoW = LOGO_MAX_W; logoH = logoW / ratio }
          doc.addImage(settingsStore.logo, fmt, M, ZONE_A_Y + (LOGO_MAX_H - logoH) / 2 + 1, logoW, logoH)
          orgNameX = M + logoW + 3
        } catch (_) {}
      }

      // Org name
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...NAVY)
      doc.text(settingsStore.studioName || 'unabase', orgNameX, ZONE_A_Y + 7)

      // Version + DRAFT label (right)
      const verNum   = !isMultiCal ? (projList[0].version || 1) : null
      const verParts = []
      if (verNum)   verParts.push(`${L('version')} ${verNum}`)
      if (isDraft)  verParts.push(L('draft'))
      const verLabel = verParts.join(' · ')

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...(isDraft ? [200, 60, 60] : MUTED))
      doc.text(verLabel, PW - M, ZONE_A_Y + 7, { align: 'right' })

      // Separator A → B
      doc.setDrawColor(...BORDC)
      doc.setLineWidth(SEP)
      doc.line(M, ZONE_B_Y - SEP, PW - M, ZONE_B_Y - SEP)

      // ┌─ ZONE B — CALENDAR INFO ROW ──────────────────────────────────────────┐
      doc.setFillColor(...BGLOW)
      doc.rect(M, ZONE_B_Y, PW - M * 2, ZONE_B_H, 'F')

      projList.forEach((proj, idx) => {
        const lineY = ZONE_B_Y + PROJ_PAD + idx * PROJ_ROW_H + 4

        // Color dot — project color
        const dotClr = PROJ_CLR[idx % PROJ_CLR.length]
        doc.setFillColor(...dotClr)
        doc.circle(M + 2, lineY - 1.3, 1.5, 'F')

        // Metadata parts — omit empty fields
        const parts = []
        const projName = proj.name || proj.client || ''
        if (projName) parts.push(projName)
        if (proj.client && proj.name && proj.client !== proj.name)
          parts.push(proj.client)
        if (proj.agency)       parts.push(proj.agency)
        if (proj.director)     parts.push(`${L('dir')}: ${proj.director}`)
        if (proj.photographer) parts.push(`${L('phot')}: ${proj.photographer}`)
        if (proj.ep)           parts.push(`${L('ep')}: ${proj.ep}`)

        doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal')
        doc.setFontSize(6.2)
        doc.setTextColor(...NAVY)

        // Truncate to available width
        const maxW  = PW - M * 2 - 8
        let metaStr = parts.join('  ·  ')
        const textW = doc.getStringUnitWidth(metaStr) * 6.2 / doc.internal.scaleFactor
        if (textW > maxW) {
          metaStr = doc.splitTextToSize(metaStr, maxW)[0] + '…'
        }
        doc.text(metaStr, M + 6, lineY)
      })

      // Separator B → C
      doc.setDrawColor(...BORDC)
      doc.setLineWidth(SEP)
      doc.line(M, ZONE_B_Y + ZONE_B_H, PW - M, ZONE_B_Y + ZONE_B_H)

      // ┌─ ZONE C — MONTH LABEL ────────────────────────────────────────────────┐
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(...NAVY)
      doc.text(`${MO_LONG[lang][mo]} ${yr}`, M, ZONE_C_Y + 7)   // full year, e.g. "Abril 2026"

      // ┌─ ZONE D — DAY-OF-WEEK HEADER BAND ───────────────────────────────────┐
      doc.setFillColor(...NAVY)
      doc.rect(M, DAY_HDR_Y, PW - M * 2, DAY_HDR_H, 'F')
      doc.setTextColor(...WHITE)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.0)
      for (let d = 0; d < 7; d++) {
        doc.text(
          DAY_NAMES[lang][d],
          M + d * COL_W + COL_W / 2,
          DAY_HDR_Y + 4,
          { align: 'center' }
        )
      }

      // ┌─ ZONE D — MONTHLY GRID ───────────────────────────────────────────────┐
      const daysInMo = new Date(yr, mo + 1, 0).getDate()
      const firstDow = new Date(yr, mo, 1).getDay()
      const numWeeks = Math.ceil((firstDow + daysInMo) / 7)
      const ROW_H    = GRID_H / numWeeks

      const BAR_H   = Math.min(4.2, (ROW_H - 7.5) / 5)
      const BAR_PAD = 0.6
      const MAX_EVS = Math.floor((ROW_H - 7.5) / (BAR_H + BAR_PAD))

      for (let week = 0; week < numWeeks; week++) {
        for (let dow = 0; dow < 7; dow++) {
          const dayNum     = week * 7 + dow - firstDow + 1
          const cx         = M + dow * COL_W
          const cy         = GRID_TOP + week * ROW_H
          const outOfMonth = dayNum < 1 || dayNum > daysInMo
          const isWeekend  = dow === 0 || dow === 6

          // Cell background
          if (outOfMonth) {
            doc.setFillColor(250, 251, 252)
          } else if (isWeekend) {
            doc.setFillColor(...WKEND)
          } else {
            doc.setFillColor(...WHITE)
          }
          doc.rect(cx, cy, COL_W, ROW_H, 'F')

          // Cell border
          doc.setDrawColor(...BORDC)
          doc.setLineWidth(0.2)
          doc.rect(cx, cy, COL_W, ROW_H)

          if (outOfMonth) continue

          const dateStr = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
          const isToday = dateStr === TODAY

          // Today accent — tinted background
          if (isToday) {
            doc.setFillColor(228, 251, 246)
            doc.rect(cx, cy, COL_W, ROW_H, 'F')
            doc.setDrawColor(...BORDC)
            doc.rect(cx, cy, COL_W, ROW_H)
          }

          // Day number — circle for today, plain otherwise
          const numX = cx + COL_W - 4
          const numY = cy + 5

          if (isToday) {
            doc.setFillColor(...ACCT)
            doc.circle(numX, numY - 1.5, 3, 'F')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(7)
            doc.setTextColor(...WHITE)
          } else {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(...(isWeekend ? MUTED : NAVY))
          }
          doc.text(String(dayNum), numX, numY, { align: 'center' })

          // ── Events for this cell ──
          const dayEvs = tagged
            .filter(e => e.date <= dateStr && e._end >= dateStr)
            .sort((a, b) => {
              // Sort by project first (for multi-cal consistency), then by date, then stage
              if (a._pi !== b._pi) return a._pi - b._pi
              if (a.date !== b.date) return a.date < b.date ? -1 : 1
              return (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99)
            })

          dayEvs.slice(0, MAX_EVS).forEach((ev, ei) => {
            const barY    = cy + 7.8 + ei * (BAR_H + BAR_PAD)
            const isStart = ev.date === dateStr
            const clr     = isStart ? ev._clr : lighten(ev._clr, 0.45)

            doc.setFillColor(...clr)
            doc.roundedRect(cx + 0.8, barY, COL_W - 1.6, BAR_H, 0.7, 0.7, 'F')

            // Label only on first day of the event
            if (isStart) {
              const star   = ev.keyDate ? '★ ' : ''
              const evName = lang === 'en' ? (ev.nameEN || ev.name) : ev.name
              doc.setTextColor(...WHITE)
              doc.setFont('helvetica', ev.keyDate ? 'bold' : 'normal')
              doc.setFontSize(5.0)
              doc.text(star + evName, cx + 2, barY + BAR_H - 1, { maxWidth: COL_W - 4 })
            }
          })

          // Overflow indicator
          if (dayEvs.length > MAX_EVS) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(4.5)
            doc.setTextColor(...MUTED)
            doc.text(`+${dayEvs.length - MAX_EVS}`, cx + 2, cy + ROW_H - 1.5)
          }
        }
      }

      // ── DRAFT WATERMARK (multi-cal only) ─────────────────────────────────────
      if (isMultiCal) {
        // Use very light color — no opacity needed, compatible with all jsPDF versions
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(72)
        doc.setTextColor(232, 237, 242)    // very light navy-gray (~5% opacity equivalent)
        doc.text(
          'DRAFT',
          PW / 2,
          GRID_TOP + GRID_H / 2 + 8,
          { align: 'center', angle: 45 }
        )
      }

      // Separator D → E
      doc.setDrawColor(...BORDC)
      doc.setLineWidth(SEP)
      doc.line(M, ZONE_E_Y - SEP, PW - M, ZONE_E_Y - SEP)

      // ┌─ ZONE E — MINI MONTH NAVIGATION ─────────────────────────────────────┐
      // Determine which mini months to show
      let miniMonths = []
      if (months.length <= 3) {
        // Short calendar: show all months fixed across all pages
        miniMonths = months.map(({ y, m }) => ({ yr: y, mo: m }))
      } else {
        // Long calendar: rolling window of [prev, current, next]
        const prev = pageIdx > 0
          ? { yr: months[pageIdx - 1].y, mo: months[pageIdx - 1].m }
          : null
        const curr = { yr, mo }
        const next = pageIdx < months.length - 1
          ? { yr: months[pageIdx + 1].y, mo: months[pageIdx + 1].m }
          : null
        miniMonths = [prev, curr, next].filter(Boolean)
      }

      // Distribute 3 mini calendars evenly
      const MINI_W   = 7 * 3.5 + 3    // ≈ 27.5mm
      const totalW   = miniMonths.length * MINI_W
      const gapCount = miniMonths.length - 1
      const gapW     = gapCount > 0
        ? (PW - M * 2 - totalW) / gapCount
        : 0
      const miniY    = ZONE_E_Y + 1

      miniMonths.forEach((mn, i) => {
        const isCurr = mn.yr === yr && mn.mo === mo
        const mxBase = M + i * (MINI_W + gapW)
        drawMiniCal(mxBase, miniY, mn.yr, mn.mo, isCurr)
      })
    })

    // ── Footer on every page ─────────────────────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages()

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)

      // Separator
      doc.setDrawColor(...BORDC)
      doc.setLineWidth(SEP)
      doc.line(M, FOOTER_Y - 1, PW - M, FOOTER_Y - 1)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5.5)
      doc.setTextColor(...MUTED)
      doc.text('unabase Calendar · built by unabase.com', M, FOOTER_Y + 4)
      doc.text(`${i} / ${pageCount}`, PW - M, FOOTER_Y + 4, { align: 'right' })
    }

    // ── File naming ───────────────────────────────────────────────────────────
    const firstMo  = months[0]
    const moTag    = `${firstMo.y}-${String(firstMo.m + 1).padStart(2, '0')}`
    const draftTag = isDraft ? '_DRAFT' : ''

    let fileName
    if (projList.length === 1) {
      const p    = projList[0]
      const base = (p.client || p.name || 'schedule').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const ver  = `_v${p.version || 1}`
      fileName   = `${base}${ver}${draftTag}_${moTag}.pdf`
    } else {
      fileName = `unabase-calendar${draftTag}_${moTag}.pdf`
    }

    doc.save(fileName)
  }

  return { exportPdf }
}
