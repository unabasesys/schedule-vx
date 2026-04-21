<template>
  <div class="cal-wrap">
    <!-- Navigation -->
    <div class="cal-nav">
      <div style="display:flex;align-items:center;gap:6px;z-index:1;"></div>
      <div class="cal-month-title" style="position:absolute;left:0;right:0;text-align:center;pointer-events:none;">
        {{ calTitle }}
      </div>
      <div style="margin-left:auto;font-size:.68rem;color:var(--muted);display:flex;align-items:center;gap:6px;z-index:1;">
        <select
          class="settings-select"
          :value="weekStart"
          @change="globalStore.setWeekStart($event.target.value); projectsStore.save()"
          style="padding:3px 8px;font-size:.68rem;"
        >
          <option value="sun">{{ lang === 'en' ? 'Sunday' : 'Domingo' }}</option>
          <option value="mon">{{ lang === 'en' ? 'Monday' : 'Lunes' }}</option>
        </select>
        <span style="width:1px;height:14px;background:var(--border);display:inline-block;margin:0 2px;"></span>
        <select
          class="settings-select"
          :value="tempUnit"
          @change="globalStore.setTempUnit($event.target.value)"
          style="padding:3px 8px;font-size:.68rem;"
        >
          <option value="C">°C</option>
          <option value="F">°F</option>
        </select>
      </div>
    </div>

    <!-- Weather strip -->
    <WeatherStrip
      :project="project"
      :temp-unit="tempUnit"
      :lang="lang"
      :date-str="focusDate"
    />

    <!-- Calendar grid — one column per month, scrollable -->
    <div class="cal-scroll">
      <div class="cal-main-grid">
        <div
          v-for="m in visibleMonths"
          :key="`${m.year}-${m.month}`"
          :id="`cal-month-${m.year}-${m.month}`"
          class="cal-month-col"
        >
          <div class="cal-month-label">{{ monthTitle(m.year, m.month) }}</div>
          <CalendarMonth
            :year="m.year"
            :month="m.month"
            :events="coloredEvents"
            :week-start="weekStart"
            :lang="lang"
            :holidays="holidaysForYear(m.year)"
            :read-only="readOnly"
            @day-select="onDaySelect"
            @day-click="onDayClick"
            @event-click="onEventClick"
            @reorder-events="onReorderEvents"
            @reschedule-event="onRescheduleEvent"
          />
        </div>
      </div>
    </div>

    <!-- Unified event modal (create + edit) -->
    <div v-if="evModalOpen" class="modal-backdrop" @click.self="evModalOpen = false">
      <div class="modal narrow">
        <!-- Title row: title left, key-date star + internal lock right -->
        <div class="modal-title-row">
          <h2>{{ evModalMode === 'create' ? (lang === 'en' ? 'New Event' : 'Nuevo Evento') : (lang === 'en' ? 'Edit Event' : 'Editar Evento') }}</h2>
          <div style="display:flex;gap:6px;">
            <button class="key-date-star" :class="{ active: evModalKeyDate }" @click="evModalKeyDate = !evModalKeyDate" :title="lang === 'en' ? 'Key date' : 'Fecha clave'">
              ★
            </button>
            <button class="modal-internal-btn" :class="{ active: evModalInternal }" @click="evModalInternal = !evModalInternal" :title="lang === 'en' ? 'Internal only — hidden from PDFs and shared links' : 'Solo interno — no aparece en PDFs ni links compartidos'">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </button>
            <button
              v-if="evModalMode === 'edit'"
              class="modal-completed-btn"
              :class="{ active: evModalCompleted }"
              @click="evModalCompleted = !evModalCompleted"
              :title="lang === 'en' ? 'Mark as completed' : 'Marcar como completado'"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Name -->
        <div class="field">
          <label>{{ lang === 'en' ? 'Name' : 'Nombre' }}</label>
          <input ref="evModalNameRef" v-model="evModalName" type="text" @keydown.enter="confirmEvModal" />
        </div>

        <!-- Stage -->
        <div class="field field--spaced">
          <label>{{ lang === 'en' ? 'Stage' : 'Etapa' }}</label>
          <select v-model="evModalStage" class="settings-select" style="width:100%">
            <option v-for="s in project.stages?.filter(s => s.active !== false)" :key="s.key" :value="s.key">
              {{ lang === 'en' ? (s.nameEN || s.name) : s.name }}
            </option>
          </select>
        </div>

        <!-- Days + type toggle -->
        <div class="field field--spaced ev-days-row">
          <div class="ev-days-input">
            <label>{{ lang === 'en' ? 'Days' : 'Días' }}</label>
            <input v-model.number="evModalDays" type="number" min="1" class="ev-days-num" @input="onDaysChange" />
          </div>
          <div class="qa-daytype-toggle">
            <button :class="{ active: evModalDayType === 'calendar' }" @click="onDayTypeChange('calendar')">
              {{ lang === 'en' ? 'Calendar Days' : 'Días Corridos' }}
            </button>
            <button :class="{ active: evModalDayType === 'business' }" @click="onDayTypeChange('business')">
              {{ lang === 'en' ? 'Business Days' : 'Días Hábiles' }}
            </button>
          </div>
        </div>

        <!-- From / To -->
        <div class="field field--spaced" style="flex-direction:row;gap:10px;">
          <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
            <label>{{ lang === 'en' ? 'From' : 'Desde' }}</label>
            <input v-model="evModalFrom" type="date" @change="onFromChange" />
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
            <label>{{ lang === 'en' ? 'To' : 'Hasta' }}</label>
            <input v-model="evModalTo" type="date" @change="evModalToManual = true" />
          </div>
        </div>

        <!-- Status & dependency panel (edit mode only) -->
        <div v-if="evModalMode === 'edit' && evModalEvent && evModalEvent.dep?.eventId" class="field field--spaced ev-dep-panel">
          <label>{{ lang === 'en' ? 'Status & dependency' : 'Estado y dependencia' }}</label>

          <!-- Event-level status chips -->
          <div class="ev-dep-chips">
            <span v-if="!evModalEvent.active" class="ev-chip ev-chip-paused" :title="lang === 'en' ? 'This event is paused and won\'t appear in the calendar' : 'Evento pausado: no aparece en el calendario'">
              ⏸ {{ lang === 'en' ? 'Event paused' : 'Evento pausado' }}
            </span>
            <span v-else class="ev-chip ev-chip-active">
              ● {{ lang === 'en' ? 'Event active' : 'Evento activo' }}
            </span>
            <span v-if="evModalEvent.dep?.eventId && evModalEvent.dep?.active" class="ev-chip ev-chip-dep-on">
              {{ lang === 'en' ? 'Dependency active' : 'Dependencia activa' }}
            </span>
            <span v-else-if="evModalEvent.dep?.eventId" class="ev-chip ev-chip-dep-off">
              {{ lang === 'en' ? 'Dependency paused' : 'Dependencia pausada' }}
            </span>
            <span v-else class="ev-chip ev-chip-none">
              {{ lang === 'en' ? 'No dependency' : 'Sin dependencia' }}
            </span>
          </div>

          <!-- Readable sentence -->
          <p class="ev-dep-sentence">{{ evModalDepSentence }}</p>

          <!-- Dep actions: only meaningful if the event has a dependency set -->
          <div v-if="evModalEvent.dep?.eventId" class="ev-dep-actions">
            <button class="btn-ghost btn-small" @click="toggleEvModalDep">
              {{ evModalEvent.dep.active
                ? (lang === 'en' ? 'Pause dependency' : 'Pausar dependencia')
                : (lang === 'en' ? 'Resume dependency' : 'Reanudar dependencia') }}
            </button>
            <button class="btn-danger btn-small" @click="removeEvModalDep">
              {{ lang === 'en' ? 'Remove dependency' : 'Eliminar dependencia' }}
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions" :style="evModalMode === 'edit' ? 'justify-content:space-between' : ''">
          <button v-if="evModalMode === 'edit'" class="btn-danger" style="padding:6px 14px;font-size:.72rem" @click="deleteEvModal">
            {{ lang === 'en' ? 'Delete' : 'Eliminar' }}
          </button>
          <div style="display:flex;gap:8px;">
            <button class="btn-ghost" @click="evModalOpen = false">{{ lang === 'en' ? 'Cancel' : 'Cancelar' }}</button>
            <button class="btn-primary" @click="confirmEvModal">
              {{ evModalMode === 'create' ? (lang === 'en' ? 'Add Event' : 'Agregar') : (lang === 'en' ? 'Save' : 'Guardar') }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
const globalStore   = useGlobalStore()
const projectsStore = useProjectsStore()
const holidaysStore = useHolidaysStore()

const props = defineProps({
  project:   { type: Object,  required: true },           // selected project (weather, new events)
  projects:  { type: Array,   default: () => [] },        // all visible projects for combined view
  lang:      { type: String,  default: 'es' },
  calYear:   { type: Number,  required: true },
  calMonth:  { type: Number,  required: true },
  weekStart: { type: String,  default: 'sun' },
  tempUnit:  { type: String,  default: 'C' },
  readOnly:  { type: Boolean, default: false },
})

// Resolved list: if caller provides projects use it, otherwise fall back to selected project only
const allProjects = computed(() =>
  props.projects.length ? props.projects : [props.project]
)

// Track which project owns the event currently open in the modal (for multi-project saves)
const evModalProjId = ref('')

// Unified event modal state
const evModalOpen     = ref(false)
const evModalMode     = ref('create') // 'create' | 'edit'
const evModalId       = ref('')
const evModalName     = ref('')
const evModalStage    = ref('')
const evModalDays     = ref(1)
const evModalDayType  = ref('calendar')
const evModalKeyDate   = ref(false)
const evModalInternal  = ref(false)
const evModalCompleted = ref(false)
const evModalFrom     = ref('')
const evModalTo       = ref('')
const evModalToManual = ref(false)
const evModalNameRef  = ref(null)

// Live reference to the event being edited (reads from the store so toggles/removes
// on the dependency update the explanation without closing the modal).
const evModalEvent = computed(() => {
  if (evModalMode.value !== 'edit' || !evModalId.value) return null
  const proj = projectsStore.projects.find(p => p.id === (evModalProjId.value || props.project.id))
  return proj?.events.find(e => e.id === evModalId.value) || null
})

// Sentence describing the current dependency ("starts 5 business days after X ends", etc.)
const evModalDepSentence = computed(() => {
  const ev = evModalEvent.value
  if (!ev) return ''
  const proj = projectsStore.projects.find(p => p.id === (evModalProjId.value || props.project.id))
  const refEv = ev.dep?.eventId ? (proj?.events.find(e => e.id === ev.dep.eventId) || null) : null
  return describeDependency(ev, refEv, props.lang)
})

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Shared min/max date range across all active events in ALL visible projects.
// Returns null when there are no visible events (collapses to current month).
const eventDateRange = computed(() => {
  let minDate = null
  let maxDate = null
  allProjects.value.forEach(proj => {
    ;(proj.events || []).filter(e => e.active && e.date).forEach(ev => {
      const start = ev.date
      const end   = calcTo(ev.date, ev.duration || 1, ev.durDayType || 'calendar')
      if (!minDate || start < minDate) minDate = start
      if (!maxDate || end   > maxDate) maxDate = end
    })
  })
  if (!minDate) return null
  return { minDate, maxDate }
})

const calTitle = computed(() => {
  const months = props.lang === 'en' ? MONTHS_EN : MONTHS_ES
  const range  = eventDateRange.value
  const yy = (y) => String(y).slice(-2)
  if (!range) return `${months[props.calMonth]} ${yy(props.calYear)}`
  const [y1, m1] = range.minDate.split('-').map(Number)
  const [y2, m2] = range.maxDate.split('-').map(Number)

  // Day span: inclusive count from first event start to last event end
  const msPerDay  = 86400000
  const spanDays  = Math.round(
    (new Date(range.maxDate + 'T12:00:00') - new Date(range.minDate + 'T12:00:00')) / msPerDay
  ) + 1
  const dayLabel  = props.lang === 'en' ? 'days' : 'días'
  const spanSuffix = ` (${spanDays} ${dayLabel})`

  if (y1 === y2 && m1 === m2) return `${months[m1 - 1]} ${yy(y1)}${spanSuffix}`
  if (y1 === y2) return `${months[m1 - 1]} – ${months[m2 - 1]} ${yy(y1)}${spanSuffix}`
  return `${months[m1 - 1]} ${yy(y1)} – ${months[m2 - 1]} ${yy(y2)}${spanSuffix}`
})

// Every month from first event start to last event end
const visibleMonths = computed(() => {
  const range = eventDateRange.value
  if (!range) return [{ year: props.calYear, month: props.calMonth }]
  const [y1, m1] = range.minDate.split('-').map(Number)
  const [y2, m2] = range.maxDate.split('-').map(Number)
  const list = []
  let y = y1, m = m1
  while (y < y2 || (y === y2 && m <= m2)) {
    list.push({ year: y, month: m - 1 }) // month is 0-indexed for CalendarMonth
    m++
    if (m > 12) { m = 1; y++ }
  }
  return list
})

function monthTitle(y, m) {
  const months = props.lang === 'en' ? MONTHS_EN : MONTHS_ES
  return `${months[m]} ${String(y).slice(-2)}`
}

// Merge active events from all visible projects.
// Each event is tagged with _projId and _projColor for rendering and editing.
const coloredEvents = computed(() => {
  const merged = []
  allProjects.value.forEach(proj => {
    // Set of stage keys that are currently OFF or deactivated in this project.
    // Events belonging to these stages are hidden from the calendar immediately —
    // even if the event's own `active` flag is still true (defense in depth for
    // imports, templates or any state the OFF cascade hasn't reached).
    const hiddenStageKeys = new Set(
      (proj.stages || [])
        .filter(s => s.visible === false || s.active === false)
        .map(s => s.key)
    )
    ;(proj.events || [])
      .filter(e => e.active && e.date && !hiddenStageKeys.has(e.stage))
      .forEach(e => merged.push({
        ...e,
        _projId:    proj.id,
        _projColor: proj.color || '#06CCB4',
      }))
  })
  return merged
})

const focusDate = ref(new Date().toISOString().split('T')[0])

const todayLabel = computed(() => {
  const now = new Date()
  const d = String(now.getDate()).padStart(2, '0')
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const y = String(now.getFullYear()).slice(-2)
  const dateStr = props.lang === 'en' ? `${m}/${d}/${y}` : `${d}/${m}/${y}`
  return `${props.lang === 'en' ? 'Today' : 'Hoy'} ${dateStr}`
})

// Scroll the calendar to today's month (if it exists in the visible range)
function scrollToToday() {
  const now = new Date()
  const el  = document.getElementById(`cal-month-${now.getFullYear()}-${now.getMonth()}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Scroll to the initial landing month on calendar entry or project switch:
// — first event after today → land on first event's month
// — first event before today → land on today's month
function scrollToInitialMonth() {
  nextTick(() => {
    const today = new Date().toISOString().split('T')[0]
    const dates = allProjects.value
      .flatMap(proj => (proj.events || []).filter(e => e.active && e.date).map(e => e.date))
      .sort()
    const target = dates.length && dates[0] > today ? dates[0] : today
    const [y, m] = target.split('-').map(Number)
    const el = document.getElementById(`cal-month-${y}-${m - 1}`)
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' })
  })
}

onMounted(scrollToInitialMonth)
watch(() => props.project.id, scrollToInitialMonth)

// Pre-fetch holidays for all visible projects across all rendered years
watchEffect(() => {
  const years = [...new Set(visibleMonths.value.map(m => m.year))]
  allProjects.value.forEach(proj => {
    const codes = (proj.holidays || []).map(h => h.countryCode)
    codes.forEach(code => {
      years.forEach(y => holidaysStore.fetchHolidaysForYear(code, y))
    })
  })
})

function holidaysForYear(year) {
  // Merge active holidays from ALL visible projects, deduplicated by date
  const seen     = new Set()
  const holidays = []
  allProjects.value.forEach(proj => {
    const disabled = new Set(proj.disabledHolidays || [])
    ;(proj.holidays || []).forEach(({ countryCode }) => {
      holidaysStore.getHolidaysForYear(countryCode, year).forEach(h => {
        if (!disabled.has(h.date) && !seen.has(h.date)) {
          seen.add(h.date)
          holidays.push(h)
        }
      })
    })
  })
  return holidays
}

// ── Helpers de fecha ──────────────────────────────────────────────
function shiftDate(dateStr, n) {
  if (!dateStr || n === 0) return dateStr
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function calcTo(from, days, dayType) {
  if (!from) return ''
  const n = Math.max(1, days || 1) - 1
  if (n === 0) return from
  if (dayType === 'calendar') return shiftDate(from, n)
  // Business days — skip weekends
  let count = 0, current = from
  while (count < n) {
    current = shiftDate(current, 1)
    const dow = new Date(current + 'T12:00:00').getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return current
}

// ── Active holidays for the selected project (used in business-day validation) ──
// Covers all years currently rendered; used only for event creation/editing on props.project.
const activeHolidayDatesForProject = computed(() => {
  const disabled = new Set(props.project.disabledHolidays || [])
  const years = new Set(visibleMonths.value.map(m => m.year))
  if (!years.size) years.add(new Date().getFullYear())
  const dates = new Set()
  ;(props.project.holidays || []).forEach(({ countryCode }) => {
    years.forEach(year => {
      holidaysStore.getHolidaysForYear(countryCode, year).forEach(h => {
        if (!disabled.has(h.date)) dates.add(h.date)
      })
    })
  })
  return dates
})

function isModalStartDateBusinessDay() {
  return isBusinessDay(evModalFrom.value, activeHolidayDatesForProject.value)
}

// ── Weather date selection ────────────────────────────────────────
const weatherStore = useWeatherStore()

function onDaySelect(dateStr) {
  focusDate.value = dateStr
  ;(props.project.cities || []).forEach((_, i) => {
    weatherStore.updateForDate(props.project, i, dateStr)
  })
}

// ── Modal handlers ────────────────────────────────────────────────
function onDayClick(dateStr) {
  if (props.readOnly) return
  // Auto-create a default stage if the project has none
  const activeStages = (props.project.stages || []).filter(s => s.active !== false)
  if (!activeStages.length) {
    const defaultName = props.lang === 'en' ? 'New Stage' : 'Nueva Etapa'
    projectsStore.addStage(props.project.id, defaultName)
  }
  const firstStage = (props.project.stages || []).find(s => s.active !== false)
  evModalMode.value     = 'create'
  evModalId.value       = ''
  evModalName.value     = ''
  evModalStage.value    = firstStage?.key || 'pre'
  evModalDays.value     = 1
  evModalDayType.value  = 'calendar'
  evModalKeyDate.value  = false
  evModalInternal.value = false
  evModalFrom.value     = dateStr
  evModalTo.value       = dateStr
  evModalToManual.value = false
  evModalOpen.value     = true
  nextTick(() => evModalNameRef.value?.focus())
}

function onEventClick(ev) {
  if (props.readOnly) return
  evModalMode.value     = 'edit'
  evModalId.value       = ev.id
  evModalProjId.value   = ev._projId || props.project.id   // track owning project
  evModalName.value     = props.lang === 'en' ? (ev.nameEN || ev.name) : ev.name
  evModalStage.value    = ev.stage || 'pre'
  evModalDays.value     = ev.duration || 1
  evModalDayType.value  = ev.durDayType || 'calendar'
  evModalKeyDate.value   = ev.keyDate   || false
  evModalInternal.value  = ev.internal  || false
  evModalCompleted.value = ev.completed || false
  evModalFrom.value     = ev.date || ''
  evModalTo.value       = calcTo(ev.date, ev.duration || 1, ev.durDayType || 'calendar')
  evModalToManual.value = false
  evModalOpen.value     = true
  nextTick(() => evModalNameRef.value?.focus())
}

function onFromChange() {
  if (!evModalToManual.value) {
    evModalTo.value = calcTo(evModalFrom.value, evModalDays.value, evModalDayType.value)
  }
}

function onDaysChange() {
  evModalToManual.value = false
  evModalTo.value = calcTo(evModalFrom.value, evModalDays.value, evModalDayType.value)
}

function onDayTypeChange(type) {
  evModalDayType.value  = type
  evModalToManual.value = false
  // Switching to Business Days: auto-adjust start date if it falls on a non-business day
  if (type === 'business' && evModalFrom.value && !isModalStartDateBusinessDay()) {
    evModalFrom.value = nearestBusinessDay(evModalFrom.value, activeHolidayDatesForProject.value)
    alert(props.lang === 'en'
      ? 'This event was changed to Business Days, so its start date was moved to the nearest business day.'
      : 'Este evento fue configurado como Días Hábiles, por lo tanto su fecha de inicio fue ajustada al día hábil más cercano.')
  }
  evModalTo.value = calcTo(evModalFrom.value, evModalDays.value, evModalDayType.value)
}

// Helper: resolve project ID for a merged event.
// Creation always goes to the selected project; edits/moves go to the event's owning project.
function projIdFor(eventOrId) {
  if (typeof eventOrId === 'string') {
    // evId from drag/drop — find which project owns this event
    for (const proj of allProjects.value) {
      if ((proj.events || []).some(e => e.id === eventOrId)) return proj.id
    }
    return props.project.id
  }
  return eventOrId._projId || props.project.id
}

function confirmEvModal() {
  // Validate: Business Days events must start on a valid business day
  if (evModalDayType.value === 'business' && evModalFrom.value && !isModalStartDateBusinessDay()) {
    alert(props.lang === 'en'
      ? 'This event is set as Business Days, so it must start on a business day. Please select a valid business day to continue.'
      : 'Este evento está configurado como Días Hábiles, por lo tanto debe comenzar en un día hábil. Selecciona un día hábil válido para poder continuar.')
    return
  }
  const name    = evModalName.value.trim() || (props.lang === 'en' ? 'New event' : 'Nuevo evento')
  const projId  = evModalMode.value === 'create' ? props.project.id : evModalProjId.value
  const ownerProj = allProjects.value.find(p => p.id === projId) || props.project
  if (evModalMode.value === 'create') {
    const ev = {
      id: uid(), name, nameEN: name,
      stage: evModalStage.value, active: true,
      date: evModalFrom.value, dateMode: 'manual',
      duration: Math.max(1, evModalDays.value || 1),
      durDayType: evModalDayType.value,
      dep: { active: false, eventId: '', relation: 'after', days: 1, dayType: 'calendar', broken: false },
      locked: false, notes: '', order: ownerProj.events.length,
      completed: false, keyDate: evModalKeyDate.value, internal: evModalInternal.value, whenToUse: '', whenToUseEN: '', groups: [],
    }
    projectsStore.addEvent(projId, ev)
  } else {
    projectsStore.updateEvent(projId, evModalId.value, {
      name, nameEN: name,
      stage:      evModalStage.value,
      duration:   Math.max(1, evModalDays.value || 1),
      durDayType: evModalDayType.value,
      keyDate:    evModalKeyDate.value,
      internal:   evModalInternal.value,
      completed:  evModalCompleted.value,
      date:       evModalFrom.value,
    })
  }
  projectsStore.recalcAndSave(projId)
  evModalOpen.value = false
}

// Swap the order of two events dragged within the same calendar day.
// Both events must belong to the same project (CalendarMonth only allows same-day reorder).
function onReorderEvents({ evId1, evId2 }) {
  const projId = projIdFor(evId1)
  projectsStore.reorderEvents(projId, evId1, evId2)
}

// Move an event to a new start date, keeping all other settings unchanged.
// ── Business-day snapping for drag-and-drop ────────────────────────────────────
// Saturday → snap back to Friday  (closest prior business day)
// Sunday   → snap forward to Monday (closest next business day)
function snapWeekend(dateStr) {
  const d   = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay() // 0 = Sun, 6 = Sat
  if (dow === 6) d.setDate(d.getDate() - 1) // Sat → Fri
  if (dow === 0) d.setDate(d.getDate() + 1) // Sun → Mon
  return d.toISOString().split('T')[0]
}

function onRescheduleEvent({ evId, newDate }) {
  const projId = projIdFor(evId)
  const proj   = projectsStore.projects.find(p => p.id === projId)
  const ev     = proj?.events.find(e => e.id === evId)
  if (!ev) return

  // Weekend snapping applies only to Business Days events.
  if (ev.durDayType === 'business') {
    newDate = snapWeekend(newDate)
  }

  const dateChanged = newDate !== ev.date

  // When dropping onto a day that already has events in the same stage,
  // give the dragged event the lowest order so it appears first (lane 0).
  const sameDay = (proj.events || []).filter(e =>
    e.id !== evId &&
    e.stage === ev.stage &&
    e.date === newDate &&
    e.active
  )
  const newOrder = sameDay.length
    ? sameDay.reduce((min, e) => Math.min(min, e.order ?? 0), Infinity) - 1
    : null

  // Nothing changed at all — skip
  if (!dateChanged && newOrder === null) return

  const body = { date: newDate, dateMode: 'manual' }
  if (newOrder !== null) body.order = newOrder

  // Only ask about dependency if the date is actually changing
  if (ev.dep?.active && dateChanged) {
    const refEv = ev.dep.eventId ? (proj.events.find(e => e.id === ev.dep.eventId) || null) : null
    const depLine = describeDependency(ev, refEv, props.lang)
    const msg = props.lang === 'en'
      ? `This event has an active dependency:\n\n"${depLine}"\n\nMoving it manually will pause the dependency. You can resume it at any time from the event settings.\n\nMove anyway?`
      : `Este evento tiene una dependencia activa:\n\n"${depLine}"\n\nMoverlo manualmente pausará la dependencia. Podés reanudarla cuando quieras desde la configuración del evento.\n\n¿Mover de todas formas?`
    if (!confirm(msg)) return
    body.dep = { ...ev.dep, active: false }
  }
  projectsStore.updateEvent(projId, evId, body)
  projectsStore.recalcAndSave(projId)
}

function deleteEvModal() {
  if (confirm(props.lang === 'en' ? 'Delete this event?' : '¿Eliminar este evento?')) {
    projectsStore.deleteEvent(evModalProjId.value || props.project.id, evModalId.value)
    evModalOpen.value = false
  }
}

// Pause / resume the event's dependency from the edit card.
// Keeps the dep config (eventId, relation, days, etc.) so the user can resume later.
function toggleEvModalDep() {
  const ev = evModalEvent.value
  if (!ev?.dep?.eventId) return
  const projId = evModalProjId.value || props.project.id
  const newDep = { ...ev.dep, active: !ev.dep.active }
  // When resuming, the calendar switches this event back to auto-computed date.
  // When pausing, keep whatever date it currently has — user can edit it manually from here on.
  const body = { dep: newDep }
  if (newDep.active) body.dateMode = 'auto'
  else               body.dateMode = 'manual'
  projectsStore.updateEvent(projId, ev.id, body)
  projectsStore.recalcAndSave(projId)
  // Keep the From date in the modal in sync with the (possibly recalculated) value
  const refreshed = projectsStore.projects.find(p => p.id === projId)?.events.find(e => e.id === ev.id)
  if (refreshed) {
    evModalFrom.value = refreshed.date || ''
    evModalTo.value   = calcTo(refreshed.date, refreshed.duration || 1, refreshed.durDayType || 'calendar')
  }
}

// Remove the dependency entirely (reset to default empty config).
// The event keeps its current date and becomes fully manual.
function removeEvModalDep() {
  const ev = evModalEvent.value
  if (!ev?.dep?.eventId) return
  const msg = props.lang === 'en'
    ? 'Remove this dependency? The event will keep its current date but will no longer recalculate automatically.'
    : '¿Eliminar esta dependencia? El evento conserva su fecha actual pero no se recalculará automáticamente.'
  if (!confirm(msg)) return
  const projId = evModalProjId.value || props.project.id
  projectsStore.updateEvent(projId, ev.id, {
    dep: { active: false, eventId: '', relation: 'after', days: 1, dayType: 'calendar', broken: false },
    dateMode: 'manual',
  })
  projectsStore.recalcAndSave(projId)
}

function onEvModalKeydown(e) {
  if (e.key === 'Escape') {
    evModalOpen.value = false
  } else if (e.key === 'Enter') {
    // Only confirm on Enter if focus is not on a textarea or select
    const tag = document.activeElement?.tagName
    if (tag !== 'TEXTAREA' && tag !== 'SELECT') {
      e.preventDefault()
      confirmEvModal()
    }
  }
}

watch(evModalOpen, (open) => {
  if (open) {
    window.addEventListener('keydown', onEvModalKeydown)
  } else {
    window.removeEventListener('keydown', onEvModalKeydown)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onEvModalKeydown)
})

</script>

<style scoped>
.cal-wrap {
  display: flex; flex-direction: column; flex: 1; overflow: hidden;
}

.cal-nav {
  display: flex; align-items: center; gap: 8px; padding: 8px 16px;
  background: #fff; border-bottom: 1px solid var(--border); flex-shrink: 0;
  position: relative;
}
.cal-nav-btn {
  background: none; border: 1.5px solid var(--border); border-radius: 6px;
  padding: 4px 10px; font-size: .85rem; cursor: pointer; color: var(--muted); line-height: 1;
}
.cal-nav-btn:hover { border-color: var(--accent); color: var(--accent); }
.cal-month-title {
  font-family: 'Syne', sans-serif; font-size: .92rem; font-weight: 700; color: var(--navy);
}

.hdr-icon-btn {
  background: none; border: 1.5px solid var(--border); border-radius: 7px;
  padding: 5px 9px; font-size: .8rem; cursor: pointer; color: var(--muted); transition: all .15s;
}
.hdr-icon-btn:hover { border-color: var(--accent); color: var(--accent); }

.cal-scroll { flex: 1; overflow: auto; padding: 16px 20px; }
.cal-main-grid {
  display: flex; flex-direction: column; gap: 28px; min-width: 600px;
}
.cal-month-col { display: flex; flex-direction: column; gap: 10px; }
.cal-month-label {
  font-family: 'Syne', sans-serif; font-size: 1.1rem; font-weight: 800;
  color: var(--navy); padding: 0 2px; letter-spacing: -.2px;
}


/* Event modal */
.modal-title-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
/* Override global .modal h2 margin since we handle spacing on the row itself */
.modal-title-row :deep(h2),
.modal-title-row h2 { margin: 0; }

.field--spaced { margin-top: 12px; }

.ev-days-row {
  flex-direction: row; gap: 8px; align-items: flex-end;
}
.ev-days-input {
  flex: 0 0 80px; display: flex; flex-direction: column; gap: 6px;
}
.ev-days-num {
  width: 100%; height: 33px; box-sizing: border-box;
}

.qa-daytype-toggle {
  display: flex; border: 1.5px solid var(--border); border-radius: 6px;
  overflow: hidden; flex-shrink: 0; align-self: flex-end;
}
.qa-daytype-toggle button {
  background: none; border: none; padding: 7px 11px;
  font-size: .66rem; font-weight: 600; cursor: pointer; color: var(--muted);
  font-family: inherit; white-space: nowrap; transition: all .12s;
}
.qa-daytype-toggle button.active { background: var(--navy); color: #fff; }

.key-date-star {
  background: none; border: 1.5px solid var(--border); border-radius: 6px;
  width: 30px; height: 30px; cursor: pointer; font-size: 1rem; color: var(--muted);
  display: flex; align-items: center; justify-content: center; transition: all .15s; flex-shrink: 0;
}
.key-date-star.active { background: rgba(245,158,11,.1); border-color: var(--warning); color: var(--warning); }

.modal-internal-btn {
  background: none; border: 1.5px solid var(--border); border-radius: 6px;
  width: 30px; height: 30px; cursor: pointer; color: var(--muted);
  display: flex; align-items: center; justify-content: center; transition: all .15s; flex-shrink: 0;
}
.modal-internal-btn:hover { border-color: var(--navy); color: var(--navy); }
.modal-internal-btn.active { background: rgba(30,41,59,.08); border-color: var(--navy); color: var(--navy); }

.modal-completed-btn {
  background: none; border: 1.5px solid var(--border); border-radius: 6px;
  width: 30px; height: 30px; cursor: pointer; color: var(--muted);
  display: flex; align-items: center; justify-content: center; transition: all .15s; flex-shrink: 0;
}
.modal-completed-btn:hover { border-color: var(--accent); color: var(--accent); }
.modal-completed-btn.active { background: rgba(6,204,180,.12); border-color: var(--accent); color: var(--accent); }

/* ── Event edit card: status & dependency panel ─────────────────────────────── */
.ev-dep-panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(0,0,0,.015);
  display: flex; flex-direction: column; gap: 8px;
}
.ev-dep-panel > label {
  font-size: .62rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: var(--muted);
}
.ev-dep-chips {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.ev-chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: .66rem; font-weight: 600;
  padding: 3px 8px; border-radius: 12px;
  border: 1px solid var(--border); background: #fff; color: var(--text);
}
.ev-chip-active   { border-color: rgba(6,204,180,.35); background: rgba(6,204,180,.08); color: #057a6b; }
.ev-chip-paused   { border-color: rgba(245,158,11,.35); background: rgba(245,158,11,.08); color: #a05a04; }
.ev-chip-dep-on   { border-color: rgba(6,204,180,.35); background: rgba(6,204,180,.08); color: #057a6b; }
.ev-chip-dep-off  { border-color: rgba(245,158,11,.35); background: rgba(245,158,11,.08); color: #a05a04; }
.ev-chip-none     { color: var(--muted); }

.ev-dep-sentence {
  font-size: .74rem; line-height: 1.35; color: var(--text);
  margin: 0;
}
.ev-dep-actions {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.ev-dep-actions .btn-small {
  padding: 5px 10px; font-size: .68rem;
}
</style>
