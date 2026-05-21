<template>
  <div :class="['dir', editing && 'dir--editing', item?.internalOnly && !editing && 'dir--internal']">

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
          <span v-if="item.internalOnly" class="dir-lock" title="Internal only">🔒</span>
          <span class="dir-title">{{ item.title }}</span>
          <span v-if="item.duration" class="dir-duration">{{ item.duration }}</span>
        </div>
        <div v-if="item.locationName" class="dir-meta">
          <span class="dir-meta-icon">📍</span>
          <a
            v-if="item.locationGoogleMapsUrl"
            :href="item.locationGoogleMapsUrl"
            target="_blank"
            rel="noopener"
            class="dir-loc-link"
          >{{ item.locationName }}</a>
          <span v-else>{{ item.locationName }}</span>
          <span v-if="item.locationAddress" class="dir-address">{{ item.locationAddress }}</span>
        </div>
        <div v-if="item.participants" class="dir-meta">
          <span class="dir-meta-icon">👥</span>
          <span>{{ item.participants }}</span>
        </div>
        <div v-if="item.notes" class="dir-notes">{{ item.notes }}</div>
        <div v-if="relatedEventName" class="dir-related">
          <span class="dir-related-label">{{ isEN ? 'Related event' : 'Evento relacionado' }}:</span>
          {{ relatedEventName }}
        </div>
        <div v-if="item.department" class="dir-dept">{{ deptDisplayName(item.department) }}</div>
      </div>

      <div v-if="!readOnly" class="dir-actions">
        <button class="dir-act-btn" @click="startEdit" :title="isEN ? 'Edit' : 'Editar'">✎</button>
        <button
          v-if="!confirmDel"
          class="dir-act-btn dir-act-btn--del"
          @click="confirmDel = true"
          :title="isEN ? 'Delete' : 'Eliminar'"
        >⌫</button>
        <template v-else>
          <button class="dir-del-confirm" @click="$emit('delete')">
            {{ isEN ? 'Delete' : 'Eliminar' }}
          </button>
          <button class="dir-del-cancel" @click="confirmDel = false">
            {{ isEN ? 'Cancel' : 'Cancelar' }}
          </button>
        </template>
      </div>
    </template>

    <!-- ── Edit / Create form ──────────────────────────────────────────────── -->
    <template v-else>
      <div class="dir-form">

        <!-- Date (shown only for new items) -->
        <div v-if="isNew" class="dir-form-row">
          <label class="dir-form-label">{{ isEN ? 'Date' : 'Fecha' }} *</label>
          <input type="date" v-model="form.date" class="dir-input" />
        </div>

        <!-- Time -->
        <div class="dir-form-row">
          <label class="dir-form-label">{{ isEN ? 'Time' : 'Hora' }}</label>
          <div class="dir-time-wrap">
            <!-- Type toggle -->
            <div class="dir-time-type">
              <button
                :class="['dir-time-type-btn', form.timeType === 'specific_time' && 'active']"
                @click="setTimeType('specific_time')"
              >{{ isEN ? 'Time' : 'Hora' }}</button>
              <button
                :class="['dir-time-type-btn', form.timeType === 'time_label' && 'active']"
                @click="setTimeType('time_label')"
              >Label</button>
              <button
                :class="['dir-time-type-btn', !form.timeType && 'active']"
                @click="setTimeType(null)"
              >—</button>
            </div>
            <!-- Specific time input -->
            <input
              v-if="form.timeType === 'specific_time'"
              type="time"
              v-model="form.specificTime"
              class="dir-input dir-input--time"
            />
            <!-- Label options -->
            <div v-if="form.timeType === 'time_label'" class="dir-label-opts">
              <button
                v-for="lbl in ['TBD','AM','PM','All Day']"
                :key="lbl"
                :class="['dir-label-btn', form.timeLabel === lbl && 'active']"
                @click="form.timeLabel = lbl"
              >{{ lbl }}</button>
            </div>
          </div>
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

        <!-- Location name -->
        <div class="dir-form-row">
          <label class="dir-form-label">{{ isEN ? 'Location' : 'Locación' }}</label>
          <input
            type="text"
            v-model="form.locationName"
            class="dir-input"
            :placeholder="isEN ? 'Studio A, Hotel Lobby…' : 'Estudio A, Lobby del Hotel…'"
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

        <!-- More options toggle -->
        <button class="dir-more-toggle" @click="moreOpen = !moreOpen">
          <span :class="['dir-more-arrow', moreOpen && 'open']">›</span>
          {{ isEN ? 'More options' : 'Más opciones' }}
        </button>

        <div v-if="moreOpen" class="dir-more">

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

          <!-- Department (uses project departments/groups) -->
          <div class="dir-form-row">
            <label class="dir-form-label">{{ isEN ? 'Department' : 'Departamento' }}</label>
            <select v-model="form.department" class="dir-input dir-select">
              <option value="">{{ isEN ? '— None —' : '— Ninguno —' }}</option>
              <option v-for="d in deptOptions" :key="d.id" :value="d.id">
                {{ isEN ? (d.nameEN || d.name) : d.name }}
              </option>
            </select>
          </div>

          <!-- Internal only -->
          <div class="dir-form-row">
            <label class="dir-form-label">{{ isEN ? 'Internal only' : 'Solo interno' }}</label>
            <button
              :class="['dir-internal-btn', form.internalOnly && 'active']"
              @click="form.internalOnly = !form.internalOnly"
            >
              🔒 {{ form.internalOnly
                ? (isEN ? 'Internal — hidden from client PDF' : 'Interno — oculto en PDF de cliente')
                : (isEN ? 'Visible to client' : 'Visible para cliente') }}
            </button>
          </div>

        </div>

        <!-- Form actions -->
        <div class="dir-form-actions">
          <button class="dir-form-btn dir-form-btn--cancel" @click="cancel">
            {{ isEN ? 'Cancel' : 'Cancelar' }}
          </button>
          <button
            class="dir-form-btn dir-form-btn--save"
            :disabled="!form.title.trim()"
            @click="save"
          >{{ isEN ? 'Save' : 'Guardar' }}</button>
        </div>

      </div>
    </template>

  </div>
</template>

<script setup>
import { uid } from '~/utils/helpers'
import { convertTimezone, fmt12h } from '~/utils/helpers'

const props = defineProps({
  item:        { type: Object,  default: null },
  isNew:       { type: Boolean, default: false },
  initialDate: { type: String,  default: '' },
  project:     { type: Object,  required: true },
  lang:        { type: String,  default: 'es' },
  primaryTz:   { type: Object,  default: null },
  secondaryTzs:{ type: Array,   default: () => [] },
  readOnly:    { type: Boolean, default: false },
})

const emit = defineEmits(['update', 'delete', 'save', 'cancel'])

const isEN     = computed(() => props.lang === 'en')
const titleRef = ref(null)

// ── State ─────────────────────────────────────────────────────────────────────
const editing    = ref(props.isNew)
const confirmDel = ref(false)
const moreOpen   = ref(false)

function initForm() {
  const i = props.item || {}
  const hasMore = !!(i.locationAddress || i.locationGoogleMapsUrl || i.relatedCalendarEventId || i.department)
  if (hasMore && !props.isNew) moreOpen.value = true
  return {
    date:                   props.initialDate || i.date || '',
    timeType:               i.timeType              || null,
    specificTime:           i.specificTime          || '',
    timeLabel:              i.timeLabel             || 'TBD',
    title:                  i.title                 || '',
    duration:               i.duration != null ? String(i.duration) : '',
    locationName:           i.locationName          || '',
    locationAddress:        i.locationAddress       || '',
    locationGoogleMapsUrl:  i.locationGoogleMapsUrl || '',
    notes:                  i.notes                 || '',
    participants:           i.participants          || '',
    relatedCalendarEventId: i.relatedCalendarEventId || '',
    department:             i.department            || '',
    internalOnly:           i.internalOnly          || false,
  }
}

const form = reactive(initForm())

onMounted(() => {
  if (props.isNew) nextTick(() => titleRef.value?.focus())
})

// ── Time type logic ───────────────────────────────────────────────────────────
function setTimeType(type) {
  form.timeType = type
  if (type === null) {
    form.specificTime = ''
    form.timeLabel    = 'TBD'
  }
  if (type === 'time_label' && !form.timeLabel) form.timeLabel = 'TBD'
}

// ── Display time ─────────────────────────────────────────────────────────────
const displayTime = computed(() => {
  if (!props.item) return ''
  if (props.item.timeType === 'specific_time') return fmt12h(props.item.specificTime)
  if (props.item.timeType === 'time_label')    return props.item.timeLabel || '—'
  return '—'
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
    label: labels[s] || (s === '_none' ? (props.lang === 'en' ? 'Other' : 'Otros') : s),
    events: byStage[s].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  }))
})

const relatedEventName = computed(() => {
  if (!props.item?.relatedCalendarEventId) return null
  const ev = (props.project?.events || []).find(e => e.id === props.item.relatedCalendarEventId)
  if (!ev) return null
  return props.lang === 'en' ? (ev.nameEN || ev.name) : ev.name
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

// ── Actions ───────────────────────────────────────────────────────────────────
function startEdit() {
  Object.assign(form, initForm())
  editing.value = true
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
  if (props.isNew) {
    emit('save', {
      id:                     uid(),
      date:                   form.date,
      timeType:               form.timeType,
      specificTime:           form.timeType === 'specific_time' ? form.specificTime : '',
      timeLabel:              form.timeType === 'time_label'    ? form.timeLabel    : null,
      title:                  form.title.trim(),
      duration:               form.duration.trim(),
      locationName:           form.locationName.trim(),
      locationAddress:        form.locationAddress.trim(),
      locationGoogleMapsUrl:  form.locationGoogleMapsUrl.trim(),
      notes:                  form.notes.trim(),
      participants:           form.participants.trim(),
      relatedCalendarEventId: form.relatedCalendarEventId || null,
      department:             form.department,
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
      locationName:           form.locationName.trim(),
      locationAddress:        form.locationAddress.trim(),
      locationGoogleMapsUrl:  form.locationGoogleMapsUrl.trim(),
      notes:                  form.notes.trim(),
      participants:           form.participants.trim(),
      relatedCalendarEventId: form.relatedCalendarEventId || null,
      department:             form.department,
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
}
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
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;
}
.dir-lock { font-size: .75rem; }
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
  align-items: baseline;
  gap: 5px;
  margin-top: 3px;
  font-size: .73rem;
  color: var(--muted);
  flex-wrap: wrap;
}
.dir-meta-icon { font-size: .7rem; }
.dir-loc-link { color: var(--accent); text-decoration: none; }
.dir-loc-link:hover { text-decoration: underline; }
.dir-address { color: var(--muted); opacity: .7; font-size: .68rem; }
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
.dir-label-opts { display: flex; gap: 4px; flex-wrap: wrap; }
.dir-label-btn {
  padding: 4px 10px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: .72rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all .12s;
}
.dir-label-btn:hover { border-color: var(--text); color: var(--text); }
.dir-label-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(32,167,137,.1); }

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
.dir-form-btn--save {
  background: var(--accent);
  border: 1.5px solid var(--accent);
  color: #fff;
}
.dir-form-btn--save:hover { background: var(--accent-dark); border-color: var(--accent-dark); }
.dir-form-btn--save:disabled { opacity: .4; cursor: not-allowed; }
</style>
