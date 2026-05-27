<template>
  <div class="auth-page">
    <div class="auth-card">

      <!-- Left panel -->
      <div class="auth-panel-left">
        <div class="panel-logo">
          <img src="/images/white-unabase.png" alt="unabase" class="logo-img" />
        </div>
        <div class="panel-content">
          <h2 class="panel-product">Calendar</h2>
          <p class="panel-tagline">{{ isEN ? 'Organize production calendars for creative industry projects.' : 'Organiza calendarios de producción para proyectos de la industria creativa.' }}</p>
        </div>
        <div class="panel-dots">
          <span class="dot"></span>
          <span class="dot active"></span>
          <span class="dot"></span>
        </div>
      </div>

      <!-- Right panel -->
      <div class="auth-panel-right">

        <!-- Language toggle -->
        <div class="lang-toggle">
          <button :class="{ active: !isEN }" @click="setLang('es')">ES</button>
          <span class="lang-sep">·</span>
          <button :class="{ active: isEN }" @click="setLang('en')">EN</button>
        </div>

        <h1 class="auth-title">{{ isEN ? 'Create account' : 'Crear cuenta' }}</h1>
        <p class="auth-subtitle">{{ isEN ? 'Sign up for Calendar by unabase' : 'Registrate en Calendar by unabase' }}</p>

        <div id="google-btn" class="google-btn-wrap"></div>
        <div class="divider"><span>o</span></div>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <div class="field-row">
            <div class="field">
              <label for="firstName">{{ isEN ? 'First name' : 'Nombre' }}</label>
              <input id="firstName" v-model="form.firstName" type="text" :placeholder="isEN ? 'Ryan' : 'Gael'" autocomplete="given-name" required />
            </div>
            <div class="field">
              <label for="lastName">{{ isEN ? 'Last name' : 'Apellido' }}</label>
              <input id="lastName" v-model="form.lastName" type="text" :placeholder="isEN ? 'Reynolds' : 'Garcia'" autocomplete="family-name" />
            </div>
          </div>

          <div class="field">
            <label for="email">{{ isEN ? 'Email address' : 'Email' }}</label>
            <input id="email" v-model="form.email" type="email" placeholder="you@email.com" autocomplete="email" required />
          </div>

          <div class="field">
            <label for="password">{{ isEN ? 'Password' : 'Contraseña' }}</label>
            <input id="password" v-model="form.password" type="password" :placeholder="isEN ? 'At least 8 characters' : 'Mínimo 8 caracteres'" autocomplete="new-password" required minlength="8" />
          </div>

          <div class="field">
            <label for="confirm">{{ isEN ? 'Confirm password' : 'Confirmar contraseña' }}</label>
            <input id="confirm" v-model="form.confirm" type="password" :placeholder="isEN ? 'Repeat your password' : 'Repite tu contraseña'" autocomplete="new-password" required />
          </div>

          <div v-if="localError" class="auth-error">{{ localError }}</div>
          <div v-else-if="authStore.error" class="auth-error">{{ authStore.error }}</div>

          <button type="submit" class="btn-primary" :disabled="authStore.loading">
            <span v-if="authStore.loading">{{ isEN ? 'Creating account...' : 'Creando cuenta...' }}</span>
            <span v-else>{{ isEN ? 'Create account' : 'Crear cuenta' }}</span>
          </button>
        </form>

        <p class="auth-footer">
          {{ isEN ? 'Already have an account?' : '¿Ya tienes cuenta?' }}
          <NuxtLink to="/login" class="link-accent">{{ isEN ? 'Sign in' : 'Inicia sesión' }}</NuxtLink>
        </p>
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
  await navigateTo('/calendar')
}

const form       = reactive({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
const localError = ref(null)
const lang       = ref('es')
const isEN       = computed(() => lang.value === 'en')

function setLang(l) {
  lang.value = l
  localStorage.setItem('ub_lang', l)
}

onMounted(() => {
  authStore.error = null
  lang.value = localStorage.getItem('ub_lang') || 'es'
  if (route.query.email) form.email = route.query.email
})

const handleSubmit = async () => {
  localError.value = null
  if (form.password !== form.confirm) {
    localError.value = isEN.value ? 'Passwords do not match.' : 'Las contraseñas no coinciden.'
    return
  }
  if (form.password.length < 8) {
    localError.value = isEN.value ? 'Password must be at least 8 characters.' : 'La contraseña debe tener al menos 8 caracteres.'
    return
  }
  const ok = await authStore.register({
    firstName: form.firstName,
    lastName:  form.lastName,
    email:     form.email,
    password:  form.password,
    lang:      lang.value,
  })
  if (ok) {
    const inviteToken = route.query.inviteToken
    if (inviteToken) await authStore.acceptInvitation(inviteToken)
    navigateTo('/calendar')
  }
}

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
        const ok = await authStore.loginWithGoogle(credential, lang.value)
        if (ok) {
          const inviteToken = route.query.inviteToken
          if (inviteToken) await authStore.acceptInvitation(inviteToken)
          navigateTo('/calendar')
        }
      },
    })
    window.google.accounts.id.renderButton(
      document.getElementById('google-btn'),
      { theme: 'outline', size: 'large', width: '100%', text: 'signup_with', locale: 'es' }
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
  display: flex;
  width: 100%;
  max-width: 860px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--shadow-m);
}

/* ── Left panel ─────────────────────────────────────────────────────────── */
.auth-panel-left {
  flex: 0 0 42%;
  background: var(--navy);
  display: flex;
  flex-direction: column;
  padding: 36px 32px;
  background-image: linear-gradient(160deg, #1e272e 0%, #253035 60%, #1a3040 100%);
}

.panel-logo { display: flex; align-items: center; gap: 10px; }
.logo-img   { height: 28px; object-fit: contain; }

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: 8px;
}

.panel-product {
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 10px;
  letter-spacing: -0.3px;
}

.panel-tagline {
  font-size: 14px;
  color: rgba(255,255,255,.55);
  line-height: 1.6;
  margin: 0;
}

.panel-dots { display: flex; gap: 6px; margin-top: 24px; }
.dot {
  width: 20px; height: 3px;
  border-radius: 2px;
  background: rgba(255,255,255,.25);
}
.dot.active { background: var(--accent); width: 28px; }

/* ── Right panel ────────────────────────────────────────────────────────── */
.auth-panel-right {
  flex: 1;
  background: var(--surface);
  padding: 36px 40px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.lang-toggle {
  position: absolute;
  top: 20px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.lang-toggle button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Nunito', sans-serif;
  letter-spacing: .5px;
  color: var(--muted);
  padding: 2px 4px;
  border-radius: 4px;
  transition: color .12s;
}
.lang-toggle button.active { color: var(--accent); }
.lang-toggle button:hover  { color: var(--text); }
.lang-sep { font-size: 11px; color: var(--border); }

.auth-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-title);
  margin: 0 0 6px;
  letter-spacing: -0.4px;
}

.auth-subtitle {
  font-size: 14px;
  color: var(--muted);
  margin: 0 0 20px;
  line-height: 1.5;
}

/* Google button */
.google-btn-wrap {
  display: flex;
  justify-content: center;
  min-height: 44px;
  margin-bottom: 4px;
  width: 100%;
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0;
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

/* Form */
.auth-form  { display: flex; flex-direction: column; gap: 14px; }
.field-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field      { display: flex; flex-direction: column; gap: 5px; }

.field label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.1px;
}

.field input {
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  font-size: 14px;
  color: var(--text);
  background: var(--surface-2);
  outline: none;
  transition: border-color .15s;
  font-family: 'Nunito', sans-serif;
  width: 100%;
  box-sizing: border-box;
}
.field input:focus { border-color: var(--accent); }
.field input::placeholder { color: var(--muted); opacity: .7; }

/* Error */
.auth-error {
  background: rgba(234, 78, 73, .12);
  border: 1px solid rgba(234, 78, 73, .3);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--danger);
}

/* Submit button */
.btn-primary {
  padding: 13px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background .15s, transform .1s;
  font-family: 'Nunito', sans-serif;
  margin-top: 2px;
  letter-spacing: 0.2px;
}
.btn-primary:hover:not(:disabled) { background: var(--accent-dark); }
.btn-primary:active:not(:disabled) { transform: scale(.99); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }

/* Footer */
.auth-footer {
  margin-top: auto;
  padding-top: 20px;
  font-size: 13px;
  color: var(--muted);
}

.link-accent {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  margin-left: 4px;
  transition: color .15s;
}
.link-accent:hover { color: var(--accent-dark); }

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .auth-card { flex-direction: column; max-width: 420px; }
  .auth-panel-left { flex: none; padding: 28px 28px 24px; min-height: 140px; }
  .panel-content { padding-bottom: 0; }
  .panel-product { font-size: 20px; }
  .panel-tagline { display: none; }
  .auth-panel-right { padding: 28px; }
  .field-row { grid-template-columns: 1fr; }
}
</style>
