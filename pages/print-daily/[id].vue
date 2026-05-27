<template>
  <div class="preview-shell">

    <!-- ── Screen-only top bar ──────────────────────────────────────── -->
    <div class="preview-top screen-only">
      <div class="preview-brand">unabase <em>Calendar</em></div>
      <div class="preview-meta">
        {{ printTypeLabel }} · A4 portrait · 210 × 297 mm
      </div>
      <button class="preview-print-btn" :class="{ loading: downloading }" :disabled="downloading" @click="doPrint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {{ downloading ? (isEN ? 'Generating…' : 'Generando…') : (isEN ? 'Download PDF' : 'Descargar PDF') }}
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
    <div v-else-if="project" ref="docRef" class="doc">

      <!-- Page header (repeats on every print page via @page-margin or just flows) -->
      <div class="doc-head">
        <div class="wordmark">
          <img v-if="orgLogo" :src="orgLogo" class="org-logo" alt="logo" />
          <div class="logo">{{ orgWordmark.first }}<em v-if="orgWordmark.last"> {{ orgWordmark.last }}</em></div>
          <div class="wordmark-divider"></div>
          <div class="product">{{ isEN ? 'Daily Schedule' : 'Daily Schedule' }}</div>
        </div>
        <div class="doc-meta">
          <div>
            <span class="doc-label">{{ isEN ? 'Project' : 'Proyecto' }}</span>&nbsp;
            <span class="doc-title">{{ project.name || project.client }}</span>
          </div>
          <div v-if="lastUpdatedStr" class="doc-last-updated">
            <span class="doc-label">{{ isEN ? 'Last updated' : 'Última actualización' }}</span>
            &nbsp;<span class="doc-date">{{ lastUpdatedStr }}</span>
          </div>
          <div v-if="isInternal" class="doc-internal-badge">INTERNAL</div>
        </div>
      </div>

      <!-- Project info bar -->
      <div v-if="infoFields.length" class="info-bar">
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
        <template v-if="secondaryTzs.length">
          <span v-if="isEN">All times shown in <strong>{{ primaryTz.city || primaryTz.shortLabel || primaryTz.tz }}</strong> time. {{ secondaryTzLabel }} included for reference.</span>
          <span v-else>Todos los horarios están en hora de <strong>{{ primaryTz.city || primaryTz.shortLabel || primaryTz.tz }}</strong>. {{ secondaryTzLabel }} se muestran como referencia.</span>
        </template>
        <template v-else>
          <span v-if="isEN">All times shown in <strong>{{ primaryTz.city || primaryTz.shortLabel || primaryTz.tz }}</strong> time.</span>
          <span v-else>Todos los horarios están en hora de <strong>{{ primaryTz.city || primaryTz.shortLabel || primaryTz.tz }}</strong>.</span>
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
          <span v-if="group.yearLabel" class="date-year">{{ group.yearLabel }}</span>
          <div v-if="primaryCity && weatherForDate(group.date)" class="date-weather">
            <span class="dw-emoji">{{ weatherStore.emoji(weatherForDate(group.date).weatherCode) }}</span>
            <span class="dw-city">{{ primaryCity.name }}</span>
            <span class="dw-temps">
              {{ weatherStore.formatTemp(weatherForDate(group.date).tempMax, tempUnit) }}
              <span class="dw-sep">/</span>
              {{ weatherStore.formatTemp(weatherForDate(group.date).tempMin, tempUnit) }}
            </span>
          </div>
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
            <div class="item-title-row">
              <div class="item-title">
                {{ item.title }}<span v-if="item.duration" class="item-title-dur"> ({{ fmtDuration(item.duration) }})</span>
              </div>
              <div v-if="item.department && deptLabel(item.department)" class="item-dept">{{ deptLabel(item.department) }}</div>
            </div>

            <div v-if="item.locationName" class="item-meta-row">
              <span class="meta-icon">📍</span>
              <span>
                {{ item.locationName }}
                <template v-if="item.locationAddress">
                  · <a v-if="item.locationGoogleMapsUrl" :href="item.locationGoogleMapsUrl" target="_blank" rel="noopener" class="item-address-link">{{ item.locationAddress }}</a>
                  <span v-else class="item-address">{{ item.locationAddress }}</span>
                </template>
              </span>
            </div>

            <div v-if="item.participants" class="item-meta-row">
              <span class="meta-label">Contact:</span>
              <span>{{ item.participants }}</span>
            </div>

            <div v-if="item.notes" class="item-notes">{{ item.notes }}</div>
          </div>
        </div>
      </div>

      <!-- Empty state (screen only) -->
      <div v-if="!filteredGroups.length" class="doc-empty screen-only">
        {{ isEN ? 'No items in the selected date range.' : 'No hay items en el rango de fechas seleccionado.' }}
      </div>

      <!-- Document footer -->
      <div class="doc-foot">
        <div class="foot-left">Calendar by <span class="foot-url">unabase.com</span></div>
        <div class="foot-center">Confidential · For production use only</div>
        <div class="foot-date">{{ printedVersionStr }}</div>
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
      settingsStore.fetchOrg().catch(e => console.warn('print-daily: fetchOrg failed', e)),
    ])
    project.value = proj
    orgName.value = settingsStore.studioName || authStore.organization?.name || 'Mi Productora'
    orgLogo.value = settingsStore.logo || ''
    if (proj?.cities?.[0]) {
      const firstDate = (proj.dailySchedule || []).map(i => i.date).filter(Boolean).sort()[0]
      if (firstDate) {
        try { weatherStore.fetchWeather(proj, 0, firstDate) } catch (e) { console.warn('print-daily: fetchWeather failed', e) }
      }
    }
  } catch (e) {
    console.warn('print-daily: failed to load project', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
})

const isEN       = computed(() => langQ.value === 'en')
const isInternal = computed(() => type.value === 'internal')

const weatherStore = useWeatherStore()
const primaryCity  = computed(() => project.value?.cities?.[0] || null)
const tempUnit     = computed(() => useAuthStore().user?.schedulePrefs?.tempUnit || 'C')

function weatherForDate(date) {
  if (!project.value || !primaryCity.value) return null
  const cached = weatherStore.getWeather(project.value.id, 0)
  if (!cached?.forecast15) return null
  return cached.forecast15.find(d => d.date === date) || null
}

const primaryTz    = computed(() => (project.value?.dailyConfig?.timezones || []).find(t => t.primary) || null)
const secondaryTzs = computed(() => (project.value?.dailyConfig?.timezones || []).filter(t => !t.primary))

const secondaryTzLabel = computed(() => {
  const names = secondaryTzs.value.map(tz => tz.city || tz.shortLabel || tz.tz)
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  const conj = isEN.value ? 'and' : 'y'
  return names.slice(0, -1).join(', ') + ` ${conj} ` + names[names.length - 1]
})

// ── Org wordmark (last word italic) ──────────────────────────────────────────
const orgWordmark = computed(() => {
  const parts = orgName.value.trim().split(/\s+/)
  if (parts.length <= 1) return { first: parts[0] || '', last: '' }
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] }
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
    { k: isEN.value ? 'Exec Producer'   : 'Prod. Ejecutivo',  v: p.ep             || '' },
    { k: isEN.value ? 'Agency Producer' : 'Prod. de Agencia', v: p.agencyProducer || '' },
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

const printedVersionStr = computed(() => {
  const d = todayDate
  const dateStr = fmtDateObj(d)
  const h = d.getHours()
  const min = String(d.getMinutes()).padStart(2, '0')
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  const timeStr = `${h12}:${min} ${period}`
  return `${isEN.value ? 'Printed' : 'Impreso'} · ${dateStr} · ${timeStr}`
})

const lastUpdatedStr = computed(() => {
  const iso = project.value?.updatedAt
  if (!iso) return ''
  try {
    return fmtDateStr(iso.split('T')[0])
  } catch { return '' }
})

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

function formatDateNoYear(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  if (isEN.value) return `${MONTH_EN[d.getMonth()]} ${d.getDate()}`
  return `${d.getDate()} de ${MONTH_ES[d.getMonth()]}`
}

function getYear(dateStr) {
  return new Date(dateStr + 'T12:00:00').getFullYear()
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

  const sorted = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  return sorted.map(([date, dayItems], idx) => {
    const prevYear = idx > 0 ? getYear(sorted[idx - 1][0]) : null
    const thisYear = getYear(date)
    return {
      date,
      dowLabel:  formatDow(date),
      dateLabel: formatDateNoYear(date),
      yearLabel: (idx === 0 || thisYear !== prevYear) ? String(thisYear) : '',
      items:     sortItems(dayItems),
    }
  })
})

// ── Department label lookup (department stores group id, not display name) ────
function deptLabel(val) {
  if (!val || !project.value) return ''
  const grp = (project.value.groups || []).find(g => g.id === val || g.name === val || g.key === val)
  if (grp) return (isEN.value ? (grp.nameEN || grp.name) : grp.name) || grp.name || ''
  return val.replace(/^G-/i, '')
}

// ── Related event lookup ──────────────────────────────────────────────────────
function relatedEventName(item) {
  if (!item.relatedCalendarEventId || !project.value) return null
  const ev = (project.value.events || []).find(e => e.id === item.relatedCalendarEventId)
  if (!ev) return null
  return (isEN.value ? (ev.nameEN || ev.name) : ev.name) || (isEN.value ? '(No title)' : '(Sin título)')
}

// ── Duration label ────────────────────────────────────────────────────────────
function fmtDuration(d) {
  if (!d) return ''
  const n = parseFloat(d)
  if (!isNaN(n) && String(d).trim() === String(n)) {
    return n === 1 ? `${n} hr` : `${n} hrs`
  }
  return d
}

// ── Print ─────────────────────────────────────────────────────────────────────
const downloading = ref(false)
const docRef      = ref(null)

async function doPrint() {
  if (downloading.value || !project.value) return

  downloading.value = true

  try {
    await nextTick()
    await document.fonts.ready

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    const docEl   = docRef.value
    const docRect = docEl.getBoundingClientRect()

    // Measure date-hdr positions and capture text content before html2canvas clones the DOM
    const dateHdrPositions = Array.from(docEl.querySelectorAll('.date-hdr')).map(el => {
      const r = el.getBoundingClientRect()
      return {
        topPx:    Math.round((r.top - docRect.top) * 3),
        heightPx: Math.round(r.height * 3),
        dow:   el.querySelector('.date-dow')?.textContent?.trim()   || '',
        label: el.querySelector('.date-label')?.textContent?.trim() || '',
        year:  el.querySelector('.date-year')?.textContent?.trim()  || '',
      }
    })

    const canvas = await html2canvas(docEl, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: true,
      foreignObjectRendering: false,
      imageTimeout: 0,
      onclone(clonedDoc) {
        clonedDoc.querySelectorAll('img').forEach(img => {
          img.style.filter = 'none'
          img.style.mixBlendMode = 'normal'
        })
        const d = clonedDoc.querySelector('.doc')
        if (d) { d.style.boxShadow = 'none'; d.style.width = '794px' }
        // Hide the HTML footer — we draw it per-page below
        const foot = clonedDoc.querySelector('.doc-foot')
        if (foot) foot.style.display = 'none'
      },
    })

    const pageW       = 210
    const pageH       = 297
    const pageCanvH   = Math.round(canvas.width * pageH / pageW)
    const sc          = canvas.width / 794
    const topMarginPx = Math.round(canvas.width * 8 / pageW)
    const footerPx    = Math.round(canvas.width * 14 / pageW)
    const hdrGapPx    = Math.round(10 * sc)
    // Suppress header repetition only when a new section starts within ~25px CSS of the page top
    // (covers the ~10px inter-section margin between sections)
    const hdrThresh   = Math.round(25 * sc)

    // Scan the rendered canvas for horizontal white bands = inter-item gaps.
    // This eliminates DOM-vs-canvas coordinate mismatch (sub-pixel font accumulation
    // at scale:3 shifts items by up to 1px each, compounding over many items).
    // Inter-item gap (padding top+bottom + border) ≈ 38 canvas px.
    // Intra-item max gap (flex gap + notes margin) ≈ 26 canvas px.
    // MIN_BAND = 32 sits reliably between them.
    const cutCandidates = (() => {
      const { width, height } = canvas
      const imgData = canvas.getContext('2d').getImageData(0, 0, width, height).data
      const MIN_BAND = 32
      const THRESH   = 230          // includes --line-soft #ececec (R=236), blocks text AA
      const xStep    = Math.round(50 * sc)
      const xStart   = Math.round(36 * sc)   // skip doc left padding
      const xEnd     = width - xStart
      const out      = []
      let bandStart  = -1
      for (let y = 0; y < height; y++) {
        let white = true
        for (let x = xStart; x < xEnd; x += xStep) {
          const i = (y * width + x) * 4
          if (imgData[i] < THRESH || imgData[i + 1] < THRESH || imgData[i + 2] < THRESH) {
            white = false; break
          }
        }
        if (white) {
          if (bandStart < 0) bandStart = y
        } else if (bandStart >= 0) {
          const bh = y - bandStart
          if (bh >= MIN_BAND) out.push(bandStart + Math.round(bh / 2))
          bandStart = -1
        }
      }
      if (bandStart >= 0 && (height - bandStart) >= MIN_BAND)
        out.push(bandStart + Math.round((height - bandStart) / 2))
      return out
    })()


    // DOM-based cut: find the last item-row bottom ≤ idealPx.
    function bestCutRow(idealPx) {
      let lo = 0, hi = cutCandidates.length - 1, best = idealPx
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (cutCandidates[mid] <= idealPx) { best = cutCandidates[mid]; lo = mid + 1 }
        else hi = mid - 1
      }
      return best
    }

    // Returns the date header to repeat at the top of a continuation page.
    // Returns null if a new section starts naturally near the top of the page.
    function activeHdrFor(start) {
      const prev = dateHdrPositions.filter(h => h.topPx < start)
      if (!prev.length) return null
      // Only suppress if a date-hdr starts literally at the page boundary (within 5px CSS)
      const atPageStart = dateHdrPositions.find(h => h.topPx >= start && h.topPx < start + hdrThresh)
      if (atPageStart) return null
      return prev[prev.length - 1]
    }

    // Pass 1 — compute cuts, accounting for repeated date headers
    const cuts = []
    let scanStart = 0
    let pageIdx   = 0
    while (scanStart < canvas.height) {
      const isFirst = pageIdx === 0
      const actHdr  = isFirst ? null : activeHdrFor(scanStart)
      const offsetY = isFirst ? 0 : topMarginPx + (actHdr ? actHdr.heightPx + hdrGapPx : 0)
      const availH  = pageCanvH - offsetY - footerPx

      let cutPx = scanStart + availH
      if (cutPx < canvas.height) {
        cutPx = bestCutRow(cutPx)
        if (cutPx <= scanStart) cutPx = scanStart + availH
      }
      const end = Math.min(cutPx, canvas.height)
      cuts.push({ start: scanStart, end, actHdr, offsetY })
      scanStart = end
      pageIdx++
    }

    const totalPages = cuts.length
    const pad2 = n => String(n).padStart(2, '0')

    function drawRepeatedHdr(ctx, hdr) {
      const padX = Math.round(36 * sc)
      const y    = topMarginPx

      // Border line at bottom of header box
      const lineY = y + hdr.heightPx - Math.round(sc)
      ctx.strokeStyle = '#111111'
      ctx.lineWidth   = Math.ceil(sc)
      ctx.beginPath()
      ctx.moveTo(padX, lineY)
      ctx.lineTo(canvas.width - padX, lineY)
      ctx.stroke()

      // Text baseline: ~6px padding-top + ~18px to alphabetic baseline for 22px Fraunces
      const textY = y + Math.round(24 * sc)
      const gap   = Math.round(10 * sc)

      ctx.textBaseline = 'alphabetic'
      ctx.textAlign    = 'left'

      ctx.font      = `italic 400 ${Math.round(22 * sc)}px Fraunces, serif`
      ctx.fillStyle = '#6b6b6b'
      ctx.fillText(hdr.dow, padX, textY)
      const dowW = ctx.measureText(hdr.dow).width

      ctx.font      = `500 ${Math.round(22 * sc)}px Fraunces, serif`
      ctx.fillStyle = '#111111'
      ctx.fillText(hdr.label, padX + dowW + gap, textY)
      const labelW = ctx.measureText(hdr.label).width

      if (hdr.year) {
        ctx.font      = `italic 300 ${Math.round(15 * sc)}px Fraunces, serif`
        ctx.fillStyle = '#9a9a9a'
        ctx.fillText(hdr.year, padX + dowW + gap + labelW + Math.round(4 * sc), textY)
      }
    }

    function drawFooter(ctx, pageIdx) {
      const padX     = Math.round(36 * sc)
      const lineY    = pageCanvH - footerPx + Math.round(8 * sc)
      const textY    = lineY + Math.round(16 * sc)

      ctx.strokeStyle = '#111111'
      ctx.lineWidth   = Math.ceil(sc)
      ctx.beginPath()
      ctx.moveTo(padX, lineY)
      ctx.lineTo(canvas.width - padX, lineY)
      ctx.stroke()

      ctx.textBaseline = 'middle'

      // Left: "Calendar by unabase.com"
      ctx.textAlign = 'left'
      ctx.font      = `italic ${Math.round(8.5 * sc)}px Fraunces, serif`
      ctx.fillStyle = '#111111'
      ctx.fillText('Calendar by ', padX, textY)
      const leftW = ctx.measureText('Calendar by ').width
      ctx.font      = `${Math.round(7.5 * sc)}px 'JetBrains Mono', monospace`
      ctx.fillStyle = '#6b6b6b'
      ctx.fillText('unabase.com', padX + leftW, textY)

      // Center: confidential note
      ctx.textAlign = 'center'
      ctx.font      = `${Math.round(7 * sc)}px Inter, sans-serif`
      ctx.fillStyle = '#6b6b6b'
      ctx.fillText('CONFIDENTIAL · FOR PRODUCTION USE ONLY', canvas.width / 2, textY)

      // Right: page number
      ctx.textAlign = 'right'
      ctx.font      = `${Math.round(7.5 * sc)}px 'JetBrains Mono', monospace`
      ctx.fillStyle = '#6b6b6b'
      ctx.fillText(`${pad2(pageIdx + 1)} / ${pad2(totalPages)}`, canvas.width - padX, textY)
    }

    // Pass 2 — render pages with footer and repeated date headers
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    for (let pi = 0; pi < cuts.length; pi++) {
      if (pi > 0) pdf.addPage()

      const { start: pageStartPx, end: cutPx, actHdr, offsetY } = cuts[pi]
      const sliceH = cutPx - pageStartPx

      const slice = document.createElement('canvas')
      slice.width  = canvas.width
      slice.height = pageCanvH
      const ctx = slice.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, slice.width, slice.height)

      // Repeat date header when the page continues mid-section (draw text directly)
      if (actHdr) drawRepeatedHdr(ctx, actHdr)

      // Page content
      ctx.drawImage(canvas, 0, pageStartPx, canvas.width, sliceH, 0, offsetY, canvas.width, sliceH)

      drawFooter(ctx, pi)

      pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, pageW, pageH, '', 'FAST')
    }

    const base    = (project.value.client || project.value.name || 'daily').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const now     = new Date()
    const dateStr = fmtDateObj(now).replace(/\//g, '-')
    const h12     = now.getHours() % 12 || 12
    const min     = String(now.getMinutes()).padStart(2, '0')
    const period  = now.getHours() >= 12 ? 'PM' : 'AM'
    const timeStr = `${h12}-${min}-${period}`
    pdf.save(`${base}_daily-schedule_${dateStr}_${timeStr}.pdf`)

  } catch (err) {
    console.error('PDF generation failed:', err)
    useDialog().alert({
      title: isEN.value ? 'PDF generation failed' : 'Error al generar el PDF',
      body:  isEN.value ? 'Please try again.'      : 'Intentá de nuevo.',
    })
  } finally {
    downloading.value = false
  }
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
  height: auto !important;
  overflow: visible !important;
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
  min-width: fit-content;
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
  display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
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
.doc-last-updated {
  display: flex; align-items: baseline; gap: 0;
  white-space: nowrap;
}
.doc-date {
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.02em; text-transform: none;
}
.doc-internal-badge {
  background: #1a1a1a; color: #fff;
  font-size: 8px; font-weight: 700; letter-spacing: 0.12em;
  padding: 2px 6px; border-radius: 3px;
}

/* ── Info bar ──────────────────────────────────────────────────── */
.info-bar {
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 8px 0 12px;
  margin-bottom: 12px;
  border-bottom: 0.5px solid var(--line);
}
.info-swatch {
  width: 10px; height: 10px; border-radius: 2px;
  flex-shrink: 0; margin-right: 12px;
}
.info-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-right: 16px;
  white-space: nowrap;
  flex-shrink: 0;
}
.info-field + .info-field {
  border-left: 1px solid var(--line);
  padding-left: 16px;
}
.info-k {
  font-size: 7.5px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--muted-2); font-weight: 500;
}
.info-v { font-size: 10.5px; color: var(--ink); font-weight: 500; letter-spacing: -0.005em; }

/* ── Timezone note ─────────────────────────────────────────────── */
.tz-note {
  font-size: 9.5px; color: var(--muted); margin-bottom: 16px;
  font-style: italic;
  line-height: 1.5;
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
  margin-bottom: 10px;
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
.date-year {
  font-family: 'Fraunces', serif;
  font-size: 15px;
  font-weight: 300;
  font-style: italic;
  color: var(--muted-2);
  letter-spacing: -0.02em;
  line-height: 1;
  margin-left: 4px;
  align-self: flex-end;
  padding-bottom: 1px;
}
.date-weather {
  margin-left: auto;
  align-self: center;
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bglow);
  border-radius: 4px;
  padding: 3px 9px 3px 7px;
  font-size: 9.5px;
  color: var(--muted);
  white-space: nowrap;
  font-family: inherit;
}
.dw-emoji { font-size: 12px; line-height: 1; }
.dw-city  { font-size: 9.5px; font-weight: 600; color: var(--ink-2); letter-spacing: 0.01em; }
.dw-temps { color: var(--muted-2); font-size: 9.5px; }
.dw-sep   { color: var(--line); margin: 0 1px; }

/* ── Item row ──────────────────────────────────────────────────── */
.item-row {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 6px 0;
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
  gap: 2px;
}
.item-title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.item-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -0.01em;
  line-height: 1.3;
}
.item-title-dur {
  font-size: 10px;
  font-weight: 400;
  color: var(--muted);
  letter-spacing: 0;
}
.item-meta-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 10.5px;
  color: var(--muted);
  line-height: 1.5;
}
.meta-icon {
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1.5;
  margin-top: 1px;
}
.meta-label {
  flex-shrink: 0;
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-2);
  line-height: 1.5;
}
.item-address { color: var(--muted-2); }
.item-address-link { color: var(--accent); text-decoration: none; }
.item-address-link:hover { text-decoration: underline; }
.item-notes {
  font-size: 10.5px;
  color: var(--muted);
  line-height: 1.5;
}
.item-dept {
  display: inline-flex;
  flex-shrink: 0;
  margin-left: auto;
  font-size: 7.5px;
  font-weight: 600;
  color: var(--muted-2);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 0.5px solid var(--line);
  padding: 2px 6px;
  border-radius: 3px;
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
  font-size: 7.5px;
  letter-spacing: 0.02em;
  color: var(--muted);
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
