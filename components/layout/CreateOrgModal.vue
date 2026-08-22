<template>
  <div class="modal-backdrop" @click.self="!mandatory && $emit('close')">
    <div class="modal narrow">
      <h2>{{ lang === 'en' ? 'New organization' : 'Nueva organización' }}</h2>

      <div class="field" style="margin-top:16px;">
        <label>{{ lang === 'en' ? 'Name' : 'Nombre' }}</label>
        <input
          ref="nameInput"
          type="text"
          v-model="name"
          :placeholder="lang === 'en' ? 'e.g. Estudio Fe' : 'Ej: Estudio Fe'"
          @keydown.enter="save"
          @keydown.esc="!mandatory && $emit('close')"
        />
      </div>

      <!-- En modo obligatorio esto no es un modal que se pueda cerrar: es la puerta de
           entrada de alguien que todavía no pertenece a ninguna organización. -->
      <p v-if="mandatory" class="create-org-hint">
        {{ lang === 'en'
          ? 'Every calendar belongs to an organization. Create yours to start — or ask a teammate to invite you to theirs.'
          : 'Todo calendario pertenece a una organización. Crea la tuya para empezar, o pide que te inviten a una que ya exista.' }}
      </p>

      <p v-if="error" class="create-org-error">{{ error }}</p>

      <div class="modal-actions" style="margin-top:20px;">
        <button v-if="!mandatory" class="btn-ghost" @click="$emit('close')">
          {{ lang === 'en' ? 'Cancel' : 'Cancelar' }}
        </button>
        <button class="btn-primary" :disabled="!name.trim() || saving" @click="save">
          {{ saving ? (lang === 'en' ? 'Creating…' : 'Creando…') : (lang === 'en' ? 'Create' : 'Crear') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  // Sin organización no se puede leer ni escribir nada: todo endpoint protegido exige el
  // header Organization. Así que cuando esta es la única salida, no se puede cerrar.
  mandatory: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'created'])

const authStore  = useAuthStore()
const globalStore = useGlobalStore()

const lang  = computed(() => globalStore.lang || 'es')
const name  = ref('')
const saving = ref(false)
const error  = ref('')
const nameInput = ref(null)

onMounted(() => nextTick(() => nameInput.value?.focus()))

async function save() {
  if (!name.value.trim() || saving.value) return
  saving.value = true
  error.value  = ''
  const result = await authStore.createOrg(name.value.trim())
  saving.value = false
  if (result.ok) {
    emit('created')
  } else {
    error.value = result.error
      || (lang.value === 'en' ? 'Could not create organization. Try again.' : 'No se pudo crear la organización. Intenta de nuevo.')
  }
}
</script>

<style scoped>
.modal.narrow { max-width: 380px; }
.create-org-hint {
  font-size: .78rem; color: var(--muted); line-height: 1.55; margin: 14px 0 0;
}
.create-org-error {
  margin-top: 8px; font-size: .78rem; color: var(--danger, var(--danger));
}
</style>
