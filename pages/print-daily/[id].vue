<template>
  <div class="preview-shell">

    <!-- ── Screen-only top bar ──────────────────────────────────────── -->
    <div class="preview-top screen-only">
      <div class="preview-brand">unabase <em>Calendar</em></div>
      <div class="preview-meta">
        {{ printTypeLabel }} · A4 portrait · 210 × 297 mm
      </div>
      <button class="preview-print-btn" @click="doPrint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {{ isEN ? 'Download PDF' : 'Descargar PDF' }}
      </button>
    </div>

    <!-- ── Loading ──────────────────────────────────────────────────── -->
    <div v-if="loading" class="preview-empty screen-only">
      Cargando proyecto...
    </div>

    <!-- ── Error ──────────────────────────────────────────────────── -->
    <div v-else-if="loadError || !project" class="preview-empty screen-only">
      No se pudo cargar el proyecto. Cerrá esta pestaña y volvé a abrir el PDF desde el calendario.
    </div>

    <!-- ── Printable document ────────────────────────────────────────── -->
    <div v-else-if="project" class="doc">

      <!-- Page header (repeats on every print page via @page-margin or just flows) -->
      <div class="doc-head">
        <div class="wordmark">
          <img v-if="orgLogo" :src="orgLogo" class="org-logo" alt="logo" />
          <div class="logo" v-html="orgWordmark"></div>
          <div class="wordmark-divider"></div>
          <div class="product">{{ isEN ? 'Daily Schedule' : 'Daily Schedule' }}</div>
        </div>
        <div class="doc-meta">
          <div>
            <span class="doc-label">{{ isEN ? 'Project' : 'Proyecto' }}</span>&nbsp;
            <span class="doc-title">{{ project.name || project.client }}</span>
          </div>
          <div v-if="rangeLabel" class="doc-range">{{ rangeLabel }}</div>
          <div v-if="isInternal" class="doc-internal-badge">INTERNAL</div>
        </div>
      </div>

      <!-- Project info bar -->
      <div v-if="infoFields.length" class="info-bar">
        <div class="info-swatch" :style="{ background: project.color || '#2A4F9E' }"></div>
        <div
          v-for="f in infoFields"
          :key="f.k"
          class="info-field"
        >
          <span class="info-k">{{ f.k }}</span>
          <span class="info-v">{{ f.v }}</span>
        </div>
      </div>

      <!-- Timezone note -->
      <div v-if="primaryTz" class="tz-note">
        <span class="tz-note-label">{{ isEN ? 'All times' : 'Todo en hora' }}:</span>
        <strong>{{ primaryTz.city || primaryTz.shortLabel || primaryTz.tz }}</strong>
        <template v-if="secondaryTzs.length">
          <span v-for="tz in secondaryTzs" :key="tz.tz || tz.iana" class="tz-note-sec"> · {{ tz.city || tz.shortLabel || tz.tz }}</span>
        </template>
      </div>

      <!-- Date sections -->
      <div
        v-for="group in filteredGroups"
        :key="group.date"
        class="date-section"
      >
        <!-- Date header -->
        <div class="date-hdr">
          <span class="date-dow">{{ group.dowLabel }}</span>
          <span class="date-label">{{ group.dateLabel }}</span>
        </div>

        <!-- Items -->
        <div
          v-for="item in group.items"
          :key="item.id"
          class="item-row"
          :class="{ 'item-internal': item.internalOnly && isInternal }"
        >
          <!-- Internal badge -->
          <div v-if="item.internalOnly && isInternal" class="item-int-badge">INTERNAL</div>

          <!-- Time column -->
          <div class="item-time">
            <template v-if="item.timeType === 'specific_time' && item.specificTime">
              <span class="time-primary">{{ fmt12h(item.specificTime) }}</span>
              <span v-if="groupSecondaryTimes(item).length" class="time-secondary">
                ({{ groupSecondaryTimes(item).join(' / ') }})
              </span>
              <span v-if="item.duration" class="time-duration">{{ item.duration }}</span>
            </template>
            <template v-else-if="item.timeType === 'time_label' && item.timeLabel">
              <span class="time-label">{{ item.timeLabel }}</span>
            </template>
            <template v-else>
              <span class="time-none">—</span>
            </template>
          </div>

          <!-- Content column -->
          <div class="item-content">
            <div class="item-title">{{ item.title }}</div>

            <div v-if="item.locationName" class="item-meta-row item-location">
              <span class="meta-icon">📍</span>
              <span>{{ item.locationName }}<span v-if="item.locationAddress" class="item-address"> · {{ item.locationAddress }}</span></span>
            </div>

            <div v-if="item.participants" class="item-meta-row item-participants">
              <span class="meta-icon">👥</span>
              <span>{{ item.participants }}</span>
            </div>

            <div v-if="item.notes" class="item-notes">{{ item.notes }}</div>

            <div v-if="item.department" class="item-dept">{{ item.department }}</div>

            <div v-if="relatedEventName(item)" class="item-related">
              <span class="related-k">{{ isEN ? 'Linked event' : 'Evento relacionado' }}:</span>
              {{ relatedEventName(item) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state (screen only) -->
      <div v-if="!filteredGroups.length" class="doc-empty screen-only">
        {{ isEN ? 'No items in the selected date range.' : 'No hay items en el rango de fechas seleccionado.' }}
      </div>

      <!-- Document footer -->
      <div class="doc-foot">
        <div class="foot-left">unabase Calendar<span class="foot-url"> · built by unabase.com</span></div>
        <div class="foot-center">Confidential · For production use only</div>
        <div class="foot-date">{{ todayStr }}</div>
      </div>

    </div><!-- /doc -->

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
      href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    },
  ],
})

const DOW_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const DOW_EN   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTH_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']

const route     = useRoute()
const projectId = computed(() => route.params.id)
const from      = computed(() => route.query.from   || '')
const to        = computed(() => route.query.to     || '')
const type      = computed(() => route.query.type   || 'client')
const langQ     = computed(() => route.query.lang   || 'es')

const project    = ref(null)
const orgName    = ref('Mi Productora')
const orgLogo    = ref('')
const dateFormat = ref('DD/MM/AA')
const loading    = ref(true)
const loadError  = ref(false)

onMounted(async () => {
  const authStore     = useAuthStore()
  const settingsStore = useSettingsStore()

  authStore.init()
  dateFormat.value = authStore.user?.schedulePrefs?.dateFormat || 'DD/MM/AA'

  if (!authStore.isLoggedIn) {
    loadError.value = true
    loading.value   = false
    return
  }

  try {
    const [proj] = await Promise.all([
      useApi().get(`/projects/${projectId.value}`),
      settingsStore.fetchOrg(),
    ])
    project.value = proj
    orgName.value = settingsStore.studioName || authStore.organization?.name || 'Mi Productora'
    orgLogo.value = settingsStore.logo || ''
  } catch (e) {
    console.warn('print-daily: failed to load', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
})

const isEN       = computed(() => langQ.value === 'en')
const isInternal = computed(() => type.value === 'internal')

const primaryTz    = computed(() => (project.value?.dailyConfig?.timezones || []).find(t => t.primary) || null)
const secondaryTzs = computed(() => (project.value?.dailyConfig?.timezones || []).filter(t => !t.primary))

// ── Org wordmark (last word italic) ──────────────────────────────────────────
const orgWordmark = computed(() => {
  const parts = orgName.value.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  const last = parts.pop()
  return parts.join(' ') + ' <em>' + last + '</em>'
})

// ── Project info fields ───────────────────────────────────────────────────────
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

// ── Date formatting ───────────────────────────────────────────────────────────
function fmtDateStr(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  const dd = d.padStart(2, '0')
  const mm = m.padStart(2, '0')
  const yy = y.slice(2)
  return dateFormat.value === 'MM/DD/AA' ? `${mm}/${dd}/${yy}` : `${dd}/${mm}/${yy}`
}

const todayDate = new Date()
function fmtDateObj(d) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(2)
  return dateFormat.value === 'MM/DD/AA' ? `${mm}/${dd}/${yy}` : `${dd}/${mm}/${yy}`
}
const todayStr = computed(() => fmtDateObj(todayDate))

const rangeLabel = computed(() => {
  if (!from.value && !to.value) return ''
  if (from.value && to.value) return `${fmtDateStr(from.value)} — ${fmtDateStr(to.value)}`
  if (from.value) return `${isEN.value ? 'From' : 'Desde'} ${fmtDateStr(from.value)}`
  return `${isEN.value ? 'To' : 'Hasta'} ${fmtDateStr(to.value)}`
})

const printTypeLabel = computed(() =>
  isInternal.value
    ? (isEN.value ? 'Internal' : 'Interno')
    : (isEN.value ? 'Client-facing' : 'Para cliente')
)

function formatDow(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return (isEN.value ? DOW_EN : DOW_ES)[d.getDay()]
}

function formatDateFull(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  if (isEN.value) return `${DOW_EN[d.getDay()]}, ${MONTH_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  return `${DOW_ES[d.getDay()]}, ${d.getDate()} de ${MONTH_ES[d.getMonth()]} de ${d.getFullYear()}`
}

// ── Time helpers ──────────────────────────────────────────────────────────────
function fmt12h(timeHHMM) {
  if (!timeHHMM) return ''
  const [h, m] = timeHHMM.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12    = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function convertTimezone(dateStr, timeHHMM, fromTz, toTz) {
  if (!dateStr || !timeHHMM || !fromTz || !toTz || fromTz === toTz) return timeHHMM
  try {
    const [y, mo, d] = dateStr.split('-').map(Number)
    const [h, mi]    = timeHHMM.split(':').map(Number)
    const naiveUTC   = new Date(Date.UTC(y, mo - 1, d, h, mi, 0))
    const shown      = new Intl.DateTimeFormat('en-US', {
      timeZone: fromTz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(naiveUTC)
    const [sh, sm] = shown.split(':').map(Number)
    const diffMin  = (h * 60 + mi) - (sh * 60 + sm)
    const realUTC  = new Date(naiveUTC.getTime() + diffMin * 60000)
    return new Intl.DateTimeFormat('en-US', {
      timeZone: toTz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(realUTC)
  } catch { return null }
}

function groupSecondaryTimes(item) {
  if (!primaryTz.value?.tz || !item.specificTime || !item.date) return []
  const groups = {}
  for (const tz of secondaryTzs.value) {
    const converted = convertTimezone(item.date, item.specificTime, primaryTz.value.tz, tz.tz)
    if (!converted) continue
    const time = fmt12h(converted)
    const city = tz.city || tz.shortLabel || tz.tz || ''
    if (!groups[time]) groups[time] = []
    groups[time].push(city)
  }
  return Object.entries(groups).map(([time, cities]) => `${time} ${cities.join(', ')}`)
}

// ── Sort items ────────────────────────────────────────────────────────────────
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

// ── Filtered & grouped items ──────────────────────────────────────────────────
const filteredGroups = computed(() => {
  if (!project.value) return []

  const items = (project.value.dailySchedule || []).filter(item => {
    if (!item.date) return false
    if (from.value && item.date < from.value) return false
    if (to.value   && item.date > to.value)   return false
    if (!isInternal.value && item.internalOnly) return false
    return true
  })

  const groups = {}
  items.forEach(item => {
    if (!groups[item.date]) groups[item.date] = []
    groups[item.date].push(item)
  })

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayItems]) => ({
      date,
      dowLabel:  formatDow(date),
      dateLabel: formatDateFull(date),
      items:     sortItems(dayItems),
    }))
})

// ── Related event lookup ──────────────────────────────────────────────────────
function relatedEventName(item) {
  if (!item.relatedCalendarEventId || !project.value) return null
  const ev = (project.value.events || []).find(e => e.id === item.relatedCalendarEventId)
  if (!ev) return null
  return isEN.value ? (ev.nameEN || ev.name) : ev.name
}

// ── Print ─────────────────────────────────────────────────────────────────────
function doPrint() {
  window.print()
}
</script>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --ink:       #111111;
  --ink-2:     #2b2b2b;
  --muted:     #6b6b6b;
  --muted-2:   #9a9a9a;
  --line:      #d9d9d9;
  --line-soft: #ececec;
  --paper:     #ffffff;
  --navy:      #1a2744;
  --bglow:     #f5f6fa;
  --accent:    #2A4F9E;
}

html, body {
  background: #e7e5e0;
  font-family: 'Inter', -apple-system, sans-serif;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}

/* ── Preview shell ─────────────────────────────────────────────── */
.preview-shell {
  padding: 40px 24px 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

/* ── Screen-only top bar ───────────────────────────────────────── */
.preview-top {
  width: 100%;
  max-width: 794px;
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

.preview-empty { font-size: 14px; color: var(--muted); padding: 60px; }
.doc-empty     { font-size: 13px; color: var(--muted); padding: 40px 0; text-align: center; }

/* ── Document (A4 portrait card) ───────────────────────────────── */
.doc {
  width: 794px;
  background: var(--paper);
  box-shadow:
    0 1px 1px rgba(0,0,0,.04),
    0 20px 40px -10px rgba(0,0,0,.12),
    0 40px 80px -20px rgba(0,0,0,.08);
  padding: 28px 36px 28px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Doc header ────────────────────────────────────────────────── */
.doc-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--ink);
  margin-bottom: 10px;
}
.wordmark { display: flex; align-items: center; gap: 10px; }
.org-logo {
  height: 28px; width: auto; max-width: 110px; object-fit: contain; flex-shrink: 0;
}
.logo {
  font-family: 'Fraunces', serif;
  font-weight: 500; font-size: 20px;
  letter-spacing: -0.02em; line-height: 1;
}
.logo em { font-style: italic; font-weight: 400; }
.wordmark-divider { width: 1px; height: 14px; background: var(--line); align-self: center; }
.product {
  font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--muted); font-weight: 500;
}
.doc-meta {
  display: flex; align-items: baseline; gap: 16px;
  font-size: 10px; letter-spacing: 0.06em;
  color: var(--muted);
}
.doc-label { color: var(--muted-2); text-transform: uppercase; letter-spacing: 0.08em; font-size: 9px; }
.doc-title {
  color: var(--ink); font-weight: 600; font-size: 11px;
  letter-spacing: -0.005em; text-transform: none;
}
.doc-range {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; letter-spacing: 0.02em; color: var(--muted);
}
.doc-internal-badge {
  background: #1a1a1a; color: #fff;
  font-size: 8px; font-weight: 700; letter-spacing: 0.12em;
  padding: 2px 6px; border-radius: 3px;
}

/* ── Info bar ──────────────────────────────────────────────────── */
.info-bar {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--bglow);
  border-radius: 5px;
  padding: 7px 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  row-gap: 4px;
}
.info-swatch {
  width: 10px; height: 10px; border-radius: 2px;
  flex-shrink: 0; margin-right: 12px;
}
.info-field {
  display: flex; align-items: baseline; gap: 4px;
  padding-right: 12px;
  white-space: nowrap;
}
.info-field + .info-field {
  border-left: 1px solid var(--line);
  padding-left: 12px;
}
.info-k {
  font-size: 7.5px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--muted-2); font-weight: 500;
}
.info-v { font-size: 10px; color: var(--ink); font-weight: 600; letter-spacing: -0.005em; }

/* ── Timezone note ─────────────────────────────────────────────── */
.tz-note {
  font-size: 9.5px; color: var(--muted); margin-bottom: 16px;
  font-style: italic;
  display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
}
.tz-note-label { font-style: normal; }
.tz-note strong { color: var(--ink); font-style: normal; }
.tz-note-iana {
  font-size: 8px;
  color: var(--muted-2);
  font-style: normal;
  font-family: 'JetBrains Mono', monospace;
}
.tz-note-sep { color: var(--muted-2); }
.tz-note-sec { font-style: normal; }

/* ── Date section ──────────────────────────────────────────────── */
.date-section {
  margin-bottom: 20px;
  page-break-inside: avoid;
  break-inside: avoid;
}

.date-hdr {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 6px 0 7px;
  border-bottom: 1px solid var(--ink);
  margin-bottom: 2px;
}
.date-dow {
  font-family: 'Fraunces', serif;
  font-size: 22px;
  font-weight: 400;
  font-style: italic;
  color: var(--muted);
  letter-spacing: -0.025em;
  line-height: 1;
  white-space: nowrap;
  text-transform: none;
}
.date-label {
  font-family: 'Fraunces', serif;
  font-size: 22px;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.025em;
  line-height: 1;
}

/* ── Item row ──────────────────────────────────────────────────── */
.item-row {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 8px 0;
  border-bottom: 0.5px solid var(--line-soft);
  position: relative;
}
.item-row:last-child { border-bottom: none; }
.item-row.item-internal { background: #fffbf0; border-radius: 4px; padding: 8px 8px; }

.item-int-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 7.5px; font-weight: 700; letter-spacing: 0.1em;
  color: #c04040; border: 1px solid #c04040;
  padding: 1.5px 5px; border-radius: 2px;
}

/* Time column */
.item-time {
  width: 110px;
  flex-shrink: 0;
  padding-right: 16px;
  padding-top: 1px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.time-primary {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.time-secondary {
  font-size: 10px;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: -0.01em;
  line-height: 1.3;
}
.time-duration {
  font-size: 9.5px;
  color: var(--muted-2);
  letter-spacing: 0.02em;
  margin-top: 1px;
}
.time-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.time-none {
  font-size: 13px;
  color: var(--line);
}

/* Content column */
.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -0.01em;
  line-height: 1.3;
}
.item-meta-row {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 10.5px;
  color: var(--muted);
  line-height: 1.4;
}
.meta-icon { flex-shrink: 0; font-size: 10px; margin-top: 1px; }
.item-address { color: var(--muted-2); }
.item-notes {
  font-size: 10.5px;
  color: var(--ink-2);
  line-height: 1.5;
  padding: 4px 8px;
  background: var(--bglow);
  border-left: 2px solid var(--line);
  border-radius: 0 3px 3px 0;
  margin-top: 2px;
}
.item-dept {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.item-related {
  font-size: 10px;
  color: var(--accent);
}
.related-k {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 8.5px;
  letter-spacing: 0.08em;
  margin-right: 2px;
}

/* ── Doc footer ────────────────────────────────────────────────── */
.doc-foot {
  margin-top: 20px;
  padding-top: 8px;
  border-top: 1px solid var(--ink);
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 8px;
  letter-spacing: 0.06em;
  color: var(--muted);
  position: relative;
}
.foot-left {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 8.5px;
  letter-spacing: 0;
  color: var(--ink);
  font-weight: 400;
}
.foot-url {
  font-family: 'JetBrains Mono', monospace;
  font-style: normal;
  color: var(--muted);
  font-size: 7.5px;
  letter-spacing: 0.02em;
}
.foot-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  text-transform: uppercase;
  font-size: 7px;
  letter-spacing: 0.15em;
}
.foot-date {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 0.02em;
  color: var(--ink);
}

/* ── Print ─────────────────────────────────────────────────────── */
@page {
  size: A4 portrait;
  margin: 18mm 22mm;
}

@media print {
  html, body { background: #fff; }

  .preview-shell {
    padding: 0;
    background: #fff;
    display: block;
  }

  .screen-only { display: none !important; }

  .doc {
    width: 100%;
    box-shadow: none;
    padding: 0;
  }

  .doc-head {
    position: running(header);
  }

  .date-section {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .item-row {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
</style>
