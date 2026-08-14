<template>
  <div
    ref="dirRef"
    :class="['dir', editing && 'dir--editing', item?.internalOnly && !editing && 'dir--internal']"
    @click="handleDirClick"
  >

    <!-- ── Display mode ────────────────────────────────────────────────────── -->
    <template v-if="!editing">
      <!-- La hora se edita EN LA FILA. Correr un horario es lo que más se hace en un daily
           —y muchas veces varios seguidos—, y abrir el formulario completo para tocar un
           solo campo era todo el trabajo por nada. El resto del evento sigue detrás del
           formulario: acá solo la hora. -->
      <div class="dir-time-col">
        <div v-if="timeEditing" ref="timeEditRef" class="dir-time-edit" @click.stop>
          <div class="dir-time-type">
            <button
              type="button"
              :class="['dir-time-type-btn', timeForm.timeType === 'specific_time' && 'active']"
              @click.stop="pickSpecific"
            >{{ isEN ? 'Time' : 'Hora' }}</button>
            <button
              v-for="lbl in ['TBD','AM','PM','All Day']"
              :key="lbl"
              type="button"
              :class="['dir-time-type-btn', timeForm.timeType === 'time_label' && timeForm.timeLabel === lbl && 'active']"
              @click.stop="pickLabel(lbl)"
            >{{ lbl }}</button>
          </div>
          <input
            v-if="timeForm.timeType === 'specific_time'"
            ref="timeInputRef"
            type="time"
            v-model="timeForm.specificTime"
            class="dir-input dir-input--time"
            @keydown.enter.stop.prevent="saveTime"
            @keydown.esc.stop.prevent="cancelTime"
          />
        </div>
        <button
          v-else-if="!readOnly"
          type="button"
          class="dir-time-hit"
          :title="isEN ? 'Change the time without opening the event' : 'Cambiar la hora sin abrir el evento'"
          @click.stop="startTimeEdit"
        >
          <span class="dir-time-main">{{ displayTime }}</span>
          <span v-if="groupedSecondaryTimes.length" class="dir-time-sec">
            ({{ groupedSecondaryTimes.join(' / ') }})
          </span>
        </button>
        <template v-else>
          <div class="dir-time-main">{{ displayTime }}</div>
          <div v-if="groupedSecondaryTimes.length" class="dir-time-sec">
            ({{ groupedSecondaryTimes.join(' / ') }})
          </div>
        </template>
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
        <div v-if="participantsDisplay.length" class="dir-meta">
          <span class="dir-meta-icon">👥</span>
          <span class="dir-meta-people">
            <template v-for="(p, i) in participantsDisplay" :key="p.name + i">
              <span v-if="i" >, </span>{{ p.name }}<span v-if="p.role" class="dir-meta-role"> · {{ p.role }}</span>
            </template>
          </span>
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
          <!-- The mirror span holds the same text and sets the height: the box grows as
               you type, without measuring anything on screen. -->
          <div class="dir-grow">
            <textarea
              v-model="form.notes"
              class="dir-input dir-textarea"
              rows="2"
            ></textarea>
            <span class="dir-grow-mirror" aria-hidden="true">{{ form.notes }}&nbsp;</span>
          </div>
        </div>

        <!-- Participants -->
        <div class="dir-form-row">
          <label class="dir-form-label">{{ isEN ? 'Participants' : 'Participantes' }}</label>
          <div class="dir-part">
            <div v-if="participantChips.length" class="dir-part-chips">
              <span
                v-for="chip in participantChips"
                :key="chip.key"
                class="dir-part-chip"
                :class="{ 'dir-part-chip--adhoc': chip.adhoc, 'dir-part-chip--missing': chip.missing }"
                :title="chip.missing ? (isEN ? 'This contact was removed from the directory' : 'Este contacto ya no está en el directorio') : (chip.adhoc ? (isEN ? 'Typed in (not in directory)' : 'Escrito a mano (no está en el directorio)') : chip.title)"
              >
                {{ chip.label }}<span v-if="chip.title" class="dir-part-chip-role">· {{ chip.title }}</span>
                <button
                  type="button"
                  class="dir-part-chip-x"
                  @click.stop="removeParticipant(chip)"
                  :title="isEN ? 'Remove' : 'Quitar'"
                >×</button>
              </span>
            </div>
            <div class="dir-part-search">
              <input
                ref="partSearchRef"
                type="text"
                v-model="partQuery"
                class="dir-input"
                :placeholder="isEN ? 'Search contacts or type a name…' : 'Buscar contactos o escribir un nombre…'"
                @focus="partOpen = true"
                @blur="partOpen = false"
                @keydown.enter.prevent="onPartEnter"
                @keydown.esc.stop.prevent="partOpen = false"
              />
              <div v-if="partOpen && (partMatches.length || canAddAdhoc)" class="dir-part-menu">
                <button
                  v-for="c in partMatches"
                  :key="c.id"
                  type="button"
                  class="dir-part-opt"
                  @mousedown.prevent="addContact(c)"
                >
                  <span class="dir-part-opt-name">{{ c.name }}</span>
                  <span v-if="c.title" class="dir-part-opt-role">{{ c.title }}</span>
                </button>
                <button
                  v-if="canAddAdhoc"
                  type="button"
                  class="dir-part-opt dir-part-opt--adhoc"
                  @mousedown.prevent="addAdhoc(partQuery)"
                >
                  {{ isEN ? 'Add' : 'Añadir' }} “{{ partQuery.trim() }}”
                  <span class="dir-part-opt-role">{{ isEN ? 'new contact' : 'nuevo contacto' }}</span>
                </button>
              </div>
            </div>
          </div>
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

// ── Editor de hora en la fila ─────────────────────────────────────────────────
// Vive aparte del formulario grande a propósito, con su propio estado y su propio
// listener: son dos modos de edición distintos que no se pisan (el formulario ni se
// renderiza mientras este está abierto, porque el bloque de display es `v-if="!editing"`).
const timeEditing   = ref(false)
const timeEditRef   = ref(null)
const timeInputRef  = ref(null)
const timeForm      = reactive({ timeType: 'time_label', specificTime: '', timeLabel: 'TBD' })

function startTimeEdit() {
  if (props.readOnly || editing.value) return
  timeForm.timeType     = props.item?.timeType     || 'time_label'
  timeForm.specificTime = props.item?.specificTime || ''
  timeForm.timeLabel    = props.item?.timeLabel    || 'TBD'
  timeEditing.value = true
  // El listener se registra en el TICK SIGUIENTE, y no es un detalle: registrarlo acá lo
  // engancha a la propagación del clic que acaba de abrir el editor, que sigue subiendo hasta
  // `document`. Ahí `handleTimeOutsideClick` se dispara de inmediato con `timeEditRef` todavía
  // en null —el editor no se renderizó— y lo cierra en el mismo clic: el editor no abría nunca.
  // El formulario grande no sufre esto porque su chequeo compara contra la FILA, que sí existe
  // y sí contiene al objetivo del clic.
  nextTick(() => {
    document.addEventListener('click', handleTimeOutsideClick)
    if (timeForm.timeType === 'specific_time') timeInputRef.value?.focus()
  })
}

function closeTimeEdit() {
  timeEditing.value = false
  document.removeEventListener('click', handleTimeOutsideClick)
}

function cancelTime() { closeTimeEdit() }

// Elegir una etiqueta guarda de inmediato: un clic y listo es justamente el caso que este
// editor existe para resolver. Pedir un segundo clic de confirmación para "TBD" sería
// devolverle el trabajo que se le quitó.
function pickLabel(lbl) {
  timeForm.timeType  = 'time_label'
  timeForm.timeLabel = lbl
  saveTime()
}

// Una hora sí necesita que la escriban, así que este botón solo abre el campo.
function pickSpecific() {
  timeForm.timeType = 'specific_time'
  nextTick(() => timeInputRef.value?.focus())
}

function saveTime() {
  // Una hora a medio escribir llega VACÍA desde un <input type="time">. Guardar eso
  // borraría el horario que ya estaba, así que se descarta el cambio en vez de escribir el
  // vacío: perder un horario por cerrar mal un campo es peor que no haberlo cambiado.
  if (timeForm.timeType === 'specific_time' && !timeForm.specificTime) return closeTimeEdit()

  // Cuerpo PARCIAL, solo los campos de hora: `updateDailyEvent` del store hace
  // Object.assign sobre el item, así que no hay que reenviar el evento entero —y reenviarlo
  // desde acá significaría reconstruirlo a mano y arriesgar pisar algo.
  emit('update', {
    timeType:     timeForm.timeType,
    specificTime: timeForm.timeType === 'specific_time' ? timeForm.specificTime : '',
    timeLabel:    timeForm.timeType === 'time_label'    ? timeForm.timeLabel    : null,
  })
  closeTimeEdit()
}

// Clic afuera GUARDA, igual que el formulario grande: el usuario ya eligió la hora, y
// hacerle perder el cambio por clickear al lado sería un castigo. Mismo `composedPath()`
// que `handleOutsideClick`, que es lo que hace que funcione con el desplegable nativo del
// campo de hora.
function handleTimeOutsideClick(e) {
  const path = e.composedPath()
  if (timeEditRef.value && path.includes(timeEditRef.value)) return
  saveTime()
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
  // El editor de hora tiene su propio listener y la fila se desmonta al reordenarse —cambiar
  // una hora RECOLOCA la fila en la lista, que está ordenada por hora—, así que este remove
  // no es defensivo: es el camino normal.
  document.removeEventListener('click', handleTimeOutsideClick)
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

  // Participants: structured picker over the org contact directory, plus
  // ad-hoc typed names (talent/roles not in the directory). Legacy events only
  // stored a free-text `participants` string — split it into ad-hoc names so it
  // stays editable and can be re-linked to real contacts.
  let pickedIds  = Array.isArray(i.participantIds)   ? [...i.participantIds]   : []
  let extraNames = Array.isArray(i.participantNames) ? [...i.participantNames] : []
  if (!pickedIds.length && !extraNames.length && i.participants) {
    extraNames = String(i.participants).split(',').map(s => s.trim()).filter(Boolean)
  }

  return {
    pickedIds,
    extraNames,
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

// ── Participants — contact picker over the org directory + ad-hoc names ────────
const contactsStore = useContactsStore()
const partQuery     = ref('')
const partOpen      = ref(false)
const partSearchRef = ref(null)

const contactById = computed(() => {
  const m = {}
  for (const c of contactsStore.contacts) m[c.id] = c
  return m
})

// Display name of every contact we have resolved at least once. The name of a
// linked contact lives ONLY in the directory, so if it's deleted (or the directory
// hasn't loaded) we still need it to rebuild the saved `participants` string —
// that string is what the collapsed row and the client PDF show.
const knownNames = reactive({})
watchEffect(() => {
  for (const c of contactsStore.contacts) if (c?.id && c.name) knownNames[c.id] = c.name
})

// Selected participants rendered as removable chips (linked contacts first,
// then ad-hoc typed names).
const participantChips = computed(() => {
  const idChips = form.pickedIds.map((id) => {
    const c = contactById.value[id]
    return {
      key:     'id:' + id,
      id,
      adhoc:   false,
      missing: !c,
      title:   c?.title || '',
      label:   c ? c.name : (isEN.value ? '(removed contact)' : '(contacto eliminado)'),
    }
  })
  const nameChips = form.extraNames.map((n, i) => ({
    key: 'nm:' + i + ':' + n, name: n, adhoc: true, missing: false, title: '', label: n,
  }))
  return [...idChips, ...nameChips]
})

// Collapsed row: names with the cargo the directory has for each one. Read from the
// directory at render time, so editing a cargo in Contacts updates every event.
const contactByName = computed(() => contactsByUniqueName(contactsStore.contacts))
const participantsDisplay = computed(() =>
  participantEntries(props.item, contactById.value, contactByName.value))

// Directory contacts matching the query and not already picked.
const partMatches = computed(() => {
  const picked = new Set(form.pickedIds)
  const q = partQuery.value.trim().toLowerCase()
  return contactsStore.sorted
    .filter(c => c.id && !picked.has(c.id))
    .filter(c => !q || (c.name || '').toLowerCase().includes(q) || (c.title || '').toLowerCase().includes(q))
    .slice(0, 8)
})

// Offer "Add …" only when that name isn't already a chip and isn't already in the
// directory. Checked against the WHOLE directory, not the 8 rows on screen: an exact
// match that fell outside the visible list would otherwise be offered as a new
// contact and quietly become a duplicate.
const canAddAdhoc = computed(() => {
  const q = partQuery.value.trim()
  if (!q) return false
  const lc = q.toLowerCase()
  if (form.extraNames.some(n => n.toLowerCase() === lc)) return false
  if (contactsStore.contacts.some(c => (c.name || '').trim().toLowerCase() === lc)) return false
  return true
})

function addContact(c) {
  if (!c?.id) return
  if (!form.pickedIds.includes(c.id)) form.pickedIds.push(c.id)
  partQuery.value = ''
  nextTick(() => partSearchRef.value?.focus())
}

// Typing a name that isn't in the directory now CREATES the contact, with just the
// name if that's all we have. The old behaviour stored a loose string on this one
// event, which quietly defeated the point of an org-wide directory: the same person
// got retyped in the next project, and in the one after that. A directory full of
// half-filled contacts can be merged later; names scattered across events cannot.
//
// The typed name is never lost: if the create fails (offline, API down) it falls back
// to the ad-hoc string, which still renders and still saves with the event.
async function addAdhoc(text) {
  const name = String(text || '').trim()
  if (!name) return
  partQuery.value = ''
  nextTick(() => partSearchRef.value?.focus())

  // The directory loads asynchronously when this editor opens, so someone typing
  // straight into an empty picker could otherwise create a second copy of a person
  // who was already there. Wait for it, then check the WHOLE directory by name.
  await contactsStore.loadContacts()
  const existing = contactsStore.contacts.find(
    c => c.id && (c.name || '').trim().toLowerCase() === name.toLowerCase(),
  )
  if (existing) {
    if (!form.pickedIds.includes(existing.id)) form.pickedIds.push(existing.id)
    return
  }

  try {
    const created = await contactsStore.addContact({ name })
    if (created?.id) {
      if (!form.pickedIds.includes(created.id)) form.pickedIds.push(created.id)
      return
    }
  } catch (e) {
    console.warn('Contact create from participants picker failed:', e.message)
  }
  if (!form.extraNames.some(n => n.toLowerCase() === name.toLowerCase())) form.extraNames.push(name)
}

function removeParticipant(chip) {
  if (chip.adhoc) {
    const idx = form.extraNames.indexOf(chip.name)
    if (idx >= 0) form.extraNames.splice(idx, 1)
  } else {
    const idx = form.pickedIds.indexOf(chip.id)
    if (idx >= 0) form.pickedIds.splice(idx, 1)
  }
}

// Enter: prefer an exact contact match, then the first match, else add ad-hoc.
function onPartEnter() {
  const q = partQuery.value.trim()
  if (!q) return
  // Look for the exact name across the WHOLE directory, not just the 8 shown:
  // otherwise typing a full name whose match fell outside the list linked whoever
  // happened to be first.
  const picked = new Set(form.pickedIds)
  const exact = contactsStore.sorted.find(
    c => c.id && !picked.has(c.id) && (c.name || '').toLowerCase() === q.toLowerCase(),
  )
  if (exact) return addContact(exact)
  if (partMatches.value.length) return addContact(partMatches.value[0])
  addAdhoc(q)
}

// Human-readable string persisted alongside the structured fields, so the
// collapsed row and the client PDF keep rendering with no changes.
function composeParticipants() {
  const resolved = form.pickedIds.map(id => contactById.value[id]?.name || knownNames[id]).filter(Boolean)
  const names    = [...resolved, ...form.extraNames]
  if (resolved.length < form.pickedIds.length) {
    // Some linked contacts couldn't be resolved (deleted from the directory, or the
    // directory failed to load). Carry over any name already saved that we're not
    // listing, so saving this row never makes a participant disappear.
    for (const n of String(props.item?.participants || '').split(',').map(s => s.trim()).filter(Boolean)) {
      if (!names.includes(n)) names.push(n)
    }
  }
  return names.join(', ')
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
  contactsStore.loadContacts()
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
      participants:           composeParticipants(),
      participantIds:         [...form.pickedIds],
      participantNames:       [...form.extraNames],
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
      participants:           composeParticipants(),
      participantIds:         [...form.pickedIds],
      participantNames:       [...form.extraNames],
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
  position: relative; /* ancla del editor de hora, que se sale de estos 90px */
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

/* La hora, clickeable. Se dibuja igual que el texto que reemplaza —un botón que se ve como
   botón acá sería ruido en una lista de veinte filas— y solo se delata en el hover, que es
   donde el usuario está preguntando "¿esto se puede tocar?". */
.dir-time-hit {
  display: block;
  width: 100%;
  text-align: left;
  padding: 2px 5px;
  margin: -2px -5px;
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition: background .12s, border-color .12s;
}
.dir-time-hit:hover {
  background: var(--surface-3, rgba(255,255,255,.05));
  border-color: var(--border);
}
.dir-time-hit:focus-visible {
  outline: none;
  border-color: var(--accent);
}
.dir-time-hit .dir-time-sec { display: block; }

/* Editor flotante: no cabe en los 90px de la columna, así que se sale por encima de la fila.
   Que tape el título un segundo es aceptable —es transitorio y el foco está en la hora—; que
   la columna se ensanche movería toda la lista en cada clic. */
.dir-time-edit {
  position: absolute;
  top: -7px;
  left: -7px;
  z-index: 20;
  width: 292px; /* lo que necesitan los cinco botones en UNA fila: en dos, el editor tapa
                   media pantalla de la fila y se lee como un formulario, que es lo que
                   este atajo existe para no ser */
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 8px;
  background: var(--surface, #141817);
  border: 1.5px solid var(--border);
  border-radius: 9px;
  box-shadow: 0 10px 28px -10px rgba(0,0,0,.7);
}
.dir-time-edit .dir-time-type { flex-wrap: wrap; }

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
.dir-meta-role { color: var(--muted); opacity: .7; }
/* Names wrap inside their own column instead of dropping the whole list below the icon */
.dir-meta-people { flex: 1 1 0; min-width: 0; }
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
.dir-textarea { resize: none; overflow: hidden; }

/* Notes box that grows with its text. The textarea and a hidden copy of the text share
   one grid cell: the copy sets the height, the textarea stretches to fill it. No
   measuring, so it can't get the height wrong while the form is still being laid out.
   Both boxes MUST keep the same font, padding and border, or the height won't match. */
.dir-grow { flex: 1; min-width: 0; display: grid; }
.dir-grow > .dir-textarea,
.dir-grow > .dir-grow-mirror {
  grid-area: 1 / 1 / 2 / 2;
  box-sizing: border-box;
  min-height: 52px;
  padding: 5px 9px;
  border: 1.5px solid transparent;
  font-family: inherit;
  font-size: .78rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
/* The border belongs to the textarea; the copy only reserves the same space for it. */
.dir-grow > .dir-textarea { border-color: var(--border); }
.dir-grow > .dir-textarea:focus { border-color: var(--accent); }
.dir-grow-mirror { visibility: hidden; }
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

/* Participants picker */
.dir-part { flex: 1; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.dir-part-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dir-part-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 5px 3px 10px;
  border: 1.5px solid var(--accent);
  border-radius: 6px;
  background: rgba(6,204,180,.08);
  color: var(--accent);
  font-size: .72rem;
  font-weight: 600;
}
.dir-part-chip-role {
  margin-left: 4px;
  font-weight: 400;
  opacity: .75;
}
.dir-part-chip--adhoc {
  border-color: var(--border);
  background: var(--surface-2);
  color: var(--muted);
}
.dir-part-chip--missing {
  border-color: var(--danger);
  background: rgba(239,68,68,.08);
  color: var(--danger);
}
.dir-part-chip-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  opacity: .7;
  font-family: inherit;
}
.dir-part-chip-x:hover { opacity: 1; background: rgba(0,0,0,.15); }
.dir-part-search { position: relative; }
.dir-part-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  max-height: 220px;
  overflow-y: auto;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.28);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dir-part-opt {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 6px 9px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font-size: .78rem;
  font-family: inherit;
  cursor: pointer;
}
.dir-part-opt:hover { background: var(--surface-2); }
.dir-part-opt-name { font-weight: 600; }
.dir-part-opt-role { font-size: .68rem; color: var(--muted); }
.dir-part-opt--adhoc { border-top: 1px solid var(--border); border-radius: 0 0 6px 6px; margin-top: 2px; }
.dir-part-opt--adhoc .dir-part-opt-name { color: var(--muted); font-weight: 600; }

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
