<template>
  <div class="ev-list-wrap">
    <!-- Toolbar -->
    <div class="ev-list-toolbar">
      <!-- Actions -->
      <button v-if="!readOnly" class="ev-new-event-btn" @click="addEvent">{{ L.newEvent }}</button>
      <button v-if="!readOnly" class="ev-move-btn" @click="startAddStage">{{ L.addStage }}</button>

      <div class="ev-toolbar-sep"></div>

      <!-- Display filters -->
      <button
        class="ev-filter-btn"
        :class="{ active: evFilter === 'keydates', 'keydates-btn': true }"
        @click="setFilter('keydates')"
      >★ {{ L.filterKeyDates }}</button>
      <button
        class="ev-filter-btn"
        :class="{ active: evFilter === 'active' }"
        @click="setFilter('active')"
      >{{ L.filterActive }}</button>
      <button
        class="ev-filter-btn"
        :class="{ active: evFilter === 'notcompleted' }"
        @click="setFilter('notcompleted')"
      >{{ L.filterNotCompleted }}</button>
      <button
        class="ev-filter-btn"
        :class="{ active: evFilter === 'internal' }"
        @click="setFilter('internal')"
      >{{ L.filterInternalOnly }}</button>
      <button
        class="ev-filter-btn"
        :class="{ active: evFilter === 'all' }"
        @click="setFilter('all')"
      >{{ L.filterAll }}</button>

      <div class="ev-toolbar-sep"></div>

      <!-- Functionality -->
      <button v-if="!readOnly" class="ev-move-btn" @click="openMoveModal">{{ L.moveCalendar }}</button>

      <!-- Deps column visibility toggle — always visible when not read-only -->
      <button
        v-if="!readOnly"
        class="ev-move-btn ev-deps-toggle-btn"
        :class="{ 'deps-active': showDepCol }"
        @click="showDepCol = !showDepCol"
      >{{ showDepCol ? L.depsHide : L.depsShow }}</button>

      <!-- Enable/disable all deps — only when column is visible and there are deps configured -->
      <button
        v-if="!readOnly && showDepCol && hasEventsWithDeps"
        class="ev-move-btn ev-deps-enable-btn"
        :class="{ 'deps-active': hasDepsEnabled }"
        @click="toggleAllDeps"
      >{{ hasDepsEnabled ? L.depsDisable : L.depsEnable }}</button>

      <!-- Right controls -->
      <div style="display:flex;align-items:center;gap:6px;margin-left:auto">
        <button
          class="ev-save-tmpl-btn"
          :class="{ 'ev-save-tmpl-btn--active': (project.holidays || []).length > 0 }"
          @click="$emit('toggle-holidays')"
        >{{ L.holidays }}</button>
        <button
          class="ev-save-tmpl-btn"
          :disabled="!(project.events || []).length"
          @click="saveAsTemplate"
        >＋ Template</button>
      </div>
    </div>

    <!-- Groups filter chips -->
    <div class="groups-panel">
      <span class="groups-panel-title">{{ L.groupsTitle }}</span>
      <div class="groups-chips">
        <button
          v-for="grp in activeGroups"
          :key="grp.id"
          class="group-chip"
          :class="{ active: selectedGroups.includes(grp.key) }"
          @click="toggleGroup(grp.key)"
        >
          <span class="group-chip-name">{{ lang === 'en' ? (grp.nameEN || grp.name) : grp.name }}</span>
          <span v-if="!readOnly" class="group-chip-x" @click.stop="deleteGroup(grp.id)" title="Eliminar">×</span>
        </button>

        <!-- Inline add-group form -->
        <form v-if="addingGroup" class="group-add-form" @submit.prevent="confirmAddGroup">
          <input
            ref="groupNameInput"
            v-model="newGroupName"
            class="group-add-input"
            :placeholder="L.groupPlaceholder"
            maxlength="40"
            @keydown.escape="cancelAddGroup"
          />
          <button type="submit" class="group-add-confirm">✓</button>
          <button type="button" class="group-add-cancel" @click="cancelAddGroup">×</button>
        </form>
        <button v-else-if="!readOnly" class="group-add-btn" @click="startAddGroup">＋</button>
      </div>
    </div>

    <!-- Conflicts bar -->
    <div v-if="hasConflicts" class="conflicts-bar">
      ⚠ {{ conflicts.length }} {{ L.brokenDeps }}
    </div>

    <!-- Column header bar -->
    <div class="ev-col-header">
      <div class="ev-col-actions">{{ L.colActions }}</div>
      <div class="ev-col-name">{{ L.colEvent }}</div>
      <div class="ev-col-dates">{{ L.colDates }}</div>
      <div v-show="showDepCol" class="ev-col-dep">{{ L.colDep }}</div>
    </div>

    <!-- Event rows -->
    <div class="ev-list-scroll">
      <div class="ev-rows">
        <template v-for="stage in stagesWithEvents" :key="stage.key">
          <!-- Stage header -->
          <div
            class="ev-stage-hdr"
            :class="{
              'stage-hidden':      stage.visible === false,
              'stage-collapsed':   collapsedStages.has(stage.key),
              'stage-drop-target': !readOnly && dropIndicator === 'stage:' + stage.key,
            }"
            @dragover.prevent="!readOnly && onStageDragOver(stage.key)"
            @dragleave="dropIndicator = null"
            @drop.prevent="!readOnly && onStageDrop(stage.key)"
          >
            <div class="stage-hdr-left" @click="editingStageId !== stage.id && toggleCollapse(stage.key)" style="cursor:pointer;user-select:none">
              <span class="stage-collapse-arrow">{{ collapsedStages.has(stage.key) ? '▶' : '▼' }}</span>
              <template v-if="!readOnly && editingStageId === stage.id">
                <input
                  ref="stageNameInputRef"
                  v-model="editingStageName"
                  class="stage-name-input"
                  @click.stop
                  @keydown.enter.prevent="commitRenameStage"
                  @keydown.escape.prevent="cancelRenameStage"
                  @blur="commitRenameStage"
                />
              </template>
              <template v-else>
                <span
                  class="stage-badge"
                  :class="'stage-' + stage.key"
                  :title="!readOnly ? (lang === 'en' ? 'Double-click to rename' : 'Doble clic para renombrar') : ''"
                  @dblclick.stop="!readOnly && startRenameStage(stage)"
                >{{ stage.name }}</span>
              </template>
              <span class="ev-stage-count">{{ stage.totalEvs }}</span>
            </div>
            <div v-if="!readOnly" class="stage-hdr-actions">
              <!-- ON/OFF toggle -->
              <button
                class="stage-visibility-btn"
                :class="{ 'is-off': stage.visible === false }"
                :title="stage.visible === false ? 'Mostrar etapa' : 'Ocultar etapa'"
                @click.stop="toggleStageVisible(stage.id)"
              >{{ stage.visible === false ? 'OFF' : 'ON' }}</button>
              <button
                class="stage-move-btn"
                :disabled="stage.isFirst"
                title="Mover arriba"
                @click="moveStage(stage.id, 'up')"
              >↑</button>
              <button
                class="stage-move-btn"
                :disabled="stage.isLast"
                title="Mover abajo"
                @click="moveStage(stage.id, 'down')"
              >↓</button>
              <button
                class="stage-del-btn"
                title="Eliminar etapa"
                @click="promptDeleteStage(stage)"
              >×</button>
            </div>
          </div>
          <!-- Event rows — hidden when collapsed OR stage is OFF -->
          <template v-if="!collapsedStages.has(stage.key) && stage.visible !== false">
            <div
              v-for="ev in stage.events"
              :key="'dnd-' + ev.id"
              class="ev-row-dnd-wrap"
              :class="{
                'ev-drop-above': !readOnly && dropIndicator === ev.id + ':above',
                'ev-drop-below': !readOnly && dropIndicator === ev.id + ':below',
              }"
              @dragover.prevent="!readOnly && onEvDragOver($event, ev, stage.key)"
              @dragleave="dropIndicator = null"
              @drop.prevent="!readOnly && onEvDrop($event, ev, stage.key)"
            >
              <EventRow
                :key="ev.id"
                :event="ev"
                :project="project"
                :lang="lang"
                :stage-label="stage.name"
                :autofocus="ev.id === justCreatedEventId"
                :read-only="readOnly"
                :show-dep-col="showDepCol"
                @row-drag-start="listDragId = $event"
                @row-drag-end="clearListDrag"
              />
            </div>
          </template>
        </template>

        <!-- Empty state — no stages yet -->
        <div v-if="stagesWithEvents.length === 0 && !addingStage" class="ev-empty-state">
          <p class="ev-empty-title">{{ L.emptyTitle }}</p>
          <p class="ev-empty-body">{{ L.emptyBody1 }}</p>
          <p class="ev-empty-body">{{ L.emptyBody2 }}</p>
          <p class="ev-empty-body">{{ L.emptyBody3 }}</p>
          <p class="ev-empty-closing">{{ L.emptyAction }}</p>
          <button class="ev-empty-action" @click="startAddStage">{{ L.emptyBtn }}</button>
        </div>

        <!-- Inline new-stage form — appears at the bottom of the list -->
        <div v-if="addingStage" class="ev-add-stage-row">
          <form class="stage-add-form" @submit.prevent="confirmAddStage">
            <input
              ref="stageNameInput"
              v-model="newStageName"
              class="stage-add-input"
              :placeholder="L.stagePlaceholder"
              maxlength="40"
              @keydown.escape="cancelAddStage"
            />
            <button type="submit" class="stage-add-confirm">✓</button>
            <button type="button" class="stage-add-cancel" @click="cancelAddStage">×</button>
          </form>
        </div>
      </div>
    </div>

    <!-- Move Calendar modal -->
    <Teleport to="body">
      <div v-if="moveModalOpen" class="modal-backdrop" @click.self="moveModalOpen = false">
        <div class="modal move-modal">
          <h2>{{ L.moveTitle }}</h2>

          <div class="move-direction-row">
            <button
              class="move-dir-btn"
              :class="{ active: moveDir === 'backward' }"
              @click="moveDir = 'backward'"
            >{{ L.moveBackward }}</button>
            <button
              class="move-dir-btn"
              :class="{ active: moveDir === 'forward' }"
              @click="moveDir = 'forward'"
            >{{ L.moveForward }}</button>
          </div>

          <div class="move-amount-row">
            <input
              ref="moveAmountInput"
              type="number"
              v-model.number="moveAmount"
              min="1"
              class="move-amount-input"
            />
            <button
              class="move-unit-btn"
              :class="{ active: moveUnit === 'days' }"
              @click="moveUnit = 'days'"
            >{{ L.moveDays }}</button>
            <button
              class="move-unit-btn"
              :class="{ active: moveUnit === 'weeks' }"
              @click="moveUnit = 'weeks'"
            >{{ L.moveWeeks }}</button>
          </div>

          <div class="modal-actions">
            <button class="btn-ghost" @click="moveModalOpen = false">{{ L.btnCancel }}</button>
            <button class="btn-primary" @click="applyMove">{{ L.btnApply }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- No-stages nudge modal — shown when trying to create an event with no stages -->
    <Teleport to="body">
      <div v-if="noStageModalOpen" class="modal-backdrop" @click.self="noStageModalOpen = false">
        <div class="modal no-stage-modal">
          <h2>{{ L.noStageTitle }}</h2>
          <p class="no-stage-body">{{ L.noStageBody }}</p>
          <div class="modal-actions">
            <button class="btn-ghost" @click="noStageModalOpen = false">{{ L.btnCancel }}</button>
            <button class="btn-primary" @click="goCreateStage">{{ L.noStageCta }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Stage picker modal — shown when creating an event with multiple stages -->
    <Teleport to="body">
      <div v-if="stagePickerOpen" class="modal-backdrop" @click.self="stagePickerOpen = false">
        <div class="modal stage-picker-modal">
          <h2>{{ L.pickStageTitle }}</h2>
          <div class="stage-picker-list">
            <button
              v-for="s in pickableStages"
              :key="s.key"
              class="stage-picker-btn"
              :class="'stage-picker-' + s.key"
              @click="createEventInStage(s.key)"
            >{{ s.name }}</button>
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="stagePickerOpen = false">{{ L.btnCancel }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Stage confirmation modal -->
    <Teleport to="body">
      <div v-if="deleteStageTarget" class="modal-backdrop" @click.self="deleteStageTarget = null">
        <div class="modal delete-stage-modal">
          <h2>{{ L.deleteStageTitle }}</h2>
          <p class="delete-stage-info">
            <strong>{{ deleteStageTarget.name }}</strong>
            <template v-if="deleteStageTotalEvs > 0">
              &nbsp;— {{ deleteStageTotalEvs }} evento{{ deleteStageTotalEvs === 1 ? '' : 's' }}
            </template>
          </p>
          <p class="delete-stage-body">{{ L.deleteStageBody }}</p>
          <div class="modal-actions">
            <button class="btn-ghost" @click="deleteStageTarget = null">{{ L.btnCancel }}</button>
            <button class="btn-danger" @click="confirmDeleteStage">{{ L.btnDeleteStage }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { STAGE_ORDER } from '~/utils/constants'
import { uid } from '~/utils/helpers'

// ── Inline translations ───────────────────────────────────────────────────────
const LABELS = {
  es: {
    newEvent:       '＋ Evento',
    moveCalendar:   'Mover calendario',
    depsEnable:     'Activar dependencias',
    depsDisable:    'Desactivar dependencias',
    depsShow:       'Dependencias',
    depsHide:       'Ocultar dependencias',
    filterAll:      'Todos',
    filterActive:   'Solo activos',
    filterKeyDates: 'Fechas clave',
    filterNotCompleted: 'No completadas',
    filterInternalOnly: 'Internal Only',
    holidays:       'Feriados',
    groupsTitle:    'Grupos',
    groupPlaceholder: 'Nombre del grupo',
    addGroup:       '＋ Grupo',
    addStage:          '＋ Etapa',
    stagePlaceholder:  'Nombre de la etapa',
    pickStageTitle:    '¿En qué etapa va el evento?',
    noStageTitle:      'Primero crea una etapa',
    noStageBody:       'Para crear un evento necesitas al menos una etapa. Por ejemplo: Pre-producción, Producción, Post-producción.',
    noStageCta:        'Crear etapa ahora',
    deleteStageTitle: '¿Eliminar etapa?',
    deleteStageBody:  'Se eliminarán también todos los eventos de esta etapa. Esta acción no se puede deshacer.',
    btnDeleteStage:   'Eliminar etapa',
    brokenDeps:     'dependencias rotas',
    colActions:     'Acciones',
    colEvent:       'Evento · Grupos',
    colDates:       'Días · Duración · Inicio · Fin',
    colDep:         'Dependencia / Programación',
    moveTitle:      'Mover calendario',
    moveForward:    'Adelantar',
    moveBackward:   'Atrasar',
    moveDays:       'Días',
    moveWeeks:      'Semanas',
    btnCancel:      'Cancelar',
    btnApply:       'Aplicar',
    toastSaved:     'Template guardado',
    toastMoved:     'Calendario movido',
    promptTemplate: 'Nombre del template:',
    emptyTitle:   '¿Partiste sin template? Perfecto.',
    emptyBody1:   'Entonces este calendario lo puedes armar 100% a tu manera.\n\nLo primero es crear una Etapa, porque ahí es donde viven los eventos.\nDesde ahí puedes ir construyendo tu calendario poco a poco, agregando todas las etapas y eventos que necesites, y cambiando el orden cuando quieras.',
    emptyBody2:   'También puedes usar Grupos para conectar eventos de distintas etapas.\nSi prendes o apagas un grupo, todos los eventos vinculados cambian contigo.',
    emptyBody3:   'Y no le tengas miedo a las dependencias.\nPuede sonar técnico, pero en la práctica son muy fáciles de usar y te van a ayudar a mover tu calendario de forma mucho más inteligente.',
    emptyAction:  'Empieza creando tu primera Etapa y prueba sin miedo.',
    emptyBtn:     '＋ Etapa',
  },
  en: {
    newEvent:       '＋ Event',
    moveCalendar:   'Move calendar',
    depsEnable:     'Enable dependencies',
    depsDisable:    'Disable dependencies',
    depsShow:       'Dependencies',
    depsHide:       'Hide dependencies',
    filterAll:      'All',
    filterActive:   'Active only',
    filterKeyDates: 'Key dates',
    filterNotCompleted: 'Not completed',
    filterInternalOnly: 'Internal Only',
    holidays:       'Holidays',
    groupsTitle:    'Groups',
    groupPlaceholder: 'Group name',
    addGroup:       '＋ Group',
    addStage:          '＋ Stage',
    stagePlaceholder:  'Stage name',
    pickStageTitle:    'Which stage should this event go in?',
    noStageTitle:      'Create a stage first',
    noStageBody:       'You need at least one stage before adding events. For example: Pre-production, Production, Post-production.',
    noStageCta:        'Create a stage now',
    deleteStageTitle: 'Delete stage?',
    deleteStageBody:  'All events in this stage will also be deleted. This action cannot be undone.',
    btnDeleteStage:   'Delete stage',
    brokenDeps:     'broken dependencies',
    colActions:     'Actions',
    colEvent:       'Event · Groups',
    colDates:       'Days · Duration · Start · End',
    colDep:         'Dependency / Scheduling',
    moveTitle:      'Move calendar',
    moveForward:    'Forward',
    moveBackward:   'Backward',
    moveDays:       'Days',
    moveWeeks:      'Weeks',
    btnCancel:      'Cancel',
    btnApply:       'Apply',
    toastSaved:     'Template saved',
    toastMoved:     'Calendar moved',
    promptTemplate: 'Template name:',
    emptyTitle:   'Starting without a template? Perfect.',
    emptyBody1:   'This calendar is yours to build your own way.\n\nThe first step is to create a Stage, because that\'s where events live.\nFrom there, you can build your calendar step by step, adding as many stages and events as you need, and changing the order whenever you want.',
    emptyBody2:   'You can also use Groups to connect events from different stages.\nWhen you turn a group on or off, all linked events follow.',
    emptyBody3:   'And don\'t be afraid of Dependencies.\nThey may sound technical, but they\'re actually very easy to use and can help you adjust your calendar in a much smarter way.',
    emptyAction:  'Start by creating your first Stage and explore freely.',
    emptyBtn:     '＋ Stage',
  },
}

const projectsStore = useProjectsStore()
const { $toast }    = useNuxtApp()

const props = defineProps({
  project:  { type: Object,  required: true },
  lang:     { type: String,  default: 'es' },
  readOnly: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle-holidays'])

const L = computed(() => LABELS[props.lang] ?? LABELS.es)

// ── Filter state (internal) ───────────────────────────────────────────────────
const evFilter = ref('all')

function hasAnyActive() {
  return (props.project.events || []).some(e => e.active)
}

onMounted(() => {
  evFilter.value = hasAnyActive() ? 'active' : 'all'
})

// Auto-switch to 'all' if filter is 'active' but no active events remain
watch(() => props.project.events, () => {
  if (evFilter.value === 'active' && !hasAnyActive()) {
    evFilter.value = 'all'
  }
}, { deep: true })

function setFilter(f) {
  evFilter.value = f
}

// ── Groups ────────────────────────────────────────────────────────────────────
const selectedGroups   = ref([])
const collapsedStages  = ref(new Set())

function toggleCollapse(stageKey) {
  const s = collapsedStages.value
  if (s.has(stageKey)) s.delete(stageKey)
  else s.add(stageKey)
  collapsedStages.value = new Set(s) // trigger reactivity
}

function toggleStageVisible(stageId) {
  projectsStore.toggleStageVisible(props.project.id, stageId)
}

const activeGroups = computed(() =>
  (props.project.groups || []).filter(g => g.active !== false)
)

function toggleGroup(key) {
  const idx = selectedGroups.value.indexOf(key)
  if (idx >= 0) selectedGroups.value.splice(idx, 1)
  else selectedGroups.value.push(key)
}

// ── Group create / delete ─────────────────────────────────────────────────────
const addingGroup   = ref(false)
const newGroupName  = ref('')
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

// ── Stage create / reorder / delete ──────────────────────────────────────────
const addingStage    = ref(false)
const newStageName   = ref('')
const stageNameInput = ref(null)

function startAddStage() {
  addingStage.value  = true
  newStageName.value = ''
  nextTick(() => stageNameInput.value?.focus())
}

function confirmAddStage() {
  const name = newStageName.value.trim()
  if (name) projectsStore.addStage(props.project.id, name)
  cancelAddStage()
}

function cancelAddStage() {
  addingStage.value  = false
  newStageName.value = ''
}

function moveStage(stageId, dir) {
  if (dir === 'up')   projectsStore.moveStageUp(props.project.id, stageId)
  else                projectsStore.moveStageDown(props.project.id, stageId)
}

const deleteStageTarget   = ref(null)
const deleteStageTotalEvs = computed(() =>
  deleteStageTarget.value
    ? (props.project.events || []).filter(e => e.stage === deleteStageTarget.value.key).length
    : 0
)

function promptDeleteStage(stage) {
  deleteStageTarget.value = stage
}

function confirmDeleteStage() {
  if (!deleteStageTarget.value) return
  projectsStore.deleteStage(props.project.id, deleteStageTarget.value.id)
  deleteStageTarget.value = null
}

// ── Conflicts ─────────────────────────────────────────────────────────────────
const conflicts = computed(() =>
  (props.project.events || []).filter(e => e.active && e.dep?.broken)
)
const hasConflicts = computed(() => conflicts.value.length > 0)

// ── Filtered + grouped events ─────────────────────────────────────────────────
const filteredEvents = computed(() => {
  let evs = [...(props.project.events || [])]

  if (evFilter.value === 'active')       evs = evs.filter(e => e.active)
  if (evFilter.value === 'keydates')     evs = evs.filter(e => e.keyDate)
  if (evFilter.value === 'notcompleted') evs = evs.filter(e => !e.completed)
  if (evFilter.value === 'internal')     evs = evs.filter(e => e.internal)

  if (selectedGroups.value.length) {
    evs = evs.filter(e =>
      e.groups?.some(gId => {
        // events may store group by key ('casting') or by id ('g-casting') — match both
        const grp = props.project.groups?.find(g => g.id === gId || g.key === gId)
        return grp && selectedGroups.value.includes(grp.key)
      })
    )
  }

  return evs
})

const stagesWithEvents = computed(() => {
  const stages = [...(props.project.stages || [])].filter(s => s.active !== false)
  stages.sort((a, b) => (a.order ?? STAGE_ORDER[a.key] ?? 99) - (b.order ?? STAGE_ORDER[b.key] ?? 99))

  return stages.map((stage, idx) => {
    const stageEvs = filteredEvents.value
      .filter(e => e.stage === stage.key)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const name = props.lang === 'en'
      ? (stage.nameEN || stage.name)
      : stage.name
    const totalEvs = (props.project.events || []).filter(e => e.stage === stage.key).length
    return { ...stage, name, events: stageEvs, totalEvs, isFirst: idx === 0, isLast: idx === stages.length - 1 }
  })
})

// ── List drag-and-drop (reorder within / move between stages) ────────────────
const listDragId    = ref(null)   // evId being dragged
const dropIndicator = ref(null)   // 'evId:above' | 'evId:below' | 'stage:key'

// ── Stage inline rename ──────────────────────────────────────────────────────
const editingStageId   = ref(null)
const editingStageName = ref('')
const stageNameInputRef = ref(null)

function startRenameStage(stage) {
  editingStageId.value   = stage.id
  editingStageName.value = stage.name
  nextTick(() => {
    // ref inside v-for is an array in Vue 3
    const el = Array.isArray(stageNameInputRef.value)
      ? stageNameInputRef.value[0]
      : stageNameInputRef.value
    el?.focus()
    el?.select()
  })
}

function commitRenameStage() {
  if (!editingStageId.value) return
  if (editingStageName.value.trim()) {
    projectsStore.renameStage(props.project.id, editingStageId.value, editingStageName.value)
  }
  editingStageId.value = null
}

function cancelRenameStage() {
  editingStageId.value = null
}

function clearListDrag() {
  listDragId.value    = null
  dropIndicator.value = null
}

function onEvDragOver(e, targetEv, stageKey) {
  if (!listDragId.value || listDragId.value === targetEv.id) return
  const rect = e.currentTarget.getBoundingClientRect()
  dropIndicator.value = e.clientY < rect.top + rect.height / 2
    ? targetEv.id + ':above'
    : targetEv.id + ':below'
}

function onEvDrop(e, targetEv, stageKey) {
  if (!listDragId.value) { clearListDrag(); return }
  const rect     = e.currentTarget.getBoundingClientRect()
  const position = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below'
  projectsStore.moveEventInList(props.project.id, listDragId.value, targetEv.id, position, stageKey)
  clearListDrag()
}

function onStageDragOver(stageKey) {
  if (!listDragId.value) return
  dropIndicator.value = 'stage:' + stageKey
}

function onStageDrop(stageKey) {
  if (!listDragId.value) { clearListDrag(); return }
  projectsStore.moveEventInList(props.project.id, listDragId.value, null, 'end', stageKey)
  clearListDrag()
}

// ── Actions ───────────────────────────────────────────────────────────────────
function saveAsTemplate() {
  const name = prompt(L.value.promptTemplate, props.project.name || props.project.client || 'Template')
  if (name === null) return
  projectsStore.saveAsTemplate(props.project.id, name)
  $toast?.(L.value.toastSaved, { type: 'success' })
}

// ── Stage picker (for new events) ────────────────────────────────────────────
const stagePickerOpen  = ref(false)
const noStageModalOpen = ref(false)

const pickableStages = computed(() => {
  const stages = [...(props.project.stages || [])].filter(s => s.active !== false)
  stages.sort((a, b) => (a.order ?? STAGE_ORDER[a.key] ?? 99) - (b.order ?? STAGE_ORDER[b.key] ?? 99))
  return stages.map(s => ({
    ...s,
    name: props.lang === 'en' ? (s.nameEN || s.name) : s.name,
  }))
})

function addEvent() {
  if (pickableStages.value.length === 0) {
    noStageModalOpen.value = true
  } else if (pickableStages.value.length === 1) {
    createEventInStage(pickableStages.value[0].key)
  } else {
    stagePickerOpen.value = true
  }
}

function goCreateStage() {
  noStageModalOpen.value = false
  startAddStage()
}

// Tracks the id of the event just created via "+ Nuevo Evento" so the
// corresponding EventRow autofocuses its name input on mount and the user
// can type the real name without an extra click.
const justCreatedEventId = ref('')

function createEventInStage(stageKey) {
  stagePickerOpen.value = false
  const defaultName = props.lang === 'en' ? 'New event' : 'Nuevo evento'
  const ev = {
    id: uid(), name: defaultName, nameEN: defaultName,
    stage: stageKey, active: true, date: '', dateMode: 'manual', duration: 1, durDayType: 'calendar',
    dep: { active: false, eventId: '', relation: 'after', days: 1, dayType: 'calendar', broken: false },
    locked: false, notes: '', order: props.project.events.length,
    completed: false, keyDate: false, internal: false, whenToUse: '', whenToUseEN: '', groups: [],
  }
  projectsStore.addEvent(props.project.id, ev)
  evFilter.value = 'active'
  // Mark this event as the one to autofocus on mount. We don't clear this
  // because EventRow.onMounted only fires once per key; later creations
  // overwrite the id with the new one and only that row re-mounts.
  justCreatedEventId.value = ev.id
}

// ── Move Calendar modal ───────────────────────────────────────────────────────
const moveModalOpen   = ref(false)
const moveDir         = ref('forward')
const moveUnit        = ref('days')
const moveAmount      = ref(1)
const moveAmountInput = ref(null)

function openMoveModal() {
  moveDir.value    = 'forward'
  moveUnit.value   = 'days'
  moveAmount.value = 1
  moveModalOpen.value = true
  nextTick(() => moveAmountInput.value?.focus())
}

// ─── Dependencies column visibility + toggle ──────────────────────────────────
// Default: show the column only if the project already has active deps configured
const showDepCol = ref(
  (props.project.events || []).some(ev => ev.dep?.active)
)

const hasEventsWithDeps = computed(() =>
  (props.project.events || []).some(ev => ev.dep?.eventId)
)

const hasDepsEnabled = computed(() =>
  (props.project.events || []).some(ev => ev.dep?.eventId && ev.dep?.active)
)

function toggleAllDeps() {
  projectsStore.setAllDeps(props.project.id, !hasDepsEnabled.value)
}

function applyMove() {
  const n     = Math.max(1, moveAmount.value || 1)
  const days  = moveUnit.value === 'weeks' ? n * 7 : n
  const delta = moveDir.value === 'backward' ? -days : days
  projectsStore.moveCalendar(props.project.id, delta)
  $toast?.(L.value.toastMoved, { type: 'success' })
  moveModalOpen.value = false
}

function onKeydown(e) {
  // Delete-Stage confirmation modal: Enter confirms, Esc cancels.
  // Evaluated first because it's a destructive action that should win over other modals.
  if (deleteStageTarget.value) {
    if (e.key === 'Escape') { e.stopPropagation(); deleteStageTarget.value = null; return }
    if (e.key === 'Enter')  { e.preventDefault();  e.stopPropagation(); confirmDeleteStage(); return }
  }
  if (!moveModalOpen.value) return
  if (e.key === 'Escape') { e.stopPropagation(); moveModalOpen.value = false; return }
  if (e.key === 'Enter')  { e.preventDefault();  applyMove() }
}
onMounted(()   => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.ev-list-wrap {
  display: flex; flex-direction: column; flex: 1; overflow: hidden;
}

/* ── Toolbar ── */
.ev-list-toolbar {
  display: flex; align-items: center; gap: 6px; padding: 8px 16px;
  background: #fff; border-bottom: 1px solid var(--border); flex-shrink: 0;
}

.ev-new-event-btn {
  padding: 4px 12px; border: none; border-radius: 6px;
  font-size: .68rem; font-weight: 700; cursor: pointer;
  background: var(--accent); color: var(--navy); font-family: inherit;
  white-space: nowrap;
}
.ev-new-event-btn:hover { background: var(--accent-dark); }

.ev-move-btn {
  padding: 4px 10px; border: 1.5px solid var(--border); border-radius: 6px;
  font-size: .68rem; font-weight: 600; cursor: pointer; background: #fff; color: var(--muted);
  font-family: inherit; transition: all .15s; white-space: nowrap;
}
.ev-move-btn:hover { border-color: var(--navy); color: var(--navy); }
.ev-deps-toggle-btn.deps-active,
.ev-deps-enable-btn.deps-active {
  background: var(--navy); color: #fff; border-color: var(--navy);
}
.ev-deps-toggle-btn.deps-active:hover,
.ev-deps-enable-btn.deps-active:hover { background: var(--accent-dark); border-color: var(--accent-dark); }

.ev-toolbar-sep { width: 1px; height: 16px; background: var(--border); margin: 0 2px; }

.ev-filter-btn {
  padding: 4px 10px; border: 1.5px solid var(--border); border-radius: 6px;
  font-size: .68rem; font-weight: 600; cursor: pointer; background: #fff; color: var(--muted);
  font-family: inherit; transition: all .15s; white-space: nowrap;
}
.ev-filter-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.06); }
.ev-filter-btn:hover:not(.active) { border-color: var(--muted); }
.ev-filter-btn.keydates-btn.active { border-color: var(--warning); color: var(--warning); background: rgba(245,158,11,.08); }

.ev-save-tmpl-btn {
  padding: 4px 10px; border: 1.5px solid var(--border); border-radius: 6px;
  font-size: .68rem; font-weight: 600; cursor: pointer; background: #fff; color: var(--muted);
  font-family: inherit; transition: all .15s;
}
.ev-save-tmpl-btn:hover:not(:disabled) { border-color: var(--navy); color: var(--navy); }
.ev-save-tmpl-btn--active {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
  background: rgba(6,204,180,.08) !important;
}
.ev-save-tmpl-btn:disabled { opacity: .35; cursor: not-allowed; }

/* ── Groups panel ── */
.groups-panel {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 16px; border-bottom: 1px solid var(--border);
  background: #fafcfd; flex-shrink: 0; overflow-x: auto;
}
.groups-panel-title { font-size: .64rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--muted); flex-shrink: 0; }
.groups-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.group-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px 3px 11px; border: 1.5px solid var(--border); border-radius: 20px;
  font-size: .64rem; font-weight: 600; cursor: pointer; background: #fff; color: var(--muted);
  font-family: inherit; transition: all .15s;
}
.group-chip.active { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.06); }
.group-chip:hover:not(.active) { border-color: var(--navy); color: var(--navy); }
.group-chip-name { line-height: 1; }
.group-chip-x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; border-radius: 50%; font-size: .68rem; line-height: 1;
  color: var(--muted); transition: all .13s; flex-shrink: 0;
}
.group-chip-x:hover { background: rgba(239,68,68,.12); color: var(--danger); }

.group-add-form { display: inline-flex; align-items: center; gap: 3px; }
.group-add-input {
  height: 24px; padding: 0 8px; border: 1.5px solid var(--accent); border-radius: 20px;
  font-size: .64rem; font-family: inherit; outline: none; color: var(--text);
  width: 120px; background: #fff;
}
.group-add-confirm, .group-add-cancel {
  width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--border);
  font-size: .70rem; line-height: 1; cursor: pointer; background: #fff;
  color: var(--muted); font-family: inherit; display: flex; align-items: center;
  justify-content: center; transition: all .15s; padding: 0;
}
.group-add-confirm:hover { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.08); }
.group-add-cancel:hover  { border-color: var(--danger); color: var(--danger); background: #fff5f5; }

.group-add-btn {
  width: 22px; height: 22px; border-radius: 50%; border: 1.5px dashed var(--border);
  font-size: .82rem; line-height: 1; cursor: pointer; background: transparent;
  color: var(--muted); font-family: inherit; display: flex; align-items: center;
  justify-content: center; transition: all .15s; padding: 0;
}
.group-add-btn:hover { border-color: var(--accent); color: var(--accent); border-style: solid; }

/* ── Conflicts bar ── */
.conflicts-bar {
  background: #fff5f5; border-bottom: 1px solid #fee2e2;
  padding: 6px 20px; font-size: .72rem; color: var(--danger);
  display: flex; align-items: center; gap: 6px; flex-shrink: 0;
}

/* ── Column header bar ── */
.ev-col-header {
  display: flex; align-items: center; gap: 0;
  background: #fff; border-bottom: 2px solid var(--border);
  flex-shrink: 0; overflow: hidden;
}
.ev-col-header > div {
  padding: 5px 10px; font-size: .60rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .45px; color: var(--muted);
}
.ev-col-actions { flex: 0 0 124px; border-right: 1px solid var(--border); }
.ev-col-name    { flex: 1 1 0; min-width: 0; border-right: 1px solid var(--border); }
/* Must match ev-dates fixed width in EventRow.vue exactly */
.ev-col-dates   { flex: 0 0 328px; border-right: 1px solid var(--border); }
/* Must match ev-dep-section fixed width in EventRow.vue */
.ev-col-dep     { flex: 0 0 420px; padding-left: 12px; }

/* ── Rows container ── */
.ev-list-scroll { flex: 1; overflow: auto; }
.ev-rows { display: flex; flex-direction: column; }

.ev-stage-count { font-size: .65rem; color: var(--muted); }

/* ── Move Calendar modal ── */
.move-modal { max-width: 360px; }
.move-modal h2 { margin-bottom: 20px; }

.move-direction-row {
  display: flex; gap: 8px; margin-bottom: 16px;
}
.move-dir-btn {
  flex: 1; padding: 8px 14px; border: 1.5px solid var(--border); border-radius: 7px;
  font-size: .76rem; font-weight: 600; cursor: pointer; background: #fff; color: var(--muted);
  font-family: inherit; transition: all .15s;
}
.move-dir-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.06); }
.move-dir-btn:hover:not(.active) { border-color: var(--muted); }

.move-amount-row {
  display: flex; align-items: center; gap: 8px; margin-bottom: 24px;
}
.move-amount-input {
  width: 80px; padding: 7px 10px; border: 1.5px solid var(--border); border-radius: 7px;
  font-size: .82rem; font-family: inherit; outline: none; text-align: center;
  color: var(--text);
}
.move-amount-input:focus { border-color: var(--accent); }

.move-unit-btn {
  padding: 7px 14px; border: 1.5px solid var(--border); border-radius: 7px;
  font-size: .76rem; font-weight: 600; cursor: pointer; background: #fff; color: var(--muted);
  font-family: inherit; transition: all .15s;
}
.move-unit-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.06); }
.move-unit-btn:hover:not(.active) { border-color: var(--muted); }

/* ── Stage header management ── */
.ev-stage-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 10px; background: var(--bg);
  border-top: 2px solid var(--border);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 1;
}
.stage-hdr-left  { display: flex; align-items: center; gap: 8px; }
.stage-hdr-actions {
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity .15s;
}
.ev-stage-hdr:hover .stage-hdr-actions { opacity: 1; }

.stage-move-btn {
  width: 20px; height: 20px; border-radius: 4px; border: 1.5px solid var(--border);
  font-size: .72rem; line-height: 1; cursor: pointer; background: #fff; color: var(--muted);
  font-family: inherit; display: flex; align-items: center; justify-content: center;
  padding: 0; transition: all .13s;
}
.stage-move-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.06); }
.stage-move-btn:disabled { opacity: .25; cursor: default; }

.stage-del-btn {
  width: 20px; height: 20px; border-radius: 4px; border: 1.5px solid var(--border);
  font-size: .80rem; line-height: 1; cursor: pointer; background: #fff; color: var(--muted);
  font-family: inherit; display: flex; align-items: center; justify-content: center;
  padding: 0; transition: all .13s;
}
.stage-del-btn:hover { border-color: var(--danger); color: var(--danger); background: #fff5f5; }

.stage-name-input {
  font-size: .7rem; font-weight: 700; font-family: inherit;
  border: 1.5px solid var(--accent); border-radius: 5px;
  padding: 1px 6px; outline: none; background: #fff;
  color: var(--navy); min-width: 80px; max-width: 220px;
}

.stage-collapse-arrow {
  font-size: .62rem; color: var(--muted); width: 10px; flex-shrink: 0;
  transition: transform .15s;
}
.stage-hidden .stage-badge { opacity: .4; }
.stage-hidden .ev-stage-count { opacity: .4; }
.stage-hidden .stage-collapse-arrow { opacity: .4; }

.stage-visibility-btn {
  height: 20px; padding: 0 6px; border-radius: 4px; border: 1.5px solid var(--border);
  font-size: .62rem; font-weight: 700; letter-spacing: .03em;
  cursor: pointer; background: #fff; color: var(--accent);
  font-family: inherit; display: flex; align-items: center; justify-content: center;
  transition: all .13s;
}
.stage-visibility-btn.is-off {
  border-color: var(--border); color: var(--muted); background: var(--bg);
}
.stage-visibility-btn:hover { border-color: var(--accent); }

/* Inline new-stage form row */
.ev-add-stage-row {
  display: flex; align-items: center;
  padding: 8px 14px; border-top: 2px dashed var(--border); background: var(--bg);
}
.stage-add-form { display: inline-flex; align-items: center; gap: 6px; }
.stage-add-input {
  height: 28px; padding: 0 10px; border: 1.5px solid var(--accent); border-radius: 6px;
  font-size: .72rem; font-family: inherit; outline: none; color: var(--text);
  width: 180px; background: #fff;
}
.stage-add-confirm, .stage-add-cancel {
  width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--border);
  font-size: .72rem; line-height: 1; cursor: pointer; background: #fff;
  color: var(--muted); font-family: inherit; display: flex; align-items: center;
  justify-content: center; transition: all .15s; padding: 0;
}
.stage-add-confirm:hover { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.08); }
.stage-add-cancel:hover  { border-color: var(--danger); color: var(--danger); background: #fff5f5; }

/* No-stages nudge modal */
.no-stage-modal { max-width: 380px; }
.no-stage-modal h2 { margin-bottom: 12px; }
.no-stage-body {
  font-size: .80rem; color: var(--muted); line-height: 1.6;
  margin-bottom: 24px;
}

/* Stage picker modal */
.stage-picker-modal { max-width: 340px; }
.stage-picker-modal h2 { margin-bottom: 16px; }
.stage-picker-list { display: flex; flex-direction: column; gap: 7px; margin-bottom: 20px; }
.stage-picker-btn {
  padding: 9px 14px; border: 1.5px solid var(--border); border-radius: 7px;
  font-size: .78rem; font-weight: 600; cursor: pointer; background: #fff;
  color: var(--text); font-family: inherit; text-align: left;
  transition: all .13s;
}
.stage-picker-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.05); }

/* Delete Stage modal */
.delete-stage-modal { max-width: 380px; }
.delete-stage-modal h2 { margin-bottom: 10px; }
.delete-stage-info { font-size: .82rem; color: var(--text); margin-bottom: 8px; }
.delete-stage-body { font-size: .78rem; color: var(--muted); margin-bottom: 24px; line-height: 1.5; }
.btn-danger {
  padding: 8px 18px; border: none; border-radius: 7px;
  background: var(--danger); color: #fff; font-size: .78rem; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: opacity .13s;
}
.btn-danger:hover { opacity: .88; }

/* ── Empty state ─────────────────────────────────────────────────────────── */
.ev-empty-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 48px 56px;
  max-width: 560px;
}
.ev-empty-title {
  font-size: .95rem;
  font-weight: 700;
  color: #002C3E;
  margin: 0;
}
.ev-empty-body {
  font-size: .85rem;
  color: #4a6475;
  line-height: 1.6;
  margin: 0;
  white-space: pre-line;
}
.ev-empty-closing {
  font-size: .85rem;
  color: #4a6475;
  line-height: 1.6;
  margin: 0;
  white-space: pre-line;
}
.ev-empty-action {
  margin-top: 4px;
  padding: 8px 18px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: .85rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity .13s;
}
.ev-empty-action:hover { opacity: .85; }

/* ── List drag-and-drop indicators ─────────────────────────────────────────── */
.ev-row-dnd-wrap { position: relative; }

.ev-row-dnd-wrap.ev-drop-above { border-top: 2px solid var(--accent); }
.ev-row-dnd-wrap.ev-drop-below { border-bottom: 2px solid var(--accent); }

.ev-stage-hdr.stage-drop-target {
  background: rgba(6,204,180,.08);
  outline: 1.5px solid var(--accent);
  outline-offset: -1px;
}
</style>
