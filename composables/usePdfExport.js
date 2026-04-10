import { fmtDate } from '~/utils/helpers'
import { STAGE_ORDER } from '~/utils/constants'

export function usePdfExport() {
  async function exportPdf(proj, lang = 'es') {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    const title = lang === 'en' ? 'Production Schedule' : 'Timing de Producción'
    const margin = 15
    const pageW = doc.internal.pageSize.getWidth()

    // Header
    doc.setFillColor(0, 44, 62) // --navy
    doc.rect(0, 0, pageW, 22, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin, 14)

    // Project info
    const projName = proj.name || proj.client || ''
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const meta = [proj.client, proj.agency].filter(Boolean).join(' · ')
    doc.text(projName, pageW / 2, 10, { align: 'center' })
    if (meta) doc.text(meta, pageW / 2, 16, { align: 'center' })

    // Version badge
    const vLabel = `v${proj.version || 1}`
    doc.setFontSize(7)
    doc.text(vLabel, pageW - margin, 14, { align: 'right' })

    // Events table
    const stageColors = {
      bid:  [124, 174, 255],
      pre:  [6,   204, 180],
      sht:  [249, 115, 22],
      vpst: [168, 85,  247],
      spst: [236, 72,  153],
    }

    const stageLabels = lang === 'en'
      ? { bid:'Bidding', pre:'Pre-Production', sht:'Shoot', vpst:'Video Post', spst:'Still Post' }
      : { bid:'Bidding', pre:'Prepro', sht:'Rodaje', vpst:'Post Video', spst:'Post Foto' }

    const activeEvents = proj.events
      .filter(e => e.active && e.date)
      .sort((a, b) => {
        const so = (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99)
        if (so !== 0) return so
        return (a.date || '') < (b.date || '') ? -1 : 1
      })

    let y = 30
    const rowH = 7
    const cols = { stage: margin, name: margin + 28, date: pageW - 50, days: pageW - 20 }

    // Column headers
    doc.setFillColor(240, 245, 247)
    doc.rect(margin, y - 4, pageW - margin * 2, rowH, 'F')
    doc.setTextColor(107, 143, 160)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(lang === 'en' ? 'Stage' : 'Etapa',  cols.stage, y)
    doc.text(lang === 'en' ? 'Event' : 'Evento',  cols.name,  y)
    doc.text(lang === 'en' ? 'Date'  : 'Fecha',   cols.date,  y)
    doc.text(lang === 'en' ? 'Days'  : 'Días',    cols.days,  y)
    y += rowH

    let lastStage = ''
    for (const ev of activeEvents) {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage()
        y = 20
      }

      // Stage separator
      if (ev.stage !== lastStage) {
        lastStage = ev.stage
        const sc = stageColors[ev.stage] || [100, 100, 100]
        doc.setFillColor(sc[0], sc[1], sc[2])
        doc.setTextColor(255, 255, 255)
        doc.rect(margin, y - 4, pageW - margin * 2, rowH, 'F')
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text(stageLabels[ev.stage] || ev.stage, cols.stage, y)
        y += rowH
      }

      doc.setTextColor(0, 44, 62)
      doc.setFontSize(7)
      doc.setFont('helvetica', ev.keyDate ? 'bold' : 'normal')

      const evName = lang === 'en' ? (ev.nameEN || ev.name) : ev.name
      doc.text(evName, cols.name, y, { maxWidth: cols.date - cols.name - 5 })
      doc.text(fmtDate(ev.date), cols.date, y)
      doc.text(String(ev.duration || ev.days || 1), cols.days, y)

      // Key date star
      if (ev.keyDate) {
        doc.setTextColor(6, 204, 180)
        doc.text('★', cols.name - 5, y)
        doc.setTextColor(0, 44, 62)
      }

      // Alternating row background
      if (activeEvents.indexOf(ev) % 2 === 0) {
        doc.setFillColor(248, 251, 252)
        doc.rect(margin, y - 4, pageW - margin * 2, rowH, 'F')
        // Redraw text over background
        doc.setTextColor(0, 44, 62)
        doc.setFont('helvetica', ev.keyDate ? 'bold' : 'normal')
        doc.text(evName, cols.name, y, { maxWidth: cols.date - cols.name - 5 })
        doc.text(fmtDate(ev.date), cols.date, y)
        doc.text(String(ev.duration || ev.days || 1), cols.days, y)
      }

      y += rowH
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(107, 143, 160)
      const today = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES')
      doc.text(`${today} · unabase.com`, margin, doc.internal.pageSize.getHeight() - 5)
      doc.text(`${i} / ${pageCount}`, pageW - margin, doc.internal.pageSize.getHeight() - 5, { align: 'right' })
    }

    const fileName = `${(proj.client || proj.name || 'schedule').replace(/\s+/g, '-')}-v${proj.version || 1}.pdf`
    doc.save(fileName)
  }

  return { exportPdf }
}
