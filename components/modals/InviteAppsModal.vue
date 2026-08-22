<!--
  Confirmar una invitación y con qué apps entra (§8.7).

  Invitar a alguien es compartir acceso, así que no pasa en silencio: al pulsar "Invitar" se
  confirma a quién y a qué. Las apps que la organización tiene contratadas vienen TODAS
  encendidas —invitar sigue comportándose como antes de la asignación por persona— y acá se
  apaga lo que no se quiera compartir.

  Si la organización tiene una sola app, el modal aparece igual: sigue siendo una confirmación
  de que estás dando acceso a alguien, y un flujo que a veces pregunta y a veces no es peor que
  uno predecible.
-->
<template>
  <div class="iam-backdrop" @click.self="$emit('close')">
    <div class="iam-panel">
      <h3 class="iam-title">{{ es ? '¿Invitar a esta persona?' : 'Invite this person?' }}</h3>
      <p class="iam-email">{{ email }}</p>

      <template v-if="available.length">
        <p class="iam-hint">
          {{ es
            ? 'Va a entrar con estas apps. Apaga las que no quieras compartir.'
            : 'They will enter with these apps. Turn off the ones you do not want to share.' }}
        </p>

        <div class="iam-apps">
          <button
            v-for="key in available"
            :key="key"
            type="button"
            class="iam-chip"
            :class="{ 'iam-chip--on': selected.includes(key) }"
            @click="toggle(key)"
          >
            <span class="iam-box">{{ selected.includes(key) ? '✓' : '' }}</span>
            {{ appLabel(key) }}
          </button>
        </div>

        <!--
          Sin ninguna app no se invita. Una invitación sin acceso a nada no sirve para nada:
          la persona acepta, entra, y no puede abrir una sola pantalla. Se avisa acá y el
          botón queda inhabilitado, en vez de dejar mandarla y que el error aparezca después.
        -->
        <p v-if="!selected.length" class="iam-none">
          {{ es
            ? 'Elige al menos una app: sin ninguna, esa persona entraría y no podría abrir nada.'
            : 'Pick at least one app: with none, that person would sign in and be unable to open anything.' }}
        </p>
      </template>

      <div class="iam-actions">
        <button class="btn-ghost" @click="$emit('close')">{{ es ? 'Cancelar' : 'Cancel' }}</button>
        <button
          class="btn-primary"
          :disabled="!selected.length"
          @click="$emit('confirm', [...selected])"
        >{{ es ? 'Invitar' : 'Invite' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  email:     { type: String, required: true },
  available: { type: Array,  default: () => [] },   // apps contratadas por la organización
})
const globalStore = useGlobalStore()
const es = computed(() => (globalStore.lang || 'es') !== 'en')

// Todas encendidas al abrir: el olvido no lo paga el invitado.
const selected = ref([...props.available])

const toggle = (key) => {
  selected.value = selected.value.includes(key)
    ? selected.value.filter(k => k !== key)
    : [...selected.value, key]
}

// ESC cierra ESTE modal, y Enter confirma si hay algo encendido.
//
// Se registra en fase de CAPTURA y usa `stopImmediatePropagation`: el modal de Configuración
// que está debajo escucha las mismas dos teclas en `window` —Escape lo cierra, Enter guarda—,
// y sin cortar el evento una tecla reflejo cerraría o guardaría la pantalla de atrás mientras
// esta pregunta sigue abierta. Es el mismo tipo de choque de ESC que ya se limpió en este repo.
const emit = defineEmits(['close', 'confirm'])

function onKeydown(e) {
  if (e.key !== 'Escape' && e.key !== 'Enter') return
  e.stopImmediatePropagation()
  e.preventDefault()
  if (e.key === 'Escape') emit('close')
  else if (selected.value.length) emit('confirm', [...selected.value])
}
onMounted(() => window.addEventListener('keydown', onKeydown, true))
onUnmounted(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<style scoped>
.iam-backdrop {
  position: fixed; inset: 0; z-index: 1300;   /* sobre el modal de Configuración */
  display: flex; align-items: center; justify-content: center;
  background: var(--overlay); backdrop-filter: blur(2px);
  padding: 20px;
}
.iam-panel {
  width: 100%; max-width: 380px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 20px;
}
.iam-title { margin: 0 0 2px; font-size: .95rem; font-weight: 700; color: var(--text); }
.iam-email { margin: 0 0 14px; font-size: .82rem; color: var(--accent); font-weight: 600; }
.iam-hint  { margin: 0 0 10px; font-size: .76rem; line-height: 1.4; color: var(--muted); }

.iam-apps { display: flex; flex-direction: column; gap: 6px; }
.iam-chip {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 8px 10px; border-radius: 7px; cursor: pointer;
  border: 1px solid var(--border); background: none; color: var(--muted);
  font-family: inherit; font-size: .8rem; font-weight: 600; text-align: left;
  transition: border-color .15s, color .15s, background .15s;
}
.iam-chip:hover { border-color: var(--accent); }
.iam-chip--on { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
.iam-box {
  width: 16px; height: 16px; flex: 0 0 16px;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid currentColor; border-radius: 4px;
  font-size: .7rem; line-height: 1;
}

.iam-none {
  margin: 10px 0 0; font-size: .72rem; line-height: 1.4;
  color: var(--muted); font-style: italic;
}

.iam-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.iam-actions button { padding: 7px 16px; font-size: .78rem; }
.iam-actions button:disabled { opacity: .45; cursor: not-allowed; }
</style>
