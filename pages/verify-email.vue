<template>
  <div class="ve-page">
    <div class="ve-card">
      <p class="ve-mark">
        <span class="ve-mark-g">relations</span><span class="ve-mark-n"> by unabase</span>
      </p>

      <!-- Comprobando -->
      <template v-if="estado === 'cargando'">
        <div class="ve-spinner" aria-hidden="true"></div>
        <p class="ve-body">{{ T.comprobando }}</p>
      </template>

      <!-- Listo -->
      <template v-else-if="estado === 'ok'">
        <div class="ve-icon ve-icon-ok" aria-hidden="true">✓</div>
        <h1 class="ve-title">{{ T.listoTitulo }}</h1>
        <p class="ve-body">{{ T.listoCuerpo }}</p>
        <button class="ve-btn" @click="entrar">{{ T.entrar }}</button>
      </template>

      <!-- No sirvió -->
      <template v-else>
        <div class="ve-icon ve-icon-bad" aria-hidden="true">!</div>
        <h1 class="ve-title">{{ T.malTitulo }}</h1>
        <p class="ve-body">{{ error || T.malCuerpo }}</p>
        <button class="ve-btn" @click="entrar">{{ T.irApp }}</button>
      </template>
    </div>
  </div>
</template>

<script setup>
// La pantalla del enlace de "confirma tu correo".
//
// NO exige sesión, y eso es el punto: el enlace se abre desde el correo, que puede
// estar en otro navegador o en el teléfono. Pedir login acá dejaría fuera justamente
// al caso normal. El token es la prueba; no necesita compañía.
definePageMeta({ layout: false })

const authStore   = useAuthStore()
const globalStore = useGlobalStore()
const route       = useRoute()
const router      = useRouter()

const es = computed(() => (globalStore.lang || 'es') !== 'en')

const T = computed(() => es.value ? {
  comprobando: 'Confirmando tu correo…',
  listoTitulo: 'Listo, tu correo está confirmado',
  listoCuerpo: 'Ya puedes aceptar la invitación y entrar a la organización.',
  entrar:      'Ir a la app',
  irApp:       'Ir a la app',
  malTitulo:   'Este enlace ya no sirve',
  malCuerpo:   'Puede que haya expirado o que ya lo hayas usado. Pide uno nuevo desde la app.',
} : {
  comprobando: 'Confirming your email…',
  listoTitulo: 'Done — your email is confirmed',
  listoCuerpo: 'You can now accept the invitation and join the organization.',
  entrar:      'Go to the app',
  irApp:       'Go to the app',
  malTitulo:   'This link no longer works',
  malCuerpo:   'It may have expired, or you may have used it already. Ask for a new one from the app.',
})

const estado = ref('cargando')
const error  = ref('')

const entrar = () => router.push('/')

onMounted(async () => {
  const token = String(route.query.token || '')
  if (!token) { estado.value = 'mal'; return }
  const r = await authStore.verifyEmail(token)
  if (r) { estado.value = 'ok'; return }
  error.value  = authStore.error || ''
  estado.value = 'mal'
})
</script>

<style scoped>
.ve-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg);
}
.ve-card {
  width: 100%;
  max-width: 400px;
  text-align: center;
}
.ve-mark {
  margin: 0 0 40px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -.1px;
}
.ve-mark-g { color: var(--accent); }
.ve-mark-n { color: var(--muted); font-weight: 400; }

.ve-icon {
  width: 46px;
  height: 46px;
  margin: 0 auto 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
}
.ve-icon-ok  { background: var(--accent); color: var(--accent-ink); }
.ve-icon-bad { background: var(--surface-2); color: var(--muted); border: 1px solid var(--border); }

.ve-spinner {
  width: 26px;
  height: 26px;
  margin: 0 auto 20px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: ve-spin .7s linear infinite;
}
@keyframes ve-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .ve-spinner { animation-duration: 2.4s; }
}

.ve-title {
  margin: 0 0 12px;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -.5px;
  line-height: 1.25;
  color: var(--text);
}
.ve-body {
  margin: 0;
  font-size: .95rem;
  line-height: 1.65;
  color: var(--text-2);
}
.ve-btn {
  margin-top: 26px;
  padding: 12px 26px;
  border: none;
  border-radius: 11px;
  background: var(--accent);
  color: var(--accent-ink);
  font-size: .92rem;
  font-weight: 700;
  cursor: pointer;
}
.ve-btn:hover { filter: brightness(1.06); }
.ve-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
</style>
