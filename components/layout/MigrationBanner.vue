<template>
  <div v-if="show" class="migration-banner">
    <div class="migration-content">
      <span class="migration-icon">☁</span>
      <span class="migration-text">
        {{ lang === 'en'
          ? `You have ${count} local project(s) not yet synced to the cloud.`
          : `Tenés ${count} proyecto(s) local(es) sin sincronizar con la nube.` }}
      </span>
      <button class="migration-btn" :disabled="loading" @click="migrate">
        {{ loading
          ? (lang === 'en' ? 'Syncing…' : 'Sincronizando…')
          : (lang === 'en' ? 'Sync now' : 'Sincronizar ahora') }}
      </button>
      <button class="migration-dismiss" @click="show = false">✕</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  lang: { type: String, default: 'es' },
})

const projectsStore = useProjectsStore()
const show    = ref(true)
const loading = ref(false)

const count = computed(() => projectsStore.localOnlyProjects.length)

watch(() => projectsStore.migrationPending, (val) => {
  if (val) show.value = true
})

async function migrate() {
  loading.value = true
  try {
    await projectsStore.importLocalProjects()
    await projectsStore.importLocalTemplates()
    show.value = false
  } catch (e) {
    useDialog().alert({
      title: props.lang === 'en' ? 'Sync failed'       : 'Error al sincronizar',
      body:  props.lang === 'en' ? 'Please try again.' : 'Intentá de nuevo.',
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.migration-banner {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #1e3a5f;
  color: #fff;
  padding: 10px 20px;
}
.migration-content {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 900px;
  margin: 0 auto;
}
.migration-icon { font-size: 18px; }
.migration-text { flex: 1; font-size: 13px; }
.migration-btn {
  background: #20a789;
  color: #111;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.migration-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.migration-dismiss {
  background: none;
  border: none;
  color: rgba(255,255,255,0.6);
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
}
.migration-dismiss:hover { color: #fff; }
</style>
