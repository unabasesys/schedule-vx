<template>
  <div
    class="proj-item"
    :class="{ selected }"
    @click="$emit('select')"
  >
    <div
      class="proj-dot"
      :style="{ background: project.color || '#06CCB4' }"
    ></div>

    <div class="proj-info">
      <div class="proj-name">{{ project.name || project.client || '—' }}</div>
      <div class="proj-sub">
        {{ [project.client, project.agency].filter(Boolean).join(' · ') }}
      </div>
      <div class="proj-crew" v-if="project.director || project.ep">
        {{ [project.director, project.ep].filter(Boolean).join(' / ') }}
      </div>
      <div class="proj-version" :class="{ changed: project.hasChanges }">
        v{{ project.version || 1 }}{{ project.hasChanges ? ' *' : '' }}
      </div>
      <div
        v-if="project.status !== 'archived'"
        class="proj-status"
        :class="project.status"
        @click.stop="$emit('cycle-status')"
      >{{ statusLabel }}</div>
      <div v-else class="proj-status archived">{{ t('statusArchived') }}</div>
    </div>

    <div class="proj-actions">
      <button
        class="proj-act-btn"
        :title="project.hidden ? t('showAction') : t('hideAction')"
        @click.stop="$emit('toggle-visible')"
      >{{ project.hidden ? '👁' : '👁' }}</button>
      <button class="proj-act-btn" :title="t('editAction')" @click.stop="$emit('edit')">✎</button>
      <button class="proj-act-btn" :title="t('copyAction')" @click.stop="$emit('copy')">⧉</button>
      <button
        class="proj-act-btn"
        :title="project.status === 'archived' ? t('restoreAction') : t('archiveAction')"
        @click.stop="$emit('archive')"
      >{{ project.status === 'archived' ? '↩' : '📦' }}</button>
      <button
        class="proj-act-btn"
        :title="t('deleteProjectAction')"
        style="color:#ef4444;"
        @click.stop="$emit('delete')"
      >🗑</button>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n()

const props = defineProps({
  project:  { type: Object, required: true },
  selected: { type: Boolean, default: false },
  lang:     { type: String, default: 'es' },
})

defineEmits(['select', 'edit', 'copy', 'archive', 'delete', 'toggle-visible', 'cycle-status'])

const statusLabel = computed(() => {
  const map = {
    competing: props.lang === 'en' ? 'Competing' : 'Compitiendo',
    awarded:   props.lang === 'en' ? 'Awarded'   : 'Ganado',
    archived:  props.lang === 'en' ? 'Archived'  : 'Archivado',
  }
  return map[props.project.status] || props.project.status
})
</script>

<style scoped>
.proj-item {
  display: flex; align-items: flex-start; gap: 7px; padding: 8px 8px;
  border-radius: 8px; margin-bottom: 2px; cursor: pointer; position: relative;
  transition: background .12s;
}
.proj-item:hover { background: rgba(255,255,255,.07); }
.proj-item.selected {
  background: rgba(6,204,180,.12);
  border-left: 2px solid var(--accent);
  padding-left: 6px;
}

.proj-dot {
  width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; margin-top: 4px;
}

.proj-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.proj-name {
  font-size: .79rem; font-weight: 700; color: #fff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;
}
.proj-sub {
  font-size: .64rem; color: rgba(255,255,255,.38);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;
}
.proj-crew {
  font-size: .61rem; color: rgba(255,255,255,.25);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; font-style: italic;
}
.proj-version {
  font-size: .54rem; font-weight: 700; color: rgba(255,255,255,.3); margin-top: 2px; letter-spacing: .3px;
}
.proj-version.changed { color: var(--warning); }

.proj-status {
  font-size: .56rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
  padding: 1px 5px; border-radius: 3px; margin-top: 3px; display: inline-block;
  cursor: pointer; transition: opacity .15s;
}
.proj-status:hover { opacity: .75; }
.proj-status.competing { background: rgba(124,174,255,.2); color: #7CAEFF; }
.proj-status.awarded   { background: rgba(6,204,180,.2);  color: var(--accent); }
.proj-status.archived  { background: rgba(255,255,255,.08); color: rgba(255,255,255,.35); }

.proj-actions {
  display: flex; flex-direction: column; gap: 1px; opacity: 0;
  transition: opacity .12s; flex-shrink: 0; align-items: center;
}
.proj-item:hover .proj-actions { opacity: 1; }
.proj-act-btn {
  background: none; border: none; cursor: pointer; padding: 2px 3px;
  border-radius: 4px; color: rgba(255,255,255,.4); font-size: .7rem; line-height: 1.4;
}
.proj-act-btn:hover { background: rgba(255,255,255,.1); color: #fff; }
</style>
