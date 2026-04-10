<template>
  <div class="ev-list-wrap">
    <!-- Toolbar -->
    <div class="ev-list-toolbar">
      <button
        class="ev-filter-btn"
        :class="{ active: evFilter === 'all' }"
        @click="$emit('set-filter', 'all')"
      >{{ t('efAll') }}</button>
      <button
        class="ev-filter-btn"
        :class="{ active: evFilter === 'active' }"
        @click="$emit('set-filter', 'active')"
      >{{ t('efActive') }}</button>
      <button
        v-if="hasConflicts"
        class="ev-filter-btn conflicts-btn"
        :class="{ active: evFilter === 'conflicts' }"
        @click="$emit('set-filter', 'conflicts')"
      >⚠ {{ lang === 'en' ? 'Conflicts' : 'Conflictos' }}</button>
      <div class="ev-toolbar-sep"></div>
      <button
        class="key-filter-btn"
        :class="{ active: filterKeyDates }"
        @click="$emit('toggle-key-filter')"
      >★ {{ t('keyDatesFilter') }}</button>
      <div class="ev-toolbar-sep"></div>
      <button class="ev-recalc-btn" @click="recalcAll">{{ t('recalc') }}</button>
      <div style="display:flex;align-items:center;gap:6px;margin-left:auto">
        <button class="ev-save-tmpl-btn" @click="$emit('toggle-holidays')">
          {{ lang === 'en' ? 'Holidays' : 'Feriados' }}
        </button>
        <button class="ev-save-tmpl-btn" @click="saveAsTemplate">＋ Template</button>
        <button class="ev-new-event-btn" @click="addEvent">＋ {{ lang === 'en' ? 'New Event' : 'Nuevo Evento' }}</button>
      </div>
    </div>

    <!-- Groups filter chips -->
    <div v-if="project.groups?.length" class="groups-panel">
      <span class="groups-panel-title">{{ t('groupsTitle') }}</span>
      <div class="groups-chips">
        <button
          v-for="grp in activeGroups"
          :key="grp.id"
          class="group-chip"
          :class="{ active: selectedGroups.includes(grp.key) }"
          @click="toggleGroup(grp.key)"
        >{{ lang === 'en' ? (grp.nameEN || grp.name) : grp.name }}</button>
      </div>
    </div>

    <!-- Conflicts bar -->
    <div v-if="hasConflicts" class="conflicts-bar">
      ⚠ {{ conflicts.length }} {{ lang === 'en' ? 'broken dependencies' : 'dependencias rotas' }}
    </div>

    <!-- Table -->
    <div class="ev-list-scroll">
      <table class="ev-table">
        <thead>
          <tr>
            <th style="width:20px"></th>
            <th style="width:40px">{{ t('thOn') }}</th>
            <th style="width:24px">{{ t('thDone') }}</th>
            <th style="width:150px">{{ t('thStage') }}</th>
            <th>{{ t('thEvent') }}</th>
            <th style="width:24px"></th>
            <th style="width:130px">{{ t('thDate') }}</th>
            <th style="width:46px;text-align:center">{{ t('thDays') }}</th>
            <th style="width:28px;text-align:center" title="Dependency">⛓</th>
            <th style="width:155px">{{ t('thDependsOn') }}</th>
            <th style="width:78px">{{ t('thRel') }}</th>
            <th style="width:44px;text-align:center">{{ t('thDelta') }}</th>
            <th style="width:72px">{{ t('thType') }}</th>
            <th style="width:36px;text-align:center" title="Date mode">⊙</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="stage in stagesWithEvents" :key="stage.key">
            <!-- Stage header row -->
            <tr class="ev-stage-row">
              <td colspan="14" class="ev-stage-hdr">
                <span class="stage-badge" :class="'stage-' + stage.key">{{ stage.name }}</span>
                <span class="ev-stage-count">{{ stage.events.length }}</span>
                <button class="ev-add-to-stage" @click="addEventToStage(stage.key)">
                  + {{ t('addEventToStage') }}
                </button>
              </td>
            </tr>
            <!-- Event rows -->
            <EventRow
              v-for="ev in stage.events"
              :key="ev.id"
              :event="ev"
              :project="project"
              :lang="lang"
              :stage-label="stage.name"
            />
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { STAGE_ORDER } from '~/utils/constants'
import { uid } from '~/utils/helpers'

const { t } = useI18n()
const projectsStore = useProjectsStore()
const { $toast }    = useNuxtApp()

const props = defineProps({
  project:        { type: Object, required: true },
  lang:           { type: String, default: 'es' },
  evFilter:       { type: String, default: 'all' },
  filterKeyDates: { type: Boolean, default: false },
})

const emit = defineEmits(['set-filter', 'toggle-key-filter', 'toggle-holidays'])

const selectedGroups = ref([])

const activeGroups = computed(() =>
  (props.project.groups || []).filter(g => g.active !== false)
)

function toggleGroup(key) {
  const idx = selectedGroups.value.indexOf(key)
  if (idx >= 0) selectedGroups.value.splice(idx, 1)
  else selectedGroups.value.push(key)
}

const conflicts = computed(() =>
  (props.project.events || []).filter(e => e.active && e.dep?.broken)
)
const hasConflicts = computed(() => conflicts.value.length > 0)

const filteredEvents = computed(() => {
  let evs = [...(props.project.events || [])]

  if (props.evFilter === 'active')    evs = evs.filter(e => e.active)
  if (props.evFilter === 'conflicts') evs = evs.filter(e => e.active && e.dep?.broken)
  if (props.filterKeyDates)           evs = evs.filter(e => e.keyDate)

  if (selectedGroups.value.length) {
    evs = evs.filter(e =>
      e.groups?.some(gId => {
        const grp = props.project.groups?.find(g => g.id === gId)
        return grp && selectedGroups.value.includes(grp.key)
      })
    )
  }

  return evs
})

const stagesWithEvents = computed(() => {
  const stages = [...(props.project.stages || [])]
  stages.sort((a, b) => (STAGE_ORDER[a.key] ?? 99) - (STAGE_ORDER[b.key] ?? 99))

  return stages.filter(s => s.active !== false).map(stage => {
    const stageEvs = filteredEvents.value
      .filter(e => e.stage === stage.key)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const name = props.lang === 'en'
      ? (stage.nameEN || stage.name)
      : stage.name
    return { ...stage, name, events: stageEvs }
  }).filter(s => s.events.length > 0)
})

function recalcAll() {
  projectsStore.recalcAndSave(props.project.id)
  $toast?.(t('toastRecalc'), { type: 'success' })
}

function saveAsTemplate() {
  const name = prompt(t('promptTemplate'), props.project.name || props.project.client || 'Template')
  if (name === null) return
  projectsStore.saveAsTemplate(props.project.id, name)
  $toast?.(t('toastSaved'), { type: 'success' })
}

function addEvent() {
  const stageKey = props.project.stages?.[0]?.key || 'pre'
  addEventToStage(stageKey)
}

function addEventToStage(stageKey) {
  const defaultName = props.lang === 'en' ? 'New event' : 'Nuevo evento'
  const ev = {
    id: uid(), name: defaultName, nameEN: defaultName,
    stage: stageKey, active: true, date: '', dateMode: 'manual', duration: 1, durDayType: 'calendar',
    dep: { active: false, eventId: '', relation: 'after', days: 1, dayType: 'calendar', broken: false },
    locked: false, notes: '', order: props.project.events.length,
    completed: false, keyDate: false, whenToUse: '', whenToUseEN: '', groups: [],
  }
  projectsStore.addEvent(props.project.id, ev)
}
</script>

<style scoped>
.ev-list-wrap {
  display: flex; flex-direction: column; flex: 1; overflow: hidden;
}

.ev-list-toolbar {
  display: flex; align-items: center; gap: 6px; padding: 8px 16px;
  background: #fff; border-bottom: 1px solid var(--border); flex-shrink: 0;
}

.ev-filter-btn {
  padding: 4px 10px; border: 1.5px solid var(--border); border-radius: 6px;
  font-size: .68rem; font-weight: 600; cursor: pointer; background: #fff; color: var(--muted);
  font-family: inherit; transition: all .15s;
}
.ev-filter-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.06); }
.ev-filter-btn:hover:not(.active) { border-color: var(--muted); }

.ev-filter-btn.conflicts-btn { color: var(--warning); }
.ev-filter-btn.conflicts-btn.active { background: rgba(245,158,11,.12); border-color: var(--warning); color: var(--warning); }

.ev-toolbar-sep { width: 1px; height: 16px; background: var(--border); margin: 0 2px; }

.key-filter-btn {
  padding: 4px 10px; border: 1.5px solid var(--border); border-radius: 6px;
  font-size: .68rem; font-weight: 600; cursor: pointer; background: #fff; color: var(--muted);
  font-family: inherit; transition: all .15s;
}
.key-filter-btn.active { border-color: var(--warning); color: var(--warning); background: rgba(245,158,11,.08); }

.ev-recalc-btn {
  padding: 4px 10px; border: 1.5px solid var(--border); border-radius: 6px;
  font-size: .68rem; font-weight: 600; cursor: pointer; background: #fff; color: var(--muted);
  font-family: inherit; transition: all .15s;
}
.ev-recalc-btn:hover { border-color: var(--accent); color: var(--accent); }

.ev-save-tmpl-btn {
  padding: 4px 10px; border: 1.5px solid var(--border); border-radius: 6px;
  font-size: .68rem; font-weight: 600; cursor: pointer; background: #fff; color: var(--muted);
  font-family: inherit; transition: all .15s;
}
.ev-save-tmpl-btn:hover { border-color: var(--navy); color: var(--navy); }

.ev-new-event-btn {
  padding: 4px 12px; border: none; border-radius: 6px;
  font-size: .68rem; font-weight: 700; cursor: pointer;
  background: var(--accent); color: var(--navy); font-family: inherit;
}
.ev-new-event-btn:hover { background: var(--accent-dark); }

/* Groups panel */
.groups-panel {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 16px; border-bottom: 1px solid var(--border);
  background: #fafcfd; flex-shrink: 0;
}
.groups-panel-title { font-size: .64rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--muted); flex-shrink: 0; }
.groups-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.group-chip {
  padding: 3px 10px; border: 1.5px solid var(--border); border-radius: 20px;
  font-size: .64rem; font-weight: 600; cursor: pointer; background: #fff; color: var(--muted);
  font-family: inherit; transition: all .15s;
}
.group-chip.active { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.06); }
.group-chip:hover:not(.active) { border-color: var(--muted); }

/* Conflicts bar */
.conflicts-bar {
  background: #fff5f5; border-bottom: 1px solid #fee2e2;
  padding: 6px 20px; font-size: .72rem; color: var(--danger);
  display: flex; align-items: center; gap: 6px; flex-shrink: 0;
}

/* Table */
.ev-list-scroll { flex: 1; overflow: auto; }
.ev-table {
  width: 100%; border-collapse: collapse; font-size: .76rem;
}
.ev-table thead th {
  position: sticky; top: 0; background: #fff; z-index: 2;
  padding: 6px 6px; text-align: left; font-size: .63rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .4px; color: var(--muted);
  border-bottom: 2px solid var(--border);
}

.ev-stage-row .ev-stage-hdr {
  padding: 6px 10px; background: var(--bg);
  border-top: 2px solid var(--border);
  display: flex; align-items: center; gap: 8px;
}
.ev-stage-count { font-size: .65rem; color: var(--muted); }
.ev-add-to-stage {
  margin-left: auto; background: none; border: 1.5px dashed var(--border); border-radius: 5px;
  padding: 2px 8px; font-size: .63rem; font-weight: 600; color: var(--muted);
  cursor: pointer; font-family: inherit;
}
.ev-add-to-stage:hover { border-color: var(--accent); color: var(--accent); }
</style>
