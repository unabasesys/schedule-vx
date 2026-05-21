<template>
  <div class="dv" @click="tzPanelOpen && closeTzPanel()">

    <!-- ── Top bar ─────────────────────────────────────────────────────────── -->
    <div class="dv-top">
      <button class="dv-tz-btn" @click.stop="tzPanelOpen = !tzPanelOpen">
        <span class="dv-tz-icon">◷</span>
        <span v-if="primaryTz" class="dv-tz-text">
          <strong>{{ tzCityName(primaryTz) }}</strong>
          <span v-for="tz in secondaryTzs" :key="tz.tz" class="dv-tz-sec"> · {{ tzCityName(tz) }}</span>
        </span>
        <span v-else class="dv-tz-placeholder">{{ isEN ? 'Set timezone' : 'Configurar zona horaria' }}</span>
        <span class="dv-tz-caret" :class="{ open: tzPanelOpen }">›</span>
      </button>

      <div class="dv-top-right">
        <button v-if="!readOnly" class="dv-top-btn dv-top-btn--accent" @click.stop="openNewItem()">
          + {{ isEN ? 'Add Item' : 'Agregar Item' }}
        </button>
        <button class="dv-top-btn" @click.stop="openPrintModal">
          ↓ PDF
        </button>
      </div>
    </div>

    <!-- ── Timezone config panel ───────────────────────────────────────────── -->
    <div v-if="tzPanelOpen" class="dv-tz-panel" @click.stop>
      <div class="dv-tz-panel-title">
        {{ isEN ? 'Timezone configuration' : 'Zona horaria' }}
      </div>

      <div v-if="!localTzs.length" class="dv-tz-empty-msg">
        {{ isEN ? 'No timezone configured. Add one below.' : 'Sin zona horaria. Agregá una abajo.' }}
      </div>

      <div v-for="(tz, idx) in localTzs" :key="idx" class="dv-tz-item">
        <span class="dv-tz-badge" :class="{ primary: idx === 0 }">
          {{ idx === 0 ? (isEN ? 'Primary' : 'Principal') : (isEN ? 'Secondary' : 'Secundaria') }}
        </span>
        <DailyTzPicker
          :model-value="tz"
          :is-en="isEN"
          :is-primary="idx === 0"
          @update:model-value="val => setLocalTz(idx, val)"
        />
        <button v-if="idx > 0" class="dv-tz-remove" @click="removeTz(idx)">×</button>
      </div>

      <div class="dv-tz-panel-actions">
        <button class="dv-tz-add" @click="addTz">
          + {{ isEN ? 'Add secondary timezone' : 'Agregar zona secundaria' }}
        </button>
        <button class="dv-tz-save" @click="saveTzConfig">
          {{ isEN ? 'Save' : 'Guardar' }}
        </button>
      </div>
    </div>

    <!-- ── Main body ───────────────────────────────────────────────────────── -->
    <div class="dv-body">

      <!-- Empty state -->
      <div v-if="!allGroups.length" class="dv-empty">
        <div class="dv-empty-title">
          {{ isEN ? 'No daily schedule items yet.' : 'No hay items en el Daily Schedule aún.' }}
        </div>
        <div class="dv-empty-sub">
          {{ isEN
            ? 'Add items to build your operational day-by-day schedule.'
            : 'Agrega items para construir tu schedule operacional día a día.' }}
        </div>
        <button v-if="!readOnly" class="dv-empty-cta" @click="openNewItem()">
          + {{ isEN ? 'Add first item' : 'Agregar primer item' }}
        </button>
      </div>

      <!-- Date groups -->
      <div v-for="group in allGroups" :key="group.date" class="dv-day">
        <div class="dv-day-hdr">
          <div class="dv-day-info">
            <span class="dv-day-dow">{{ group.dowLabel }}</span>
            <span class="dv-day-date">{{ group.dateLabel }}</span>
          </div>
          <div v-if="primaryTz" class="dv-day-tz">
            {{ tzCityName(primaryTz) }}<span v-for="tz in secondaryTzs" :key="tz.tz" class="dv-day-tz-sec"> · {{ tzCityName(tz) }}</span>
          </div>
          <button
            v-if="!readOnly && addingForDate !== group.date"
            class="dv-day-add"
            @click.stop="openNewItem(group.date)"
          >+ Item</button>
        </div>

        <div class="dv-day-items">
          <DailyItemRow
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            :project="project"
            :lang="lang"
            :primary-tz="primaryTz"
            :secondary-tzs="secondaryTzs"
            :read-only="readOnly"
            @update="body => projectsStore.updateDailyItem(project.id, item.id, body)"
            @delete="projectsStore.deleteDailyItem(project.id, item.id)"
          />

          <DailyItemRow
            v-if="addingForDate === group.date"
            :is-new="true"
            :initial-date="group.date"
            :project="project"
            :lang="lang"
            :primary-tz="primaryTz"
            :secondary-tzs="secondaryTzs"
            @save="saveNewItem"
            @cancel="cancelNewItem"
          />
        </div>
      </div>

    </div>

    <!-- ── Print modal ─────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="printModalOpen" class="dv-modal-back" @click.self="printModalOpen = false">
        <div class="dv-modal">
          <div class="dv-modal-title">
            {{ isEN ? 'Export Daily Schedule PDF' : 'Exportar Daily Schedule PDF' }}
          </div>

          <div class="dv-modal-row">
            <label class="dv-modal-label">{{ isEN ? 'From' : 'Desde' }}</label>
            <input type="date" v-model="printFrom" class="dv-modal-input" />
          </div>
          <div class="dv-modal-row">
            <label class="dv-modal-label">{{ isEN ? 'To' : 'Hasta' }}</label>
            <input type="date" v-model="printTo" class="dv-modal-input" />
          </div>
          <div class="dv-modal-row">
            <label class="dv-modal-label">{{ isEN ? 'Type' : 'Tipo' }}</label>
            <div class="dv-modal-toggle">
              <button
                :class="['dv-modal-tog-btn', printType === 'client' && 'active']"
                @click="printType = 'client'"
              >{{ isEN ? 'Client-facing' : 'Para cliente' }}</button>
              <button
                :class="['dv-modal-tog-btn', printType === 'internal' && 'active']"
                @click="printType = 'internal'"
              >{{ isEN ? 'Internal' : 'Interno' }}</button>
            </div>
          </div>

          <div class="dv-modal-footer">
            <button class="dv-modal-btn" @click="printModalOpen = false">
              {{ isEN ? 'Cancel' : 'Cancelar' }}
            </button>
            <button
              class="dv-modal-btn dv-modal-btn--primary"
              @click="doExport"
            >
              {{ isEN ? 'Export PDF' : 'Exportar PDF' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { isoToday } from '~/utils/helpers'

const props = defineProps({
  project:  { type: Object, required: true },
  lang:     { type: String,  default: 'es' },
  readOnly: { type: Boolean, default: false },
})

const projectsStore = useProjectsStore()
const isEN = computed(() => props.lang === 'en')

// ── Timezone ─────────────────────────────────────────────────────────────────
const tzPanelOpen = ref(false)
const localTzs    = ref([])

watch(tzPanelOpen, (open) => {
  if (open) localTzs.value = JSON.parse(JSON.stringify(
    props.project?.dailyConfig?.timezones || []
  ))
})

function closeTzPanel() { tzPanelOpen.value = false }

const primaryTz    = computed(() => (props.project?.dailyConfig?.timezones || []).find(t => t.primary) || (props.project?.dailyConfig?.timezones?.[0]) || null)
const secondaryTzs = computed(() => {
  const tzs = props.project?.dailyConfig?.timezones || []
  const primary = tzs.find(t => t.primary) || tzs[0]
  return tzs.filter(t => t !== primary)
})

function tzShortLabel(tz) {
  if (!tz) return ''
  return tz.shortLabel || tz.timezoneGroup || tz.abbreviationGeneric || tz.label || tz.tz || ''
}

function tzCityName(tz) {
  if (!tz) return ''
  return tz.city || tz.shortLabel || tz.tz || ''
}

function setLocalTz(idx, val) {
  if (!val) {
    localTzs.value.splice(idx, 1)
    return
  }
  localTzs.value[idx] = { ...val, primary: idx === 0 }
}

function addTz() {
  localTzs.value.push({ tz: '', iana: '', label: '', primary: false })
}

function removeTz(idx) {
  localTzs.value.splice(idx, 1)
  saveTzConfig()
}

function saveTzConfig() {
  const valid = localTzs.value.filter(t => t?.iana || t?.tz)
  valid.forEach((t, i) => { t.primary = i === 0 })
  projectsStore.updateDailyConfig(props.project.id, { timezones: valid })
  tzPanelOpen.value = false
}

// ── Date helpers ─────────────────────────────────────────────────────────────
const DOW_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const DOW_EN   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTH_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']

function formatDow(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return (isEN.value ? DOW_EN : DOW_ES)[d.getDay()]
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  if (isEN.value) return `${MONTH_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  return `${d.getDate()} de ${MONTH_ES[d.getMonth()]} de ${d.getFullYear()}`
}

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

// ── Items grouping ────────────────────────────────────────────────────────────
const groupedDays = computed(() => {
  const groups = {}
  ;(props.project?.dailySchedule || []).forEach(item => {
    if (!item.date) return
    if (!groups[item.date]) groups[item.date] = []
    groups[item.date].push(item)
  })
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      dowLabel:  formatDow(date),
      dateLabel: formatDateLabel(date),
      items:     sortItems(items),
    }))
})

const addingForDate = ref(null)

// allGroups merges existing date groups + a temp group for a new date being created
const allGroups = computed(() => {
  const groups = [...groupedDays.value]
  const date = addingForDate.value
  if (date && !groups.some(g => g.date === date)) {
    const newG = {
      date,
      dowLabel:  formatDow(date),
      dateLabel: formatDateLabel(date),
      items:     [],
    }
    const insertAt = groups.findIndex(g => g.date > date)
    if (insertAt === -1) groups.push(newG)
    else groups.splice(insertAt, 0, newG)
  }
  return groups
})

function openNewItem(date = null) {
  addingForDate.value = date || isoToday()
}
function cancelNewItem() { addingForDate.value = null }
function saveNewItem(item) {
  projectsStore.addDailyItem(props.project.id, item)
  addingForDate.value = null
}

// ── Print modal ───────────────────────────────────────────────────────────────
const printModalOpen = ref(false)
const printFrom      = ref('')
const printTo        = ref('')
const printType      = ref('client')

function openPrintModal() {
  const dates = (props.project?.dailySchedule || []).map(i => i.date).filter(Boolean).sort()
  printFrom.value = dates[0]     || isoToday()
  printTo.value   = dates[dates.length - 1] || isoToday()
  printModalOpen.value = true
}

function doExport() {
  const params = new URLSearchParams({
    from: printFrom.value,
    to:   printTo.value,
    type: printType.value,
    lang: props.lang,
  })
  window.open(`/print-daily/${props.project.id}?${params.toString()}`, '_blank')
  printModalOpen.value = false
}
</script>

<style scoped>
.dv {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

/* ── Top bar ── */
.dv-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 12px;
}
.dv-tz-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1.5px solid var(--border);
  border-radius: 7px;
  padding: 5px 10px;
  cursor: pointer;
  color: var(--text);
  font-family: inherit;
  font-size: .75rem;
  transition: all .15s;
}
.dv-tz-btn:hover { border-color: var(--accent); color: var(--accent); }
.dv-tz-icon { font-size: .9rem; opacity: .7; }
.dv-tz-text { color: var(--muted); }
.dv-tz-text strong { color: var(--text); font-weight: 700; }
.dv-tz-placeholder { color: var(--muted); font-style: italic; }
.dv-tz-sec { color: var(--muted); font-size: .7rem; }
.dv-tz-caret {
  color: var(--muted);
  font-size: .85rem;
  transition: transform .15s;
  display: inline-block;
}
.dv-tz-caret.open { transform: rotate(90deg); }
.dv-top-right { display: flex; gap: 6px; flex-shrink: 0; }
.dv-top-btn {
  padding: 5px 12px;
  border: 1.5px solid var(--border);
  border-radius: 7px;
  font-size: .72rem;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: var(--muted);
  font-family: inherit;
  transition: all .15s;
}
.dv-top-btn:hover { border-color: var(--text); color: var(--text); }
.dv-top-btn--accent { border-color: var(--accent); color: var(--accent); }
.dv-top-btn--accent:hover { background: rgba(32,167,137,.15); }

/* ── Timezone panel ── */
.dv-tz-panel {
  padding: 14px 20px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.dv-tz-panel-title {
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--muted);
  margin-bottom: 10px;
}
.dv-tz-empty-msg { font-size: .78rem; color: var(--muted); margin-bottom: 10px; }
.dv-tz-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
}
.dv-tz-badge {
  font-size: .6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .4px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--surface);
  color: var(--muted);
  white-space: nowrap;
  flex-shrink: 0;
}
.dv-tz-badge.primary { background: rgba(32,167,137,.15); color: var(--accent); }
.dv-tz-remove {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 1rem;
  padding: 0 4px;
  transition: color .15s;
}
.dv-tz-remove:hover { color: var(--danger); }
.dv-tz-panel-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  align-items: center;
}
.dv-tz-add {
  font-size: .72rem;
  font-weight: 600;
  color: var(--accent);
  background: none;
  border: 1.5px dashed rgba(32,167,137,.4);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
}
.dv-tz-add:hover { background: rgba(32,167,137,.08); border-color: var(--accent); }
.dv-tz-save {
  font-size: .72rem;
  font-weight: 700;
  padding: 5px 14px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition: background .15s;
}
.dv-tz-save:hover { background: var(--accent-dark); }

/* ── Body ── */
.dv-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 0 40px;
}

/* ── Empty state ── */
.dv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 60px 40px;
  gap: 10px;
}
.dv-empty-title {
  font-family: 'Nunito', sans-serif;
  font-size: .95rem;
  font-weight: 700;
  color: var(--text-title);
}
.dv-empty-sub { font-size: .78rem; color: var(--muted); line-height: 1.6; max-width: 360px; }
.dv-empty-cta {
  margin-top: 6px;
  padding: 8px 20px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: .75rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background .15s;
}
.dv-empty-cta:hover { background: var(--accent-dark); }

/* ── Date group ── */
.dv-day {
  border-bottom: 1px solid var(--border);
}
.dv-day-hdr {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 20px 10px;
  background: var(--header-bg);
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid rgba(255,255,255,.05);
}
.dv-day-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.dv-day-dow {
  font-family: 'Nunito', sans-serif;
  font-size: .9rem;
  font-weight: 800;
  color: var(--text-title);
  text-transform: uppercase;
  letter-spacing: .04em;
}
.dv-day-date {
  font-size: .78rem;
  color: var(--muted);
  font-weight: 500;
}
.dv-day-tz {
  font-size: .65rem;
  color: var(--muted);
  white-space: nowrap;
}
.dv-day-tz-sec { opacity: .7; }
.dv-day-add {
  background: none;
  border: 1.5px solid rgba(32,167,137,.35);
  border-radius: 6px;
  color: var(--accent);
  font-size: .68rem;
  font-weight: 700;
  padding: 3px 9px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all .15s;
  flex-shrink: 0;
}
.dv-day-add:hover { background: rgba(32,167,137,.12); border-color: var(--accent); }

.dv-day-items { padding: 4px 0 6px; }

/* ── Print modal ── */
.dv-modal-back {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dv-modal {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  width: 340px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dv-modal-title {
  font-family: 'Nunito', sans-serif;
  font-size: .95rem;
  font-weight: 800;
  color: var(--text-title);
}
.dv-modal-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dv-modal-label {
  font-size: .72rem;
  font-weight: 600;
  color: var(--muted);
  width: 60px;
  flex-shrink: 0;
}
.dv-modal-input {
  flex: 1;
  background: var(--surface-2);
  border: 1.5px solid var(--border);
  border-radius: 6px;
  padding: 5px 9px;
  font-size: .78rem;
  color: var(--text);
  font-family: inherit;
}
.dv-modal-input:focus { outline: none; border-color: var(--accent); }
.dv-modal-toggle { display: flex; gap: 4px; }
.dv-modal-tog-btn {
  padding: 5px 12px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: .7rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
}
.dv-modal-tog-btn:hover { border-color: var(--text); color: var(--text); }
.dv-modal-tog-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(32,167,137,.1); }
.dv-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--border);
}
.dv-modal-btn {
  padding: 6px 16px;
  border: 1.5px solid var(--border);
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  font-size: .75rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
}
.dv-modal-btn:hover { border-color: var(--text); color: var(--text); }
.dv-modal-btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.dv-modal-btn--primary:hover { background: var(--accent-dark); border-color: var(--accent-dark); }
.dv-modal-btn--primary:disabled { opacity: .5; cursor: not-allowed; }
</style>
