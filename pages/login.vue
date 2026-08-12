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
          <span class="dot active"></span>
          <span class="dot"></span>
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

        <h1 class="auth-title">{{ isEN ? 'Sign In' : 'Iniciar sesión' }}</h1>
        <p class="auth-subtitle">{{ isEN ? 'Sign in to Calendar by unabase' : 'Ingresa a Calendar by unabase' }}</p>

        <!-- Google sign-in -->
        <div id="google-btn" class="google-btn-wrap"></div>
        <div class="divider"><span>o</span></div>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <div class="field">
            <label for="email">{{ isEN ? 'Email address' : 'Email' }}</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="you@email.com"
              autocomplete="email"
              required
            />
          </div>

          <div class="field">
            <label for="password">{{ isEN ? 'Password' : 'Contraseña' }}</label>
            <div class="input-wrap">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                required
              />
              <button type="button" class="toggle-pw" @click="showPassword = !showPassword" tabindex="-1">
                <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="form-row">
            <label class="remember-me">
              <input type="checkbox" v-model="rememberMe" />
              <span>{{ isEN ? 'Keep me signed in' : 'Mantener sesión iniciada' }}</span>
            </label>
            <NuxtLink :to="{ path: '/forgot-password', query: form.email ? { email: form.email } : {} }" class="link-accent">
              {{ isEN ? 'Forgot your password?' : '¿Olvidaste tu contraseña?' }}
            </NuxtLink>
          </div>

          <div v-if="authStore.error" class="auth-error">{{ authStore.error }}</div>

          <button type="submit" class="btn-primary" :disabled="authStore.loading">
            <span v-if="authStore.loading">{{ isEN ? 'Signing in...' : 'Ingresando...' }}</span>
            <span v-else>{{ isEN ? 'Sign In' : 'Iniciar sesión' }}</span>
          </button>
        </form>

        <p class="auth-footer">
          {{ isEN ? "Don't have an account yet?" : '¿No tienes cuenta?' }}
          <NuxtLink :to="{ path: '/register', query: form.email ? { email: form.email } : {} }" class="link-accent">
            {{ isEN ? 'Create an account here' : 'Crea una cuenta aquí' }}
          </NuxtLink>
        </p>
      </div>

    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const authStore = useAuthStore()
const config    = useRuntimeConfig()
const route     = useRoute()
authStore.init()

if (authStore.isLoggedIn) {
  await navigateTo('/calendar')
}

const form         = reactive({ email: '', password: '' })
const showPassword = ref(false)
// Default ON — that is what the app has always done, so nobody starts getting logged
// out because this checkbox became real. Unchecking it is now honoured, and the choice
// is remembered for the next visit.
const rememberMe   = ref(true)
const lang         = ref('es')
const isEN         = computed(() => lang.value === 'en')

function setLang(l) {
  lang.value = l
  localStorage.setItem('ub_lang', l)
}

onMounted(() => {
  lang.value = localStorage.getItem('ub_lang') || 'es'
  try { rememberMe.value = localStorage.getItem('ub_remember') !== '0' } catch { /* ignore */ }
})

const handleSubmit = async () => {
  const ok = await authStore.login({ ...form, remember: rememberMe.value })
  if (ok) {
    const inviteToken = route.query.inviteToken
    if (inviteToken) await authStore.acceptInvitation(inviteToken)
    navigateTo('/calendar')
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
        const ok = await authStore.loginWithGoogle(credential, undefined, rememberMe.value)
        if (ok) {
          const inviteToken = route.query.inviteToken
          if (inviteToken) await authStore.acceptInvitation(inviteToken)
          navigateTo('/calendar')
        }
      },
    })
    window.google.accounts.id.renderButton(
      document.getElementById('google-btn'),
      { theme: 'outline', size: 'large', width: '100%', text: 'continue_with', locale: 'en' }
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

/* Card container */
.auth-card {
  display: flex;
  width: 100%;
  max-width: 860px;
  min-height: 520px;
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
  position: relative;
  background-image: linear-gradient(160deg, #1e272e 0%, #253035 60%, #1a3040 100%);
}

.panel-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-img {
  height: 28px;
  object-fit: contain;
}

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

.panel-dots {
  display: flex;
  gap: 6px;
  margin-top: 24px;
}

.dot {
  width: 20px;
  height: 3px;
  border-radius: 2px;
  background: rgba(255,255,255,.25);
}

.dot.active {
  background: var(--accent);
  width: 28px;
}

/* ── Language toggle ────────────────────────────────────────────────────── */
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

/* ── Right panel ────────────────────────────────────────────────────────── */
.auth-panel-right {
  flex: 1;
  background: var(--surface);
  position: relative;
  padding: 44px 40px;
  display: flex;
  flex-direction: column;
}

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
  margin: 0 0 24px;
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

/* Form */
.auth-form { display: flex; flex-direction: column; gap: 16px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.1px;
}

.field input,
.input-wrap input {
  padding: 11px 14px;
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
.field input:focus,
.input-wrap input:focus { border-color: var(--accent); }
.field input::placeholder,
.input-wrap input::placeholder { color: var(--muted); opacity: .7; }

.input-wrap {
  position: relative;
}
.input-wrap input { padding-right: 44px; }

.toggle-pw {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--muted);
  display: flex;
  align-items: center;
  padding: 0;
  transition: color .15s;
}
.toggle-pw:hover { color: var(--text); }

/* Remember me row */
.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -4px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--muted);
  user-select: none;
}
.remember-me input[type="checkbox"] {
  width: 15px;
  height: 15px;
  border-radius: 4px;
  accent-color: var(--accent);
  cursor: pointer;
}

.link-accent {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  transition: color .15s;
}
.link-accent:hover { color: var(--accent-dark); }

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
  margin-top: 4px;
  letter-spacing: 0.2px;
}
.btn-primary:hover:not(:disabled) { background: var(--accent-dark); }
.btn-primary:active:not(:disabled) { transform: scale(.99); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }

/* Footer */
.auth-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 13px;
  color: var(--muted);
}
.auth-footer .link-accent { margin-left: 4px; }

/* ── Responsive ────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .auth-card { flex-direction: column; max-width: 420px; }
  .auth-panel-left { flex: none; padding: 28px 28px 24px; min-height: 140px; }
  .panel-content { padding-bottom: 0; }
  .panel-product { font-size: 20px; }
  .panel-tagline { display: none; }
  .auth-panel-right { padding: 32px 28px; }
}
</style>
