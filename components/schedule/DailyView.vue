<template>
  <div class="dv" @click="tzPanelOpen && closeTzPanel()">

    <!-- ── Top bar ─────────────────────────────────────────────────────────── -->
    <div class="dv-top">
      <button v-if="!readOnly" class="dv-new-event-btn" @click.stop="openNewItem()">
        + {{ isEN ? 'Daily event' : 'Evento diario' }}
      </button>

      <div v-if="!readOnly" class="dv-top-sep"></div>

      <button class="dv-tz-btn" @click.stop="tzPanelOpen = !tzPanelOpen">
        <span class="dv-tz-icon">◷</span>
        <span v-if="primaryTz" class="dv-tz-text">
          <strong>{{ tzCityName(primaryTz) }}</strong>
          <span v-for="tz in secondaryTzs" :key="tz.tz" class="dv-tz-sec"> · {{ tzCityName(tz) }}</span>
        </span>
        <span v-else class="dv-tz-placeholder">{{ isEN ? 'Set timezone' : 'Configurar zona horaria' }}</span>
        <span class="dv-tz-caret" :class="{ open: tzPanelOpen }">›</span>
      </button>
    </div>

    <!-- ── Departments filter chips ────────────────────────────────────────── -->
    <div v-if="activeGroups.length || !readOnly" class="dv-groups-panel">
      <span class="dv-groups-panel-title">{{ isEN ? 'Departments' : 'Departamentos' }}</span>
      <div class="dv-groups-chips">
        <button
          v-for="grp in activeGroups"
          :key="grp.id"
          class="dv-group-chip"
          :class="{ active: selectedGroups.includes(grp.key) }"
          @click="toggleGroup(grp.key)"
        >
          <span class="dv-group-chip-name">{{ isEN ? (grp.nameEN || grp.name) : grp.name }}</span>
          <span v-if="!readOnly" class="dv-group-chip-x" @click.stop="deleteGroup(grp.id)" :title="isEN ? 'Delete' : 'Eliminar'">×</span>
        </button>

        <!-- Inline add-group form -->
        <form v-if="addingGroup" class="dv-group-add-form" @submit.prevent="confirmAddGroup">
          <input
            ref="groupNameInput"
            v-model="newGroupName"
            class="dv-group-add-input"
            :placeholder="isEN ? 'Department name' : 'Nombre del departamento'"
            maxlength="40"
            @keydown.escape="cancelAddGroup"
          />
          <button type="submit" class="dv-group-add-confirm">✓</button>
          <button type="button" class="dv-group-add-cancel" @click="cancelAddGroup">×</button>
        </form>
        <button v-else-if="!readOnly" class="dv-group-add-btn" @click="startAddGroup">＋</button>
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
          {{ isEN ? 'No daily events yet.' : 'No hay Daily Events aún.' }}
        </div>
        <div class="dv-empty-sub">
          {{ isEN
            ? 'Add daily events to build your operational day-by-day schedule.'
            : 'Agrega Daily Events para construir tu schedule operacional día a día.' }}
        </div>
        <button v-if="!readOnly" class="dv-empty-cta" @click.stop="openNewItem()">
          + {{ isEN ? 'Add first daily event' : 'Agregar primer Daily Event' }}
        </button>
      </div>

      <!-- Date groups -->
      <div v-for="group in allGroups" :key="group.date" class="dv-day">
        <div class="dv-day-hdr">
          <div class="dv-day-info">
            <span class="dv-day-dow">{{ group.dowLabel }}</span>
            <span class="dv-day-date">{{ group.dateLabel }}</span>
          </div>
          <button
            v-if="!readOnly && addingForDate !== group.date"
            class="dv-day-add"
            @click.stop="openNewItem(group.date)"
          >+</button>
        </div>

        <div class="dv-day-items">
          <template v-for="item in group.items" :key="item.id">
            <DailyEventRow
              :item="item"
              :project="project"
              :lang="lang"
              :primary-tz="primaryTz"
              :secondary-tzs="secondaryTzs"
              :read-only="readOnly"
              :start-editing="item.id === justDuplicatedId"
              @update="body => { projectsStore.updateDailyEvent(project.id, item.id, body); if (justDuplicatedId === item.id) justDuplicatedId = null }"
              @delete="() => { projectsStore.deleteDailyEvent(project.id, item.id); if (justDuplicatedId === item.id) justDuplicatedId = null }"
              @cancel="() => { if (justDuplicatedId === item.id) justDuplicatedId = null }"
              @duplicate="duplicateItem(item)"
              @add-below="addBelow(item)"
            />
            <DailyEventRow
              v-if="addingAfterId === item.id"
              :is-new="true"
              :initial-date="group.date"
              :project="project"
              :lang="lang"
              :primary-tz="primaryTz"
              :secondary-tzs="secondaryTzs"
              @save="saveNewItem"
              @cancel="cancelNewItem"
            />
          </template>

          <DailyEventRow
            v-if="addingForDate === group.date && !addingAfterId"
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

  </div>
</template>

<script setup>
import { isoToday, uid } from '~/utils/helpers'

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
  // If we were filtering by this group, deselect it first
  const grp = props.project.groups?.find(g => g.id === groupId)
  if (grp) {
    const idx = selectedGroups.value.indexOf(grp.key)
    if (idx >= 0) selectedGroups.value.splice(idx, 1)
  }
  projectsStore.deleteGroup(props.project.id, groupId)
}

// ── Items grouping ────────────────────────────────────────────────────────────
const groupedDays = computed(() => {
  const groups = {}
  ;(props.project?.dailySchedule || []).forEach(item => {
    if (!item.date) return
    if (selectedGroups.value.length) {
      // Daily items store departments as group keys (or legacy ids); accept both.
      const depts = Array.isArray(item.departments) ? item.departments : []
      const match = depts.some(dKey => {
        const grp = props.project.groups?.find(g => g.id === dKey || g.key === dKey)
        return grp && selectedGroups.value.includes(grp.key)
      })
      if (!match) return
    }
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
const addingAfterId = ref(null)

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
  addingAfterId.value = null
}
function cancelNewItem() {
  addingForDate.value = null
  addingAfterId.value = null
}
function saveNewItem(item) {
  projectsStore.addDailyEvent(props.project.id, item)
  addingForDate.value = null
  addingAfterId.value = null
}

// Inline "+ below" — opens a new-item form directly below the clicked event row.
function addBelow(item) {
  addingForDate.value = item.date
  addingAfterId.value = item.id
}

// Tracks the id of the just-duplicated event so its row opens in edit mode.
const justDuplicatedId = ref(null)

function duplicateItem(item) {
  const newId = uid()
  const suffix = isEN.value ? ' (Copy)' : ' (Copia)'
  const baseTitle = item.title || ''
  // Avoid stacking " (Copy) (Copy)" if the user duplicates a copy.
  const newTitle = baseTitle.endsWith(suffix) ? baseTitle : baseTitle + suffix
  projectsStore.addDailyEvent(props.project.id, { ...item, id: newId, title: newTitle })
  justDuplicatedId.value = newId
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
  padding: 8px 20px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 10px;
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
.dv-new-event-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  font-size: .68rem;
  font-weight: 700;
  cursor: pointer;
  background: var(--accent);
  color: var(--text);
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
}
.dv-new-event-btn:hover { background: var(--accent-dark); }

.dv-top-sep {
  width: 1px;
  height: 20px;
  background: var(--border);
  flex-shrink: 0;
}

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

/* ── Departments filter panel ── */
.dv-groups-panel {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 16px; border-bottom: 1px solid rgba(255,255,255,.06);
  background: var(--bg); flex-shrink: 0; overflow-x: auto;
}
.dv-groups-panel-title {
  font-size: .64rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .4px; color: var(--muted); flex-shrink: 0;
}
.dv-groups-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.dv-group-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px 3px 11px; border: 1.5px solid var(--border); border-radius: 20px;
  font-size: .64rem; font-weight: 600; cursor: pointer; background: var(--surface); color: var(--muted);
  font-family: inherit; transition: all .15s;
}
.dv-group-chip.active { border-color: var(--accent); color: var(--accent); background: rgba(32,167,137,.06); }
.dv-group-chip:hover:not(.active) { border-color: var(--text); color: var(--text); }
.dv-group-chip-name { line-height: 1; }
.dv-group-chip-x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; border-radius: 50%; font-size: .68rem; line-height: 1;
  color: var(--muted); transition: all .13s; flex-shrink: 0;
}
.dv-group-chip-x:hover { background: rgba(239,68,68,.12); color: var(--danger); }

.dv-group-add-form { display: inline-flex; align-items: center; gap: 3px; }
.dv-group-add-input {
  height: 24px; padding: 0 8px; border: 1.5px solid var(--accent); border-radius: 20px;
  font-size: .64rem; font-family: inherit; outline: none; color: var(--text);
  width: 120px; background: var(--surface);
}
.dv-group-add-confirm, .dv-group-add-cancel {
  width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--border);
  font-size: .70rem; line-height: 1; cursor: pointer; background: var(--surface);
  color: var(--muted); font-family: inherit; display: flex; align-items: center;
  justify-content: center; transition: all .15s; padding: 0;
}
.dv-group-add-confirm:hover { border-color: var(--accent); color: var(--accent); background: rgba(32,167,137,.08); }
.dv-group-add-cancel:hover  { border-color: var(--danger); color: var(--danger); background: rgba(234,78,73,.12); }

.dv-group-add-btn {
  width: 22px; height: 22px; border-radius: 50%; border: 1.5px dashed var(--border);
  font-size: .82rem; line-height: 1; cursor: pointer; background: transparent;
  color: var(--muted); font-family: inherit; display: flex; align-items: center;
  justify-content: center; transition: all .15s; padding: 0;
}
.dv-group-add-btn:hover { border-color: var(--accent); color: var(--accent); border-style: solid; }

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

</style>
