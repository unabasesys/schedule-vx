<template>
  <div class="cal-wrap">
    <!-- Departments filter chips -->
    <div v-if="activeGroups.length || !readOnly" class="cal-groups-panel">
      <span class="cal-groups-panel-title">{{ lang === 'en' ? 'Departments' : 'Departamentos' }}</span>
      <div class="cal-groups-chips">
        <button
          v-for="grp in activeGroups"
          :key="grp.id"
          class="cal-group-chip"
          :class="{ active: selectedGroups.includes(grp.key) }"
          @click="toggleGroup(grp.key)"
        >
          <span class="cal-group-chip-name">{{ lang === 'en' ? (grp.nameEN || grp.name) : grp.name }}</span>
          <span v-if="!readOnly" class="cal-group-chip-x" @click.stop="deleteGroup(grp.id)" :title="lang === 'en' ? 'Delete' : 'Eliminar'">×</span>
        </button>

        <!-- Inline add-group form -->
        <form v-if="addingGroup" class="cal-group-add-form" @submit.prevent="confirmAddGroup">
          <input
            ref="groupNameInput"
            v-model="newGroupName"
            class="cal-group-add-input"
            :placeholder="lang === 'en' ? 'Department name' : 'Nombre del departamento'"
            maxlength="40"
            @keydown.escape="cancelAddGroup"
          />
          <button type="submit" class="cal-group-add-confirm">✓</button>
          <button type="button" class="cal-group-add-cancel" @click="cancelAddGroup">×</button>
        </form>
        <button v-else-if="!readOnly" class="cal-group-add-btn" @click="startAddGroup">＋</button>
      </div>
    </div>

    <!-- Calendar grid — one column per month, scrollable -->
    <div class="cal-scroll">
      <div class="cal-main-grid">
        <div
          v-for="(m, idx) in visibleMonths"
          :key="`${m.year}-${m.month}`"
          :id="`cal-month-${m.year}-${m.month}`"
          class="cal-month-col"
        >
          <div class="cal-month-label-row">
            <button v-if="idx === 0" class="cal-prev-month-btn" @click="addPrevMonth" :title="lang === 'en' ? 'Add previous month' : 'Agregar mes anterior'">−</button>
            <div class="cal-month-label">{{ monthTitle(m.year, m.month) }}</div>
          </div>
          <CalendarMonth
            :year="m.year"
            :month="m.month"
            :events="coloredEvents"
            :week-start="weekStart"
            :lang="lang"
            :holidays="holidaysForYear(m.year)"
            :read-only="readOnly"
            :focus-date="focusDate"
            :saving-ev-id="savingEvId"
            :daily-schedule="project.dailySchedule || []"
            @day-select="onDaySelect"
            @day-click="onDayClick"
            @event-click="onEventClick"
            @holiday-click="onHolidayClick"
            @reorder-events="onReorderEvents"
            @reschedule-event="onRescheduleEvent"
          />
        </div>
      </div>
      <div v-if="showAddMonth" class="add-month-wrap">
        <button class="add-month-btn" @click="addNextMonth" :title="lang === 'en' ? 'Add next month' : 'Agregar mes siguiente'">+</button>
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
          <div class="ev-name-wrap">
            <!-- .stop: the modal also has a window-level Enter handler, and without
                 stopping propagation one keystroke confirmed twice → duplicate event -->
            <input ref="evModalNameRef" v-model="evModalName" type="text" autocomplete="off" @keydown.enter.stop.prevent="confirmEvModal" />
            <div v-if="evSuggestions.length" class="ev-suggest-panel">
              <div class="ev-suggest-hint">
                {{ lang === 'en' ? 'Events without a date — pick one to assign it this date' : 'Eventos sin fecha — elige uno para asignarle esta fecha' }}
              </div>
              <button
                v-for="s in evSuggestions"
                :key="s.id"
                type="button"
                class="ev-suggest-item"
                @click="selectSuggestion(s)"
              >
                <span class="ev-suggest-name">{{ lang === 'en' ? (s.nameEN || s.name) : s.name }}</span>
                <span class="ev-suggest-stage">{{ suggestionStageLabel(s.stage) }}</span>
              </button>
            </div>
          </div>
          <div v-if="evModalLinkId" class="ev-suggest-linked">
            <span>{{ lang === 'en' ? 'Existing event — it will receive this date' : 'Evento existente — se le asignará esta fecha' }}</span>
            <button type="button" class="ev-suggest-unlink" @click="unlinkSuggestion" :title="lang === 'en' ? 'Create a new event instead' : 'Crear un evento nuevo en su lugar'">×</button>
          </div>
        </div>

        <!-- Stage. The swatch shows the colour this stage gives the event in the
             calendar — the stage is what paints the bar, and without it the colour
             only became visible after saving. -->
        <div class="field field--spaced">
          <label class="ev-stage-label">
            <span>{{ lang === 'en' ? 'Stage' : 'Etapa' }}</span>
            <span
              class="ev-stage-swatch"
              :style="{ background: evModalStageColor }"
              :title="lang === 'en' ? 'Colour this event will have in the calendar' : 'Color que tendrá este evento en el calendario'"
            ></span>
          </label>
          <select v-model="evModalStage" class="settings-select" style="width:100%">
            <option v-for="s in project.stages?.filter(s => s.active !== false)" :key="s.key" :value="s.key">
              {{ lang === 'en' ? (s.nameEN || s.name) : s.name }}
            </option>
          </select>
        </div>

        <!-- Departments -->
        <div v-if="project.groups?.filter(g => g.active !== false).length" class="field field--spaced">
          <label>{{ lang === 'en' ? 'Departments' : 'Departamentos' }}</label>
          <div class="ev-modal-groups">
            <label
              v-for="grp in project.groups.filter(g => g.active !== false)"
              :key="grp.id"
              class="ev-modal-group-opt"
            >
              <input
                type="checkbox"
                :checked="evModalGroups.includes(grp.key) || evModalGroups.includes(grp.id)"
                @change="evModalGroups.includes(grp.key)
                  ? evModalGroups.splice(evModalGroups.indexOf(grp.key), 1)
                  : evModalGroups.push(grp.key)"
              />
              <span>{{ lang === 'en' ? (grp.nameEN || grp.name) : grp.name }}</span>
            </label>
          </div>
        </div>

        <!-- Days + type toggle -->
        <div class="field field--spaced ev-days-row">
          <div class="ev-days-input">
            <label>{{ lang === 'en' ? 'Days' : 'Días' }}</label>
            <NumberStepper v-model="evModalDays" :min="1" @change="onDaysChange" />
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
            <input v-model="evModalTo" type="date" @change="onToChange" />
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

// Shared drag state — all CalendarMonth instances read/write this to enable cross-month drag
const activeDrag = reactive({ evId: null, evStart: null, isBusiness: false })
provide('calDrag', activeDrag)

// Tracks which event is mid-save after a drag-drop so CalendarMonth can show a pulse
const savingEvId = ref(null)

// Pending durDayType overrides from drag-drop (evId → dayType).
// Avoids mutating store objects directly during the async drop flow.
const pendingDayTypes = new Map()

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

// Resolved list: if caller provides projects use it, otherwise fall back to selected project only.
// If all projects are hidden (empty list) and the selected one is also hidden, show nothing.
const allProjects = computed(() =>
  props.projects.length ? props.projects
    : (props.project.hidden ? [] : [props.project])
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
const evModalGroups   = ref([])
const evModalNameRef  = ref(null)

// ── Undated-event suggestions (create mode) ────────────────────────────────────
// Typing a name while creating from a day double-click offers the project's
// events that still have no date, so the clicked date can be assigned to one
// of them instead of creating a duplicate.
const evModalLinkId       = ref(null)  // existing undated event receiving the date
const evModalLinkBaseName = ref('')    // prefilled name — detects if the user edited it

const normSearch = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const evSuggestions = computed(() => {
  if (evModalMode.value !== 'create' || evModalLinkId.value) return []
  const q = normSearch(evModalName.value.trim())
  if (q.length < 2) return []
  return (props.project.events || [])
    .filter(e => !e.date)
    .filter(e => normSearch(e.name).includes(q) || normSearch(e.nameEN).includes(q))
    .slice(0, 8)
})

function selectSuggestion(ev) {
  evModalLinkId.value       = ev.id
  evModalName.value         = props.lang === 'en' ? (ev.nameEN || ev.name) : ev.name
  evModalLinkBaseName.value = evModalName.value
  evModalStage.value    = ev.stage || evModalStage.value
  evModalDays.value     = ev.duration || 1
  evModalDayType.value  = ev.durDayType || 'calendar'
  evModalKeyDate.value  = ev.keyDate  || false
  evModalInternal.value = ev.internal || false
  evModalGroups.value   = [...(ev.groups || [])]
  evModalTo.value       = calcTo(evModalFrom.value, evModalDays.value, evModalDayType.value)
}

function unlinkSuggestion() {
  evModalLinkId.value       = null
  evModalLinkBaseName.value = ''
}

function suggestionStageLabel(key) {
  const s = (props.project.stages || []).find(st => st.key === key)
  if (!s) return ''
  return props.lang === 'en' ? (s.nameEN || s.name) : s.name
}

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

// Auto-derived months from event range (0-indexed months for CalendarMonth)
const autoVisibleMonths = computed(() => {
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

// Manually added months beyond the auto range
const extraMonthCount = ref(0)
const extraMonthsBefore = ref(0)
watch(() => props.project.id, () => { extraMonthCount.value = 0; extraMonthsBefore.value = 0 })

// Always show "+" so the user can extend the view by one month at any time
const showAddMonth = true

// Full visible range = manually added before + auto months + manually added extras
const visibleMonths = computed(() => {
  const base = autoVisibleMonths.value
  const first = base[0]
  const before = []
  let yb = first.year, mb = first.month
  for (let i = 0; i < extraMonthsBefore.value; i++) {
    mb--
    if (mb < 0) { mb = 11; yb-- }
    before.unshift({ year: yb, month: mb })
  }
  const last = base[base.length - 1]
  const extra = []
  let y = last.year, m = last.month
  for (let i = 0; i < extraMonthCount.value; i++) {
    m++
    if (m > 11) { m = 0; y++ }
    extra.push({ year: y, month: m })
  }
  return [...before, ...base, ...extra]
})

function addNextMonth() {
  extraMonthCount.value++
}

function addPrevMonth() {
  extraMonthsBefore.value++
}

function monthTitle(y, m) {
  const months = props.lang === 'en' ? MONTHS_EN : MONTHS_ES
  return `${months[m]} ${String(y).slice(-2)}`
}

// ── Departments filter ───────────────────────────────────────────────────────
const selectedGroups = ref([])

const activeGroups = computed(() =>
  (props.project?.groups || []).filter(g => g.active !== false)
)

function toggleGroup(key) {
  const idx = selectedGroups.value.indexOf(key)
  if (idx >= 0) selectedGroups.value.splice(idx, 1)
  else selectedGroups.value.push(key)
}

const addingGroup    = ref(false)
const newGroupName   = ref('')
const groupNameInput = ref(null)

function startAddGroup() {
  addingGroup.value  = true
  newGroupName.value = ''
  nextTick(() => groupNameInput.value?.focus())
}
function confirmAddGroup() {
  const name = newGroupName.value.trim()
  if (name) projectsStore.addGroup(props.project.id, name)
  cancelAddGroup()
}
function cancelAddGroup() {
  addingGroup.value  = false
  newGroupName.value = ''
}
function deleteGroup(groupId) {
  const grp = props.project.groups?.find(g => g.id === groupId)
  if (grp) {
    const idx = selectedGroups.value.indexOf(grp.key)
    if (idx >= 0) selectedGroups.value.splice(idx, 1)
  }
  projectsStore.deleteGroup(props.project.id, groupId)
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
    const stageColorMap = {}
    ;(proj.stages || []).forEach(s => { if (s.color) stageColorMap[s.key] = s.color })
    ;(proj.events || [])
      .filter(e => e.active && e.date && !hiddenStageKeys.has(e.stage))
      .filter(e => {
        if (!selectedGroups.value.length) return true
        return e.groups?.some(gId => {
          const grp = proj.groups?.find(g => g.id === gId || g.key === gId)
          return grp && selectedGroups.value.includes(grp.key)
        })
      })
      .forEach(e => merged.push({
        ...e,
        _projId:     proj.id,
        _projColor:  proj.color || '#20a789',
        _stageColor: stageColorMap[e.stage] || null,
      }))
  })
  return merged
})

// isoToday(), not toISOString(): the latter reads the date in UTC, so from mid-afternoon
// onward in the Americas the calendar focused tomorrow and the weather strip fetched the
// wrong day.
const focusDate = ref(isoToday())

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
    const today = isoToday()
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
  // Show holidays only for the currently selected project
  const seen     = new Set()
  const holidays = []
  const disabled = new Set(props.project.disabledHolidays || [])
  ;(props.project.holidays || []).forEach(({ countryCode }) => {
    holidaysStore.getHolidaysForYear(countryCode, year).forEach(h => {
      if (!disabled.has(h.date) && !seen.has(h.date)) {
        seen.add(h.date)
        holidays.push(h)
      }
    })
  })
  return holidays
}

// ── Helpers de fecha ──────────────────────────────────────────────
function shiftDate(dateStr, n) {
  if (!dateStr || n === 0) return dateStr
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return ymd(d)
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

function calcDaysFromRange(from, to, dayType) {
  if (!from || !to || to < from) return 1
  if (dayType === 'calendar') {
    const diffMs = new Date(to + 'T12:00:00') - new Date(from + 'T12:00:00')
    return Math.round(diffMs / 86400000) + 1
  }
  // Business days — count working days inclusive
  let count = 1, current = from
  while (current < to) {
    current = shiftDate(current, 1)
    const dow = new Date(current + 'T12:00:00').getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return Math.max(1, count)
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

// Which stage a brand-new event should start in.
//
// This used to be "the first active stage", which on a production calendar is always
// the earliest phase (Bidding). The stage is what paints the bar, so an event created
// in post-production territory silently landed in Bidding and came out in Bidding's
// colour — the event was fine, the colour looked broken, and the only clue was a
// dropdown the user had no reason to re-read.
//
// So follow the neighbours instead: the stage of the dated event closest to the day
// being clicked is the phase the user is almost certainly adding to. Ties go to the
// event that starts earlier — a new event usually continues the phase already under
// way rather than opening the next one.
function stageForNewEvent(dateStr) {
  const stages = (props.project.stages || []).filter(s => s.active !== false)
  if (!stages.length) return 'pre'
  const fallback = stages[0].key

  const target = Date.parse(`${dateStr}T00:00:00Z`)
  if (Number.isNaN(target)) return fallback

  const allowed = new Set(stages.map(s => s.key))
  let best = null
  for (const e of props.project.events || []) {
    if (!e.date || e.active === false || !allowed.has(e.stage)) continue
    const start = Date.parse(`${e.date}T00:00:00Z`)
    if (Number.isNaN(start)) continue
    const dist = Math.abs(target - start)
    if (!best || dist < best.dist || (dist === best.dist && start < best.start)) {
      best = { dist, start, stage: e.stage }
    }
  }
  return best?.stage || fallback
}

// The colour the event will get in the calendar. Shown next to the Stage label so the
// consequence of that dropdown is visible while choosing, not after saving.
const evModalStageColor = computed(() => {
  const stage = (props.project.stages || []).find(s => s.key === evModalStage.value)
  return stage?.color || props.project.color || '#20a789'
})

// ── Modal handlers ────────────────────────────────────────────────
function onDayClick(dateStr) {
  if (props.readOnly) return
  // Auto-create a default stage if the project has none
  const activeStages = (props.project.stages || []).filter(s => s.active !== false)
  if (!activeStages.length) {
    const defaultName = props.lang === 'en' ? 'New Stage' : 'Nueva Etapa'
    projectsStore.addStage(props.project.id, defaultName)
  }
  evModalMode.value     = 'create'
  evModalId.value       = ''
  evModalName.value     = ''
  unlinkSuggestion()
  evModalStage.value    = stageForNewEvent(dateStr)
  evModalDays.value     = 1
  evModalDayType.value  = 'calendar'
  evModalKeyDate.value  = false
  evModalInternal.value = false
  evModalGroups.value   = []
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
  unlinkSuggestion()
  evModalName.value     = props.lang === 'en' ? (ev.nameEN || ev.name) : ev.name
  evModalStage.value    = ev.stage || 'pre'
  evModalDays.value     = ev.duration || 1
  evModalDayType.value  = ev.durDayType || 'calendar'
  evModalKeyDate.value   = ev.keyDate   || false
  evModalInternal.value  = ev.internal  || false
  evModalCompleted.value = ev.completed || false
  evModalGroups.value    = [...(ev.groups || [])]
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

function onToChange() {
  if (!evModalFrom.value || !evModalTo.value) return
  if (evModalTo.value < evModalFrom.value) {
    evModalTo.value = evModalFrom.value
    evModalDays.value = 1
    return
  }
  evModalDays.value = calcDaysFromRange(evModalFrom.value, evModalTo.value, evModalDayType.value)
  evModalToManual.value = true
}

async function onDayTypeChange(type) {
  evModalDayType.value  = type
  evModalToManual.value = false
  // Switching to Business Days: auto-adjust start date if it falls on a non-business day
  if (type === 'business' && evModalFrom.value && !isModalStartDateBusinessDay()) {
    evModalFrom.value = nearestBusinessDay(evModalFrom.value, activeHolidayDatesForProject.value)
    await useDialog().alert({
      title: props.lang === 'en' ? 'Start date adjusted' : 'Fecha de inicio ajustada',
      body:  props.lang === 'en'
        ? 'This event was changed to Business Days, so its start date was moved to the nearest business day.'
        : 'Este evento fue configurado como Días Hábiles, por lo tanto su fecha de inicio fue ajustada al día hábil más cercano.',
    })
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

async function confirmEvModal() {
  // Validate: Business Days events must start on a valid business day
  if (evModalDayType.value === 'business' && evModalFrom.value && !isModalStartDateBusinessDay()) {
    await useDialog().alert({
      title: props.lang === 'en' ? 'Invalid start date' : 'Fecha de inicio inválida',
      body:  props.lang === 'en'
        ? 'This event is set as Business Days, so it must start on a business day. Please select a valid business day to continue.'
        : 'Este evento está configurado como Días Hábiles, por lo tanto debe comenzar en un día hábil. Selecciona un día hábil válido para poder continuar.',
    })
    return
  }
  const name    = evModalName.value.trim() || (props.lang === 'en' ? 'New event' : 'Nuevo evento')
  const projId  = evModalMode.value === 'create' ? props.project.id : evModalProjId.value
  const ownerProj = allProjects.value.find(p => p.id === projId) || props.project
  if (evModalMode.value === 'create' && evModalLinkId.value) {
    // Assign the clicked date to an existing undated event. It keeps its own
    // identity; the name only travels if the user actually edited it (which
    // marks it customized, per the bilingual-names decoupling rule).
    const target = (ownerProj.events || []).find(e => e.id === evModalLinkId.value)
    const body = {
      date: evModalFrom.value, dateMode: 'manual', active: true,
      stage:      evModalStage.value,
      duration:   Math.max(1, evModalDays.value || 1),
      durDayType: evModalDayType.value,
      keyDate:    evModalKeyDate.value,
      internal:   evModalInternal.value,
      groups:     evModalGroups.value,
    }
    if (target?.dep?.active) body.dep = { ...target.dep, active: false }
    if (evModalName.value.trim() && name !== evModalLinkBaseName.value) {
      if (props.lang === 'en') body.nameEN = name
      else                     body.name   = name
      body.nameCustomized = true
    }
    projectsStore.updateEvent(projId, evModalLinkId.value, body)
  } else if (evModalMode.value === 'create') {
    const ev = {
      id: uid(), name, nameEN: name,
      stage: evModalStage.value, active: true,
      date: evModalFrom.value, dateMode: 'manual',
      duration: Math.max(1, evModalDays.value || 1),
      durDayType: evModalDayType.value,
      dep: { active: false, eventId: '', relation: 'after', days: 1, broken: false },
      notes: '', order: ownerProj.events.length,
      completed: false, keyDate: evModalKeyDate.value, internal: evModalInternal.value, groups: evModalGroups.value,
    }
    projectsStore.addEvent(projId, ev)
  } else {
    const nameFields = props.lang === 'en'
      ? { nameEN: name, nameCustomized: true }
      : { name,   nameCustomized: true }
    projectsStore.updateEvent(projId, evModalId.value, {
      ...nameFields,
      stage:      evModalStage.value,
      duration:   Math.max(1, evModalDays.value || 1),
      durDayType: evModalDayType.value,
      keyDate:    evModalKeyDate.value,
      internal:   evModalInternal.value,
      completed:  evModalCompleted.value,
      groups:     evModalGroups.value,
      date:       evModalFrom.value,
    })
  }
  projectsStore.recalcAndSave(projId)
  projectsStore.selectProject(projId)
  evModalOpen.value = false
}

// Swap the order of two events dragged within the same calendar day.
// Both events must belong to the same project (CalendarMonth only allows same-day reorder).
function onReorderEvents({ evId1, evId2 }) {
  const projId = projIdFor(evId1)
  projectsStore.reorderEvents(projId, evId1, evId2)
  projectsStore.selectProject(projId)
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
  return ymd(d)
}

// Returns active holiday dates for any project
function getActiveHolidayDatesFor(proj) {
  const disabled = new Set(proj.disabledHolidays || [])
  const years = new Set(visibleMonths.value.map(m => m.year))
  if (!years.size) years.add(new Date().getFullYear())
  const dates = new Set()
  ;(proj.holidays || []).forEach(({ countryCode }) => {
    years.forEach(year => {
      holidaysStore.getHolidaysForYear(countryCode, year).forEach(h => {
        if (!disabled.has(h.date)) dates.add(h.date)
      })
    })
  })
  return dates
}

// Returns the display name of a holiday on a given date for a project
function getHolidayName(proj, dateStr) {
  const year = parseInt(dateStr.slice(0, 4))
  for (const { countryCode } of (proj.holidays || [])) {
    const h = holidaysStore.getHolidaysForYear(countryCode, year).find(h => h.date === dateStr)
    if (h) return h.localName || h.name || dateStr
  }
  return dateStr
}

async function onRescheduleEvent({ evId, newDate }) {
  const projId = projIdFor(evId)
  const proj   = projectsStore.projects.find(p => p.id === projId)
  const ev     = proj?.events.find(e => e.id === evId)
  if (!ev) return

  // Business day event dropped on weekend or holiday → ask what to do
  if (ev.durDayType === 'business') {
    const dow        = new Date(newDate + 'T12:00:00').getDay()
    const isWeekend  = dow === 0 || dow === 6
    const isHoliday  = getActiveHolidayDatesFor(proj).has(newDate)
    const en         = props.lang === 'en'

    if (isHoliday) {
      const holName = getHolidayName(proj, newDate)
      const chosen  = await useDialog().choice({
        title:   en ? 'Business day event on a holiday' : 'Evento de Días Hábiles en un feriado',
        body:    en
          ? `"${ev.name}" is a Business Day event.\n\nIf you want to keep it here you can either convert it to Calendar Day or deactivate this holiday.`
          : `"${ev.name}" es un evento de Días Hábiles.\n\nSi querés dejarlo aquí podés convertirlo a Días Corridos o desactivar el feriado.`,
        choices: [
          { label: en ? 'Convert to Calendar Day'        : 'Convertir a Días Corridos',          value: 'calendar',    primary: true },
          { label: en ? `Deactivate "${holName}"` : `Desactivar "${holName}"`, value: 'deactivate' },
        ],
        cancelLabel: en ? 'Cancel' : 'Cancelar',
      })
      if (!chosen) return
      if (chosen === 'deactivate') {
        const disabled = [...(proj.disabledHolidays || [])]
        if (!disabled.includes(newDate)) disabled.push(newDate)
        projectsStore.updateDisabledHolidays(projId, disabled)
        globalStore.openHolidaysPanelAt(newDate)
        // keep durDayType: 'business' — day is now a valid business day
      } else {
        newDate = newDate // stays where dropped
        pendingDayTypes.set(evId, 'calendar')
      }
    } else if (isWeekend) {
      const ok = await useDialog().confirm({
        title:        en ? 'Business day event on a weekend'   : 'Evento de Días Hábiles en fin de semana',
        body:         en
          ? `"${ev.name}" is a Business Day event and cannot land on a weekend.\n\nDo you want to convert it to Calendar Day?`
          : `"${ev.name}" es un evento de Días Hábiles y no puede caer en fin de semana.\n\nSi querés dejarlo acá, convertilo a Días Corridos.`,
        confirmLabel: en ? 'Convert to Calendar Day' : 'Convertir a Días Corridos',
        cancelLabel:  en ? 'Cancel'                  : 'Cancelar',
      })
      if (!ok) return
      pendingDayTypes.set(evId, 'calendar')
    }
  }

  const dateChanged = newDate !== ev.date
  const pendingDayType = pendingDayTypes.get(evId)
  pendingDayTypes.delete(evId)

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
  if (!dateChanged && newOrder === null && !pendingDayType) return

  const body = { date: newDate, dateMode: 'manual' }
  if (newOrder !== null) body.order = newOrder
  if (pendingDayType) {
    body.durDayType = pendingDayType
  }

  // Only ask about dependency if the date is actually changing
  if (ev.dep?.active && dateChanged) {
    const refEv = ev.dep.eventId ? (proj.events.find(e => e.id === ev.dep.eventId) || null) : null
    const depLine = describeDependency(ev, refEv, props.lang)
    const ok = await useDialog().confirm({
      title:        props.lang === 'en' ? 'Move event?'           : '¿Mover evento?',
      body:         props.lang === 'en'
        ? `This event has an active dependency: "${depLine}"\n\nMoving it manually will pause the dependency. You can resume it at any time from the event settings.`
        : `Este evento tiene una dependencia activa: "${depLine}"\n\nMoverlo manualmente pausará la dependencia. Podés reanudarla cuando quieras desde la configuración del evento.`,
      confirmLabel: props.lang === 'en' ? 'Move anyway'          : 'Mover de todas formas',
      cancelLabel:  props.lang === 'en' ? 'Cancel'               : 'Cancelar',
    })
    if (!ok) return
    body.dep = { ...ev.dep, active: false }
  }
  projectsStore.updateEvent(projId, evId, body)
  projectsStore.recalcAndSave(projId)
  projectsStore.selectProject(projId)

  // Fire the API save immediately — don't wait for the 1500ms debounce.
  // This guarantees the change survives a page reload right after dropping.
  savingEvId.value = evId
  await projectsStore.syncProjectNow(projId)
  savingEvId.value = null
}

async function onHolidayClick({ date, name }) {
  if (props.readOnly) return
  const ok = await useDialog().confirm({
    title:        props.lang === 'en' ? 'Disable holiday?' : '¿Desactivar feriado?',
    body:         props.lang === 'en'
      ? `Do you want to hide "${name}" from this calendar?`
      : `¿Querés ocultar "${name}" de este calendario?`,
    confirmLabel: props.lang === 'en' ? 'Disable' : 'Desactivar',
    cancelLabel:  props.lang === 'en' ? 'Cancel'  : 'Cancelar',
  })
  if (!ok) return
  const current = [...(props.project.disabledHolidays || [])]
  if (!current.includes(date)) current.push(date)
  projectsStore.updateDisabledHolidays(props.project.id, current)
}

async function deleteEvModal() {
  const ok = await useDialog().confirm({
    title:        props.lang === 'en' ? 'Delete event?'  : '¿Eliminar evento?',
    body:         props.lang === 'en'
      ? 'This action cannot be undone.'
      : 'Esta acción no se puede deshacer.',
    confirmLabel: props.lang === 'en' ? 'Delete'         : 'Eliminar',
    cancelLabel:  props.lang === 'en' ? 'Cancel'         : 'Cancelar',
  })
  if (!ok) return
  projectsStore.deleteEvent(evModalProjId.value || props.project.id, evModalId.value)
  evModalOpen.value = false
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
async function removeEvModalDep() {
  const ev = evModalEvent.value
  if (!ev?.dep?.eventId) return
  const ok = await useDialog().confirm({
    title:        props.lang === 'en' ? 'Remove dependency?'   : '¿Eliminar dependencia?',
    body:         props.lang === 'en'
      ? 'The event will keep its current date but will no longer recalculate automatically.'
      : 'El evento conserva su fecha actual pero no se recalculará automáticamente.',
    confirmLabel: props.lang === 'en' ? 'Remove'               : 'Eliminar',
    cancelLabel:  props.lang === 'en' ? 'Cancel'               : 'Cancelar',
  })
  if (!ok) return
  const projId = evModalProjId.value || props.project.id
  projectsStore.updateEvent(projId, ev.id, {
    dep: { active: false, eventId: '', relation: 'after', days: 1, broken: false },
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
  } else if ((e.metaKey || e.ctrlKey) && (e.key === 'Backspace' || e.key === 'Delete')) {
    if (evModalMode.value === 'edit') {
      e.preventDefault()
      deleteEvModal()
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

.cal-nav-btn {
  background: none; border: 1.5px solid var(--border); border-radius: 6px;
  padding: 4px 10px; font-size: .85rem; cursor: pointer; color: var(--muted); line-height: 1;
}
.cal-nav-btn:hover { border-color: var(--accent); color: var(--accent); }
.hdr-icon-btn {
  background: none; border: 1.5px solid var(--border); border-radius: 7px;
  padding: 5px 9px; font-size: .8rem; cursor: pointer; color: var(--muted); transition: all .15s;
}
.hdr-icon-btn:hover { border-color: var(--accent); color: var(--accent); }

/* ── Departments filter panel (shared style with Events/Daily) ── */
.cal-groups-panel {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 16px; border-bottom: 1px solid rgba(255,255,255,.06);
  background: var(--bg); flex-shrink: 0; overflow-x: auto;
}
.cal-groups-panel-title {
  font-size: .64rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .4px; color: var(--muted); flex-shrink: 0;
}
.cal-groups-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.cal-group-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px 3px 11px; border: 1.5px solid var(--border); border-radius: 20px;
  font-size: .64rem; font-weight: 600; cursor: pointer; background: var(--surface); color: var(--muted);
  font-family: inherit; transition: all .15s;
}
.cal-group-chip.active { border-color: var(--accent); color: var(--accent); background: rgba(32,167,137,.06); }
.cal-group-chip:hover:not(.active) { border-color: var(--text); color: var(--text); }
.cal-group-chip-name { line-height: 1; }
.cal-group-chip-x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; border-radius: 50%; font-size: .68rem; line-height: 1;
  color: var(--muted); transition: all .13s; flex-shrink: 0;
}
.cal-group-chip-x:hover { background: rgba(239,68,68,.12); color: var(--danger); }
.cal-group-add-form { display: inline-flex; align-items: center; gap: 3px; }
.cal-group-add-input {
  height: 24px; padding: 0 8px; border: 1.5px solid var(--accent); border-radius: 20px;
  font-size: .64rem; font-family: inherit; outline: none; color: var(--text);
  width: 120px; background: var(--surface);
}
.cal-group-add-confirm, .cal-group-add-cancel {
  width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--border);
  font-size: .70rem; line-height: 1; cursor: pointer; background: var(--surface);
  color: var(--muted); font-family: inherit; display: flex; align-items: center;
  justify-content: center; transition: all .15s; padding: 0;
}
.cal-group-add-confirm:hover { border-color: var(--accent); color: var(--accent); background: rgba(32,167,137,.08); }
.cal-group-add-cancel:hover  { border-color: var(--danger); color: var(--danger); background: rgba(234,78,73,.12); }
.cal-group-add-btn {
  width: 22px; height: 22px; border-radius: 50%; border: 1.5px dashed var(--border);
  font-size: .82rem; line-height: 1; cursor: pointer; background: transparent;
  color: var(--muted); font-family: inherit; display: flex; align-items: center;
  justify-content: center; transition: all .15s; padding: 0;
}
.cal-group-add-btn:hover { border-color: var(--accent); color: var(--accent); border-style: solid; }

.cal-scroll { flex: 1; overflow: auto; padding: 8px 20px; }
.cal-main-grid {
  display: flex; flex-direction: column; gap: 20px; min-width: 600px;
}
.cal-month-col { display: flex; flex-direction: column; gap: 4px; }
.cal-month-label {
  font-family: 'Nunito', sans-serif; font-size: .95rem; font-weight: 800;
  color: var(--text); letter-spacing: -.2px; line-height: 1;
}

.add-month-wrap {
  display: flex; justify-content: center; padding: 12px 0 4px;
}
.cal-month-label-row {
  display: flex; align-items: center; gap: 8px; min-height: 24px; padding: 0 2px;
}
.cal-prev-month-btn {
  width: 22px; height: 22px; border-radius: 50%;
  border: 1.5px solid var(--border); background: none;
  color: var(--muted); font-size: .95rem; line-height: 1;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: border-color .15s, color .15s; padding: 0; flex-shrink: 0;
}
.cal-prev-month-btn:hover { border-color: var(--accent); color: var(--accent); }
.add-month-btn {
  width: 34px; height: 34px; border-radius: 50%;
  border: 1.5px solid var(--border); background: none;
  color: var(--muted); font-size: 1.25rem; line-height: 1;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: border-color .15s, color .15s;
}
.add-month-btn:hover { border-color: var(--accent); color: var(--accent); }


/* Event modal */
.modal-title-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
/* Override global .modal h2 margin since we handle spacing on the row itself */
.modal-title-row :deep(h2),
.modal-title-row h2 { margin: 0; }

.field--spaced { margin-top: 12px; }

/* Stage label + the colour the stage gives the event */
.ev-stage-label {
  display: flex; align-items: center; gap: 7px;
}
.ev-stage-swatch {
  width: 10px; height: 10px; border-radius: 50%;
  /* Theme border, not a hardcoded dark one: the Shoot stage is near-black and its
     swatch would otherwise vanish into the modal in dark mode. */
  border: 1px solid var(--border);
  flex: 0 0 auto;
}

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
.qa-daytype-toggle button.active { background: var(--accent); color: #fff; }

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
.modal-internal-btn:hover { border-color: var(--text); color: var(--text); }
.modal-internal-btn.active { background: rgba(30,41,59,.08); border-color: var(--text); color: var(--text); }

.modal-completed-btn {
  background: none; border: 1.5px solid var(--border); border-radius: 6px;
  width: 30px; height: 30px; cursor: pointer; color: var(--muted);
  display: flex; align-items: center; justify-content: center; transition: all .15s; flex-shrink: 0;
}
.modal-completed-btn:hover { border-color: var(--accent); color: var(--accent); }
.modal-completed-btn.active { background: rgba(32,167,137,.12); border-color: var(--accent); color: var(--accent); }

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
  border: 1px solid var(--border); background: var(--surface); color: var(--text);
}
.ev-chip-active   { border-color: rgba(32,167,137,.35); background: rgba(32,167,137,.08); color: #057a6b; }
.ev-chip-paused   { border-color: rgba(245,158,11,.35); background: rgba(245,158,11,.08); color: #a05a04; }
.ev-chip-dep-on   { border-color: rgba(32,167,137,.35); background: rgba(32,167,137,.08); color: #057a6b; }
.ev-chip-dep-off  { border-color: rgba(245,158,11,.35); background: rgba(245,158,11,.08); color: #a05a04; }
.ev-chip-none     { color: var(--muted); }

.ev-dep-sentence {
  font-size: .74rem; line-height: 1.35; color: var(--text);
  margin: 0;
}
.ev-dep-actions {
  display: flex; gap: 8px; flex-wrap: wrap;
}

.ev-modal-groups {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.ev-modal-group-opt {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: .72rem; color: var(--text); cursor: pointer;
  border: 1.5px solid var(--border); border-radius: 6px;
  padding: 4px 8px; transition: border-color .12s;
}
.ev-modal-group-opt:has(input:checked) {
  border-color: var(--accent); background: rgba(32,167,137,.08); color: var(--accent);
}
.ev-modal-group-opt input { display: none; }
.ev-dep-actions .btn-small {
  padding: 5px 10px; font-size: .68rem;
}

/* ── Undated-event suggestions in the create modal ── */
.ev-name-wrap { position: relative; }
.ev-name-wrap input { width: 100%; }
.ev-suggest-panel {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 30;
  background: var(--surface); border: 1.5px solid var(--border); border-radius: 8px;
  overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,.35);
}
.ev-suggest-hint {
  font-size: .62rem; color: var(--muted); padding: 6px 10px 4px;
}
.ev-suggest-item {
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  width: 100%; padding: 7px 10px; background: none; border: none; cursor: pointer;
  font-family: inherit; font-size: .78rem; color: var(--text); text-align: left;
}
.ev-suggest-item:hover { background: var(--surface-2); }
.ev-suggest-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ev-suggest-stage { font-size: .64rem; color: var(--muted); flex-shrink: 0; }
.ev-suggest-linked {
  display: flex; align-items: center; gap: 8px; margin-top: 6px;
  font-size: .68rem; color: var(--accent);
}
.ev-suggest-unlink {
  background: none; border: none; color: var(--muted); cursor: pointer;
  font-size: .8rem; padding: 0 2px; line-height: 1;
}
.ev-suggest-unlink:hover { color: var(--text); }
</style>
