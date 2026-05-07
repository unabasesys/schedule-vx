import { defineStore } from 'pinia'

const API = () => useRuntimeConfig().public.apiUrl

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,
    organization: null,
    loading: false,
    error: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token && !!state.user,
    fullName: (state) => {
      if (!state.user) return ''
      const { first = '', last = '' } = state.user?.data?.name || {}
      return `${first} ${last}`.trim() || state.user.email || ''
    },
  },

  actions: {
    init() {
      const token = localStorage.getItem('ub_token')
      const raw   = localStorage.getItem('ub_auth_user')
      const org   = localStorage.getItem('ub_auth_org')

      if (token && raw) {
        try {
          this.token        = token
          this.user         = JSON.parse(raw)
          this.organization = org ? JSON.parse(org) : null
        } catch {
          this.logout()
        }
      }
    },

    _persist() {
      if (this.token) {
        localStorage.setItem('ub_token', this.token)
        localStorage.setItem('ub_auth_user', JSON.stringify(this.user))
        if (this.organization) {
          localStorage.setItem('ub_auth_org', JSON.stringify(this.organization))
        }
      }
    },

    _headers() {
      return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(this.organization?._id ? { Organization: this.organization._id } : {}),
      }
    },

    _setSession({ token, user, organization }) {
      this.token        = token
      this.user         = user
      this.organization = organization || null
      this._persist()
    },

    // ── Register ───────────────────────────────────────────────────────────
    async register({ firstName, lastName, email, password }) {
      this.loading = true
      this.error   = null
      try {
        const res  = await fetch(`${API()}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al registrarse')
        this._setSession(data)
        return true
      } catch (err) {
        this.error = err.message
        return false
      } finally {
        this.loading = false
      }
    },

    // ── Login ──────────────────────────────────────────────────────────────
    async login({ email, password }) {
      this.loading = true
      this.error   = null
      try {
        const res  = await fetch(`${API()}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Email o contraseña incorrectos')
        this._setSession(data)
        return true
      } catch (err) {
        this.error = err.message
        return false
      } finally {
        this.loading = false
      }
    },

    // ── Google login ───────────────────────────────────────────────────────
    async loginWithGoogle(credential) {
      this.loading = true
      this.error   = null
      try {
        const res  = await fetch(`${API()}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión con Google')
        this._setSession(data)
        return true
      } catch (err) {
        this.error = err.message
        return false
      } finally {
        this.loading = false
      }
    },

    // ── Renew token ────────────────────────────────────────────────────────
    async renew() {
      if (!this.token) return false
      try {
        const res = await fetch(`${API()}/auth/renew`, {
          method: 'POST',
          headers: this._headers(),
        })
        if (!res.ok) { this.logout(); return false }
        const data = await res.json()
        this._setSession(data)
        return true
      } catch {
        return false
      }
    },

    // ── Accept org invitation ──────────────────────────────────────────────
    async acceptInvitation(inviteToken) {
      this.loading = true
      this.error   = null
      try {
        const res  = await fetch(`${API()}/auth/accept-invitation`, {
          method: 'POST',
          headers: this._headers(),
          body: JSON.stringify({ token: inviteToken }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al aceptar la invitación')
        this._setSession(data)
        return true
      } catch (err) {
        this.error = err.message
        return false
      } finally {
        this.loading = false
      }
    },

    // ── Reset password ─────────────────────────────────────────────────────
    async resetPassword({ token, newPassword }) {
      this.loading = true
      this.error   = null
      try {
        const res  = await fetch(`${API()}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al restablecer la contraseña')
        return data.message
      } catch (err) {
        this.error = err.message
        return null
      } finally {
        this.loading = false
      }
    },

    // ── Forgot password ────────────────────────────────────────────────────
    async forgotPassword(email) {
      this.loading = true
      this.error   = null
      try {
        const res  = await fetch(`${API()}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al enviar el correo')
        return data.message
      } catch (err) {
        this.error = err.message
        return null
      } finally {
        this.loading = false
      }
    },

    // ── Logout ─────────────────────────────────────────────────────────────
    logout() {
      this.token        = null
      this.user         = null
      this.organization = null
      localStorage.removeItem('ub_token')
      localStorage.removeItem('ub_auth_user')
      localStorage.removeItem('ub_auth_org')
      navigateTo('/login')
    },

    setUser(user) {
      this.user = user
      localStorage.setItem('ub_auth_user', JSON.stringify(user))
    },

    setOrganization(org) {
      this.organization = org
      localStorage.setItem('ub_auth_org', JSON.stringify(org))
    },
  },
})
