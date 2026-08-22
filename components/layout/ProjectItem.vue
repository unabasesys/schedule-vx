<template>
  <div
    class="proj-item"
    :class="{ selected }"
    @click="$emit('select')"
    @dblclick.stop="$emit('edit')"
  >
    <div class="proj-info">
      <div class="proj-name">{{ project.name || project.client || '—' }}</div>
      <div class="proj-sub">
        {{ [project.client, project.agency].filter(Boolean).join(' · ') }}
      </div>
      <div class="proj-crew" v-if="project.director || project.photographer">
        {{ [project.director, project.photographer].filter(Boolean).join(' / ') }}
      </div>
      <div class="proj-crew" v-if="project.ep">
        {{ project.ep }}
      </div>
      <div class="proj-version" :class="{ changed: project.hasChanges }">
        {{ lang === 'en' ? 'Version' : 'Versión' }} {{ project.version ?? 0 }}{{ project.hasChanges ? ' *' : '' }}
      </div>
      <div class="proj-event-count">
        {{ lang === 'en' ? 'Events' : 'Eventos' }} {{ (project.events || []).filter(e => e.active).length }}
      </div>
      <div class="proj-event-count" v-if="(project.dailySchedule || []).length">
        {{ lang === 'en' ? 'Daily Events' : 'Daily Events' }} {{ (project.dailySchedule || []).length }}
      </div>
      <div class="proj-event-count" v-if="calendarSpan">
        {{ lang === 'en' ? 'Duration' : 'Duración' }}: {{ calendarSpan }} {{ lang === 'en' ? 'days' : 'días' }}
      </div>
      <div class="proj-badges">
        <div
          v-if="project.status !== 'archived'"
          class="proj-status"
          :class="project.status"
          @click.stop="$emit('cycle-status')"
        >{{ statusLabel }}</div>
        <div v-else class="proj-status archived">{{ lang === 'en' ? 'Archived' : 'Archivado' }}</div>
        <div v-if="hasConflicts" class="proj-conflict" :title="lang === 'en' ? 'This calendar has events with broken dependencies' : 'Este calendario tiene eventos con dependencias rotas'">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 1.5L10.5 9.5H1.5L6 1.5z"/>
            <line x1="6" y1="5" x2="6" y2="7.5"/>
            <circle cx="6" cy="9" r=".5" fill="currentColor" stroke="none"/>
          </svg>
        </div>
      </div>
    </div>

    <div class="proj-actions">
      <!-- Toggle visible -->
      <button
        class="proj-act-btn proj-act-btn--eye-shown"
        :title="project.hidden ? (lang === 'en' ? 'Show' : 'Mostrar') : (lang === 'en' ? 'Hide' : 'Ocultar')"
        @click.stop="$emit('toggle-visible')"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="8" cy="8" rx="6.5" ry="4.5"/>
          <circle cx="8" cy="8" r="2"/>
          <template v-if="project.hidden">
            <line x1="2" y1="2" x2="14" y2="14"/>
          </template>
        </svg>
      </button>
      <!-- Copy -->
      <button class="proj-act-btn" :title="lang === 'en' ? 'Copy' : 'Copiar'" @click.stop="$emit('copy')">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="5" width="8" height="9" rx="1.5"/>
          <path d="M3 11V3a1 1 0 011-1h8"/>
        </svg>
      </button>
      <!-- Archive / Restore -->
      <button
        class="proj-act-btn"
        :title="project.status === 'archived' ? (lang === 'en' ? 'Restore' : 'Restaurar') : (lang === 'en' ? 'Archive' : 'Archivar')"
        @click.stop="$emit('archive')"
      >
        <svg v-if="project.status !== 'archived'" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1.5" y="5.5" width="13" height="9" rx="1"/>
          <path d="M1.5 5.5l1.5-4h10l1.5 4"/>
          <line x1="6" y1="9" x2="10" y2="9"/>
        </svg>
        <svg v-else viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="4 9 8 5 12 9"/>
          <line x1="8" y1="5" x2="8" y2="14"/>
          <path d="M2 14h12"/>
        </svg>
      </button>
      <!-- Delete -->
      <button
        class="proj-act-btn proj-act-btn--danger"
        :title="lang === 'en' ? 'Delete' : 'Eliminar'"
        @click.stop="$emit('delete')"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="2 4 14 4"/>
          <path d="M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4"/>
          <rect x="3" y="4" width="10" height="10" rx="1"/>
          <line x1="6" y1="7" x2="6" y2="11"/>
          <line x1="10" y1="7" x2="10" y2="11"/>
        </svg>
      </button>
      <!-- Save as template -->
      <button
        class="proj-act-btn"
        :title="lang === 'en' ? 'Save as template' : 'Guardar como template'"
        :disabled="!(project.events || []).length"
        @click.stop="$emit('save-template')"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="12" height="12" rx="1.5"/>
          <line x1="8" y1="5" x2="8" y2="11"/>
          <line x1="5" y1="8" x2="11" y2="8"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  project:  { type: Object, required: true },
  selected: { type: Boolean, default: false },
  lang:     { type: String, default: 'es' },
})

defineEmits(['select', 'edit', 'copy', 'archive', 'delete', 'toggle-visible', 'cycle-status', 'save-template'])

const statusLabel = computed(() => {
  const map = {
    competing: props.lang === 'en' ? 'Competing' : 'Compitiendo',
    awarded:   props.lang === 'en' ? 'Won'       : 'Ganado',
    lost:      props.lang === 'en' ? 'Lost'      : 'Perdido',
    draft:     props.lang === 'en' ? 'Draft'     : 'Draft',
    archived:  props.lang === 'en' ? 'Archived'  : 'Archivado',
  }
  return map[props.project.status] || props.project.status
})

const hasConflicts = computed(() =>
  (props.project.events || []).some(e => e.active && e.dep?.active && e.dep?.broken)
)

const calendarSpan = computed(() => {
  const events = (props.project.events || []).filter(e => e.active && e.date)
  if (!events.length) return null
  let minMs = Infinity
  let maxMs = -Infinity
  for (const e of events) {
    const start = new Date(e.date).getTime()
    const end = new Date(e.date)
    end.setDate(end.getDate() + Math.max(1, e.duration || 1) - 1)
    if (start < minMs) minMs = start
    if (end.getTime() > maxMs) maxMs = end.getTime()
  }
  return Math.round((maxMs - minMs) / 86400000) + 1
})
</script>

<style scoped>
.proj-item {
  display: flex; align-items: flex-start; gap: 7px; padding: 8px 8px;
  border-radius: 8px; margin-bottom: 2px; cursor: pointer; position: relative;
  transition: background .12s;
}
.proj-item:hover { background: var(--wash-2); }
.proj-item.selected {
  background: var(--accent-soft);
  border-left: 2px solid var(--accent);
  padding-left: 6px;
}

.proj-dot {
  width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; margin-top: 4px;
}

.proj-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.proj-name {
  font-size: .79rem; font-weight: 700; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;
}
.proj-sub {
  font-size: .64rem; color: var(--muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;
}
.proj-crew {
  font-size: .61rem; color: var(--dim);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; font-style: italic;
}
.proj-version {
  font-size: .54rem; font-weight: 700; color: var(--muted); margin-top: 2px; letter-spacing: .3px;
}
.proj-version.changed { color: var(--warning); }
.proj-event-count {
  font-size: .54rem; font-weight: 600; color: var(--dim); margin-top: 1px; letter-spacing: .3px;
}

.proj-badges { display: flex; align-items: center; gap: 4px; margin-top: 3px; flex-wrap: wrap; }

.proj-status {
  font-size: .56rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
  padding: 1px 5px; border-radius: 3px; display: inline-block;
  cursor: pointer; transition: opacity .15s;
}
.proj-status:hover { opacity: .75; }
.proj-status.competing { background: var(--amber-soft);  color: var(--amber); }
.proj-status.awarded   { background: var(--green-soft);  color: var(--accent); }
.proj-status.lost      { background: var(--red-soft);  color: var(--danger); }
.proj-status.draft     { background: var(--slate-soft); color: var(--muted); }
.proj-status.archived  { background: var(--wash-2); color: var(--muted); }

.proj-conflict {
  display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; color: var(--amber); flex-shrink: 0;
}
.proj-conflict svg { width: 12px; height: 12px; }

.proj-actions {
  display: flex; flex-direction: column; gap: 1px;
  flex-shrink: 0; align-items: center;
}
.proj-act-btn {
  background: none; border: none; cursor: pointer; padding: 3px;
  border-radius: 4px; color: var(--muted);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity .12s;
}
.proj-item:hover .proj-act-btn { opacity: 1; }
.proj-act-btn--eye-shown { opacity: 1; }
.proj-act-btn svg { width: 13px; height: 13px; }
.proj-act-btn:hover { background: var(--wash-2); color: var(--text); }
.proj-act-btn--danger { color: var(--danger); }
.proj-act-btn--danger:hover { background: var(--red-soft); color: var(--danger); }
</style>
