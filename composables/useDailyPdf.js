import { useSettingsStore } from '~/stores/settings'
import { convertTimezone, fmt12h } from '~/utils/helpers'

export function useDailyPdf() {
  const settingsStore = useSettingsStore()

  // ── Color palette (matches usePdfExport.js) ──────────────────────────────
  const NAVY  = [26,  46,  74]
  const MUTED = [128, 150, 168]
  const BORDC = [228, 234, 240]
  const BGLOW = [248, 250, 251]
  const WHITE = [255, 255, 255]
  const ACCT  = [91,  191, 173]
  const WARN  = [255, 161, 32]

  // ── Locale helpers ────────────────────────────────────────────────────────
  const DOW_FULL = {
    en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    es: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
  }
  const MONTH_LONG = {
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  }

  function fmtDateFull(dateStr, lang) {
    const d = new Date(dateStr + 'T12:00:00')
    const dow   = DOW_FULL[lang]?.[d.getDay()] || ''
    const day   = d.getDate()
    const month = MONTH_LONG[lang]?.[d.getMonth()] || ''
    const year  = d.getFullYear()
    return lang === 'en'
      ? `${dow}, ${month} ${day}, ${year}`
      : `${dow}, ${day} de ${month} de ${year}`
  }

  // ── Sort items within a day (same logic as DailyView.vue) ─────────────────
  function sortItems(items) {
    const P = { 'All Day': 0, 'AM': 1, 'PM': 4, 'TBD': 5 }
    return [...items].sort((a, b) => {
      const ap = a.timeType === 'specific_time' ? 2 : (P[a.timeLabel] ?? 5)
      const bp = b.timeType === 'specific_time' ? 2 : (P[b.timeLabel] ?? 5)
      if (ap !== bp) return ap - bp
      if (a.timeType === 'specific_time' && b.timeType === 'specific_time') {
        return (a.specificTime || '').localeCompare(b.specificTime || '')
      }
      return 0
    })
  }

  // ── Main export function ──────────────────────────────────────────────────
  async function exportDailyPdf(project, options = {}) {
    const { jsPDF } = await import('jspdf')

    const lang    = options.lang   || 'es'
    const type    = options.type   || 'client'   // 'client' | 'internal'
    const fromStr = options.from   || ''
    const toStr   = options.to     || ''
    const isEN    = lang === 'en'
    const isInternal = type === 'internal'

    // Filter items in date range, and apply visibility rules
    const allItems = (project.dailySchedule || []).filter(item => {
      if (!item.date || !item.title) return false
      if (fromStr && item.date < fromStr) return false
      if (toStr   && item.date > toStr)   return false
      if (!isInternal && item.internalOnly) return false
      return true
    })

    if (!allItems.length) {
      alert(isEN
        ? 'No items in the selected date range.'
        : 'No hay items en el rango de fechas seleccionado.')
      return
    }

    // Group and sort items by date
    const grouped = {}
    allItems.forEach(item => {
      if (!grouped[item.date]) grouped[item.date] = []
      grouped[item.date].push(item)
    })
    const sortedDates = Object.keys(grouped).sort()
    sortedDates.forEach(date => { grouped[date] = sortItems(grouped[date]) })

    // Timezone config
    const timezones   = project.dailyConfig?.timezones || []
    const primaryTz   = timezones.find(t => t.primary) || null
    const secondaryTzs = timezones.filter(t => !t.primary)

    // Related events map
    const eventMap = {}
    ;(project.events || []).forEach(ev => { eventMap[ev.id] = ev })

    // ── jsPDF setup ─────────────────────────────────────────────────────────
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const PW  = doc.internal.pageSize.getWidth()   // 210mm
    const PH  = doc.internal.pageSize.getHeight()  // 297mm
    const M   = 14
    const SEP = 0.3

    // Layout zones
    const ZONE_A_H  = 13    // org header
    const ZONE_B_H  = 14    // project info
    const ZONE_C_H  = 10    // "DAILY SCHEDULE" label + date range
    const FOOTER_H  = 6

    const ZONE_A_Y  = M
    const ZONE_B_Y  = ZONE_A_Y + ZONE_A_H + SEP
    const ZONE_C_Y  = ZONE_B_Y + ZONE_B_H  + SEP
    const CONTENT_Y = ZONE_C_Y + ZONE_C_H  + 4
    const BOTTOM    = PH - M - FOOTER_H - 4

    // Item layout
    const TIME_W    = 40      // time column width
    const CONT_X    = M + TIME_W + 3
    const CONT_W    = PW - M - CONT_X

    // ── Helper: draw page header (called on every new page after the first) ─
    let pageCount = 1

    function drawZoneA() {
      let orgX = M
      if (settingsStore.logo) {
        try {
          const fmt      = settingsStore.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG'
          const imgProps = doc.getImageProperties(settingsStore.logo)
          const ratio    = imgProps.width / imgProps.height
          const logoH    = 9
          const logoW    = Math.min(logoH * ratio, 30)
          doc.addImage(settingsStore.logo, fmt, M, ZONE_A_Y + (9 - logoH) / 2 + 1, logoW, logoH)
          orgX = M + logoW + 3
        } catch (_) {}
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...NAVY)
      doc.text(settingsStore.studioName || 'unabase', orgX, ZONE_A_Y + 7)

      // "DAILY SCHEDULE" label (right)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...ACCT)
      doc.text(isEN ? 'DAILY SCHEDULE' : 'DAILY SCHEDULE', PW - M, ZONE_A_Y + 7, { align: 'right' })

      // Separator
      doc.setDrawColor(...BORDC)
      doc.setLineWidth(SEP)
      doc.line(M, ZONE_B_Y - SEP, PW - M, ZONE_B_Y - SEP)
    }

    function drawZoneB() {
      doc.setFillColor(...BGLOW)
      doc.rect(M, ZONE_B_Y, PW - M * 2, ZONE_B_H, 'F')

      const p = project
      const fields = [
        p.name         || p.client || '',
        p.client && p.name && p.client !== p.name ? p.client : '',
        p.agency       ? `${isEN ? 'Agency' : 'Agencia'}: ${p.agency}` : '',
        p.director     ? `${isEN ? 'Dir' : 'Dir'}: ${p.director}` : '',
        p.photographer ? `${isEN ? 'Phot' : 'Fot'}: ${p.photographer}` : '',
        p.ep           ? `EP: ${p.ep}` : '',
        p.agencyProducer ? `${isEN ? 'Prod Agency' : 'Prod Agencia'}: ${p.agencyProducer}` : '',
      ].filter(Boolean)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.2)
      doc.setTextColor(...NAVY)
      const metaStr = fields.join('  ·  ')
      const maxW    = PW - M * 2 - 4
      const textW   = doc.getStringUnitWidth(metaStr) * 6.2 / doc.internal.scaleFactor
      const display = textW > maxW ? doc.splitTextToSize(metaStr, maxW)[0] + '…' : metaStr
      doc.text(display, M + 3, ZONE_B_Y + 5)

      // Version
      const v = project.version || 0
      const hasChanges = project.hasChanges
      const verLabel = isEN ? `v${v}${hasChanges ? '*' : ''}` : `v${v}${hasChanges ? '*' : ''}`
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.setTextColor(...MUTED)
      doc.text(verLabel, PW - M, ZONE_B_Y + 5, { align: 'right' })

      // Type badge
      if (isInternal) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(5.5)
        doc.setTextColor(...WARN)
        doc.text(isEN ? '[ INTERNAL ]' : '[ INTERNO ]', PW - M, ZONE_B_Y + 10, { align: 'right' })
      }

      // Date range
      const rangeLabel = fromStr && toStr
        ? `${fromStr}${fromStr !== toStr ? ' → ' + toStr : ''}`
        : ''
      if (rangeLabel) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(...MUTED)
        doc.text(rangeLabel, M + 3, ZONE_B_Y + 10)
      }

      doc.setDrawColor(...BORDC)
      doc.setLineWidth(SEP)
      doc.line(M, ZONE_B_Y + ZONE_B_H, PW - M, ZONE_B_Y + ZONE_B_H)
    }

    function drawZoneC() {
      // Timezone note
      if (primaryTz) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(6)
        doc.setTextColor(...MUTED)
        const secLabels = secondaryTzs.map(t => t.label).join(', ')
        const tzStr = isEN
          ? `All times ${primaryTz.label} time${secLabels ? ' · Secondary: ' + secLabels : ''}`
          : `Todo en hora ${primaryTz.label}${secLabels ? ' · Secundarias: ' + secLabels : ''}`
        doc.text(tzStr, M, ZONE_C_Y + 7)
      }
    }

    function drawFooter(pgNum, pgTotal) {
      const fy = PH - M - FOOTER_H + 4
      doc.setDrawColor(...BORDC)
      doc.setLineWidth(SEP)
      doc.line(M, PH - M - FOOTER_H, PW - M, PH - M - FOOTER_H)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5.5)
      doc.setTextColor(...MUTED)
      doc.text('unabase Calendar · built by unabase.com', M, fy)
      doc.text(`${pgNum} / ${pgTotal}`, PW - M, fy, { align: 'right' })
    }

    // ── Draw first page header ───────────────────────────────────────────────
    drawZoneA()
    drawZoneB()
    drawZoneC()

    // ── Render items ─────────────────────────────────────────────────────────
    let y = CONTENT_Y

    function checkNewPage(neededH) {
      if (y + neededH > BOTTOM) {
        doc.addPage()
        pageCount++
        // Redraw minimal header on continuation pages
        doc.setFillColor(...BGLOW)
        doc.rect(M, M, PW - M * 2, 7, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...NAVY)
        doc.text(project.name || project.client || '', M + 3, M + 5)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...ACCT)
        doc.text('DAILY SCHEDULE', PW - M, M + 5, { align: 'right' })
        doc.setDrawColor(...BORDC)
        doc.setLineWidth(SEP)
        doc.line(M, M + 7, PW - M, M + 7)
        y = M + 11
      }
    }

    for (const date of sortedDates) {
      const items = grouped[date]
      if (!items.length) continue

      // Date header row
      checkNewPage(14)
      doc.setFillColor(...NAVY)
      doc.rect(M, y, PW - M * 2, 11, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...WHITE)
      doc.text(fmtDateFull(date, lang), M + 4, y + 7.5)
      if (primaryTz) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(...ACCT)
        const tzNote = isEN
          ? `All times ${primaryTz.label}`
          : `Todo en hora ${primaryTz.label}`
        doc.text(tzNote, PW - M - 2, y + 7.5, { align: 'right' })
      }
      y += 13

      // Items
      for (const item of items) {
        // Estimate item height
        let lineCount = 1  // title
        if (item.locationName)  lineCount++
        if (item.locationAddress) lineCount++
        if (item.participants)  lineCount++
        if (item.notes) {
          lineCount += Math.ceil((item.notes.length || 0) / 65)
        }
        const relEv = item.relatedCalendarEventId ? eventMap[item.relatedCalendarEventId] : null
        if (relEv) lineCount++
        if (item.department) lineCount++

        // Secondary tz lines for specific_time items
        const secTzCount = (item.timeType === 'specific_time' && primaryTz)
          ? secondaryTzs.length
          : 0

        const itemH = Math.max(
          lineCount * 4 + 6,
          7 + secTzCount * 3.5 + 4
        )

        checkNewPage(itemH + 2)

        // Item background (subtle alternation, internal items get a tint)
        if (item.internalOnly && isInternal) {
          doc.setFillColor(255, 248, 235)
          doc.rect(M, y, PW - M * 2, itemH, 'F')
        }

        // Separator line between items
        doc.setDrawColor(...BORDC)
        doc.setLineWidth(0.15)
        doc.line(M + TIME_W + 1, y, PW - M, y)

        // ── Time column ──
        let timeY = y + 5
        if (item.timeType === 'specific_time' && item.specificTime) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          doc.setTextColor(...NAVY)
          doc.text(fmt12h(item.specificTime), M, timeY)

          // Secondary timezones
          if (primaryTz && secondaryTzs.length) {
            timeY += 4
            secondaryTzs.forEach(tz => {
              const conv = convertTimezone(item.date, item.specificTime, primaryTz.tz, tz.tz)
              if (conv) {
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(5.5)
                doc.setTextColor(...MUTED)
                doc.text(`(${fmt12h(conv)} ${tz.label})`, M, timeY)
                timeY += 3.5
              }
            })
          }
        } else if (item.timeType === 'time_label' && item.timeLabel) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7.5)
          doc.setTextColor(...MUTED)
          doc.text(item.timeLabel, M, y + 5)
        } else {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.setTextColor(...BORDC)
          doc.text('—', M, y + 5)
        }

        // ── Content column ──
        let cy = y + 5

        // Internal badge
        if (item.internalOnly && isInternal) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(5.5)
          doc.setTextColor(...WARN)
          doc.text('[INTERNAL]', PW - M, cy - 0.5, { align: 'right' })
        }

        // Title
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...NAVY)
        const titleStr = doc.splitTextToSize(item.title, CONT_W - (item.internalOnly && isInternal ? 22 : 0))
        doc.text(titleStr[0], CONT_X, cy)
        if (item.duration) {
          const titleW = doc.getStringUnitWidth(titleStr[0]) * 8 / doc.internal.scaleFactor
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6)
          doc.setTextColor(...MUTED)
          doc.text(`(${item.duration})`, CONT_X + titleW + 2, cy)
        }
        cy += 4

        // Location
        if (item.locationName) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.5)
          doc.setTextColor(...MUTED)
          doc.text(`📍 ${item.locationName}`, CONT_X, cy)
          cy += 3.5
        }
        if (item.locationAddress) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(5.5)
          doc.setTextColor(...MUTED)
          doc.text(`   ${item.locationAddress}`, CONT_X, cy)
          cy += 3.5
        }

        // Participants
        if (item.participants) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6)
          doc.setTextColor(...MUTED)
          const pStr = doc.splitTextToSize(`👥 ${item.participants}`, CONT_W)
          doc.text(pStr[0], CONT_X, cy)
          cy += 3.5
        }

        // Notes
        if (item.notes) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(6)
          doc.setTextColor(...MUTED)
          const noteLines = doc.splitTextToSize(item.notes, CONT_W)
          noteLines.slice(0, 3).forEach(line => {
            doc.text(line, CONT_X, cy)
            cy += 3.5
          })
        }

        // Related event
        if (relEv) {
          const evName = lang === 'en' ? (relEv.nameEN || relEv.name) : relEv.name
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(5.5)
          doc.setTextColor(...ACCT)
          doc.text(
            `${isEN ? 'Related event' : 'Evento relacionado'}: ${evName}`,
            CONT_X, cy
          )
          cy += 3.5
        }

        // Department
        if (item.department) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(5)
          doc.setTextColor(...MUTED)
          doc.text(item.department.toUpperCase(), CONT_X, cy)
          cy += 3.5
        }

        y += itemH + 2
      }

      // Space after each date group
      y += 4
    }

    // ── Footer on every page ─────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      drawFooter(i, totalPages)
    }

    // ── File name ────────────────────────────────────────────────────────────
    const base     = (project.client || project.name || 'daily').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const typeTag  = isInternal ? '_internal' : ''
    const dateTag  = fromStr ? `_${fromStr}` : ''
    const fileName = `${base}_daily-schedule${typeTag}${dateTag}.pdf`

    doc.save(fileName)
  }

  return { exportDailyPdf }
}
