<template>
  <div
    class="ev-row"
    :class="{
      'ev-inactive':      !event.active,
      'ev-completed':      event.completed,
      'ev-conflict-row':   event.dep?.broken,
      'ev-internal-row':   event.internal,
    }"
    :draggable="!readOnly && dragAllowed"
    @dragstart="onRowDragStart"
    @dragend="onRowDragEnd"
  >
    <!-- ① Actions ─────────────────────────────────────────────────────── -->
    <div class="ev-actions" :class="{ 'ev-actions-readonly': readOnly }">
      <span
        class="ev-drag"
        v-if="!readOnly"
        title="Drag"
        @mousedown="dragAllowed = true"
        @mouseup="dragAllowed = false"
      >⠿</span>

      <label class="ev-toggle" :title="L.toggleTitle" :style="readOnly ? 'pointer-events:none;opacity:.4' : ''">
        <input type="checkbox" :checked="event.active" @change="!readOnly && toggleActive()" :disabled="readOnly" />
        <span class="ev-toggle-slider"></span>
      </label>

      <button
        class="ev-key-btn"
        :class="{ active: event.keyDate }"
        :title="L.keyDateTitle"
        :disabled="readOnly"
        @click="!readOnly && toggleKeyDate()"
      >★</button>

      <button
        class="ev-internal-btn"
        :class="{ active: event.internal }"
        :title="L.internalTitle"
        :disabled="readOnly"
        @click="!readOnly && toggleInternal()"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </button>

      <input
        type="checkbox"
        class="ev-done-chk"
        :checked="event.completed"
        :disabled="!event.active || readOnly"
        :title="L.doneTitle"
        @change="!readOnly && toggleCompleted()"
      />

      <button v-if="!readOnly" class="ev-delete-btn" :title="L.deleteTitle" @click="deleteEvent">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>

    <!-- Delete confirmation modal -->
    <Teleport to="body">
      <div v-if="deleteModalOpen" class="ev-delete-backdrop" @click.self="deleteModalOpen = false">
        <div class="ev-delete-modal" @keydown.esc="deleteModalOpen = false">
          <div class="ev-delete-modal-title">{{ L.confirmDeleteTitle }}</div>
          <div class="ev-delete-modal-body">{{ L.confirmDeleteBody }}</div>
          <div class="ev-delete-modal-actions">
            <button class="ev-delete-cancel" @click="deleteModalOpen = false">{{ L.btnCancel }}</button>
            <button class="ev-delete-confirm" @click="confirmDelete" ref="confirmBtnRef">{{ L.btnDelete }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ② Name + info + group assignment ──────────────────────────────── -->
    <div class="ev-main">
      <input
        ref="nameInputRef"
        class="ev-name-input"
        :value="displayName"
        :readonly="readOnly"
        :style="[
          event.completed ? 'text-decoration:line-through;opacity:.5' : '',
          readOnly ? 'cursor:default;' : '',
        ]"
        @change="!readOnly && updateName($event.target.value)"
        @blur="!readOnly && updateName($event.target.value)"
      />

      <!-- Group assignment button — sits after the event name -->
      <button
        ref="groupBtnRef"
        class="ev-group-btn"
        :class="{ 'has-groups': eventGroupIds.length > 0 }"
        :title="L.groupsTitle"
        :disabled="readOnly"
        @click.stop="!readOnly && (groupMenuOpen ? groupMenuOpen = false : openGroupMenu())"
      >
        <span class="ev-group-icon">{{ L.groupsBtn }}</span>
        <span v-if="eventGroupIds.length" class="ev-group-count">{{ eventGroupIds.length }}</span>
      </button>

      <button
        v-if="event.whenToUse || event.whenToUseEN"
        class="ev-info-btn"
        :title="lang === 'en' ? event.whenToUseEN : event.whenToUse"
      >ℹ</button>
    </div>

    <!-- Group menu — teleported to body to avoid overflow clipping -->
    <Teleport to="body">
      <div
        v-if="groupMenuOpen"
        class="ev-group-menu-portal"
        :style="groupMenuStyle"
        @click.stop
        @mouseleave="groupMenuOpen = false"
      >
        <div class="ev-group-menu-title">{{ L.groupsTitle }}</div>
        <div v-if="!projectGroups.length" class="ev-group-empty">{{ L.noGroupsDefined }}</div>
        <label
          v-for="grp in projectGroups"
          :key="grp.id"
          class="ev-group-opt"
        >
          <input
            type="checkbox"
            :checked="eventGroupIds.includes(grp.key) || eventGroupIds.includes(grp.id)"
            :disabled="readOnly"
            @change="!readOnly && toggleGroupMembership(grp.key)"
          />
          <span>{{ lang === 'en' ? (grp.nameEN || grp.name) : grp.name }}</span>
        </label>
      </div>
    </Teleport>

    <!-- ③ Duration & Dates ─────────────────────────────────────────────── -->
    <div class="ev-dates">
      <input
        type="number"
        class="ev-dur-input"
        min="1"
        :value="event.duration || 1"
        :title="L.daysTitle"
        :readonly="readOnly"
        :disabled="readOnly"
        @change="!readOnly && updateDuration(parseInt($event.target.value) || 1)"
      />
      <button
        class="ev-dur-type-btn"
        :class="{
          'is-business': (event.durDayType || 'calendar') === 'business',
          'is-calendar':  (event.durDayType || 'calendar') === 'calendar',
        }"
        :title="L.durDayTypeTitle"
        :disabled="readOnly"
        @click="!readOnly && updateDurDayType((event.durDayType || 'calendar') === 'calendar' ? 'business' : 'calendar')"
      >{{ (event.durDayType || 'calendar') === 'business' ? 'Business' : 'Calendar' }}</button>

      <!-- Date wrapper: shows 2-digit year, click anywhere opens native picker -->
      <div
        class="ev-date-label"
        :class="{ 'ev-date-auto': event.dateMode === 'auto', 'ev-date-broken': event.dep?.broken }"
        :title="L.startDate"
        @click="!readOnly && openDatePicker()"
      >
        <span class="ev-date-text">{{ formattedStartDate || '— / — / —' }}</span>
        <input
          ref="datePickerInput"
          type="date"
          class="ev-date-native"
          :value="event.date"
          :disabled="readOnly"
          @change="!readOnly && updateDate($event.target.value)"
        />
      </div>
      <span class="ev-dates-arrow">→</span>
      <span class="ev-end-date" :class="{ 'ev-end-empty': !endDate }" :title="L.endDate">
        {{ formattedEndDate || '—' }}
      </span>
    </div>

    <!-- ④ Dependency / Scheduling ─────────────────────────────────────── -->
    <div
      v-show="showDepCol"
      class="ev-dep-section"
      :class="{
        'ev-dep-on':     event.dep?.active,
        'ev-dep-paused': !event.dep?.active && !!event.dep?.eventId,
        'ev-dep-broken': event.dep?.broken,
      }"
    >
      <button
        class="ev-dep-play"
        :class="{ active: event.dep?.active }"
        :title="depTooltip ?? (event.dep?.active ? L.depPause : L.depPlay)"
        :disabled="readOnly"
        @click="!readOnly && toggleDep()"
      >{{ event.dep?.active ? '⏸' : '⏵' }}</button>

      <!-- Show controls for both active and paused states (paused = has eventId but not active) -->
      <template v-if="event.dep?.active || event.dep?.eventId">
        <div class="ev-dep-controls" :class="{ 'ev-dep-controls-paused': !event.dep?.active }">
          <input
            type="number"
            class="ev-dep-days"
            min="0"
            :value="event.dep?.days ?? 1"
            :title="L.depDaysTitle"
            :disabled="readOnly"
            @change="!readOnly && updateDepDays(parseInt($event.target.value) || 0)"
          />

          <span class="ev-dep-daylabel">{{ L.depDayLabel(event.dep?.days ?? 1) }}</span>

          <select
            class="ev-dep-rel"
            :value="event.dep?.relation"
            :disabled="readOnly"
            @change="!readOnly && updateDepRelation($event.target.value)"
          >
            <option value="after">{{ L.depAfter }}</option>
            <option value="before">{{ L.depBefore }}</option>
          </select>

          <select
            class="ev-dep-event"
            :value="event.dep?.eventId"
            :disabled="readOnly"
            @change="!readOnly && updateDepEvent($event.target.value)"
          >
            <option value="">{{ L.chooseEvent }}</option>
            <option
              v-for="other in otherEvents"
              :key="other.id"
              :value="other.id"
            >{{ lang === 'en' ? (other.nameEN || other.name) : other.name }}</option>
          </select>

          <button
            class="ev-dep-toggle-btn ev-dep-anchor-btn"
            :title="L.depAnchorTitle"
            :disabled="readOnly"
            @click="!readOnly && updateDepAnchor((event.dep?.anchor || 'start') === 'start' ? 'end' : 'start')"
          >{{ (event.dep?.anchor || 'start') === 'start' ? L.depAnchorStart : L.depAnchorEnd }}</button>
        </div><!-- /ev-dep-controls -->
      </template>

      <!-- No dependency configured at all -->
      <span v-else class="ev-dep-hint">{{ L.depHint }}</span>
    </div>
  </div>
</template>

<script setup>
import { useDependencyEngine } from '~/composables/useDependencyEngine'

// ── Inline translations ───────────────────────────────────────────────────────
const LABELS = {
  es: {
    toggleTitle:    'Activar / desactivar evento',
    keyDateTitle:   'Fecha clave',
    doneTitle:      'Marcar como completado',
    deleteTitle:    'Eliminar evento',
    daysTitle:      'Duración',
    durDayTypeTitle:'Tipo de días de duración',
    bizShort:       'Háb',
    calShort:       'Cor',
    businessDays:   'Días hábiles',
    calendarDays:   'Días corridos',
    startDate:      'Fecha de inicio',
    endDate:        'Fecha de fin',
    depPlay:        'Activar dependencia',
    depPause:       'Desactivar dependencia',
    depAfter:       'después que',
    depBefore:      'antes que',
    depDayLabel:    (n) => n === 1 ? 'día' : 'días',
    chooseEvent:    'Elegir evento…',
    depDaysTitle:   'Días de diferencia',
    depDayTypeTitle:'Tipo de días de dependencia',
    depAnchorTitle: 'Elige desde cuándo comienza esta dependencia. Puede ser desde el inicio o desde el final del evento relacionado.',
    depAnchorStart: 'Comience',
    depAnchorEnd:   'Termine',
    depOf:          'de',
    depHint:        'Sin dependencia',
    toastCircular:       'Dependencia circular detectada',
    confirmDeleteTitle:  '¿Eliminar evento?',
    confirmDeleteBody:   '¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer.',
    btnCancel:           'Cancelar',
    btnDelete:           'Eliminar',
    internalTitle:  'Solo interno — no aparece en PDFs ni links compartidos',
    groupsBtn:           'Grupos',
    groupsTitle:    'Asignar grupos',
    noGroupsDefined:'No hay grupos definidos',
  },
  en: {
    toggleTitle:    'Toggle event on / off',
    keyDateTitle:   'Key date',
    doneTitle:      'Mark as completed',
    deleteTitle:    'Delete event',
    daysTitle:      'Duration',
    durDayTypeTitle:'Duration day type',
    bizShort:       'Bus',
    calShort:       'Cal',
    businessDays:   'Business days',
    calendarDays:   'Calendar days',
    startDate:      'Start date',
    endDate:        'End date',
    depPlay:        'Enable dependency',
    depPause:       'Disable dependency',
    depAfter:       'after',
    depBefore:      'before',
    depDayLabel:    (n) => n === 1 ? 'day' : 'days',
    chooseEvent:    'Choose event…',
    depDaysTitle:   'Offset in days',
    depDayTypeTitle:'Dependency day type',
    depAnchorTitle: 'Choose when this dependency starts from. It can be from the beginning or the end of the related event.',
    depAnchorStart: 'starts',
    depAnchorEnd:   'ends',
    depOf:          'of',
    depHint:        'No dependency',
    toastCircular:       'Circular dependency detected',
    confirmDeleteTitle:  'Delete event?',
    confirmDeleteBody:   'Are you sure you want to delete this event? This action cannot be undone.',
    btnCancel:           'Cancel',
    btnDelete:           'Delete',
    internalTitle:  'Internal only — hidden from PDFs and shared links',
    groupsBtn:           'Groups',
    groupsTitle:    'Assign groups',
    noGroupsDefined:'No groups defined',
  },
}

const projectsStore = useProjectsStore()
const globalStore   = useGlobalStore()
const holidaysStore = useHolidaysStore()
const { hasCircularDep } = useDependencyEngine()

// Active holiday dates for this project — covers the event's year + neighbours.
// Used to validate business-day rules when the user changes durDayType.
const activeHolidayDates = computed(() => {
  const disabled = new Set(props.project.disabledHolidays || [])
  const years = new Set()
  const base = props.event.date ? Number(props.event.date.slice(0, 4)) : new Date().getFullYear()
  ;[base - 1, base, base + 1, base + 2].forEach(y => years.add(y))
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

const props = defineProps({
  event:      { type: Object,  required: true },
  project:    { type: Object,  required: true },
  lang:       { type: String,  default: 'es' },
  stageLabel: { type: String,  default: '' },
  autofocus:    { type: Boolean, default: false },
  readOnly:     { type: Boolean, default: false },
  showDepCol:   { type: Boolean, default: false },
})

const emit = defineEmits(['row-drag-start', 'row-drag-end'])

// ── Row drag (list view reorder / stage change) ───────────────────────────────
const dragAllowed = ref(false)

function onRowDragStart(e) {
  if (!dragAllowed.value) { e.preventDefault(); return }
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', props.event.id)
  emit('row-drag-start', props.event.id)
}

function onRowDragEnd() {
  dragAllowed.value = false
  emit('row-drag-end')
}

// Ref to the event name input — used to autofocus it when creating a new event.
const nameInputRef = ref(null)

const L = computed(() => LABELS[props.lang] ?? LABELS.es)

// ── Group assignment ──────────────────────────────────────────────────────────
const groupBtnRef    = ref(null)
const groupMenuOpen  = ref(false)
const groupMenuStyle = ref({})

const projectGroups = computed(() =>
  (props.project.groups || []).filter(g => g.active !== false)
)
const eventGroupIds = computed(() => props.event.groups || [])

function openGroupMenu() {
  if (!groupBtnRef.value) return
  const rect = groupBtnRef.value.getBoundingClientRect()
  groupMenuStyle.value = {
    top:  `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
  }
  groupMenuOpen.value = true
}

function toggleGroupMembership(groupId) {
  const current = [...eventGroupIds.value]
  const idx = current.indexOf(groupId)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(groupId)
  update({ groups: current })
}

function onGroupOutsideClick(e) {
  if (!groupMenuOpen.value) return
  const menu = document.querySelector('.ev-group-menu-portal')
  if (
    groupBtnRef.value && !groupBtnRef.value.contains(e.target) &&
    (!menu || !menu.contains(e.target))
  ) {
    groupMenuOpen.value = false
  }
}

// ── Derived ───────────────────────────────────────────────────────────────────
const otherEvents = computed(() =>
  (props.project.events || []).filter(e => e.id !== props.event.id && e.active)
)

// Human-readable sentence describing the active dependency — shown as tooltip on the pause button.
// Returns null when the dependency is not active or not fully configured.
const depTooltip = computed(() => {
  const dep = props.event.dep
  if (!dep?.active || !dep.eventId) return null

  const refEvent = (props.project.events || []).find(e => e.id === dep.eventId)
  if (!refEvent) return null

  const isEN     = props.lang === 'en'
  const thisName = isEN ? (props.event.nameEN || props.event.name) : props.event.name
  const refName  = isEN ? (refEvent.nameEN   || refEvent.name)   : refEvent.name
  const days     = dep.days    ?? 1
  // Day type is inherited from the event's own config, not the dep
  const dayType  = props.event.durDayType || 'calendar'
  const anchor   = dep.anchor  || 'start'
  const rel      = dep.relation || 'after'

  if (isEN) {
    const anchorLabel = anchor === 'end' ? 'ends' : 'starts'
    if (rel === 'same' || days === 0) {
      return `"${thisName}" starts the same day "${refName}" ${anchorLabel}`
    }
    const dayLabel = days === 1 ? 'day' : 'days'
    const relLabel = rel === 'after' ? 'after' : 'before'
    return `"${thisName}" starts ${days} ${dayLabel} ${relLabel} "${refName}" ${anchorLabel}`
  } else {
    const anchorLabel = anchor === 'end' ? 'termine' : 'comience'
    if (rel === 'same' || days === 0) {
      return `"${thisName}" empieza el mismo día en que "${refName}" ${anchorLabel}`
    }
    const dayLabel = days === 1 ? 'día' : 'días'
    const relLabel = rel === 'after' ? 'después de que' : 'antes de que'
    return `"${thisName}" empieza ${days} ${dayLabel} ${relLabel} "${refName}" ${anchorLabel}`
  }
})

const displayName = computed(() =>
  props.lang === 'en' ? (props.event.nameEN || props.event.name) : props.event.name
)

// Compute end date from start + duration, respecting durDayType (weekdays only for business)
const endDate = computed(() => {
  const start = props.event.date
  const dur   = props.event.duration || 1
  if (!start) return ''
  if (dur <= 1) return start
  const d = new Date(start + 'T12:00:00')
  if ((props.event.durDayType || 'calendar') === 'business') {
    let remaining = dur - 1
    while (remaining > 0) {
      d.setDate(d.getDate() + 1)
      const dow = d.getDay()
      if (dow !== 0 && dow !== 6) remaining--
    }
  } else {
    d.setDate(d.getDate() + dur - 1)
  }
  return d.toISOString().split('T')[0]
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  if (!year || !month || !day) return ''
  const yy  = year.slice(-2)
  const fmt = globalStore.dateFormat || 'DD/MM/AA'
  return fmt === 'MM/DD/AA' ? `${month}/${day}/${yy}` : `${day}/${month}/${yy}`
}

const formattedStartDate = computed(() => formatDate(props.event.date))
const formattedEndDate   = computed(() => formatDate(endDate.value))

const datePickerInput = ref(null)
function openDatePicker() {
  try { datePickerInput.value?.showPicker() } catch { datePickerInput.value?.click() }
}

// ── Mutations ─────────────────────────────────────────────────────────────────
function update(body) {
  projectsStore.updateEvent(props.project.id, props.event.id, body)
  projectsStore.recalcAndSave(props.project.id)
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
const deleteModalOpen = ref(false)
const confirmBtnRef   = ref(null)

function deleteEvent() {
  deleteModalOpen.value = true
  nextTick(() => confirmBtnRef.value?.focus())
}

function confirmDelete() {
  deleteModalOpen.value = false
  projectsStore.deleteEvent(props.project.id, props.event.id)
}

function onDeleteKeydown(e) {
  if (!deleteModalOpen.value) return
  if (e.key === 'Escape') { e.stopPropagation(); deleteModalOpen.value = false }
  if (e.key === 'Enter')  { e.stopPropagation(); confirmDelete() }
}

onMounted(() => {
  document.addEventListener('click',   onGroupOutsideClick, true)
  document.addEventListener('keydown', onDeleteKeydown,     true)

  // Autofocus + select the name input on mount when requested
  // (e.g. this row was just created via "+ Nuevo Evento"). The user can
  // start typing the real name immediately without an extra click.
  if (props.autofocus) {
    nextTick(() => {
      const el = nameInputRef.value
      if (!el) return
      el.focus()
      el.select()
    })
  }
})
onUnmounted(() => {
  document.removeEventListener('click',   onGroupOutsideClick, true)
  document.removeEventListener('keydown', onDeleteKeydown,     true)
})

function toggleActive()    { update({ active:    !props.event.active }) }
function toggleCompleted() { update({ completed: !props.event.completed }) }
function toggleKeyDate()   { update({ keyDate:   !props.event.keyDate }) }
function toggleInternal()  { update({ internal:  !props.event.internal }) }

function updateName(val) {
  if (props.lang === 'en') update({ nameEN: val })
  else update({ name: val })
}

function updateDate(val) {
  // If a dependency is active, pause it — the manual date takes over.
  // The dep config is preserved so the user can reactivate it later.
  const body = { date: val, dateMode: 'manual' }
  if (props.event.dep?.active) {
    body.dep = { ...props.event.dep, active: false }
  }
  update(body)
}

function updateDuration(val) {
  update({ duration: val, days: val })
}

function updateDurDayType(dt) {
  // Switching to Business Days: if the current start date is not a business day,
  // auto-move it to the nearest valid business day and notify the user.
  if (dt === 'business' && props.event.date && !isBusinessDay(props.event.date, activeHolidayDates.value)) {
    const adjusted = nearestBusinessDay(props.event.date, activeHolidayDates.value)
    update({ durDayType: dt, date: adjusted, dateMode: 'manual' })
    alert(props.lang === 'en'
      ? 'This event was changed to Business Days, so its start date was moved to the nearest business day.'
      : 'Este evento fue configurado como Días Hábiles, por lo tanto su fecha de inicio fue ajustada al día hábil más cercano.')
    return
  }
  update({ durDayType: dt })
}

function toggleDep() {
  const nowActive = !props.event.dep?.active
  update({
    dep:      { ...props.event.dep, active: nowActive },
    dateMode: nowActive ? 'auto' : 'manual',
    // Clear the manual date when activating so the engine sets it from the rule
    ...(nowActive ? { date: '' } : {}),
  })
}

function updateDepEvent(evId) {
  if (evId && hasCircularDep(props.project, props.event.id, evId)) {
    alert(L.value.toastCircular)
    return
  }
  update({ dep: { ...props.event.dep, eventId: evId }, dateMode: 'auto' })
}

function updateDepRelation(rel) {
  update({ dep: { ...props.event.dep, relation: rel }, dateMode: 'auto' })
}

function updateDepDays(n) {
  update({ dep: { ...props.event.dep, days: n }, dateMode: 'auto' })
}

function updateDepDayType(dt) {
  update({ dep: { ...props.event.dep, dayType: dt }, dateMode: 'auto' })
}

function updateDepAnchor(anchor) {
  update({ dep: { ...props.event.dep, anchor }, dateMode: 'auto' })
}
</script>

<style scoped>
/* ── Row container ── */
.ev-row {
  display: flex;
  align-items: center;
  gap: 0;
  border-bottom: 1px solid var(--border);
  min-height: 38px;
  transition: background .1s;
}
.ev-row:hover { background: rgba(0,0,0,.015); }
.ev-row.ev-inactive { opacity: .45; }
.ev-row.ev-completed .ev-main { opacity: .6; }
.ev-row.ev-conflict-row { background: rgba(239,68,68,.03); }

/* ── ① Actions ── */
.ev-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
}
.ev-actions-readonly button:disabled { opacity: .35; cursor: default; }

.ev-drag {
  cursor: grab;
  color: var(--muted);
  font-size: .9rem;
  line-height: 1;
  padding: 0 2px;
  opacity: .5;
}
.ev-drag:hover { opacity: 1; }

/* Toggle switch */
.ev-toggle {
  display: inline-flex; align-items: center; align-self: center;
  cursor: pointer; flex-shrink: 0; line-height: 0;
}
.ev-toggle input { display: none; }
.ev-toggle-slider {
  width: 32px; height: 18px; border-radius: 9px;
  background: #d1d5db; position: relative;
  transition: background .2s;
  flex-shrink: 0;
}
.ev-toggle-slider::after {
  content: ''; position: absolute;
  width: 14px; height: 14px; border-radius: 50%;
  background: #fff; top: 2px; left: 2px;
  transition: transform .2s cubic-bezier(.4,0,.2,1);
  box-shadow: 0 1px 3px rgba(0,0,0,.22), 0 1px 1px rgba(0,0,0,.1);
}
.ev-toggle input:checked + .ev-toggle-slider { background: var(--accent); }
.ev-toggle input:checked + .ev-toggle-slider::after { transform: translateX(14px); }

/* Key date button */
.ev-key-btn {
  background: none; border: none; cursor: pointer; font-size: .8rem;
  color: var(--muted); padding: 0 1px; line-height: 1; flex-shrink: 0;
}
.ev-key-btn.active { color: var(--warning); }
.ev-key-btn:hover  { color: var(--warning); }

/* Internal-only button */
.ev-internal-btn {
  background: none; border: none; cursor: pointer; padding: 1px 1px; line-height: 0;
  color: var(--muted); flex-shrink: 0; border-radius: 3px; transition: all .13s;
  display: inline-flex; align-items: center; justify-content: center; opacity: .45;
}
.ev-internal-btn:hover          { color: var(--navy); opacity: 1; }
.ev-internal-btn.active         { color: var(--navy); opacity: 1; }
/* internal row — lock icon in actions is the sole indicator, no overlay */

/* Done checkbox */
.ev-done-chk {
  cursor: pointer; accent-color: var(--accent); width: 13px; height: 13px; flex-shrink: 0;
}

/* Delete button */
.ev-delete-btn {
  background: none; border: none; cursor: pointer;
  color: var(--muted); padding: 3px; line-height: 0; border-radius: 3px;
  opacity: .45; flex-shrink: 0; transition: all .13s;
  display: inline-flex; align-items: center; justify-content: center;
}
.ev-delete-btn:hover { color: var(--danger); opacity: 1; background: rgba(239,68,68,.08); }

/* ── ② Name + info ── */
.ev-main {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1 1 0;   /* takes all remaining space; min-width: 0 lets it shrink freely */
  min-width: 0;
  padding: 4px 10px;
  border-right: 1px solid var(--border);
  overflow: hidden;
}

.ev-name-input {
  border: none; outline: none; font-size: .76rem; font-family: inherit;
  color: var(--text); background: transparent; width: 100%; min-width: 80px;
}
.ev-name-input:focus { background: #f8fbfc; border-radius: 4px; padding: 1px 4px; }

.ev-info-btn {
  background: none; border: none; cursor: pointer; color: var(--muted);
  font-size: .7rem; padding: 1px 3px; flex-shrink: 0; line-height: 1;
}
.ev-info-btn:hover { color: var(--accent); }

/* ── ③ Duration & Dates ── */
.ev-dates {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  /* Fixed width — must never change so the column stays aligned across all rows */
  flex: 0 0 328px;
  width: 328px;
  overflow: hidden;
  border-right: 1px solid var(--border);
}

.ev-dur-input {
  width: 38px; border: 1.5px solid var(--border); border-radius: 5px;
  padding: 3px 4px; font-size: .72rem; font-family: inherit;
  text-align: center; outline: none; color: var(--text);
}
.ev-dur-input:focus { border-color: var(--accent); }

/* Duration day-type — shows only the active mode */
.ev-dur-type-btn {
  padding: 2px 7px; border: 1.5px solid var(--border); border-radius: 5px;
  font-size: .62rem; font-weight: 700; background: #fff; cursor: pointer; font-family: inherit;
  transition: all .13s; white-space: nowrap; line-height: 1; color: var(--muted);
}
.ev-dur-type-btn.is-business { border-color: var(--accent); color: var(--navy); background: rgba(6,204,180,.08); }
.ev-dur-type-btn.is-calendar { border-color: var(--accent); color: var(--accent); }
.ev-dur-type-btn:hover { border-color: var(--accent); }

/* Date label wrapper — custom display with 2-digit year; native picker underneath */
.ev-date-label {
  position: relative; display: inline-flex; align-items: center;
  border: 1.5px solid var(--border); border-radius: 5px; padding: 3px 6px;
  cursor: pointer; transition: border-color .13s; flex-shrink: 0; min-width: 66px;
}
.ev-date-label:hover { border-color: var(--accent); }
.ev-date-label.ev-date-auto   { border-style: dashed; }
.ev-date-label.ev-date-auto .ev-date-text { color: var(--accent); }
.ev-date-label.ev-date-broken { border-color: var(--danger); }
.ev-date-text {
  font-size: .70rem; font-family: inherit; color: var(--text);
  white-space: nowrap; pointer-events: none; line-height: 1;
}
.ev-date-native {
  position: absolute; width: 0; height: 0;
  opacity: 0; pointer-events: none; border: none; padding: 0;
}

/* Dependency single-button toggles (day type + anchor) */
.ev-dep-toggle-btn {
  padding: 3px 7px; border: 1.5px solid var(--border); border-radius: 5px;
  font-size: .62rem; font-weight: 700; background: #fff; cursor: pointer; font-family: inherit;
  transition: all .13s; white-space: nowrap; line-height: 1; color: var(--muted); flex-shrink: 0;
}
.ev-dep-toggle-btn:hover { border-color: var(--accent); color: var(--accent); }
.ev-dep-anchor-btn { min-width: 28px; text-align: center; }

.ev-dates-arrow { font-size: .65rem; color: var(--muted); flex-shrink: 0; }

.ev-end-date {
  font-size: .70rem; color: var(--muted); white-space: nowrap; min-width: 54px;
}
.ev-end-date.ev-end-empty { color: var(--border); }

/* ── ④ Dependency section ── */
.ev-dep-section {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  /*
   * Fixed width — keeps the dependency zone self-contained.
   * This prevents it from ever pushing ev-dates left/right.
   * Width is sized for the fully-active state; inactive rows
   * simply have unused space to the right inside this zone.
   */
  flex: 0 0 420px;
  width: 420px;
  overflow: hidden;
  border-left: 2px solid transparent;
  background: transparent;
  transition: background .15s, border-color .15s;
}
.ev-dep-section.ev-dep-on {
  border-left-color: var(--accent);
  background: rgba(6,204,180,.04);
}
.ev-dep-section.ev-dep-paused {
  border-left-color: var(--border);
  border-left-style: dashed;
}
.ev-dep-section.ev-dep-broken {
  border-left-color: var(--danger);
  background: rgba(239,68,68,.04);
}

/* Controls wrapper — dimmed when paused so the play button stays fully visible */
.ev-dep-controls {
  display: contents;
}
.ev-dep-controls.ev-dep-controls-paused {
  display: flex;
  align-items: center;
  gap: 5px;
  opacity: 0.38;
  pointer-events: none;
}

.ev-dep-play {
  background: none; border: 1.5px solid var(--border); border-radius: 5px;
  cursor: pointer; font-size: .8rem; padding: 3px 6px; color: var(--muted);
  line-height: 1; flex-shrink: 0; transition: all .13s;
}
.ev-dep-play.active { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.08); }
.ev-dep-play:hover:not(.active) { border-color: var(--muted); color: var(--text); }

.ev-dep-rel {
  border: 1.5px solid var(--border); border-radius: 5px;
  padding: 3px 5px; font-size: .70rem; font-family: inherit; color: var(--text);
  background: #fff; cursor: pointer; outline: none;
}
.ev-dep-rel:focus { border-color: var(--accent); }

.ev-dep-event {
  border: 1.5px solid var(--border); border-radius: 5px;
  padding: 3px 5px; font-size: .70rem; font-family: inherit; color: var(--text);
  background: #fff; cursor: pointer; outline: none;
  /* constrained so the dep zone stays within its fixed width */
  flex: 1 1 0; min-width: 0; max-width: 140px;
}
.ev-dep-event:focus { border-color: var(--accent); }

.ev-dep-days {
  width: 38px; border: 1.5px solid var(--border); border-radius: 5px;
  padding: 3px 4px; font-size: .72rem; font-family: inherit;
  text-align: center; outline: none; color: var(--text);
}
.ev-dep-days:focus { border-color: var(--accent); }

.ev-dep-hint { font-size: .68rem; color: var(--muted); font-style: italic; white-space: nowrap; }
.ev-dep-of       { font-size: .68rem; color: var(--muted); white-space: nowrap; flex-shrink: 0; }
.ev-dep-daylabel { font-size: .68rem; color: var(--muted); white-space: nowrap; flex-shrink: 0; }

/* ── Group assignment button ── */
.ev-group-btn {
  display: inline-flex; align-items: center; gap: 3px;
  background: none; border: 1.5px solid var(--border); border-radius: 5px;
  padding: 2px 6px; font-size: .65rem; font-weight: 700; line-height: 1;
  cursor: pointer; color: var(--muted); font-family: inherit;
  flex-shrink: 0; transition: all .13s; white-space: nowrap;
}
.ev-group-btn:hover { border-color: var(--navy); color: var(--navy); }
.ev-group-btn.has-groups { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.07); }
.ev-group-btn.has-groups:hover { background: rgba(6,204,180,.14); }

.ev-group-icon { font-size: .72rem; }
.ev-group-count {
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--accent); color: var(--navy);
  border-radius: 3px; font-size: .58rem; font-weight: 800;
  min-width: 14px; height: 14px; padding: 0 3px; line-height: 1;
}
</style>

<!-- Portal styles — not scoped, rendered at body level -->
<style>
.ev-group-menu-portal {
  position: fixed; z-index: 500;
  background: #fff; border: 1.5px solid var(--border);
  border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,.13);
  padding: 6px; min-width: 180px; max-width: 260px;
}

.ev-group-menu-title {
  font-size: .60rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: .5px; color: var(--muted); padding: 2px 6px 6px;
  border-bottom: 1px solid var(--border); margin-bottom: 4px;
}

.ev-group-empty {
  font-size: .72rem; color: var(--muted); font-style: italic;
  padding: 6px 6px;
}

.ev-group-opt {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 6px; border-radius: 5px; cursor: pointer;
  font-size: .74rem; color: var(--text); transition: background .1s;
}
.ev-group-opt:hover { background: var(--bg); }
.ev-group-opt input[type="checkbox"] {
  accent-color: var(--accent); width: 13px; height: 13px; cursor: pointer; flex-shrink: 0;
}

/* ── Delete confirmation modal ── */
.ev-delete-backdrop {
  position: fixed; inset: 0; z-index: 600;
  background: rgba(0,0,0,.32);
  display: flex; align-items: center; justify-content: center;
}

.ev-delete-modal {
  background: #fff; border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0,0,0,.18);
  padding: 24px 28px; width: 340px; max-width: 90vw;
}

.ev-delete-modal-title {
  font-size: .95rem; font-weight: 700; color: var(--navy);
  margin-bottom: 10px;
}

.ev-delete-modal-body {
  font-size: .78rem; color: var(--muted); line-height: 1.55;
  margin-bottom: 22px;
}

.ev-delete-modal-actions {
  display: flex; justify-content: flex-end; gap: 8px;
}

.ev-delete-cancel {
  padding: 7px 16px; border: 1.5px solid var(--border); border-radius: 7px;
  background: #fff; color: var(--muted); font-size: .76rem; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .13s;
}
.ev-delete-cancel:hover { border-color: var(--muted); color: var(--text); }

.ev-delete-confirm {
  padding: 7px 16px; border: none; border-radius: 7px;
  background: var(--danger); color: #fff; font-size: .76rem; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: background .13s;
}
.ev-delete-confirm:hover { background: #dc2020; }
.ev-delete-confirm:focus { outline: 2px solid var(--danger); outline-offset: 2px; }
</style>
