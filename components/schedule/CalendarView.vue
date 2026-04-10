<template>
  <div class="cal-wrap">
    <!-- Navigation -->
    <div class="cal-nav">
      <div style="display:flex;align-items:center;gap:4px;z-index:1;">
        <button class="cal-nav-btn" @click="globalStore.calPrev()">‹</button>
        <button class="cal-nav-btn" @click="globalStore.calNext()">›</button>
        <button class="cal-nav-btn" @click="globalStore.calToday()">{{ t('calToday') }}</button>
      </div>
      <div class="cal-month-title" style="position:absolute;left:0;right:0;text-align:center;pointer-events:none;">
        {{ calTitle }}
      </div>
      <div style="margin-left:auto;font-size:.68rem;color:var(--muted);display:flex;align-items:center;gap:6px;z-index:1;">
        <span>{{ t('calWeekLabel') }}</span>
        <select
          class="settings-select"
          :value="weekStart"
          @change="globalStore.setWeekStart($event.target.value)"
          style="padding:3px 8px;font-size:.68rem;"
        >
          <option value="sun">{{ t('weekSun') }}</option>
          <option value="mon">{{ t('weekMon') }}</option>
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
        <button class="hdr-icon-btn" @click="openPdfExport" title="Export PDF" style="font-size:.7rem;padding:3px 8px;">PDF</button>
      </div>
    </div>

    <!-- Weather strip -->
    <WeatherStrip
      :project="project"
      :temp-unit="tempUnit"
      :lang="lang"
      :date-str="focusDate"
    />

    <!-- Calendar grid: 2 months side by side -->
    <div class="cal-scroll">
      <div class="cal-main-grid">
        <div class="cal-month-col">
          <div class="cal-month-label">{{ monthTitle(calYear, calMonth) }}</div>
          <CalendarMonth
            :year="calYear"
            :month="calMonth"
            :events="coloredEvents"
            :week-start="weekStart"
            :lang="lang"
            :holidays="holidaysForYear(calYear)"
            @day-click="onDayClick"
            @event-click="onEventClick"
          />
        </div>
        <div class="cal-month-col">
          <div class="cal-month-label">{{ monthTitle(nextYear, nextMonth) }}</div>
          <CalendarMonth
            :year="nextYear"
            :month="nextMonth"
            :events="coloredEvents"
            :week-start="weekStart"
            :lang="lang"
            :holidays="holidaysForYear(nextYear)"
            @day-click="onDayClick"
            @event-click="onEventClick"
          />
        </div>
      </div>
    </div>

    <!-- Quick-add event modal -->
    <div v-if="quickAddOpen" class="modal-backdrop" @click.self="quickAddOpen = false">
      <div class="modal narrow">
        <h2>{{ lang === 'en' ? 'New Event' : 'Nuevo Evento' }}</h2>
        <div class="field">
          <label>{{ lang === 'en' ? 'Name' : 'Nombre' }}</label>
          <input ref="qaNameRef" v-model="qaName"  type="text" @keydown.enter="confirmQuickAdd" />
        </div>
        <div class="field">
          <label>{{ lang === 'en' ? 'Stage' : 'Etapa' }}</label>
          <select v-model="qaStage" class="settings-select" style="width:100%">
            <option v-for="s in project.stages?.filter(s => s.active !== false)" :key="s.key" :value="s.key">
              {{ lang === 'en' ? (s.nameEN || s.name) : s.name }}
            </option>
          </select>
        </div>
        <div class="field" style="flex-direction:row;align-items:center;gap:8px">
          <input id="qa-key" v-model="qaKeyDate" type="checkbox" />
          <label for="qa-key" style="margin:0;font-size:.75rem">{{ lang === 'en' ? 'Key date' : 'Fecha clave' }}</label>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="quickAddOpen = false">{{ t('btnCancel') }}</button>
          <button class="btn-primary" @click="confirmQuickAdd">{{ lang === 'en' ? 'Add' : 'Agregar' }}</button>
        </div>
      </div>
    </div>

    <!-- Event popup -->
    <div v-if="evPopupOpen" class="modal-backdrop" @click.self="evPopupOpen = false">
      <div class="modal narrow">
        <h2>{{ lang === 'en' ? 'Edit Event' : 'Editar Evento' }}</h2>
        <div class="field">
          <label>{{ lang === 'en' ? 'Name' : 'Nombre' }}</label>
          <input v-model="epName"  type="text" />
        </div>
        <div class="field">
          <label>{{ lang === 'en' ? 'Duration (days)' : 'Duración (días)' }}</label>
          <input v-model.number="epDuration"  type="number" min="1" />
        </div>
        <div class="field" style="flex-direction:row;align-items:center;gap:8px">
          <input id="ep-key" v-model="epKeyDate" type="checkbox" />
          <label for="ep-key" style="margin:0;font-size:.75rem">{{ lang === 'en' ? 'Key date' : 'Fecha clave' }}</label>
        </div>
        <div class="field" style="flex-direction:row;align-items:center;gap:8px">
          <input id="ep-active" v-model="epActive" type="checkbox" />
          <label for="ep-active" style="margin:0;font-size:.75rem">{{ lang === 'en' ? 'Active' : 'Activo' }}</label>
        </div>
        <div class="modal-actions" style="justify-content:space-between">
          <button class="btn-danger" style="padding:6px 14px;font-size:.72rem" @click="deletePopupEvent">{{ t('deleteProjectAction') }}</button>
          <div style="display:flex;gap:8px">
            <button class="btn-ghost" @click="evPopupOpen = false">{{ t('btnCancel') }}</button>
            <button class="btn-primary" @click="savePopupEvent">{{ t('btnSave') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- PDF export modal -->
    <div v-if="pdfModalOpen" class="modal-backdrop" @click.self="pdfModalOpen = false">
      <div class="modal narrow">
        <h2>{{ t('versionModalTitle') }}</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:4px;">
          {{ t('versionModalDesc') }}
        </p>
        <div class="version-modal-opts">
          <div
            class="version-opt"
            :class="{ selected: pdfMode === 'draft' }"
            @click="pdfMode = 'draft'"
          >
            <div class="version-opt-title">{{ t('versionDraftTitle') }}</div>
            <div class="version-opt-desc">{{ t('versionDraftDesc') }}</div>
          </div>
          <div
            class="version-opt"
            :class="{ selected: pdfMode === 'new' }"
            @click="pdfMode = 'new'"
          >
            <div class="version-opt-title">{{ t('versionNewTitle') }}</div>
            <div class="version-opt-desc">{{ t('versionNewDesc') }}</div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="pdfModalOpen = false">{{ t('btnCancel') }}</button>
          <button class="btn-primary" @click="confirmExport">{{ t('downloadPDF') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n()
const globalStore   = useGlobalStore()
const projectsStore = useProjectsStore()
const holidaysStore = useHolidaysStore()
const { exportPdf } = usePdfExport()

const props = defineProps({
  project:   { type: Object, required: true },
  lang:      { type: String, default: 'es' },
  calYear:   { type: Number, required: true },
  calMonth:  { type: Number, required: true },
  weekStart: { type: String, default: 'sun' },
  tempUnit:  { type: String, default: 'C' },
})

const pdfModalOpen = ref(false)
const pdfMode      = ref('draft')

// Quick-add state
const quickAddOpen = ref(false)
const qaDate       = ref('')
const qaName       = ref('')
const qaStage      = ref('')
const qaKeyDate    = ref(false)
const qaNameRef    = ref(null)

// Event popup state
const evPopupOpen  = ref(false)
const epEventId    = ref('')
const epName       = ref('')
const epDuration   = ref(1)
const epKeyDate    = ref(false)
const epActive     = ref(true)

const nextMonth = computed(() => props.calMonth === 11 ? 0 : props.calMonth + 1)
const nextYear  = computed(() => props.calMonth === 11 ? props.calYear + 1 : props.calYear)

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']

const calTitle = computed(() => {
  const months = props.lang === 'en' ? MONTHS_EN : MONTHS_ES
  const m2 = nextMonth.value
  return `${months[props.calMonth]} – ${months[m2]} ${props.calYear}`
})

function monthTitle(y, m) {
  const months = props.lang === 'en' ? MONTHS_EN : MONTHS_ES
  return `${months[m]} ${y}`
}

// Attach project color to events for rendering
const coloredEvents = computed(() =>
  (props.project.events || [])
    .filter(e => e.active && e.date)
    .map(e => ({ ...e, _projColor: props.project.color || '#06CCB4' }))
)

const focusDate = computed(() => new Date().toISOString().split('T')[0])

// Load holidays for the currently visible years
watchEffect(() => {
  const countryCodes = (props.project.holidays || []).map(h => h.countryCode)
  if (!countryCodes.length) return
  const years = [props.calYear, nextYear.value]
  years.forEach(y => {
    countryCodes.forEach(code => {
      holidaysStore.fetchHolidaysForYear(code, y)
    })
  })
})

function holidaysForYear(year) {
  const codes = (props.project.holidays || []).map(h => h.countryCode)
  const holidays = []
  codes.forEach(code => {
    const hs = holidaysStore.getHolidaysForYear(code, year)
    holidays.push(...hs)
  })
  return holidays
}

function onDayClick(dateStr) {
  qaDate.value    = dateStr
  qaName.value    = ''
  qaKeyDate.value = false
  qaStage.value   = props.project.stages?.find(s => s.active !== false)?.key || 'pre'
  quickAddOpen.value = true
  nextTick(() => qaNameRef.value?.focus())
}

function confirmQuickAdd() {
  const name = qaName.value.trim() || (props.lang === 'en' ? 'New event' : 'Nuevo evento')
  const ev = {
    id: uid(), name, nameEN: name,
    stage: qaStage.value, active: true,
    date: qaDate.value, dateMode: 'manual',
    duration: 1, durDayType: 'calendar',
    dep: { active: false, eventId: '', relation: 'after', days: 1, dayType: 'calendar', broken: false },
    locked: false, notes: '', order: props.project.events.length,
    completed: false, keyDate: qaKeyDate.value, whenToUse: '', whenToUseEN: '', groups: [],
  }
  projectsStore.addEvent(props.project.id, ev)
  quickAddOpen.value = false
}

function onEventClick(ev) {
  epEventId.value  = ev.id
  epName.value     = props.lang === 'en' ? (ev.nameEN || ev.name) : ev.name
  epDuration.value = ev.duration || 1
  epKeyDate.value  = ev.keyDate || false
  epActive.value   = ev.active !== false
  evPopupOpen.value = true
}

function savePopupEvent() {
  projectsStore.updateEvent(props.project.id, epEventId.value, {
    name:     epName.value,
    nameEN:   epName.value,
    duration: epDuration.value,
    keyDate:  epKeyDate.value,
    active:   epActive.value,
  })
  projectsStore.recalcAndSave(props.project.id)
  evPopupOpen.value = false
}

function deletePopupEvent() {
  if (confirm(props.lang === 'en' ? 'Delete this event?' : '¿Eliminar este evento?')) {
    projectsStore.deleteEvent(props.project.id, epEventId.value)
    evPopupOpen.value = false
  }
}

function openPdfExport() {
  pdfModalOpen.value = true
}

async function confirmExport() {
  if (pdfMode.value === 'new') {
    projectsStore.bumpVersion(props.project.id)
  }
  await exportPdf(props.project, props.lang)
  pdfModalOpen.value = false
}
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

.cal-scroll { flex: 1; overflow: auto; padding: 12px 16px; }
.cal-main-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-width: 700px;
}
.cal-month-col { display: flex; flex-direction: column; gap: 8px; }
.cal-month-label {
  font-family: 'Syne', sans-serif; font-size: .82rem; font-weight: 700;
  color: var(--navy); padding: 0 2px;
}

/* PDF modal options */
.version-modal-opts { display: flex; flex-direction: column; gap: 10px; margin: 14px 0; }
.version-opt {
  display: flex; flex-direction: column; gap: 4px; padding: 14px 16px;
  border: 1.5px solid var(--border); border-radius: 9px; cursor: pointer; transition: all .15s;
}
.version-opt:hover { border-color: var(--accent); }
.version-opt.selected { border-color: var(--accent); background: rgba(6,204,180,.05); }
.version-opt-title { font-size: .82rem; font-weight: 700; color: var(--navy); }
.version-opt-desc  { font-size: .72rem; color: var(--muted); }
</style>
