<template>
  <div class="preview-shell">

    <!-- ── Screen-only top bar ──────────────────────────────────── -->
    <div class="preview-top">
      <div class="preview-brand">unabase <em>Calendar</em></div>
      <div class="preview-meta">PDF preview · A4 landscape · 297 × 210 mm</div>
      <button class="preview-print-btn" :class="{ loading: downloading }" @click="downloadPdf" :disabled="downloading">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {{ downloading ? (isEN ? 'Generating…' : 'Generando…') : (isEN ? 'Download PDF' : 'Descargar PDF') }}
      </button>
    </div>

    <!-- ── Not found ────────────────────────────────────────────── -->
    <div v-if="!project" class="preview-empty">
      Project not found. Go back and reopen from the calendar.
    </div>

    <!-- ── Pages ────────────────────────────────────────────────── -->
    <template v-else>
      <div
        v-for="(page, pageIdx) in pages"
        :key="pageIdx"
        class="page"
      >
        <!-- Page header -->
        <div class="page-head">
          <div class="wordmark">
            <img v-if="orgLogo" :src="orgLogo" class="org-logo" alt="logo" />
            <div class="logo" v-html="orgWordmark"></div>
            <div class="wordmark-divider"></div>
            <div class="product">{{ isEN ? 'Production Schedule' : 'Calendario de Producción' }}</div>
          </div>
          <div class="doc-info">
            <div>
              <span class="doc-project-label">Project</span>
              &nbsp;
              <span class="doc-project-title">{{ project.name || project.client }}</span>
            </div>
            <div class="doc-version" :class="{ 'doc-version--draft': isDraft }">
              {{ versionLabel }}
            </div>
            <div v-if="lastUpdatedStr" class="doc-last-updated">
              <span class="doc-project-label">{{ isEN ? 'Last updated' : 'Última actualización' }}</span>
              &nbsp;<span class="doc-date">{{ lastUpdatedStr }}</span>
            </div>
          </div>
        </div>

        <!-- Calendars stack (one per month on this page) -->
        <div class="calendars" :data-count="page.months.length">
          <div
            v-for="(monthData, mi) in page.months"
            :key="mi"
            class="calendar"
          >
            <!-- Calendar header (project info line) -->
            <div class="cal-head">
              <div class="swatch" :style="{ background: project.color || '#D64545' }"></div>
              <div class="month-label">
                {{ monthData.monthName }}&nbsp;<span class="year">{{ monthData.year }}</span>
              </div>
              <div class="cal-sep"></div>
              <div class="info-row">
                <div
                  v-for="f in infoFields"
                  v-show="f.v"
                  :key="f.k"
                  class="field"
                >
                  <span class="k">{{ f.k }}</span>
                  <span class="v">{{ f.v }}</span>
                </div>
              </div>
            </div>

            <!-- Month grid -->
            <div class="cal-body">
              <div class="month-grid">

                <!-- Day-of-week header -->
                <div class="dow-row">
                  <div
                    v-for="(d, i) in DOW_LABELS"
                    :key="i"
                    :class="['dow', i >= 5 ? 'weekend' : '']"
                  >{{ d }}</div>
                </div>

                <!-- Week rows -->
                <div
                  v-for="(week, wi) in monthData.weeks"
                  :key="wi"
                  class="week-row"
                >
                  <!-- Day cells -->
                  <div
                    v-for="(day, di) in week.days"
                    :key="di"
                    :class="[
                      'day',
                      day.isWeekend ? 'weekend' : '',
                      day.isOut     ? 'out'     : '',
                      day.isToday   ? 'today'   : '',
                      day.isHoliday ? 'holiday' : '',
                    ]"
                  >
                    <!-- Day number -->
                    <div class="num">
                      <span>{{ day.date }}</span>
                      <span v-if="day.isFirstOfMonth" class="month-tag">{{ day.monthAbbr }}</span>
                    </div>

                    <!-- Lane spacer -->
                    <div
                      v-if="day.laneReserve > 0"
                      :style="{ height: (day.laneReserve * 19) + 'px', flexShrink: '0' }"
                    ></div>

                    <!-- Point event pills (includes holidays, rendered last in gray) -->
                    <div
                      v-if="day.pointEvents.length"
                      class="ev-stack"
                    >
                      <div
                        v-for="ev in day.pointEvents.slice(0, 3)"
                        :key="ev._id"
                        class="pill"
                        :style="pillStyle(ev.type, ev.keyDate)"
                      >
                        <span v-if="ev.keyDate" class="pill-star">★</span>
                        <span class="pill-text" :class="{ 'pill-holiday': ev.type === 'holiday' }">{{ ev.label }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Span overlay -->
                  <div class="span-layer">
                    <div
                      v-for="(span, si) in week.spans"
                      :key="si"
                      :class="[
                        'span',
                        span.continuesLeft  ? 'continues-left'  : '',
                        span.continuesRight ? 'continues-right' : '',
                      ]"
                      :style="spanBarStyle(span)"
                    >
                      <span v-if="span.continuesLeft"  class="arrow">←</span>
                      <span v-if="span.keyDate" class="span-star">★</span>
                      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">{{ span.label }}</span>
                      <span v-if="span.continuesRight" class="arrow" style="margin-left:auto;">→</span>
                    </div>
                  </div>

                </div><!-- /week-row -->
              </div><!-- /month-grid -->
            </div><!-- /cal-body -->
          </div><!-- /calendar -->
        </div><!-- /calendars -->

        <!-- Page footer -->
        <div class="page-foot">
          <div class="foot-left">unabase Calendar<span class="foot-url">&nbsp;· built by unabase.com</span></div>
          <div class="foot-center">Confidential · For production use only</div>
          <div class="page-num">{{ pad(pageIdx + 1) }}<span class="page-sep">/</span>{{ pad(pages.length) }}</div>
        </div>

      </div><!-- /page -->
    </template>

  </div>
</template>

<script setup>
definePageMeta({ layout: false })

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    },
  ],
})

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_FULL_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTH_FULL_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_ABBR_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MONTH_ABBR_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// DOW labels per lang × weekStart
const DOW_MON_ES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const DOW_MON_EN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const DOW_SUN_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DOW_SUN_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// Stage → event category (determines solid vs tinted)
const STAGE_SOLID = { sht: true }   // shoot stages get the full project color

// stage key → semantic slot (for solid detection)
const STAGE_TYPE = {
  bid:  'preprod',
  pre:  'preprod',
  sht:  'shoot',
  vpst: 'post',
  spst: 'post',
}

// ── Route & data ───────────────────────────────────────────────────────────────
const route     = useRoute()
const projectId = computed(() => route.params.id)
const isDraft   = computed(() => route.query.draft === '1')

const project      = ref(null)
const orgName      = ref('Mi Productora')
const orgLogo      = ref('')
const lang         = ref('es')
const weekStartCfg = ref('mon')   // 'mon' | 'sun'
const dateFormat   = ref('DD/MM/AA') // 'DD/MM/AA' | 'MM/DD/AA'

onMounted(() => {
  lang.value         = localStorage.getItem('ub_lang')       || 'es'
  weekStartCfg.value = localStorage.getItem('ub_weekstart')  || 'sun'
  dateFormat.value   = localStorage.getItem('ub_dateformat') || 'DD/MM/AA'

  orgName.value = localStorage.getItem('ub_studio') || 'Mi Productora'
  orgLogo.value = localStorage.getItem('ub_logo')   || ''

  try {
    const raw = localStorage.getItem('ub_projects')
    if (raw) {
      const projs = JSON.parse(raw)
      const found = projs.find(p => p.id === projectId.value)
      if (found) project.value = found
    }
  } catch {}
})

// ── Locale helpers ─────────────────────────────────────────────────────────────
const isEN       = computed(() => lang.value === 'en')
const MONTH_FULL = computed(() => isEN.value ? MONTH_FULL_EN : MONTH_FULL_ES)
const MONTH_ABBR = computed(() => isEN.value ? MONTH_ABBR_EN : MONTH_ABBR_ES)
const DOW_LABELS = computed(() => {
  if (weekStartCfg.value === 'sun') return isEN.value ? DOW_SUN_EN : DOW_SUN_ES
  return isEN.value ? DOW_MON_EN : DOW_MON_ES
})
// Weekend column indices depend on week start
// mon-start → Sat=5, Sun=6; sun-start → Sun=0, Sat=6
const weekendCols = computed(() =>
  weekStartCfg.value === 'sun' ? [0, 6] : [5, 6]
)

// ── Color helpers (derive from project color) ──────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}
// Mix hex color with white at given strength (0=white, 1=full color)
function tint(hex, strength = 0.14) {
  try {
    const { r, g, b } = hexToRgb(hex)
    const mix = (c) => Math.round(c + (255 - c) * (1 - strength))
    return `rgb(${mix(r)},${mix(g)},${mix(b)})`
  } catch { return '#eee' }
}
// Darken hex by a factor (for readable text on tint bg)
function darken(hex, factor = 0.65) {
  try {
    const { r, g, b } = hexToRgb(hex)
    const d = (c) => Math.round(c * factor)
    return `rgb(${d(r)},${d(g)},${d(b)})`
  } catch { return '#333' }
}

// ── Version label ──────────────────────────────────────────────────────────────
const versionLabel = computed(() => {
  const v   = project.value?.version ?? 0
  const hasChanges = project.value?.hasChanges ?? false
  if (isDraft.value) {
    return isEN.value
      ? `Draft v${v}${hasChanges ? '*' : ''}`
      : `Borrador v${v}${hasChanges ? '*' : ''}`
  }
  return isEN.value ? `Version ${v}` : `Versión ${v}`
})

// ── Today ──────────────────────────────────────────────────────────────────────
const todayDate = new Date()
const todayYmd  = ymd(todayDate)
// Format a Date object according to the org's dateFormat setting
function fmtDateObj(d) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(2)
  return dateFormat.value === 'MM/DD/AA' ? `${mm}/${dd}/${yy}` : `${dd}/${mm}/${yy}`
}

// Format a YYYY-MM-DD string according to the org's dateFormat setting
function fmtDateStr(s) {
  if (!s) return ''
  const [y, m, day] = s.split('-')
  const dd = day.padStart(2, '0')
  const mm = m.padStart(2, '0')
  const yy = y.slice(2)
  return dateFormat.value === 'MM/DD/AA' ? `${mm}/${dd}/${yy}` : `${dd}/${mm}/${yy}`
}

const todayStr = computed(() => fmtDateObj(todayDate))

// ── Last updated ───────────────────────────────────────────────────────────────
// project.updatedAt is an ISO string; extract YYYY-MM-DD part for formatting.
const lastUpdatedStr = computed(() => {
  const iso = project.value?.updatedAt
  if (!iso) return ''
  try {
    const ymdPart = iso.split('T')[0]  // → 'YYYY-MM-DD'
    return fmtDateStr(ymdPart)
  } catch { return '' }
})

// ── Org wordmark (last word in italic) ────────────────────────────────────────
const orgWordmark = computed(() => {
  const parts = orgName.value.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  const last = parts.pop()
  return parts.join(' ') + ' <em>' + last + '</em>'
})

// ── Project info fields ────────────────────────────────────────────────────────
const infoFields = computed(() => {
  if (!project.value) return []
  const p = project.value
  return [
    { k: isEN.value ? 'Client'        : 'Cliente',         v: p.client        || '' },
    { k: isEN.value ? 'Agency'        : 'Agencia',         v: p.agency        || '' },
    { k: isEN.value ? 'Director'      : 'Director',        v: p.director      || '' },
    { k: isEN.value ? 'Photographer'  : 'Fotógrafo',       v: p.photographer  || '' },
    { k: isEN.value ? 'Exec Producer' : 'Prod. Ejecutivo', v: p.ep            || '' },
  ].filter(f => f.v)
})

// ── Helper: date utilities ─────────────────────────────────────────────────────
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function colIndex(d) {
  // Column index 0..6 based on weekStart setting
  return weekStartCfg.value === 'sun'
    ? d.getDay()                 // Sun=0, Mon=1, …, Sat=6
    : (d.getDay() + 6) % 7      // Mon=0, Tue=1, …, Sun=6
}
function startOfCalendarGrid(year, month) {
  const first  = new Date(year, month, 1)
  const offset = colIndex(first)
  return new Date(year, month, 1 - offset)
}
function daysBetween(a, b) {
  return Math.round((b - a) / (24 * 60 * 60 * 1000))
}
function addDaysSimple(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return ymd(d)
}
function pad(n) {
  return String(n).padStart(2, '0')
}

// ── Business day segment builder (mirrors CalendarMonth.vue segmentation logic) ─
// Returns [{start, end}, ...] — one segment per consecutive business-day run.
// A 6-BD event Mon→Mon (skipping Sat-Sun) yields [{Mon–Fri}, {Mon}].
function buildBusinessSegments(startDate, n, holidayDates) {
  const segments = []
  const d = new Date(startDate + 'T12:00:00')
  let added = 0
  let segStart = null
  let segLast  = null

  while (added < n) {
    const ds  = ymd(d)
    const dow = d.getDay()
    const isBD = dow !== 0 && dow !== 6 && (!holidayDates || !holidayDates.has(ds))

    if (isBD) {
      if (!segStart) segStart = ds
      segLast = ds
      added++
      if (added === n) {
        segments.push({ start: segStart, end: segLast })
        segStart = null
        break
      }
    } else {
      if (segStart) {
        segments.push({ start: segStart, end: segLast })
        segStart = null
        segLast  = null
      }
    }
    d.setDate(d.getDate() + 1)
  }

  if (segStart) segments.push({ start: segStart, end: segLast })
  return segments
}

// ── Calendar-day end date (simple) ────────────────────────────────────────────
function calendarEnd(dateStr, dur) {
  return addDaysSimple(dateStr, dur - 1)
}

// ── Map project events → handoff format ───────────────────────────────────────
const exportEvents = computed(() => {
  if (!project.value) return []
  const p      = project.value
  const result = []

  // Build set of active holiday dates for business-day calculations
  const holidayDates = new Set(
    (p.holidays || [])
      .filter(h => !(p.disabledHolidays || []).includes(h.date))
      .map(h => h.date)
  )

  // Project events
  for (const ev of p.events || []) {
    if (!ev.active || !ev.date || ev.internal) continue
    const label   = isEN.value ? (ev.nameEN || ev.name) : ev.name
    const type    = STAGE_TYPE[ev.stage] || 'preprod'
    const dur     = ev.duration || 1
    const isBusiness = ev.durDayType === 'business'

    if (dur > 1 && isBusiness) {
      // Split into separate segments per consecutive business-day run
      // so span bars never cross weekends or holidays visually.
      const segs = buildBusinessSegments(ev.date, dur, holidayDates)
      segs.forEach((seg, si) => {
        result.push({
          kind: 'span', type, start: seg.start, end: seg.end, label,
          _id: ev.id + '_s' + si, keyDate: !!ev.keyDate,
          _forceContLeft:  si > 0,                  // viene de segmento anterior
          _forceContRight: si < segs.length - 1,    // continúa en segmento siguiente
        })
      })
    } else if (dur > 1) {
      const end = calendarEnd(ev.date, dur)
      result.push({ kind: 'span', type, start: ev.date, end, label, _id: ev.id, keyDate: !!ev.keyDate })
    } else {
      result.push({ kind: 'point', type, date: ev.date, label, _id: ev.id, keyDate: !!ev.keyDate })
    }
  }

  // Holidays from project
  for (const h of p.holidays || []) {
    const disabled = (p.disabledHolidays || []).includes(h.date)
    if (disabled) continue
    const label = isEN.value ? (h.localName || h.name) : (h.name || h.localName)
    result.push({ kind: 'point', type: 'holiday', date: h.date, label: label || 'Holiday', _id: 'hol-' + h.date })
  }

  return result
})

// ── Compute months range from events ──────────────────────────────────────────
const projectMonths = computed(() => {
  const evs = exportEvents.value
  if (!evs.length) return []

  const dates = []
  for (const ev of evs) {
    if (ev.kind === 'point' && ev.type !== 'holiday') dates.push(ev.date)
    if (ev.kind === 'span') { dates.push(ev.start); dates.push(ev.end) }
  }
  if (!dates.length) return []

  dates.sort()
  const first = dates[0]
  const last  = dates[dates.length - 1]

  const [fy, fm] = first.split('-').map(Number)
  const [ly, lm] = last.split('-').map(Number)

  const months = []
  let y = fy, m = fm - 1  // 0-indexed month
  while (y < ly || (y === ly && m <= lm - 1)) {
    months.push({ year: y, month: m })
    m++
    if (m > 11) { m = 0; y++ }
  }
  return months
})

// ── Lane algorithm (verbatim from handoff render.js) ──────────────────────────
function buildWeekData(weekDates, allEvents, currentMonth) {
  const weekStart = weekDates[0]
  const weekEnd   = weekDates[6]

  // Collect span events overlapping this week
  const weekSpans = []
  for (const ev of allEvents) {
    if (ev.kind !== 'span') continue
    const s = parseYmd(ev.start)
    const e = parseYmd(ev.end)
    if (e < weekStart || s > weekEnd) continue
    const clipStart = s < weekStart ? weekStart : s
    const clipEnd   = e > weekEnd   ? weekEnd   : e
    weekSpans.push({
      ...ev,
      startCol:       daysBetween(weekStart, clipStart),
      endCol:         daysBetween(weekStart, clipEnd),
      continuesLeft:  ev._forceContLeft  ?? s < weekStart,
      continuesRight: ev._forceContRight ?? e > weekEnd,
    })
  }

  // Greedy lane assignment
  weekSpans.sort((a, b) => a.startCol - b.startCol || b.endCol - a.endCol)
  const lanes = []
  weekSpans.forEach(s => {
    let laneIdx = 0
    while (
      lanes[laneIdx] &&
      lanes[laneIdx].some(ex => !(s.endCol < ex.startCol || s.startCol > ex.endCol))
    ) {
      laneIdx++
    }
    if (!lanes[laneIdx]) lanes[laneIdx] = []
    lanes[laneIdx].push(s)
    s.lane = laneIdx
  })

  // Per-day: max lane depth
  const dayLaneCount = new Array(7).fill(0)
  weekSpans.forEach(s => {
    for (let c = s.startCol; c <= s.endCol; c++) {
      dayLaneCount[c] = Math.max(dayLaneCount[c], s.lane + 1)
    }
  })

  // Build day cell data
  const days = weekDates.map((date, d) => {
    const dateStr     = ymd(date)
    const dayEvents   = allEvents.filter(ev => ev.kind === 'point' && ev.date === dateStr)
    const isHolidayDay = dayEvents.some(e => e.type === 'holiday')
    // Sort holidays last so project events appear first
    const pointEvents = [
      ...dayEvents.filter(e => e.type !== 'holiday'),
      ...dayEvents.filter(e => e.type === 'holiday'),
    ]

    return {
      date:           date.getDate(),
      dateStr,
      isWeekend:      weekendCols.value.includes(d),
      isOut:          date.getMonth() !== currentMonth,
      isToday:        dateStr === todayYmd,
      isFirstOfMonth: date.getDate() === 1,
      monthAbbr:      MONTH_ABBR.value[date.getMonth()],
      isHoliday:      isHolidayDay,
      pointEvents,
      laneReserve:    dayLaneCount[d],
    }
  })

  return { days, spans: weekSpans }
}

// ── Build pages ────────────────────────────────────────────────────────────────
const pages = computed(() => {
  const months = projectMonths.value
  if (!months.length) return []

  // One month per page (handoff spec)
  return months.map(({ year, month }) => {
    const gridStart = startOfCalendarGrid(year, month)
    const weeks     = []

    for (let w = 0; w < 6; w++) {
      const weekDates = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(gridStart)
        date.setDate(gridStart.getDate() + w * 7 + d)
        weekDates.push(date)
      }

      // Stop early if 6th row is entirely out-of-month (same logic as render.js)
      const lastOfWeek      = weekDates[6]
      const nextWeekMonday  = new Date(weekDates[0])
      nextWeekMonday.setDate(weekDates[0].getDate() + 7)
      if (w >= 4 && nextWeekMonday.getMonth() !== month && lastOfWeek.getMonth() !== month) {
        break
      }

      weeks.push(buildWeekData(weekDates, exportEvents.value, month))
    }

    return {
      months: [{
        year,
        month,
        monthName: MONTH_FULL.value[month],
        weeks,
      }],
    }
  })
})

// ── Style helpers — all colors derived from the project's color ────────────────
function typeStyle(type) {
  const hex = project.value?.color || '#2A4F9E'

  if (type === 'holiday') return { bg: '#e8e8e8', fg: '#888888', dot: '#aaaaaa', solid: false }
  if (type === 'delivery') return { bg: '#111111', fg: '#ffffff', dot: '#111111', solid: true }

  // shoot → full project color (solid)
  if (type === 'shoot') return { bg: hex, fg: '#ffffff', dot: hex, solid: true }

  // all other types → light tint bg, darkened project color for text/dot
  const fg  = darken(hex, 0.70)
  const bg  = tint(hex, 0.14)
  const dot = hex
  return { bg, fg, dot, solid: false }
}

function pillStyle(type, keyDate) {
  if (keyDate) return { background: '#111', color: '#fff' }
  const s = typeStyle(type)
  return { background: s.bg, color: s.fg }
}

function spanBarStyle(span) {
  const left  = (span.startCol / 7) * 100
  const width = ((span.endCol - span.startCol + 1) / 7) * 100
  const top   = 24 + span.lane * 19

  if (span.keyDate) {
    return {
      left:       `calc(${left}% + 3px)`,
      width:      `calc(${width}% - 6px)`,
      top:        `${top}px`,
      background: '#111',
      color:      '#fff',
    }
  }

  const s    = typeStyle(span.type)
  const base = {
    left:       `calc(${left}% + 3px)`,
    width:      `calc(${width}% - 6px)`,
    top:        `${top}px`,
    background: s.bg,
    color:      s.fg,
  }
  if (!s.solid) base.borderLeft = `2px solid ${s.dot}`
  return base
}

// ── PDF download ───────────────────────────────────────────────────────────────
const downloading = ref(false)

async function downloadPdf() {
  if (downloading.value || !project.value) return
  downloading.value = true

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    // Build filename: OrgName_Client_Agency_Project_Version
    const slug = (s) => (s || '').trim().replace(/\s+/g, '_')
    const parts = [
      slug(orgName.value),
      slug(project.value.client),
      slug(project.value.agency),
      slug(project.value.name),
      slug(versionLabel.value),
    ].filter(Boolean)
    const filename = parts.join('_') + '.pdf'

    const pageEls = document.querySelectorAll('.page')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    for (let i = 0; i < pageEls.length; i++) {
      if (i > 0) pdf.addPage()
      const canvas = await html2canvas(pageEls[i], {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        imageTimeout: 0,
        onclone(clonedDoc) {
          // Remove any CSS filters/effects that html2canvas may misrender
          clonedDoc.querySelectorAll('img').forEach(img => {
            img.style.filter = 'none'
            img.style.mixBlendMode = 'normal'
            img.style.imageRendering = 'high-quality'
          })
          // Temporarily enlarge the org logo so it's captured at higher pixel density
          clonedDoc.querySelectorAll('.org-logo').forEach(el => {
            el.style.height = '80px'
            el.style.maxWidth = '320px'
          })
        },
      })
      // Render to PNG (lossless — no JPEG compression artifacts on text/images)
      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, '', 'FAST')
    }

    pdf.save(filename)
  } catch (err) {
    console.error('PDF download failed:', err)
    alert(isEN.value ? 'PDF generation failed. Please try again.' : 'Error al generar el PDF. Intentá de nuevo.')
  } finally {
    downloading.value = false
  }
}
</script>

<style>
/* ── Reset + base ─────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --ink:       #111111;
  --ink-2:     #2b2b2b;
  --muted:     #6b6b6b;
  --muted-2:   #9a9a9a;
  --line:      #d9d9d9;
  --line-soft: #ececec;
  --paper:     #ffffff;
}

html, body {
  height: auto !important;
  overflow: visible !important;
  background: #e7e5e0;
  font-family: 'Inter', -apple-system, sans-serif;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "ss01", "cv11", "tnum";
}

/* ── Preview shell ────────────────────────────────────────────── */
.preview-shell {
  padding: 40px 24px 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

/* ── Screen-only top bar ──────────────────────────────────────── */
.preview-top {
  width: 100%;
  max-width: 1123px;
  display: flex;
  align-items: baseline;
  gap: 16px;
  padding: 0 4px;
}
.preview-brand {
  font-family: 'Fraunces', serif;
  font-weight: 500;
  font-size: 22px;
  letter-spacing: -0.01em;
}
.preview-brand em { font-style: italic; font-weight: 400; color: var(--muted); }
.preview-meta {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  flex: 1;
}
.preview-print-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 18px;
  background: var(--ink); color: #fff;
  border: none; border-radius: 7px;
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  cursor: pointer; letter-spacing: 0.01em;
  transition: opacity .15s;
}
.preview-print-btn:hover { opacity: .82; }
.preview-print-btn.loading { opacity: .6; cursor: wait; }

.preview-empty {
  font-size: 14px; color: var(--muted); padding: 60px;
}

/* ── Page (A4 landscape) ──────────────────────────────────────── */
.page {
  width: 1123px;
  height: 794px;
  background: var(--paper);
  box-shadow:
    0 1px 1px rgba(0,0,0,.04),
    0 20px 40px -10px rgba(0,0,0,.12),
    0 40px 80px -20px rgba(0,0,0,.08);
  padding: 22px 30px 18px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Page header ─────────────────────────────────────────────── */
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--ink);
  margin-bottom: 10px;
  flex-shrink: 0;
}
.wordmark { display: flex; align-items: center; gap: 10px; }
.org-logo {
  height: 32px; width: auto; max-width: 120px; object-fit: contain; flex-shrink: 0;
}
.wordmark .logo {
  font-family: 'Fraunces', serif;
  font-weight: 500; font-size: 22px;
  letter-spacing: -0.02em; line-height: 1;
}
.wordmark .logo em { font-style: italic; font-weight: 400; }
.wordmark-divider { width: 1px; height: 16px; background: var(--line); align-self: center; }
.wordmark .product {
  font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--muted); font-weight: 500;
}
.doc-info {
  display: flex; align-items: baseline; gap: 24px;
  font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--muted); font-weight: 500;
}
.doc-project-label { color: var(--muted-2); }
.doc-project-title {
  color: var(--ink); font-weight: 500;
  letter-spacing: -0.005em; text-transform: none; font-size: 12px;
}
.doc-version { color: var(--ink); }
.doc-version--draft { color: #c04040; }
.doc-date {
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.02em; text-transform: none;
}
.doc-last-updated {
  display: flex; align-items: baseline; gap: 0;
  white-space: nowrap;
}

/* ── Calendars stack ─────────────────────────────────────────── */
.calendars {
  flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 0;
}
.calendars[data-count="1"] .calendar { flex: 1; }
.calendars[data-count="2"] .calendar { flex: 1; }
.calendars[data-count="3"] .calendar { flex: 1; }

/* ── Single calendar ─────────────────────────────────────────── */
.calendar {
  display: flex; flex-direction: column; min-height: 0;
  border-top: 0.5px solid var(--ink);
  padding-top: 8px; overflow: hidden;
}
.calendar:first-child { border-top: none; padding-top: 0; }

/* Project info line */
.cal-head {
  display: flex; align-items: center;
  padding: 0 0 6px;
  font-size: 10.5px; letter-spacing: 0.02em;
  flex-shrink: 0;
}
.cal-head .swatch {
  width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0; margin-right: 12px;
}
.cal-head .month-label {
  font-family: 'Fraunces', serif;
  font-weight: 500; font-size: 32px;
  letter-spacing: -0.025em; line-height: 1;
  color: var(--ink); margin-right: 4px; white-space: nowrap;
}
.cal-head .month-label .year {
  font-style: italic; font-weight: 400; color: var(--muted); margin-left: 6px;
}
.cal-sep {
  width: 1px; height: 14px; background: var(--line); margin: 0 14px; flex-shrink: 0;
}
.info-row {
  display: flex; align-items: center; flex: 1; overflow: hidden; min-width: 0;
}
.field {
  display: flex; align-items: baseline; gap: 6px;
  padding-right: 14px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; flex-shrink: 0;
}
.field + .field { border-left: 1px solid var(--line); padding-left: 14px; }
.field .k {
  font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--muted-2); font-weight: 500;
}
.field .v { font-size: 10.5px; color: var(--ink); font-weight: 500; letter-spacing: -0.005em; }

/* ── Calendar body / grid ────────────────────────────────────── */
.cal-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }

.month-grid {
  display: flex; flex-direction: column;
  flex: 1; min-height: 0;
  border-left: 0.5px solid var(--line);
  border-top: 0.5px solid var(--line);
  overflow: hidden;
}

.dow-row { display: grid; grid-template-columns: repeat(7, 1fr); flex-shrink: 0; }
.dow {
  padding: 5px 8px 6px;
  font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--muted); font-weight: 500;
  border-right: 0.5px solid var(--line);
  border-bottom: 0.5px solid var(--ink);
  background: #fff;
}
.dow.weekend { color: var(--muted-2); }

.week-row {
  display: grid; grid-template-columns: repeat(7, 1fr);
  position: relative; flex: 1; min-height: 0;
}

.day {
  border-right: 0.5px solid var(--line);
  border-bottom: 0.5px solid var(--line);
  padding: 5px 7px 6px;
  overflow: hidden; display: flex; flex-direction: column;
  background: #fff; gap: 1px; min-height: 0;
}
.day.out      { background: #fbfbfb; }
.day.out .num { color: #c9c9c9; }
.day.weekend:not(.out) { background: #fcfcfc; }
.day.holiday  {
  background: repeating-linear-gradient(135deg, #fff 0 6px, #f3f3f3 6px 7px);
}
.day.today .num span:first-child {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--ink); color: #fff;
  font-size: 11px;
}

.day .num {
  font-family: 'Fraunces', serif;
  font-size: 15px; font-weight: 400; line-height: 1;
  color: var(--ink); letter-spacing: -0.02em;
  margin-bottom: 3px;
  display: flex; align-items: baseline; gap: 5px; flex-shrink: 0;
}
.month-tag {
  font-family: 'Inter', sans-serif;
  font-size: 7.5px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--muted-2); font-weight: 500;
}

/* Event pills */
.ev-stack {
  display: flex; flex-direction: column; gap: 1.5px;
  padding-top: 2px;
}
.pill {
  font-size: 9.5px; line-height: 1.3;
  padding: 2.5px 6px 3px; border-radius: 2.5px;
  font-weight: 500; letter-spacing: -0.005em;
  display: flex; align-items: flex-start; gap: 3px;
}
.pill-text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
.pill-holiday { font-style: italic; }
.pill .dot { width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
.pill-star { font-size: 8px; flex-shrink: 0; margin-top: 2px; color: #F5C518; line-height: 1; }
.span-star { font-size: 8px; flex-shrink: 0; color: #F5C518; line-height: 1; margin-right: 2px; }

/* Span bars */
.span-layer { position: absolute; inset: 0; pointer-events: none; }
.span {
  position: absolute; height: 17px;
  font-size: 10px; line-height: 17px; padding: 0 6px;
  border-radius: 2.5px; white-space: nowrap; overflow: hidden;
  font-weight: 600; letter-spacing: 0.01em;
  display: flex; align-items: center; gap: 4px;
}
.span.continues-left  { border-top-left-radius: 0;  border-bottom-left-radius: 0;  padding-left: 4px; }
.span.continues-right { border-top-right-radius: 0; border-bottom-right-radius: 0; padding-right: 4px; }
.span .arrow { font-size: 9px; opacity: .7; flex-shrink: 0; }

/* ── Page footer ─────────────────────────────────────────────── */
.page-foot {
  margin-top: 8px; padding-top: 6px;
  border-top: 1px solid var(--ink); flex-shrink: 0;
  display: flex; align-items: baseline; justify-content: space-between;
  position: relative;
  font-size: 8px; letter-spacing: 0.06em; color: var(--muted);
}
.foot-left {
  font-family: 'Fraunces', serif; font-style: italic;
  font-size: 8.5px; letter-spacing: 0; color: var(--ink); font-weight: 400;
}
.foot-url {
  font-family: 'JetBrains Mono', monospace; font-style: normal;
  color: var(--muted); font-size: 7.5px; letter-spacing: 0.02em;
}
.foot-center {
  position: absolute; left: 50%; transform: translateX(-50%);
  text-transform: uppercase; font-size: 7px; letter-spacing: 0.15em;
}
.page-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px; letter-spacing: 0.02em; color: var(--ink);
}
.page-sep { color: var(--muted-2); margin: 0 2px; }

/* ── Print ───────────────────────────────────────────────────── */
@page { size: A4 landscape; margin: 0; }

@media print {
  html, body { background: #fff; }
  .preview-shell { padding: 0; gap: 0; background: #fff; }
  .preview-top   { display: none; }
  .page {
    box-shadow: none;
    page-break-after: always;
    width: 297mm;
    height: 210mm;
  }
  .page:last-child { page-break-after: auto; }
}
</style>
