<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <h2>{{ L.copyTitle }}</h2>

      <div class="copy-tabs">
        <button
          class="copy-tab"
          :class="{ active: copyMode === 'struct' }"
          @click="copyMode = 'struct'"
        >{{ L.copyStruct }}</button>
        <button
          class="copy-tab"
          :class="{ active: copyMode === 'full' }"
          @click="copyMode = 'full'"
        >{{ L.copyFull }}</button>
      </div>

      <div style="font-size:.73rem;color:var(--muted);margin-bottom:14px;">
        {{ copyMode === 'struct' ? L.copyDescStruct : L.copyDescFull }}
      </div>

      <div class="modal-grid">
        <div class="field">
          <label>{{ L.fClient }}</label>
          <input type="text" v-model="form.client" />
        </div>
        <div class="field">
          <label>{{ L.fAgency }}</label>
          <input type="text" v-model="form.agency" />
        </div>
        <div class="field" style="grid-column:1/-1">
          <label>{{ L.fProject }}</label>
          <input type="text" v-model="form.name" />
        </div>
        <div class="field">
          <label>{{ L.fDirector }}</label>
          <input type="text" v-model="form.director" />
        </div>
        <div class="field">
          <label>{{ L.fPhotographer }}</label>
          <input type="text" v-model="form.photographer" />
        </div>
        <div class="field">
          <label>{{ L.fEP }}</label>
          <input type="text" v-model="form.ep" />
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-ghost" @click="$emit('close')">{{ L.btnCancel }}</button>
        <button class="btn-primary" @click="doCopy">{{ L.btnCopy }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const projectsStore = useProjectsStore()
const globalStore   = useGlobalStore()
const { $toast }    = useNuxtApp()

const props = defineProps({
  sourceId: { type: String, required: true },
})
const emit = defineEmits(['close'])

// ── Inline translations (avoids @nuxtjs/i18n runtime bug in v-if modals) ──────
const LABELS = {
  es: {
    copyTitle:      'Copiar calendario',
    copyStruct:     'Solo estructura',
    copyFull:       'Calendario completo',
    copyDescStruct: 'Copia eventos activos/inactivos, duraciones y dependencias. Las fechas se limpian.',
    copyDescFull:   'Copia todo: estructura, fechas, dependencias y configuración completa.',
    fClient:        'Cliente',
    fAgency:        'Agencia',
    fProject:       'Proyecto',
    fDirector:      'Director/a',
    fPhotographer:  'Fotógrafo/a',
    fEP:            'Productor/a Ejecutivo/a',
    btnCancel:      'Cancelar',
    btnCopy:        'Crear copia',
    toastCopied:    '✓ Calendario copiado',
  },
  en: {
    copyTitle:      'Copy calendar',
    copyStruct:     'Structure only',
    copyFull:       'Full calendar',
    copyDescStruct: 'Copies active/inactive events, durations and dependencies. Dates are cleared.',
    copyDescFull:   'Copies everything: structure, dates, dependencies and full configuration.',
    fClient:        'Client',
    fAgency:        'Agency',
    fProject:       'Project',
    fDirector:      'Director',
    fPhotographer:  'Photographer',
    fEP:            'Executive Producer',
    btnCancel:      'Cancel',
    btnCopy:        'Create copy',
    toastCopied:    '✓ Calendar copied',
  },
}

const lang = computed(() => globalStore.lang || 'es')
const L    = computed(() => LABELS[lang.value] ?? LABELS.es)

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
  $toast?.(L.value.toastCopied, { type: 'success' })
  emit('close')
}

// ── Keyboard: Enter = copy, Esc = close ────────────────────────────────────────
function onKeydown(e) {
  if (e.key === 'Escape') { emit('close') }
  if (e.key === 'Enter')  { doCopy() }
}
onMounted(()   => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
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
