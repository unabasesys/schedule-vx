<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <h2>{{ t('copyTitle') }}</h2>

      <div class="copy-tabs">
        <button
          class="copy-tab"
          :class="{ active: copyMode === 'struct' }"
          @click="copyMode = 'struct'"
        >{{ t('copyStruct') }}</button>
        <button
          class="copy-tab"
          :class="{ active: copyMode === 'full' }"
          @click="copyMode = 'full'"
        >{{ t('copyFull') }}</button>
      </div>

      <div style="font-size:.73rem;color:var(--muted);margin-bottom:14px;">
        {{ copyMode === 'struct' ? t('copyDescStruct') : t('copyDescFull') }}
      </div>

      <div class="modal-grid">
        <div class="field">
          <label>{{ t('fClient') }}</label>
          <input type="text" v-model="form.client" />
        </div>
        <div class="field">
          <label>{{ t('fAgency') }}</label>
          <input type="text" v-model="form.agency" />
        </div>
        <div class="field" style="grid-column:1/-1">
          <label>{{ t('fProject') }}</label>
          <input type="text" v-model="form.name" />
        </div>
        <div class="field">
          <label>{{ t('fDirector') }}</label>
          <input type="text" v-model="form.director" />
        </div>
        <div class="field">
          <label>{{ t('fPhotographer') }}</label>
          <input type="text" v-model="form.photographer" />
        </div>
        <div class="field">
          <label>{{ t('fEP') }}</label>
          <input type="text" v-model="form.ep" />
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-ghost" @click="$emit('close')">{{ t('btnCancel') }}</button>
        <button class="btn-primary" @click="doCopy">{{ t('btnCopy') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n()
const projectsStore = useProjectsStore()
const { $toast } = useNuxtApp()

const props = defineProps({
  sourceId: { type: String, required: true },
})
const emit = defineEmits(['close'])

const source = computed(() => projectsStore.projects.find(p => p.id === props.sourceId))

const copyMode = ref('struct')

const form = reactive({
  client:       source.value?.client       || '',
  agency:       source.value?.agency       || '',
  name:         (source.value?.name        || source.value?.client || '') + ' (copy)',
  director:     source.value?.director     || '',
  photographer: source.value?.photographer || '',
  ep:           source.value?.ep           || '',
})

function doCopy() {
  projectsStore.copyProject(props.sourceId, {
    ...form,
    clearDates: copyMode.value === 'struct',
  })
  $toast?.(t('toastCopied'), { type: 'success' })
  emit('close')
}
</script>

<style scoped>
.copy-tabs {
  display: flex; gap: 4px; margin-bottom: 14px;
}
.copy-tab {
  flex: 1; padding: 7px; border: 1.5px solid var(--border); border-radius: 7px;
  font-size: .72rem; font-weight: 600; cursor: pointer; text-align: center;
  background: #fff; color: var(--muted); font-family: inherit;
}
.copy-tab.active { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.06); }
</style>
