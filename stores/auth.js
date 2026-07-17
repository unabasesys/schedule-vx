import { defineStore } from 'pinia'

const API = () => useRuntimeConfig().public.apiUrl

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,
    organization: null,
    organizations: [],   // minimal list: [{ _id, name, imgUrl, isOwner, isCurrent }]
    pendingInvitations: [], // [{ orgId, orgName, token, invitedBy }]
    loading: false,
    error: null,
    joinedOrgName: null,  // name of the org just joined via invitation (display only)
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
      const orgs  = localStorage.getItem('ub_auth_orgs')

      if (token && raw) {
        try {
          this.token         = token
          this.user          = JSON.parse(raw)
          this.organization  = org  ? JSON.parse(org)  : null
          this.organizations = orgs ? JSON.parse(orgs) : []
          // Hydrate settings from the cached org so the real name/logo render
          // immediately on reload; fetchOrg() refreshes them right after.
          if (this.organization) {
            useSettingsStore()._applyOrgToStore(this.organization)
          }
        } catch {
          this.logout()
        }
      }
    },

    _persist() {
      if (this.token) {
        localStorage.setItem('ub_token', this.token)
        localStorage.setItem('ub_auth_user', JSON.stringify(this.user))
        if (this.organization)  localStorage.setItem('ub_auth_org',  JSON.stringify(this.organization))
        if (this.organizations) localStorage.setItem('ub_auth_orgs', JSON.stringify(this.organizations))
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
      if (organization) {
        const settingsStore = useSettingsStore()
        settingsStore._applyOrgToStore(organization)
      }
      // Refresh orgs list in background after any session change
      nextTick(() => this.fetchMyOrgs())
    },

    // ── Register ───────────────────────────────────────────────────────────
    async register({ firstName, lastName, email, password, lang }) {
      this.loading = true
      this.error   = null
      try {
        const res  = await fetch(`${API()}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email, password, lang }),
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
    async loginWithGoogle(credential, lang) {
      this.loading = true
      this.error   = null
      try {
        const res  = await fetch(`${API()}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential, lang }),
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
        this.joinedOrgName = data.joinedOrgName || null
        this._setSession(data)
        const settingsStore = useSettingsStore()
        settingsStore._applyOrgToStore(data.organization)
        const projectsStore = useProjectsStore()
        projectsStore.projects  = []
        projectsStore.templates = []
        await projectsStore.loadFromApi()
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

    // ── Create new organization ────────────────────────────────────────────
    async createOrg(name) {
      if (!this.token) return { ok: false, error: null }
      try {
        const res  = await fetch(`${API()}/organizations`, {
          method:  'POST',
          headers: this._headers(),
          body:    JSON.stringify({ name }),
        })
        const data = await res.json()
        if (!res.ok) return { ok: false, error: data.error || null }
        await this.switchOrg(data._id)
        return { ok: true }
      } catch { return { ok: false, error: null } }
    },

    // ── Fetch full orgs list ───────────────────────────────────────────────
    async fetchMyOrgs() {
      if (!this.token) return
      try {
        const res = await fetch(`${API()}/users/me/organizations`, {
          headers: this._headers(),
        })
        if (!res.ok) return
        const orgs = await res.json()
        this.organizations = orgs
        localStorage.setItem('ub_auth_orgs', JSON.stringify(orgs))
        // If current org was removed from the user, auto-switch to another (or clear)
        if (this.organization?._id) {
          const currentOrgId = this.organization._id.toString()
          const stillMember = orgs.some(o => o._id.toString() === currentOrgId)
          if (!stillMember) {
            if (orgs.length > 0) {
              await this.switchOrg(orgs[0]._id)
            } else {
              this.organization = null
              localStorage.removeItem('ub_auth_org')
            }
          }
        }
      } catch { /* silent */ }
    },

    // ── Switch active organization ─────────────────────────────────────────
    async switchOrg(orgId) {
      if (!this.token) return false
      try {
        const res = await fetch(`${API()}/auth/switch-org`, {
          method:  'PUT',
          headers: this._headers(),
          body:    JSON.stringify({ orgId }),
        })
        const data = await res.json()
        if (!res.ok) {
          this.fetchMyOrgs()
          return false
        }
        this._setSession(data)
        // Update settings immediately so the sidebar reflects the new org right away
        const settingsStore = useSettingsStore()
        settingsStore._applyOrgToStore(data.organization)
        // Reload projects for the new org
        const projectsStore = useProjectsStore()
        projectsStore.projects  = []
        projectsStore.templates = []
        await projectsStore.loadFromApi()
        return true
      } catch { return false }
    },

    // ── Pending invitations ────────────────────────────────────────────────
    async fetchPendingInvitations() {
      if (!this.token) return
      try {
        const res = await fetch(`${API()}/auth/pending-invitations`, {
          headers: this._headers(),
        })
        if (!res.ok) return
        this.pendingInvitations = await res.json()
      } catch { /* silent */ }
    },

    async declineInvitation(inviteToken) {
      if (!this.token) return false
      try {
        const res = await fetch(`${API()}/auth/decline-invitation`, {
          method:  'POST',
          headers: this._headers(),
          body:    JSON.stringify({ token: inviteToken }),
        })
        if (!res.ok) return false
        this.pendingInvitations = this.pendingInvitations.filter(i => i.token !== inviteToken)
        return true
      } catch { return false }
    },

    // ── Delete organization ────────────────────────────────────────────────
    async deleteOrg(orgId) {
      if (!this.token) return { ok: false }
      try {
        const res = await fetch(`${API()}/organizations/${orgId}`, {
          method:  'DELETE',
          headers: this._headers(),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          return { ok: false, error: data.error || null }
        }
        this.organizations = this.organizations.filter(o => o._id?.toString() !== orgId.toString())
        localStorage.setItem('ub_auth_orgs', JSON.stringify(this.organizations))
        if (this.organizations.length) {
          await this.switchOrg(this.organizations[0]._id)
        } else {
          this.organization = null
          localStorage.removeItem('ub_auth_org')
        }
        return { ok: true }
      } catch {
        return { ok: false, error: null }
      }
    },

    // ── Logout ─────────────────────────────────────────────────────────────
    logout() {
      useSettingsStore().$reset()
      this.token         = null
      this.user          = null
      this.organization  = null
      this.organizations = []
      localStorage.removeItem('ub_token')
      localStorage.removeItem('ub_auth_user')
      localStorage.removeItem('ub_auth_org')
      localStorage.removeItem('ub_auth_orgs')
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
