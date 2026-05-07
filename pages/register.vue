<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <span class="brand-name">Schedule</span>
        <span class="brand-by">by Unabase</span>
      </div>

      <h1 class="auth-title">Crear cuenta</h1>

      <!-- Google sign-in -->
      <div id="google-btn" class="google-btn-wrap"></div>
      <div class="divider"><span>o</span></div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="field-row">
          <div class="field">
            <label for="firstName">Nombre</label>
            <input id="firstName" v-model="form.firstName" type="text" placeholder="Juan" autocomplete="given-name" required />
          </div>
          <div class="field">
            <label for="lastName">Apellido</label>
            <input id="lastName" v-model="form.lastName" type="text" placeholder="Pérez" autocomplete="family-name" />
          </div>
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="form.email" type="email" placeholder="tu@email.com" autocomplete="email" required />
        </div>

        <div class="field">
          <label for="password">Contraseña</label>
          <input id="password" v-model="form.password" type="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password" required minlength="8" />
        </div>

        <div class="field">
          <label for="confirm">Confirmar contraseña</label>
          <input id="confirm" v-model="form.confirm" type="password" placeholder="Repetí tu contraseña" autocomplete="new-password" required />
        </div>

        <div v-if="localError" class="auth-error">{{ localError }}</div>
        <div v-else-if="authStore.error" class="auth-error">{{ authStore.error }}</div>

        <button type="submit" class="btn-primary" :disabled="authStore.loading">
          <span v-if="authStore.loading">Creando cuenta...</span>
          <span v-else>Crear cuenta</span>
        </button>
      </form>

      <div class="auth-footer">
        <span class="link-muted">¿Ya tenés cuenta?</span>
        <NuxtLink to="/login" class="link-accent">Iniciá sesión</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const authStore  = useAuthStore()
const config     = useRuntimeConfig()
const route      = useRoute()
authStore.init()

if (authStore.isLoggedIn) {
  await navigateTo('/schedule')
}

const form       = reactive({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
const localError = ref(null)

const handleSubmit = async () => {
  localError.value = null
  if (form.password !== form.confirm) {
    localError.value = 'Las contraseñas no coinciden.'
    return
  }
  if (form.password.length < 8) {
    localError.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }
  const ok = await authStore.register({
    firstName: form.firstName,
    lastName:  form.lastName,
    email:     form.email,
    password:  form.password,
  })
  if (ok) {
    const inviteToken = route.query.inviteToken
    if (inviteToken) await authStore.acceptInvitation(inviteToken)
    navigateTo('/schedule')
  }
}

// ── Google Identity Services ───────────────────────────────────────────────
onMounted(() => {
  const clientId = config.public.googleClientId
  if (!clientId) return

  const script = document.createElement('script')
  script.src   = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  script.onload = () => {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        const ok = await authStore.loginWithGoogle(credential)
        if (ok) {
          const inviteToken = route.query.inviteToken
          if (inviteToken) await authStore.acceptInvitation(inviteToken)
          navigateTo('/schedule')
        }
      },
    })
    window.google.accounts.id.renderButton(
      document.getElementById('google-btn'),
      { theme: 'outline', size: 'large', width: 340, text: 'signup_with', locale: 'es' }
    )
  }
  document.head.appendChild(script)
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
.auth-card {
  background: var(--white);
  border-radius: 16px;
  padding: 48px 40px;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 4px 32px rgba(0,44,62,.10);
}
.auth-brand { display: flex; align-items: baseline; gap: 8px; margin-bottom: 32px; }
.brand-name { font-family: 'Nunito', sans-serif; font-size: 22px; font-weight: 700; color: var(--navy); }
.brand-by   { font-size: 13px; color: var(--muted); }
.auth-title { font-family: 'Nunito', sans-serif; font-size: 20px; font-weight: 700; color: var(--navy); margin: 0 0 20px; }

.google-btn-wrap {
  display: flex;
  justify-content: center;
  min-height: 44px;
  margin-bottom: 4px;
}
.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0;
  color: var(--muted);
  font-size: 12px;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.auth-form { display: flex; flex-direction: column; gap: 16px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; font-weight: 600; color: var(--navy); }
.field input {
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  color: var(--navy);
  background: var(--white);
  outline: none;
  transition: border-color .15s;
  font-family: 'Nunito', sans-serif;
}
.field input:focus { border-color: var(--accent); }
.auth-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--danger);
}
.btn-primary {
  padding: 12px;
  background: var(--navy);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
  font-family: 'Nunito', sans-serif;
  margin-top: 4px;
}
.btn-primary:hover:not(:disabled) { background: var(--accent); color: var(--navy); }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.auth-footer {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  font-size: 13px;
}
.link-muted  { color: var(--muted); }
.link-accent { color: var(--accent-dark); text-decoration: none; font-weight: 600; }
.link-accent:hover { color: var(--accent); }
</style>
