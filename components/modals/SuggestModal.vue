<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="!sending && globalStore.closeSuggest()">
      <div class="modal suggest-modal">
        <div class="sg-head">
          <span class="sg-icon">💡</span>
          <h2 class="sg-title">{{ lang === 'en' ? 'Suggest an idea' : 'Sugerir una idea' }}</h2>
        </div>
        <p class="sg-sub">
          {{ lang === 'en'
            ? 'Calendar grows with your ideas. Tell us what you’d love to see — every suggestion reaches our team.'
            : 'Calendar crece con tus ideas. Cuéntanos qué te encantaría ver — cada sugerencia llega a nuestro equipo.' }}
        </p>

        <textarea
          ref="ta"
          v-model="message"
          class="sg-textarea"
          :placeholder="lang === 'en' ? 'Your idea, suggestion or feedback…' : 'Tu idea, sugerencia o comentario…'"
          :disabled="sending"
          rows="5"
          @keydown.meta.enter="submit"
          @keydown.ctrl.enter="submit"
        ></textarea>

        <p class="sg-from">
          {{ lang === 'en' ? 'Sent as' : 'Se envía como' }}
          <b>{{ authStore.user?.email }}</b>
        </p>

        <div class="modal-actions sg-actions">
          <button class="btn-ghost" :disabled="sending" @click="globalStore.closeSuggest()">
            {{ lang === 'en' ? 'Cancel' : 'Cancelar' }}
          </button>
          <button class="btn-primary" :disabled="sending || !message.trim()" @click="submit">
            {{ sending ? (lang === 'en' ? 'Sending…' : 'Enviando…') : (lang === 'en' ? 'Send' : 'Enviar') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const globalStore = useGlobalStore()
const authStore   = useAuthStore()
const { $toast }  = useNuxtApp()

const lang = computed(() => globalStore.lang)

const message = ref('')
const sending = ref(false)
const ta = ref(null)

onMounted(() => nextTick(() => ta.value?.focus()))

async function submit() {
  const text = message.value.trim()
  if (!text || sending.value) return
  sending.value = true
  try {
    // De qué app viene: la bandeja del equipo es UNA para todo el ecosistema
    // (Relations, Leads y Calendar escriben en la misma colección), así que sin esto
    // un "no funciona la fecha" llega sin decir de qué app habla.
    await useApi().post('/feedback', { message: text, app: 'calendar' })
    $toast(lang.value === 'en' ? 'Thanks! Your idea was sent. 🙌' : '¡Gracias! Tu idea fue enviada. 🙌', { type: 'success' })
    globalStore.closeSuggest()
  } catch (e) {
    $toast(lang.value === 'en' ? 'Could not send. Try again.' : 'No se pudo enviar. Intenta de nuevo.', { type: 'error' })
    sending.value = false
  }
}
</script>

<style scoped>
.suggest-modal { width: min(480px, 94vw); }
.sg-head { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; }
.sg-icon { font-size: 1.15rem; }
.sg-title { margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--text); }
.sg-sub { margin: 0 0 14px; font-size: .82rem; line-height: 1.6; color: var(--muted); }
.sg-textarea {
  width: 100%; box-sizing: border-box; padding: 11px 12px; border-radius: 10px;
  border: 1.5px solid var(--border); background: var(--bg); color: var(--text);
  font-size: .88rem; font-family: inherit; line-height: 1.55; resize: vertical; outline: none;
}
.sg-textarea:focus { border-color: var(--accent); }
.sg-from { margin: 10px 0 0; font-size: .73rem; color: var(--muted); }
.sg-from b { color: var(--text); font-weight: 700; }
.sg-actions { margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px; }
</style>
