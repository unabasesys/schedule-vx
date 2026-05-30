<template>
  <div
    ref="dirRef"
    :class="['dir', editing && 'dir--editing', item?.internalOnly && !editing && 'dir--internal']"
    @click="handleDirClick"
  >

    <!-- ── Display mode ────────────────────────────────────────────────────── -->
    <template v-if="!editing">
      <div class="dir-time-col">
        <div class="dir-time-main">{{ displayTime }}</div>
        <div v-if="groupedSecondaryTimes.length" class="dir-time-sec">
          ({{ groupedSecondaryTimes.join(' / ') }})
        </div>
      </div>

      <div class="dir-content">
        <div class="dir-title-row">
          <svg v-if="item.internalOnly" class="dir-lock" title="Internal only" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="7" width="10" height="8" rx="1.5"/>
            <path d="M5 7V5a3 3 0 0 1 6 0v2"/>
          </svg>
          <span class="dir-title">{{ item.title }}</span>
          <span v-if="item.duration" class="dir-duration">{{ fmtDuration(item.duration) }}</span>
        </div>
        <div v-if="item.locationType === 'remote'" class="dir-meta">
          <span class="dir-meta-icon">🌐</span>
          <span>{{ isEN ? 'Remote' : 'Remoto' }}</span>
        </div>
        <div v-else-if="item.locationName" class="dir-meta">
          <span class="dir-meta-icon">📍</span>
          <a
            v-if="item.locationGoogleMapsUrl"
            :href="item.locationGoogleMapsUrl"
            target="_blank"
            rel="noopener"
            class="dir-loc-link"
            @click.stop
          >{{ item.locationName }}</a>
          <span v-else>{{ item.locationName }}</span>
          <a
            v-if="item.locationAddress && item.locationGoogleMapsUrl"
            :href="item.locationGoogleMapsUrl"
            target="_blank"
            rel="noopener"
            class="dir-address dir-address-link"
            @click.stop
          >{{ item.locationAddress }}</a>
          <span v-else-if="item.locationAddress" class="dir-address">{{ item.locationAddress }}</span>
        </div>
        <div v-if="item.participants" class="dir-meta">
          <span class="dir-meta-icon">👥</span>
          <span>{{ item.participants }}</span>
        </div>
        <div v-if="item.notes" class="dir-notes">{{ item.notes }}</div>
        <div v-if="relatedEventName" class="dir-related">
          <span class="dir-related-label">{{ isEN ? 'Related event' : 'Evento relacionado' }}:</span>
          {{ relatedEventName }}
          <span v-if="relatedDateConflict" class="dir-related-conflict" :title="isEN ? 'This daily event\'s date differs from the related calendar event' : 'La fecha de este Daily Event no coincide con el evento del calendario'">
            · {{ isEN ? 'possible date conflict' : 'posible conflicto de fechas' }}
          </span>
        </div>
        <div v-if="itemDepartmentsLabel" class="dir-dept">{{ itemDepartmentsLabel }}</div>
      </div>

      <div v-if="!readOnly" class="dir-actions">
        <button
          v-if="!confirmDel"
          class="dir-act-btn"
          @click.stop="$emit('add-below')"
          :title="isEN ? 'Add event below' : 'Agregar evento debajo'"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button
          v-if="!confirmDel"
          class="dir-act-btn"
          @click.stop="$emit('duplicate')"
          :title="isEN ? 'Duplicate' : 'Duplicar'"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button
          v-if="!confirmDel"
          class="dir-act-btn dir-act-btn--del"
          @click.stop="confirmDel = true"
          :title="isEN ? 'Delete' : 'Eliminar'"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
        <template v-else>
          <button class="dir-del-confirm" @click.stop="$emit('delete')">
            {{ isEN ? 'Delete' : 'Eliminar' }}
          </button>
          <button class="dir-del-cancel" @click.stop="confirmDel = false">
            {{ isEN ? 'Cancel' : 'Cancelar' }}
          </button>
        </template>
      </div>
    </template>

    <!-- ── Edit / Create form ──────────────────────────────────────────────── -->
    <template v-else>
      <div class="dir-form">

        <!-- Date -->
        <div class="dir-form-row">
          <label class="dir-form-label">{{ isEN ? 'Date' : 'Fecha' }} *</label>
          <input type="date" v-model="form.date" class="dir-input dir-input--half" />
        </div>

        <!-- Title -->
        <div class="dir-form-row">
          <label class="dir-form-label">{{ isEN ? 'Title' : 'Título' }} *</label>
          <input
            ref="titleRef"
            type="text"
            v-model="form.title"
            class="dir-input"
            :placeholder="isEN ? 'Crew Call, Lunch, Talent Arrival…' : 'Crew Call, Almuerzo, Llegada Talento…'"
            @keydown.enter="save"
            @keydown.esc="cancel"
          />
        </div>

        <!-- Time -->
        <div class="dir-form-row">
          <label class="dir-form-label">{{ isEN ? 'Time' : 'Hora' }}</label>
          <div class="dir-time-wrap">
            <div class="dir-time-type">
              <button
                :class="['dir-time-type-btn', form.timeType === 'specific_time' && 'active']"
                @click="setTimeType('specific_time')"
              >{{ isEN ? 'Time' : 'Hora' }}</button>
              <button
                v-for="lbl in ['TBD','AM','PM','All Day']"
                :key="lbl"
                :class="['dir-time-type-btn', form.timeType === 'time_label' && form.timeLabel === lbl && 'active']"
                @click="setLabel(lbl)"
              >{{ lbl }}</button>
            </div>
            <input
              v-if="form.timeType === 'specific_time'"
              type="time"
              v-model="form.specificTime"
              class="dir-input dir-input--time"
            />
          </div>
        </div>

        <!-- Duration -->
        <div class="dir-form-row">
          <label class="dir-form-label">{{ isEN ? 'Duration' : 'Duración' }}</label>
          <input
            type="text"
            v-model="form.duration"
            class="dir-input dir-input--half"
            :placeholder="isEN ? '1h, 30 min, 2 hrs' : '1h, 30 min, 2 hrs'"
          />
        </div>

        <!-- Notes -->
        <div class="dir-form-row">
          <label class="dir-form-label">{{ isEN ? 'Notes' : 'Notas' }}</label>
          <textarea
            v-model="form.notes"
            class="dir-input dir-textarea"
            rows="2"
          ></textarea>
        </div>

        <!-- Participants -->
        <div class="dir-form-row">
          <label class="dir-form-label">{{ isEN ? 'Participants' : 'Participantes' }}</label>
          <input
            type="text"
            v-model="form.participants"
            class="dir-input"
            :placeholder="isEN ? 'Director, DP, Client, Talent 01…' : 'Director, DP, Cliente, Talento 01…'"
          />
        </div>

        <!-- Location -->
        <div class="dir-form-row">
          <label class="dir-form-label">{{ isEN ? 'Location' : 'Locación' }}</label>
          <div class="dir-time-wrap">
            <div class="dir-time-type">
              <button
                :class="['dir-time-type-btn', form.locationType === 'on_location' && 'active']"
                @click="form.locationType = 'on_location'"
              >{{ isEN ? 'On location' : 'En locación' }}</button>
              <button
                :class="['dir-time-type-btn', form.locationType === 'remote' && 'active']"
                @click="form.locationType = 'remote'"
              >{{ isEN ? 'Remote' : 'Remoto' }}</button>
            </div>
            <input
              v-if="form.locationType === 'on_location'"
              type="text"
              v-model="form.locationName"
              class="dir-input"
              :placeholder="isEN ? 'Studio A, Hotel Lobby…' : 'Estudio A, Lobby del Hotel…'"
            />
          </div>
        </div>

        <!-- More options toggle -->
        <button class="dir-more-toggle" @click="moreOpen = !moreOpen">
          <span :class="['dir-more-arrow', moreOpen && 'open']">›</span>
          {{ isEN ? 'More options' : 'Más opciones' }}
        </button>

        <div v-if="moreOpen" class="dir-more">

          <template v-if="form.locationType === 'on_location'">
            <!-- Location address -->
            <div class="dir-form-row">
              <label class="dir-form-label">{{ isEN ? 'Address' : 'Dirección' }}</label>
              <input type="text" v-model="form.locationAddress" class="dir-input" />
            </div>

            <!-- Google Maps URL -->
            <div class="dir-form-row">
              <label class="dir-form-label">Maps URL</label>
              <input
                type="url"
                v-model="form.locationGoogleMapsUrl"
                class="dir-input"
                placeholder="https://maps.google.com/…"
              />
            </div>
          </template>

          <!-- Related calendar event -->
          <div class="dir-form-row">
            <label class="dir-form-label">{{ isEN ? 'Related event' : 'Evento relacionado' }}</label>
            <select v-model="form.relatedCalendarEventId" class="dir-input dir-select">
              <option value="">{{ isEN ? '— None —' : '— Ninguno —' }}</option>
              <option v-if="!relatedEventsGrouped.length" value="" disabled>
                {{ isEN ? '(no calendar events in this project)' : '(este proyecto no tiene eventos de calendario)' }}
              </option>
              <optgroup
                v-for="sg in relatedEventsGrouped"
                :key="sg.key"
                :label="sg.label"
              >
                <option v-for="ev in sg.events" :key="ev.id" :value="ev.id">
                  {{ isEN ? (ev.nameEN || ev.name) : ev.name }}{{ ev.date ? ' · ' + ev.date : '' }}
                </option>
              </optgroup>
            </select>
          </div>

          <!-- Departments (uses project departments/groups) -->
          <div class="dir-form-row">
            <label class="dir-form-label">{{ isEN ? 'Departments' : 'Departamentos' }}</label>
            <div class="dir-dept-chips">
              <button
                v-for="d in deptOptions"
                :key="d.id"
                type="button"
                class="dir-dept-chip"
                :class="{ active: form.departments.includes(d.key) }"
                @click.stop="toggleDept(d.key)"
              >{{ isEN ? (d.nameEN || d.name) : d.name }}</button>
            </div>
          </div>

          <!-- Internal only -->
          <div class="dir-form-row">
            <label class="dir-form-label">{{ isEN ? 'Internal only' : 'Solo interno' }}</label>
            <button
              :class="['dir-internal-btn', form.internalOnly && 'active']"
              @click="form.internalOnly = !form.internalOnly"
            >
              <svg v-if="form.internalOnly" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="7" width="10" height="8" rx="1.5"/>
                <path d="M5 7V5a3 3 0 0 1 6 0v2"/>
              </svg>
              <svg v-else width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="7" width="10" height="8" rx="1.5"/>
                <path d="M5 7V4a3 3 0 0 1 5.83-1"/>
              </svg>
              {{ form.internalOnly
                ? (isEN ? 'Internal — hidden from client PDF' : 'Interno — oculto en PDF de cliente')
                : (isEN ? 'Visible to client' : 'Visible para cliente') }}
            </button>
          </div>

        </div>

        <!-- Form actions -->
        <div class="dir-form-actions">
          <button v-if="!isNew" class="dir-form-btn dir-form-btn--delete" @click.stop="confirmDelete">
            {{ isEN ? 'Delete' : 'Eliminar' }}
          </button>
          <button class="dir-form-btn dir-form-btn--cancel" @click.stop="cancel">
            {{ isEN ? 'Cancel' : 'Cancelar' }}
          </button>
          <button class="dir-form-btn dir-form-btn--save" @click.stop="save" :disabled="!form.title.trim()">
            {{ isEN ? 'Save' : 'Guardar' }}
          </button>
        </div>

      </div>
    </template>

  </div>
</template>

<script setup>
import { uid } from '~/utils/helpers'
import { convertTimezone, fmt12h } from '~/utils/helpers'

const props = defineProps({
  item:         { type: Object,  default: null },
  isNew:        { type: Boolean, default: false },
  initialDate:  { type: String,  default: '' },
  project:      { type: Object,  required: true },
  lang:         { type: String,  default: 'es' },
  primaryTz:    { type: Object,  default: null },
  secondaryTzs: { type: Array,   default: () => [] },
  readOnly:     { type: Boolean, default: false },
  startEditing: { type: Boolean, default: false },
})

const emit = defineEmits(['update', 'delete', 'duplicate', 'save', 'cancel', 'add-below'])

const isEN     = computed(() => props.lang === 'en')
const titleRef = ref(null)

// ── State ─────────────────────────────────────────────────────────────────────
const editing    = ref(props.isNew || props.startEditing)
const confirmDel = ref(false)
const moreOpen   = ref(false)
const dirRef     = ref(null)

function onDocClick() {
  if (form.title.trim()) save()
  else cancel()
}

function handleOutsideClick(e) {
  const path = e.composedPath()
  if (dirRef.value && path.includes(dirRef.value)) return
  onDocClick()
}

async function confirmDelete() {
  if (props.isNew) return
  const ok = await useDialog().confirm({
    title:        isEN.value ? 'Delete daily event?' : '¿Eliminar Daily Event?',
    body:         isEN.value ? 'This action cannot be undone.' : 'Esta acción no se puede deshacer.',
    confirmLabel: isEN.value ? 'Delete' : 'Eliminar',
    cancelLabel:  isEN.value ? 'Cancel' : 'Cancelar',
  })
  if (!ok) return
  emit('delete')
}

// Cmd/Ctrl + Delete or Backspace deletes the event (only when editing an existing one).
function handleEditKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'Backspace' || e.key === 'Delete')) {
    if (props.isNew) return
    e.preventDefault()
    confirmDelete()
  }
}

watch(editing, (val) => {
  if (val) {
    document.addEventListener('click', handleOutsideClick)
    document.addEventListener('keydown', handleEditKeydown)
  } else {
    document.removeEventListener('click', handleOutsideClick)
    document.removeEventListener('keydown', handleEditKeydown)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  document.removeEventListener('keydown', handleEditKeydown)
})

// Normalize a stored department reference (id, key or name) into the group's key.
// Keeps daily departments[] aligned with calendar event.groups[] (also keys).
function deptToKey(val) {
  if (!val) return null
  const grp = (props.project?.groups || []).find(g => g.id === val || g.key === val || g.name === val)
  return grp?.key || val
}

function normalizeDepts(i) {
  if (Array.isArray(i.departments) && i.departments.length) {
    return i.departments.map(deptToKey).filter(Boolean)
  }
  if (i.department) {
    const k = deptToKey(i.department)
    return k ? [k] : []
  }
  return []
}

function initForm() {
  const i = props.item || {}
  const hasMore = !!(i.locationAddress || i.locationGoogleMapsUrl || i.relatedCalendarEventId || i.departments?.length || i.department)
  if (hasMore && !props.isNew) moreOpen.value = true
  return {
    date:                   props.initialDate || i.date || '',
    timeType:               i.timeType              || 'time_label',
    specificTime:           i.specificTime          || '',
    timeLabel:              i.timeLabel             || 'TBD',
    title:                  i.title                 || '',
    duration:               i.duration != null ? String(i.duration) : '',
    locationType:           i.locationType          || 'on_location',
    locationName:           i.locationName          || '',
    locationAddress:        i.locationAddress       || '',
    locationGoogleMapsUrl:  i.locationGoogleMapsUrl || '',
    notes:                  i.notes                 || '',
    participants:           i.participants          || '',
    relatedCalendarEventId: i.relatedCalendarEventId || '',
    departments:            normalizeDepts(i),
    internalOnly:           i.internalOnly          || false,
  }
}

const form = reactive(initForm())

function toggleDept(key) {
  const idx = form.departments.indexOf(key)
  if (idx >= 0) form.departments.splice(idx, 1)
  else form.departments.push(key)
}

// When the user picks a related calendar event, inherit its departments.
// Only fires on user-driven changes (initial form value doesn't trigger watch).
watch(() => form.relatedCalendarEventId, (newId) => {
  if (!newId) return
  const ev = (props.project?.events || []).find(e => e.id === newId)
  if (!ev) return
  form.departments = [...(ev.groups || [])]
})

onMounted(() => {
  if (props.isNew) nextTick(() => titleRef.value?.focus())
  if (props.startEditing && !props.isNew) {
    nextTick(() => {
      dirRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      titleRef.value?.focus()
      titleRef.value?.select()
    })
  }
})

// ── Time type logic ───────────────────────────────────────────────────────────
function setTimeType(type) {
  form.timeType = type
  if (type === 'specific_time') form.timeLabel = form.timeLabel || 'TBD'
}

function setLabel(lbl) {
  form.timeType  = 'time_label'
  form.timeLabel = lbl
}

// ── Display time ─────────────────────────────────────────────────────────────
const displayTime = computed(() => {
  if (!props.item) return ''
  if (props.item.timeType === 'specific_time') return fmt12h(props.item.specificTime)
  if (props.item.timeType === 'time_label')    return props.item.timeLabel || 'TBD'
  return 'TBD'
})

// Secondary timezone conversions — grouped by converted time
const groupedSecondaryTimes = computed(() => {
  if (!props.item || props.item.timeType !== 'specific_time') return []
  if (!props.primaryTz || !props.item.specificTime || !props.item.date) return []
  const groups = {}
  for (const tz of (props.secondaryTzs || [])) {
    const converted = convertTimezone(props.item.date, props.item.specificTime, props.primaryTz.tz, tz.tz)
    if (!converted) continue
    const time = fmt12h(converted)
    const city = tz.city || tz.shortLabel || tz.tz || ''
    if (!groups[time]) groups[time] = []
    groups[time].push(city)
  }
  return Object.entries(groups).map(([time, cities]) => `${time} ${cities.join(', ')}`)
})

// ── Related event ─────────────────────────────────────────────────────────────
const STAGE_LABELS = {
  es: { bid: 'Licitación', pre: 'Preproducción', sht: 'Rodaje', vpst: 'Post Video', spst: 'Post Foto' },
  en: { bid: 'Bidding',    pre: 'Pre-Production', sht: 'Shoot', vpst: 'Video Post', spst: 'Still Post' },
}
const STAGE_ORDER_LIST = ['bid', 'pre', 'sht', 'vpst', 'spst']

const relatedEventsGrouped = computed(() => {
  const evs = (props.project?.events || []).filter(e => e.active !== false)
  const byStage = {}
  evs.forEach(ev => {
    const key = ev.stage || '_none'
    if (!byStage[key]) byStage[key] = []
    byStage[key].push(ev)
  })
  const labels = STAGE_LABELS[props.lang] || STAGE_LABELS.es
  // Show standard stages first, then any extra stage keys found in the project
  const knownStages   = STAGE_ORDER_LIST.filter(s => byStage[s]?.length)
  const unknownStages = Object.keys(byStage).filter(s => s !== '_none' && !STAGE_ORDER_LIST.includes(s))
  const noStage       = byStage['_none']?.length ? ['_none'] : []
  return [...knownStages, ...unknownStages, ...noStage].map(s => ({
    key: s,
    label: labels[s] || (s === '_none'
      ? (props.lang === 'en' ? 'Other' : 'Otros')
      : (() => {
          const st = (props.project?.stages || []).find(x => x.id === s || x.key === s)
          if (!st) return s
          return (props.lang === 'en' ? st.nameEN : st.name) || st.name || s
        })()
    ),
    events: byStage[s].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  }))
})

const relatedEventName = computed(() => {
  if (!props.item?.relatedCalendarEventId) return null
  const ev = (props.project?.events || []).find(e => e.id === props.item.relatedCalendarEventId)
  if (!ev) return null
  return props.lang === 'en' ? (ev.nameEN || ev.name) : ev.name
})

const relatedDateConflict = computed(() => {
  if (!props.item?.relatedCalendarEventId || !props.item?.date) return false
  const ev = (props.project?.events || []).find(e => e.id === props.item.relatedCalendarEventId)
  if (!ev?.date) return false
  const dur = Number(ev.duration) || 1
  const evEnd = ev.date && dur > 1
    ? new Date(new Date(ev.date).getTime() + (dur - 1) * 86400000).toISOString().slice(0, 10)
    : ev.date
  return props.item.date < ev.date || props.item.date > evEnd
})

// ── Department options — shared with project departments (groups) ─────────────
const deptOptions = computed(() =>
  (props.project?.groups || []).filter(g => g.active !== false)
)

function deptDisplayName(val) {
  if (!val) return ''
  const grp = (props.project?.groups || []).find(g => g.id === val || g.name === val || g.key === val)
  if (grp) return isEN.value ? (grp.nameEN || grp.name) : grp.name
  return val  // backward compat: show raw string if no match
}

// Joined label for the collapsed row — handles both new departments[] and legacy department.
const itemDepartmentsLabel = computed(() => {
  const i = props.item || {}
  const list = Array.isArray(i.departments) && i.departments.length
    ? i.departments
    : (i.department ? [i.department] : [])
  return list.map(deptDisplayName).filter(Boolean).join(' · ')
})

function fmtDuration(val) {
  if (!val) return ''
  const trimmed = String(val).trim()
  const n = Number(trimmed)
  if (!isNaN(n) && isFinite(n) && trimmed === String(n)) {
    return n === 1 ? '1 HR' : `${trimmed} HRS`
  }
  return trimmed
}

// ── Actions ───────────────────────────────────────────────────────────────────
function handleDirClick(e) {
  if (!editing.value && !props.readOnly) startEdit()
}

function startEdit() {
  Object.assign(form, initForm())
  editing.value = true
  document.addEventListener('click', handleOutsideClick)
  nextTick(() => titleRef.value?.focus())
}

function cancel() {
  if (props.isNew) {
    emit('cancel')
  } else {
    editing.value = false
    confirmDel.value = false
  }
}

function save() {
  if (!form.title.trim()) return
  const now = new Date().toISOString()
  const isRemote = form.locationType === 'remote'
  const locFields = {
    locationType:          form.locationType,
    locationName:          isRemote ? '' : form.locationName.trim(),
    locationAddress:       isRemote ? '' : form.locationAddress.trim(),
    locationGoogleMapsUrl: isRemote ? '' : form.locationGoogleMapsUrl.trim(),
  }
  if (props.isNew) {
    emit('save', {
      id:                     uid(),
      date:                   form.date,
      timeType:               form.timeType,
      specificTime:           form.timeType === 'specific_time' ? form.specificTime : '',
      timeLabel:              form.timeType === 'time_label'    ? form.timeLabel    : null,
      title:                  form.title.trim(),
      duration:               form.duration.trim(),
      ...locFields,
      notes:                  form.notes.trim(),
      participants:           form.participants.trim(),
      relatedCalendarEventId: form.relatedCalendarEventId || null,
      departments:            [...form.departments],
      department:             '',
      internalOnly:           form.internalOnly,
      sortOrder:              null,
      createdAt:              now,
      updatedAt:              now,
    })
  } else {
    emit('update', {
      date:                   form.date,
      timeType:               form.timeType,
      specificTime:           form.timeType === 'specific_time' ? form.specificTime : '',
      timeLabel:              form.timeType === 'time_label'    ? form.timeLabel    : null,
      title:                  form.title.trim(),
      duration:               form.duration.trim(),
      ...locFields,
      notes:                  form.notes.trim(),
      participants:           form.participants.trim(),
      relatedCalendarEventId: form.relatedCalendarEventId || null,
      departments:            [...form.departments],
      department:             '',
      internalOnly:           form.internalOnly,
    })
    editing.value = false
  }
}
</script>

<style scoped>
.dir {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 9px 20px;
  border-bottom: 1px solid rgba(255,255,255,.04);
  transition: background .1s;
  min-height: 44px;
  cursor: pointer;
  position: relative;
}
.dir--editing { cursor: default; }
.dir:hover:not(.dir--editing) { background: rgba(255,255,255,.025); }
.dir--internal { background: rgba(255,160,32,.04); }
.dir--editing {
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  padding: 12px 20px;
}

/* ── Time column ── */
.dir-time-col {
  width: 90px;
  flex-shrink: 0;
  padding-top: 1px;
}
.dir-time-main {
  font-size: .82rem;
  font-weight: 700;
  color: var(--text);
  font-family: 'Nunito', sans-serif;
}
.dir-time-sec {
  font-size: .65rem;
  color: var(--muted);
  margin-top: 2px;
}

/* ── Content ── */
.dir-content { flex: 1; min-width: 0; }
.dir-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.dir-lock {
  flex-shrink: 0;
  opacity: .55;
  color: var(--warning);
}
.dir-title {
  font-size: .85rem;
  font-weight: 600;
  color: var(--text);
}
.dir-duration {
  font-size: .68rem;
  color: var(--muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0 5px;
}
.dir-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  font-size: .73rem;
  color: var(--muted);
  flex-wrap: wrap;
}
.dir-meta-icon { font-size: .7rem; }
.dir-loc-link { color: var(--accent); text-decoration: none; }
.dir-loc-link:hover { text-decoration: underline; }
.dir-address { color: var(--muted); opacity: .7; font-size: .68rem; }
.dir-address-link { color: var(--accent); text-decoration: none; opacity: 1; }
.dir-address-link:hover { text-decoration: underline; }
.dir-notes {
  margin-top: 4px;
  font-size: .72rem;
  color: var(--muted);
  font-style: italic;
  line-height: 1.55;
}
.dir-related {
  margin-top: 4px;
  font-size: .68rem;
  color: var(--muted);
}
.dir-related-label { opacity: .6; }
.dir-related-conflict {
  color: #e05252;
  opacity: .75;
  font-style: italic;
}
.dir-dept {
  display: inline-block;
  margin-top: 4px;
  font-size: .62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .4px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--surface-2);
  color: var(--muted);
  border: 1px solid var(--border);
}

/* ── Row actions ── */
.dir-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding-top: 1px;
  opacity: 0;
  transition: opacity .15s;
}
.dir:hover .dir-actions { opacity: 1; }
.dir-act-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--muted);
  cursor: pointer;
  font-size: .72rem;
  padding: 3px 7px;
  transition: all .13s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dir-act-btn:hover { border-color: var(--accent); color: var(--accent); }
.dir-act-btn--del:hover { border-color: var(--danger); color: var(--danger); }
.dir-del-confirm {
  font-size: .68rem;
  font-weight: 700;
  padding: 3px 9px;
  background: var(--danger);
  border: none;
  border-radius: 5px;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
}
.dir-del-cancel {
  font-size: .68rem;
  padding: 3px 7px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
}

/* ── Form ── */
.dir-form { width: 100%; display: flex; flex-direction: column; gap: 10px; }
.dir-form-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.dir-form-label {
  width: 90px;
  flex-shrink: 0;
  font-size: .7rem;
  font-weight: 600;
  color: var(--muted);
  padding-top: 7px;
}
.dir-input {
  flex: 1;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 6px;
  padding: 5px 9px;
  font-size: .78rem;
  color: var(--text);
  font-family: inherit;
  min-width: 0;
}
.dir-input:focus { outline: none; border-color: var(--accent); }
.dir-input--time { flex: none; width: 130px; }
.dir-input--half { flex: none; width: 150px; }
.dir-textarea { resize: vertical; min-height: 52px; line-height: 1.5; }
.dir-select { cursor: pointer; }
.dir-select option, .dir-select optgroup { background: var(--surface); }

/* Time selector */
.dir-time-wrap { flex: 1; display: flex; flex-direction: column; gap: 7px; }
.dir-time-type { display: flex; gap: 4px; }
.dir-time-type-btn {
  padding: 4px 10px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: .68rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all .12s;
}
.dir-time-type-btn:hover { border-color: var(--text); color: var(--text); }
.dir-time-type-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(32,167,137,.1); }

/* More options */
.dir-more-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  color: var(--muted);
  font-size: .7rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  transition: color .13s;
}
.dir-more-toggle:hover { color: var(--text); }
.dir-more-arrow {
  display: inline-block;
  transition: transform .13s;
  font-size: .85rem;
}
.dir-more-arrow.open { transform: rotate(90deg); }
.dir-more { display: flex; flex-direction: column; gap: 10px; }

/* Internal only toggle */
.dir-internal-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: .72rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all .13s;
  text-align: left;
}
.dir-internal-btn:hover { border-color: var(--warning); color: var(--warning); }
.dir-internal-btn.active { border-color: var(--warning); color: var(--warning); background: rgba(255,161,32,.08); }

/* Department chips (multi-select) */
.dir-dept-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dir-dept-chip {
  padding: 5px 12px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: .72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .3px;
  cursor: pointer;
  font-family: inherit;
  transition: all .13s;
}
.dir-dept-chip:hover { border-color: var(--accent); color: var(--accent); }
.dir-dept-chip.active { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.08); }

/* Form actions */
.dir-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  padding-top: 4px;
  border-top: 1px solid var(--border);
  margin-top: 2px;
}
.dir-form-btn {
  padding: 6px 16px;
  border-radius: 7px;
  font-size: .75rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all .13s;
}
.dir-form-btn--cancel {
  background: transparent;
  border: 1.5px solid var(--border);
  color: var(--muted);
}
.dir-form-btn--cancel:hover { border-color: var(--text); color: var(--text); }
.dir-form-btn--delete {
  background: transparent;
  border: 1.5px solid transparent;
  color: rgba(239,68,68,.5);
  margin-right: auto;
}
.dir-form-btn--delete:hover { border-color: var(--danger); color: var(--danger); }
.dir-form-btn--save {
  background: var(--accent);
  border: 1.5px solid var(--accent);
  color: #fff;
}
.dir-form-btn--save:hover { background: var(--accent-dark); border-color: var(--accent-dark); }
.dir-form-btn--save:disabled { opacity: .4; cursor: not-allowed; }
</style>
