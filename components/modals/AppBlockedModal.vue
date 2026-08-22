<!--
  Los tres 403 de la puerta (§8.7), cada uno con su salida.

  Aparece cuando el back cierra una app: la organización no la contrató, se venció el trial,
  o esta persona no la tiene asignada. Es una pantalla y no un toast porque no es un error
  que se arregle reintentando — hay algo concreto que hacer, y es distinto en cada caso.

  El texto principal viene del back: es el único que sabe a QUIÉN pedirle la app. Repetirlo
  acá dejaría dos versiones que se desfasan.
-->
<template>
  <Transition name="abm">
    <div v-if="block" class="abm-backdrop">
      <div class="abm-panel">
        <div class="abm-lock" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="11" width="16" height="9" rx="2"/>
            <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
          </svg>
        </div>

        <h2 class="abm-title">{{ title }}</h2>
        <p class="abm-body">{{ block.message }}</p>

        <!-- Un solo camino visible por caso: la acción que de verdad desbloquea. -->
        <a v-if="block.code === 'APP_NOT_ASSIGNED' && block.ownerEmail"
           class="btn-primary abm-cta"
           :href="mailto">
          {{ lang === 'en' ? 'Ask the owner' : 'Pedírsela al dueño' }}
        </a>

        <button class="btn-ghost abm-dismiss" @click="block = null">
          {{ lang === 'en' ? 'Close' : 'Cerrar' }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const block       = useAppBlock()
const globalStore = useGlobalStore()

const lang  = computed(() => globalStore.lang || 'es')
const title = computed(() => {
  const t = APP_BLOCK_TITLES[lang.value] || APP_BLOCK_TITLES.es
  return t[block.value?.code] || (lang.value === 'en' ? 'Access closed' : 'Acceso cerrado')
})

const mailto = computed(() => {
  const app     = block.value?.app || ''
  const subject = lang.value === 'en'
    ? `Access to ${app}`
    : `Acceso a ${app}`
  const body = lang.value === 'en'
    ? `Hi, could you assign me ${app}? I can't open it.`
    : `Hola, ¿me puedes asignar ${app}? No puedo abrirla.`
  return `mailto:${block.value.ownerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
})
</script>

<style scoped>
.abm-backdrop {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  background: var(--overlay); backdrop-filter: blur(2px);
  padding: 20px;
}
.abm-panel {
  width: 100%; max-width: 400px; text-align: center;
  background: var(--card, var(--white)); border: 1px solid var(--border);
  border-radius: 14px; padding: 26px 24px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.abm-lock { color: var(--muted); }
.abm-title { font-size: 1rem; font-weight: 700; color: var(--text); margin: 0; }
.abm-body  { font-size: .82rem; line-height: 1.45; color: var(--muted); margin: 0; }
.abm-cta   { margin-top: 6px; text-decoration: none; padding: 8px 16px; font-size: .8rem; }
.abm-dismiss { font-size: .75rem; }

.abm-enter-active, .abm-leave-active { transition: opacity .18s ease; }
.abm-enter-from,   .abm-leave-to     { opacity: 0; }
</style>
