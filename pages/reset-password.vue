<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <span class="brand-name">Schedule</span>
        <span class="brand-by">by Unabase</span>
      </div>

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

      <div class="auth-footer">
        <NuxtLink to="/login" class="link-muted">← Volver al login</NuxtLink>
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

if (!token) {
  await navigateTo('/forgot-password')
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
  background: var(--white);
  border-radius: 16px;
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 32px rgba(0,44,62,.10);
}
.auth-brand { display: flex; align-items: baseline; gap: 8px; margin-bottom: 32px; }
.brand-name { font-family: 'Nunito', sans-serif; font-size: 22px; font-weight: 700; color: var(--navy); }
.brand-by   { font-size: 13px; color: var(--muted); }
.auth-title    { font-family: 'Nunito', sans-serif; font-size: 20px; font-weight: 700; color: var(--navy); margin: 0 0 8px; }
.auth-subtitle { font-size: 14px; color: var(--muted); margin: 0 0 24px; line-height: 1.5; }
.auth-form { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; font-weight: 600; color: var(--navy); }
.field input {
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  color: var(--navy);
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
.auth-success {
  text-align: center;
  padding: 24px 0;
  color: var(--success);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.auth-success p { font-size: 14px; color: var(--muted); line-height: 1.6; margin: 0; }
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
}
.btn-primary:hover:not(:disabled) { background: var(--accent); color: var(--navy); }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.auth-footer { display: flex; justify-content: center; margin-top: 24px; font-size: 13px; }
.link-muted { color: var(--muted); text-decoration: none; }
.link-muted:hover { color: var(--accent); }
</style>
