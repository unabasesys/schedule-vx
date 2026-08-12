import { defineStore } from 'pinia'

const API = () => useRuntimeConfig().public.apiUrl

// ── Where the session lives ───────────────────────────────────────────────────
//
// "Keep me signed in" used to be a dead control: handleSubmit never read it, and the
// session went to localStorage either way — so on a shared edit-suite machine, leaving
// it unchecked did exactly nothing.
//
//   checked (the default, = today's behaviour) → localStorage, survives closing the browser
//   unchecked                                  → sessionStorage, dies with the tab
//
// Reads check both, so an already-signed-in person is not logged out by this change.
// Writes go to whichever store the session already lives in, so a later setUser /
// switch-org never silently promotes a session the user asked NOT to keep.
const REMEMBER_KEY = 'ub_remember'

const store = (remember) => {
  try { return remember ? localStorage : sessionStorage } catch { return null }
}

const authRead = (key) => {
  try { return localStorage.getItem(key) ?? sessionStorage.getItem(key) } catch { return null }
}

// Which store the current session is in: whichever one holds the token.
const sessionStore = () => {
  try { return localStorage.getItem('ub_token') ? localStorage : sessionStorage } catch { return null }
}

const authWrite = (key, value, target = sessionStore()) => {
  try { target?.setItem(key, value) } catch { /* storage full or blocked */ }
}

const authClear = (key) => {
  try { localStorage.removeItem(key); sessionStorage.removeItem(key) } catch { /* ignore */ }
}

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
      const token = authRead('ub_token')
      const raw   = authRead('ub_auth_user')
      const org   = authRead('ub_auth_org')
      const orgs  = authRead('ub_auth_orgs')

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

    // `remember` is only passed on a fresh sign-in; later calls (renew, switch-org)
    // leave the session where it already is.
    _persist(remember = null) {
      if (!this.token) return
      const target = remember === null ? sessionStore() : store(remember)
      if (remember !== null) {
        // Moving stores: clear the old copy so a stale token can't outlive the choice.
        authClear('ub_token'); authClear('ub_auth_user')
        authClear('ub_auth_org'); authClear('ub_auth_orgs')
        // A UI preference, not a session: kept in localStorage either way so the
        // checkbox comes back the way the user left it.
        try { localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0') } catch { /* ignore */ }
      }
      authWrite('ub_token', this.token, target)
      authWrite('ub_auth_user', JSON.stringify(this.user), target)
      if (this.organization)  authWrite('ub_auth_org',  JSON.stringify(this.organization), target)
      if (this.organizations) authWrite('ub_auth_orgs', JSON.stringify(this.organizations), target)
    },

    _headers() {
      return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(this.organization?._id ? { Organization: this.organization._id } : {}),
      }
    },

    _setSession({ token, user, organization }, remember = null) {
      this.token        = token
      this.user         = user
      this.organization = organization || null
      this._persist(remember)
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
    async login({ email, password, remember = true }) {
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
        this._setSession(data, remember)
        return true
      } catch (err) {
        this.error = err.message
        return false
      } finally {
        this.loading = false
      }
    },

    // ── Google login ───────────────────────────────────────────────────────
    async loginWithGoogle(credential, lang, remember = true) {
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
        this._setSession(data, remember)
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
        authWrite('ub_auth_orgs', JSON.stringify(orgs))
        // If current org was removed from the user, auto-switch to another (or clear)
        if (this.organization?._id) {
          const currentOrgId = this.organization._id.toString()
          const stillMember = orgs.some(o => o._id.toString() === currentOrgId)
          if (!stillMember) {
            if (orgs.length > 0) {
              await this.switchOrg(orgs[0]._id)
            } else {
              this.organization = null
              authClear('ub_auth_org')
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
        authWrite('ub_auth_orgs', JSON.stringify(this.organizations))
        if (this.organizations.length) {
          await this.switchOrg(this.organizations[0]._id)
        } else {
          this.organization = null
          authClear('ub_auth_org')
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
      authClear('ub_token')
      authClear('ub_auth_user')
      authClear('ub_auth_org')
      authClear('ub_auth_orgs')
      navigateTo('/login')
    },

    setUser(user) {
      this.user = user
      authWrite('ub_auth_user', JSON.stringify(user))
    },

    setOrganization(org) {
      this.organization = org
      authWrite('ub_auth_org', JSON.stringify(org))
    },
  },
})
