<template>
  <Transition name="inv-fade">
    <div v-if="current" class="inv-overlay" @click.self="null">
      <div class="inv-card">

        <!-- Header -->
        <div class="inv-header">
          <div class="inv-icon">{{ current.needsVerification ? '✉️' : '🤝' }}</div>
          <p class="inv-eyebrow">{{ LABELS.eyebrow[lang] }}</p>
        </div>

        <!-- Org info -->
        <h2 class="inv-orgname">{{ current.orgName }}</h2>
        <p v-if="current.invitedBy" class="inv-inviter">
          {{ LABELS.invitedBy[lang] }} <strong>{{ current.invitedBy }}</strong>
        </p>

        <!-- Progress dots when multiple -->
        <div v-if="total > 1" class="inv-progress">
          <span
            v-for="i in total"
            :key="i"
            class="inv-dot"
            :class="{ active: i - 1 === index }"
          ></span>
        </div>

        <!-- Falta confirmar el correo -->
        <template v-if="current.needsVerification">
          <p class="inv-verify-why">{{ LABELS.verifyWhy[lang] }}</p>
          <p v-if="enviado" class="inv-verify-sent">{{ LABELS.verifySent[lang] }}</p>
          <div class="inv-actions">
            <button class="inv-btn-accept" :disabled="busy" @click="confirmar">
              <span v-if="busy">{{ LABELS.sending[lang] }}</span>
              <span v-else>{{ enviado ? LABELS.resend[lang] : LABELS.verifyCta[lang] }}</span>
            </button>
            <button class="inv-btn-decline" :disabled="busy" @click="ahoraNo">
              {{ LABELS.later[lang] }}
            </button>
          </div>
        </template>

        <!-- Actions -->
        <div v-else class="inv-actions">
          <button
            class="inv-btn-accept"
            :disabled="busy"
            @click="accept"
          >
            <span v-if="busy && accepting">{{ LABELS.joining[lang] }}</span>
            <span v-else>{{ LABELS.yes[lang] }}</span>
          </button>
          <button
            class="inv-btn-decline"
            :disabled="busy"
            @click="decline"
          >
            {{ LABELS.no[lang] }}
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup>
const authStore   = useAuthStore()
const globalStore = useGlobalStore()

const lang = computed(() => globalStore.lang || 'es')

const LABELS = {
  eyebrow:   { es: 'Tienes una invitación', en: 'You have an invitation' },
  invitedBy: { es: 'Te invitó',            en: 'Invited by' },
  yes:       { es: 'Sí, unirme',           en: 'Join' },
  no:        { es: 'No, gracias',          en: 'Decline' },
  joining:   { es: 'Uniéndome...',         en: 'Joining...' },
  // Confirmar el correo hace falta para entrar a la organización de OTRO. El texto
  // dice POR QUÉ: sin el motivo, un paso extra entre "te invitaron" y "entra" se lee
  // como un trámite inventado.
  verifyWhy:  {
    es: 'Antes de entrar necesitamos confirmar que este correo es tuyo. Te mandamos un enlace y listo.',
    en: 'Before you join, we need to confirm this email is yours. We\u2019ll send you a link.',
  },
  verifyCta:  { es: 'Enviarme el enlace',  en: 'Send me the link' },
  resend:     { es: 'Reenviar el enlace',  en: 'Resend the link' },
  sending:    { es: 'Enviando...',         en: 'Sending...' },
  later:      { es: 'Ahora no',            en: 'Not now' },
  verifySent: {
    es: 'Listo, revisa tu correo. Abre el enlace y vuelve acá.',
    en: 'Done — check your inbox. Open the link and come back.',
  },
}

const busy      = ref(false)
const accepting = ref(false)
const index     = ref(0)

const invitations = computed(() => authStore.pendingInvitations)
const total       = computed(() => invitations.value.length)
const current     = computed(() => invitations.value[index.value] ?? null)

async function accept() {
  if (busy.value || !current.value) return
  const token = current.value.token
  const orgId = current.value.orgId
  busy.value      = true
  accepting.value = true
  const ok = await authStore.acceptInvitation(token)
  if (ok) {
    authStore.pendingInvitations = authStore.pendingInvitations.filter(i => i.token !== token)
    // Switch to the new org — reloads projects and settings so the calendar updates immediately
    await authStore.switchOrg(orgId)
  } else {
    advance()
  }
  busy.value      = false
  accepting.value = false
}

// Pide el enlace de confirmación. El servidor lo manda SIEMPRE a la dirección de la
// cuenta: no hay campo donde escribir otra, porque entonces no probaría nada.
const enviado = ref(false)
async function confirmar() {
  if (busy.value) return
  busy.value = true
  const r = await authStore.sendVerification()
  busy.value = false
  if (!r) return
  // `alreadyVerified` = ya estaba probado (p.ej. abrió el enlace en otra pestaña).
  // Se recarga la bandeja para que la invitación aparezca con su llave y el botón
  // pase a ser "Sí, unirme" sin que la persona tenga que adivinar nada.
  if (r.alreadyVerified) { await authStore.fetchPendingInvitations(); return }
  enviado.value = true
}

// "Ahora no" mientras falta confirmar el correo NO rechaza la invitación: solo cierra
// el cartel hasta la próxima carga. Rechazar de verdad exige la llave, que a esta
// altura todavía no viajó — y aunque viajara, no correspondería: quien no probó el
// correo tampoco debería poder tirar a la basura la invitación de otra persona.
function ahoraNo() {
  if (busy.value || !current.value) return
  const id = current.value.orgId
  authStore.pendingInvitations = authStore.pendingInvitations.filter(i => i.orgId !== id)
}

async function decline() {
  if (busy.value || !current.value) return
  const token = current.value.token
  busy.value = true
  await authStore.declineInvitation(token)
  busy.value = false
}

function advance() {
  if (index.value < total.value - 1) {
    index.value++
  }
}

// When an invitation is removed, keep index in bounds
watch(total, (newTotal) => {
  if (index.value >= newTotal) index.value = Math.max(0, newTotal - 1)
})
</script>

<style scoped>
.inv-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay);
  backdrop-filter: blur(2px);
  padding: 24px;
}

.inv-card {
  background: var(--surface);
  border-radius: 20px;
  padding: 40px 36px;
  width: 100%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 20px 60px var(--shadow-ink-2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.inv-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.inv-icon {
  font-size: 40px;
  line-height: 1;
}

.inv-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .6px;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0;
}

.inv-orgname {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-title);
  margin: 4px 0 0;
  line-height: 1.2;
}

.inv-inviter {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
}

/* Falta confirmar el correo */
.inv-verify-why {
  margin: 16px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}
.inv-verify-sent {
  margin: 10px 0 0;
  padding: 9px 12px;
  border-radius: var(--r-sm);
  background: var(--accent-panel);
  border: 1px solid var(--accent-deep);
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--accent);
}

/* Progress dots */
.inv-progress {
  display: flex;
  gap: 6px;
  margin: 4px 0;
}
.inv-dot {
  width: 24px;
  height: 3px;
  border-radius: 2px;
  background: var(--border);
  transition: background .2s;
}
.inv-dot.active {
  background: var(--accent);
  width: 32px;
}

/* Buttons */
.inv-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 8px;
}

.inv-btn-accept {
  padding: 13px;
  background: var(--accent);
  color: var(--accent-ink);
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background .15s;
}
.inv-btn-accept:hover:not(:disabled) { background: var(--accent-dark); }
.inv-btn-accept:disabled { opacity: .5; cursor: not-allowed; }

.inv-btn-decline {
  padding: 12px;
  background: none;
  color: var(--muted);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color .15s, color .15s;
}
.inv-btn-decline:hover:not(:disabled) { border-color: var(--danger); color: var(--danger); }
.inv-btn-decline:disabled { opacity: .5; cursor: not-allowed; }

/* Fade transition */
.inv-fade-enter-active,
.inv-fade-leave-active { transition: opacity .2s, transform .2s; }
.inv-fade-enter-from,
.inv-fade-leave-to { opacity: 0; transform: scale(.96); }
</style>
