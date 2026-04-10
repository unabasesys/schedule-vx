<template>
  <tr
    class="ev-row"
    :class="{
      'ev-inactive': !event.active,
      'ev-completed': event.completed,
      'ev-conflict-row': event.dep?.broken,
    }"
  >
    <!-- Drag handle -->
    <td class="ev-drag">⠿</td>

    <!-- Active toggle -->
    <td class="ev-toggle-cell">
      <label class="ev-toggle">
        <input type="checkbox" :checked="event.active" @change="toggleActive" />
        <span class="ev-toggle-slider"></span>
      </label>
    </td>

    <!-- Completed checkbox -->
    <td class="ev-done-cell">
      <input
        type="checkbox"
        :checked="event.completed"
        :disabled="!event.active"
        @change="toggleCompleted"
        class="ev-done-chk"
      />
    </td>

    <!-- Stage -->
    <td class="ev-stage-cell">
      <span class="stage-badge" :class="'stage-' + event.stage">{{ stageLabel }}</span>
      <button
        v-if="event.keyDate"
        class="ev-key-btn active"
        title="Key Date"
        @click="toggleKeyDate"
      >★</button>
      <button
        v-else
        class="ev-key-btn"
        title="Mark as Key Date"
        @click="toggleKeyDate"
      >☆</button>
    </td>

    <!-- Event name -->
    <td class="ev-name-cell">
      <input
        class="ev-name-input"
        :value="displayName"
        :style="event.completed ? 'text-decoration:line-through;opacity:.5' : ''"
        @change="updateName($event.target.value)"
        @blur="updateName($event.target.value)"
      />
    </td>

    <!-- Info button -->
    <td class="ev-info-cell">
      <button
        v-if="event.whenToUse || event.whenToUseEN"
        class="ev-info-btn"
        :title="lang === 'en' ? event.whenToUseEN : event.whenToUse"
      >ℹ</button>
    </td>

    <!-- Date -->
    <td class="ev-date-cell">
      <input
        type="date"
        class="ev-date-input"
        :value="event.date"
        :class="{ 'ev-date-auto': event.dateMode === 'auto', 'ev-date-broken': event.dep?.broken }"
        @change="updateDate($event.target.value)"
      />
    </td>

    <!-- Duration -->
    <td class="ev-dur-cell">
      <input
        type="number"
        class="ev-dur-input"
        min="1"
        :value="event.duration || event.days || 1"
        @change="updateDuration(parseInt($event.target.value) || 1)"
      />
    </td>

    <!-- Dep toggle -->
    <td class="ev-dep-toggle-cell">
      <input
        type="checkbox"
        :checked="event.dep?.active"
        @change="toggleDep"
        class="ev-dep-chk"
        title="Enable dependency"
      />
    </td>

    <!-- Depends on -->
    <td class="ev-dep-cell">
      <select
        v-if="event.dep?.active"
        class="ev-dep-sel"
        :value="event.dep?.eventId"
        @change="updateDepEvent($event.target.value)"
      >
        <option value="">{{ t('chooseEvent') }}</option>
        <option
          v-for="other in otherEvents"
          :key="other.id"
          :value="other.id"
        >{{ lang === 'en' ? (other.nameEN || other.name) : other.name }}</option>
      </select>
      <span v-else class="ev-dep-none">{{ t('depNone') }}</span>
    </td>

    <!-- Relation -->
    <td class="ev-rel-cell">
      <select
        v-if="event.dep?.active"
        class="ev-rel-sel"
        :value="event.dep?.relation"
        @change="updateDepRelation($event.target.value)"
      >
        <option value="after">{{ t('depAfter') }}</option>
        <option value="before">{{ t('depBefore') }}</option>
        <option value="same">{{ t('depSameDay') }}</option>
      </select>
    </td>

    <!-- Delta days -->
    <td class="ev-delta-cell">
      <input
        v-if="event.dep?.active && event.dep?.relation !== 'same'"
        type="number"
        class="ev-delta-input"
        min="0"
        :value="event.dep?.days ?? 1"
        @change="updateDepDays(parseInt($event.target.value) || 0)"
      />
    </td>

    <!-- Day type -->
    <td class="ev-type-cell">
      <select
        v-if="event.dep?.active"
        class="ev-type-sel"
        :value="event.dep?.dayType || 'calendar'"
        @change="updateDepDayType($event.target.value)"
      >
        <option value="calendar">{{ t('depCalendar') }}</option>
        <option value="business">{{ t('depBusiness') }}</option>
      </select>
    </td>

    <!-- Date mode indicator -->
    <td class="ev-mode-cell">
      <button
        class="ev-mode-btn"
        :class="{ 'ev-mode-auto': event.dateMode === 'auto', 'ev-mode-broken': event.dep?.broken }"
        :title="modeTitle"
        @click="toggleDateMode"
      >{{ event.dateMode === 'auto' ? '⟳' : '⊙' }}</button>
    </td>
  </tr>
</template>

<script setup>
import { useDependencyEngine } from '~/composables/useDependencyEngine'

const { t } = useI18n()
const projectsStore = useProjectsStore()
const { hasCircularDep } = useDependencyEngine()

const props = defineProps({
  event:       { type: Object, required: true },
  project:     { type: Object, required: true },
  lang:        { type: String, default: 'es' },
  stageLabel:  { type: String, default: '' },
})

const otherEvents = computed(() =>
  (props.project.events || []).filter(e => e.id !== props.event.id && e.active)
)

const displayName = computed(() =>
  props.lang === 'en' ? (props.event.nameEN || props.event.name) : props.event.name
)

const modeTitle = computed(() => {
  if (props.event.dep?.broken) return t('indBroken')
  return props.event.dateMode === 'auto' ? t('indAuto') : t('indManual')
})

function update(body) {
  projectsStore.updateEvent(props.project.id, props.event.id, body)
  projectsStore.recalcAndSave(props.project.id)
}

function toggleActive() {
  update({ active: !props.event.active })
}

function toggleCompleted() {
  update({ completed: !props.event.completed })
}

function toggleKeyDate() {
  update({ keyDate: !props.event.keyDate })
}

function updateName(val) {
  if (props.lang === 'en') update({ nameEN: val })
  else update({ name: val })
}

function updateDate(val) {
  update({ date: val, dateMode: 'manual' })
}

function updateDuration(val) {
  update({ duration: val, days: val })
}

function toggleDep() {
  update({ dep: { ...props.event.dep, active: !props.event.dep?.active } })
}

function updateDepEvent(evId) {
  if (evId && hasCircularDep(props.project, props.event.id, evId)) {
    alert(t('toastCircular'))
    return
  }
  update({ dep: { ...props.event.dep, eventId: evId } })
}

function updateDepRelation(rel) {
  update({ dep: { ...props.event.dep, relation: rel } })
}

function updateDepDays(n) {
  update({ dep: { ...props.event.dep, days: n } })
}

function updateDepDayType(dt) {
  update({ dep: { ...props.event.dep, dayType: dt } })
}

function toggleDateMode() {
  const newMode = props.event.dateMode === 'auto' ? 'manual' : 'auto'
  update({ dateMode: newMode })
}
</script>

<style scoped>
.ev-row { transition: background .1s; }
.ev-row:hover td { background: rgba(0,0,0,.02); }
.ev-row.ev-inactive { opacity: .45; }
.ev-row.ev-conflict-row td { background: rgba(239,68,68,.03); }

.ev-row td {
  padding: 4px 6px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
  font-size: .76rem;
  color: var(--text);
}

.ev-drag { cursor: grab; color: var(--muted); font-size: .8rem; text-align: center; }

.ev-toggle { display: inline-block; }

.ev-done-chk { cursor: pointer; accent-color: var(--accent); width: 14px; height: 14px; }

.ev-stage-cell { white-space: nowrap; }
.ev-key-btn {
  background: none; border: none; cursor: pointer; font-size: .75rem;
  color: var(--muted); padding: 0 2px; line-height: 1;
}
.ev-key-btn.active { color: var(--warning); }
.ev-key-btn:hover { color: var(--warning); }

.ev-name-input {
  border: none; outline: none; font-size: .76rem; font-family: inherit;
  color: var(--text); background: transparent; width: 100%; min-width: 100px;
}
.ev-name-input:focus { background: #f8fbfc; border-radius: 4px; padding: 1px 4px; }

.ev-info-btn {
  background: none; border: none; cursor: pointer; color: var(--muted); font-size: .7rem; padding: 1px 3px;
}
.ev-info-btn:hover { color: var(--accent); }

.ev-date-input {
  border: 1.5px solid var(--border); border-radius: 5px; padding: 3px 6px;
  font-size: .72rem; font-family: inherit; color: var(--text); cursor: pointer; outline: none;
}
.ev-date-input:focus { border-color: var(--accent); }
.ev-date-input.ev-date-auto { border-style: dashed; color: var(--accent); }
.ev-date-input.ev-date-broken { border-color: var(--danger); }

.ev-dur-input {
  width: 40px; border: 1.5px solid var(--border); border-radius: 5px;
  padding: 3px 4px; font-size: .72rem; font-family: inherit; text-align: center; outline: none;
}
.ev-dur-input:focus { border-color: var(--accent); }

.ev-dep-chk { cursor: pointer; accent-color: var(--accent); width: 14px; height: 14px; }

.ev-dep-sel, .ev-rel-sel, .ev-type-sel {
  border: 1.5px solid var(--border); border-radius: 5px;
  padding: 3px 5px; font-size: .7rem; font-family: inherit; color: var(--text);
  background: #fff; cursor: pointer; outline: none; max-width: 140px;
}
.ev-dep-sel:focus, .ev-rel-sel:focus, .ev-type-sel:focus { border-color: var(--accent); }

.ev-dep-none { font-size: .7rem; color: var(--muted); font-style: italic; }

.ev-delta-input {
  width: 38px; border: 1.5px solid var(--border); border-radius: 5px;
  padding: 3px 4px; font-size: .72rem; font-family: inherit; text-align: center; outline: none;
}
.ev-delta-input:focus { border-color: var(--accent); }

.ev-mode-btn {
  background: none; border: none; cursor: pointer; font-size: .9rem; color: var(--muted); padding: 1px 3px;
}
.ev-mode-btn.ev-mode-auto { color: var(--accent); }
.ev-mode-btn.ev-mode-broken { color: var(--danger); }
.ev-mode-btn:hover { color: var(--text); }
</style>
