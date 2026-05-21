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
          <p class="panel-tagline">Crea y gestiona calendarios de producción audiovisual de forma profesional.</p>
        </div>
        <div class="panel-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot active"></span>
        </div>
      </div>

      <!-- Right panel -->
      <div class="auth-panel-right">
        <h1 class="auth-title">Nueva contraseña</h1>
        <p class="auth-subtitle">Ingresá tu nueva contraseña para restablecer el acceso.</p>

        <form v-if="!done" class="auth-form" @submit.prevent="handleSubmit">
          <div class="field">
            <label for="password">Nueva contraseña</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autocomplete="new-password"
              required
              minlength="8"
            />
          </div>

          <div class="field">
            <label for="confirm">Confirmar contraseña</label>
            <input
              id="confirm"
              v-model="form.confirm"
              type="password"
              placeholder="Repetí tu contraseña"
              autocomplete="new-password"
              required
            />
          </div>

          <div v-if="localError" class="auth-error">{{ localError }}</div>
          <div v-else-if="authStore.error" class="auth-error">{{ authStore.error }}</div>

          <button type="submit" class="btn-primary" :disabled="authStore.loading">
            <span v-if="authStore.loading">Actualizando...</span>
            <span v-else>Actualizar contraseña</span>
          </button>
        </form>

        <div v-else class="auth-success">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <p>Contraseña actualizada correctamente.</p>
        </div>

        <p class="auth-footer">
          <NuxtLink to="/login" class="link-accent">← Volver al login</NuxtLink>
        </p>
      </div>

    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const authStore  = useAuthStore()
const route      = useRoute()
const token      = route.query.token

const form       = reactive({ password: '', confirm: '' })
const localError = ref(null)
const done       = ref(false)

onMounted(() => { authStore.error = null })

if (!token) {
  await navigateTo('/forgot-password')
} else {
  await navigateTo(`/forgot-password?token=${token}`)
}

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
  const msg = await authStore.resetPassword({ token, newPassword: form.password })
  if (msg) done.value = true
}
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

/* ── Right panel ────────────────────────────────────────────────────────── */
.auth-panel-right {
  flex: 1;
  background: var(--surface);
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
  margin: 0 0 28px;
  line-height: 1.5;
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

.field input {
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

/* Success */
.auth-success {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 8px 0;
  color: var(--accent);
}
.auth-success p {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
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
  margin-top: auto;
  padding-top: 24px;
  font-size: 13px;
}

.link-accent {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
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
  .auth-panel-right { padding: 32px 28px; }
}
</style>
