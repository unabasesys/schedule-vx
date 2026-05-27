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
          <p class="panel-tagline">Organiza calendarios de producción para proyectos de la industria creativa.</p>
        </div>
        <div class="panel-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot active"></span>
        </div>
      </div>

      <!-- Right panel -->
      <div class="auth-panel-right">

        <!-- Step 1: enter email -->
        <template v-if="step === 1">
          <h1 class="auth-title">Reset your password</h1>
          <p class="auth-subtitle">Enter your email and we'll send you a link to create a new password.</p>

          <form class="auth-form" @submit.prevent="handleSendEmail">
            <div class="field">
              <label for="email">Email address</label>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="you@email.com"
                autocomplete="email"
                required
              />
            </div>

            <div v-if="authStore.error" class="auth-error">{{ authStore.error }}</div>

            <button type="submit" class="btn-primary" :disabled="authStore.loading">
              <span v-if="authStore.loading">Sending...</span>
              <span v-else>Send reset link</span>
            </button>
          </form>
        </template>

        <!-- Step 2: enter token + new password -->
        <template v-else-if="step === 2">
          <h1 class="auth-title">New password</h1>
          <p class="auth-subtitle">
            <template v-if="email">Check your inbox at <strong class="email-highlight">{{ email }}</strong> and</template>
            <template v-else>Enter the code from the reset link you received by email and</template>
            enter your new password below.
          </p>

          <form class="auth-form" @submit.prevent="handleReset">
            <div class="field">
              <label for="token">Reset code</label>
              <input
                id="token"
                v-model="resetToken"
                type="text"
                placeholder="Paste the code here"
                autocomplete="off"
                required
              />
              <span class="field-hint">It's the "token=" parameter from the link you received by email.</span>
            </div>

            <div class="field">
              <label for="password">New password</label>
              <input
                id="password"
                v-model="form.password"
                type="password"
                placeholder="At least 8 characters"
                autocomplete="new-password"
                required
                minlength="8"
              />
            </div>

            <div class="field">
              <label for="confirm">Confirm password</label>
              <input
                id="confirm"
                v-model="form.confirm"
                type="password"
                placeholder="Repeat your password"
                autocomplete="new-password"
                required
              />
            </div>

            <div v-if="localError" class="auth-error">{{ localError }}</div>
            <div v-else-if="authStore.error" class="auth-error">{{ authStore.error }}</div>

            <button type="submit" class="btn-primary" :disabled="authStore.loading">
              <span v-if="authStore.loading">Updating...</span>
              <span v-else>Update password</span>
            </button>

            <button type="button" class="btn-back" @click="step = 1; resetToken = ''; form.password = ''; form.confirm = ''; authStore.error = null; localError = null">
              ← Change email
            </button>
          </form>
        </template>

        <!-- Step 3: done -->
        <template v-else>
          <h1 class="auth-title">All done!</h1>
          <div class="auth-success">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p>Password updated successfully for <strong class="email-highlight">{{ email }}</strong>.</p>
          </div>
          <NuxtLink to="/login" class="btn-primary btn-login-link">Go to Sign In</NuxtLink>
        </template>

        <p class="auth-footer">
          <NuxtLink to="/login" class="link-accent">← Back to Sign In</NuxtLink>
        </p>
      </div>

    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const authStore  = useAuthStore()
const route      = useRoute()

const step       = ref(1)
const email      = ref(route.query.email || '')
const resetToken = ref(route.query.token || '')
const form       = reactive({ password: '', confirm: '' })
const localError = ref(null)

onMounted(() => {
  authStore.error = null
  if (route.query.token) step.value = 2
})

const handleSendEmail = async () => {
  authStore.error = null
  const msg = await authStore.forgotPassword(email.value)
  if (msg) step.value = 2
}

const handleReset = async () => {
  localError.value = null
  authStore.error  = null
  if (form.password !== form.confirm) {
    localError.value = 'Passwords do not match.'
    return
  }
  if (form.password.length < 8) {
    localError.value = 'Password must be at least 8 characters.'
    return
  }
  const msg = await authStore.resetPassword({ token: resetToken.value, newPassword: form.password })
  if (msg) step.value = 3
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

.email-highlight {
  color: var(--text-title);
  font-weight: 700;
}

/* Form */
.auth-form { display: flex; flex-direction: column; gap: 16px; }

.field-hint {
  font-size: 11px;
  color: var(--muted);
  opacity: .75;
  line-height: 1.4;
}

.btn-back {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 13px;
  font-family: 'Nunito', sans-serif;
  cursor: pointer;
  padding: 0;
  text-align: left;
  transition: color .15s;
}
.btn-back:hover { color: var(--text); }

.btn-login-link {
  display: block;
  text-align: center;
  text-decoration: none;
  margin-top: 12px;
}

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
  color: var(--muted);
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
