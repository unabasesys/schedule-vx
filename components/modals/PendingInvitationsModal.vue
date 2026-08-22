<template>
  <Transition name="inv-fade">
    <div v-if="current" class="inv-overlay" @click.self="null">
      <div class="inv-card">

        <!-- Header -->
        <div class="inv-header">
          <div class="inv-icon">📅</div>
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

        <!-- Actions -->
        <div class="inv-actions">
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
  eyebrow:   { es: 'Tenés una invitación', en: 'You have an invitation' },
  invitedBy: { es: 'Te invitó',            en: 'Invited by' },
  yes:       { es: 'Sí, unirme',           en: 'Join' },
  no:        { es: 'No, gracias',          en: 'Decline' },
  joining:   { es: 'Uniéndome...',         en: 'Joining...' },
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
