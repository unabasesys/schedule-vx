<template>
  <div class="auth-page">
    <div class="invite-card">

      <div class="invite-brand">
        <img src="/images/white-unabase.png" alt="unabase" class="brand-logo" />
      </div>

      <!-- Loading -->
      <div v-if="state === 'loading'" class="invite-body">
        <div class="invite-spinner"></div>
        <p class="invite-msg">Verificando invitación...</p>
      </div>

      <!-- Success (already logged in → auto-accepted) -->
      <div v-else-if="state === 'success'" class="invite-body">
        <div class="invite-icon success-icon">✓</div>
        <h2 class="invite-title">¡Ya sos parte del equipo!</h2>
        <p class="invite-msg">Tu cuenta fue vinculada a <strong>{{ orgName }}</strong>.</p>
        <NuxtLink to="/schedule" class="btn-primary">Ir al calendario</NuxtLink>
      </div>

      <!-- Error -->
      <div v-else-if="state === 'error'" class="invite-body">
        <div class="invite-icon error-icon">✕</div>
        <h2 class="invite-title">Invitación no válida</h2>
        <p class="invite-msg">{{ errorMsg }}</p>
        <NuxtLink to="/login" class="btn-ghost">Ir al inicio de sesión</NuxtLink>
      </div>

      <!-- Not logged in → ask to log in or register -->
      <div v-else-if="state === 'prompt'" class="invite-body">
        <div class="invite-icon team-icon">👋</div>
        <h2 class="invite-title">Tenés una invitación</h2>
        <p class="invite-msg">Para unirte al equipo, iniciá sesión o creá una cuenta nueva.</p>
        <div class="invite-actions">
          <NuxtLink :to="`/login?inviteToken=${token}`" class="btn-primary">Iniciar sesión</NuxtLink>
          <NuxtLink :to="`/register?inviteToken=${token}`" class="btn-ghost">Crear cuenta nueva</NuxtLink>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const route     = useRoute()
const authStore = useAuthStore()
authStore.init()

const token    = route.query.token
const state    = ref('loading')
const orgName  = ref('')
const errorMsg = ref('')

onMounted(async () => {
  if (!token) {
    errorMsg.value = 'No se encontró el token de invitación en el enlace.'
    state.value    = 'error'
    return
  }

  if (!authStore.isLoggedIn) {
    state.value = 'prompt'
    return
  }

  const ok = await authStore.acceptInvitation(token)
  if (ok) {
    orgName.value = authStore.organization?.name || 'la organización'
    state.value   = 'success'
  } else {
    errorMsg.value = authStore.error || 'El enlace es inválido o ya expiró.'
    state.value    = 'error'
  }
})
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  font-family: 'Nunito', sans-serif;
  padding: 24px;
}

.invite-card {
  background: var(--surface);
  border-radius: 20px;
  padding: 48px 40px;
  width: 100%;
  max-width: 440px;
  box-shadow: var(--shadow-m);
  text-align: center;
}

.invite-brand {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}
.brand-logo { height: 24px; object-fit: contain; }

.invite-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.invite-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
}
.success-icon { background: rgba(32,167,137,.12); color: var(--accent); }
.error-icon   { background: rgba(234,78,73,.12);  color: var(--danger); }
.team-icon    { background: rgba(32,167,137,.12); font-size: 32px; }

.invite-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-title);
  margin: 0;
}

.invite-msg {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

.invite-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.invite-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 8px;
}

.btn-primary {
  display: block;
  padding: 13px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  font-family: 'Nunito', sans-serif;
  transition: background .15s;
}
.btn-primary:hover { background: var(--accent-dark); }

.btn-ghost {
  display: block;
  padding: 12px;
  background: none;
  color: var(--muted);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  font-family: 'Nunito', sans-serif;
  transition: border-color .15s, color .15s;
}
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
</style>
