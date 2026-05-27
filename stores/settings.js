import { defineStore } from 'pinia'

const API = () => useRuntimeConfig().public.apiUrl

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    studioName: 'Mi Productora',
    logo: null,
    company: {
      name: 'Mi Productora',
      logo: '',
      website: '',
    },
    users: [],
    orgCities:          [],
    orgDefaultHolidays: [],
  }),

  actions: {
    setStudioName(name) {
      this.studioName   = name
      this.company.name = name
    },

    saveLogo(dataUrl) {
      this.logo = dataUrl
    },

    setCompany(data) {
      this.company = { ...this.company, ...data }
    },

    setUsers(users) {
      this.users = users
    },

    addUser(user) {
      this.users.push(user)
    },

    inviteUser(email) {
      if (!email) return
      if (this.users.find(u => u.email === email)) return
      this.users.push({ email, status: 'pending', id: Math.random().toString(36).slice(2) })
    },

    removeUser(id) {
      this.users = this.users.filter(u => u.id !== id)
    },

    setOrgCities(cities) {
      this.orgCities = cities
    },

    setOrgDefaultHolidays(countries) {
      this.orgDefaultHolidays = countries
    },

    // ── API sync ───────────────────────────────────────────────────────────

    async fetchOrg() {
      const authStore = useAuthStore()
      if (!authStore.isLoggedIn || !authStore.organization?._id) return null
      try {
        const res = await fetch(`${API()}/organizations/${authStore.organization._id}`, {
          headers: {
            Authorization: `Bearer ${authStore.token}`,
            Organization: authStore.organization._id,
          },
        })
        if (!res.ok) return null
        const org = await res.json()
        this._applyOrgToStore(org)
        authStore.setOrganization(org)
        return org
      } catch { return null }
    },

    _applyOrgToStore(org) {
      if (!org) return
      this.setStudioName(org.name || 'Mi Productora')
      this.setCompany({ name: org.name || '', website: org.contact?.webSite || '' })
      this.logo = org.imgUrl || null
      this.orgCities          = org.scheduleSettings?.cities          || []
      this.orgDefaultHolidays = org.scheduleSettings?.defaultHolidays || []
      if (org.users?.length) {
        const seen = new Set()
        this.users = org.users
          .map(u => ({
            id:     u.user?._id || u.email,
            email:  u.user?.email || u.email || '',
            name:   u.user?.data?.name
              ? `${u.user.data.name.first || ''} ${u.user.data.name.last || ''}`.trim()
              : '',
            status: u.status || 'active',
            role:   u.role   || 'member',
            _userId: u.user?._id || null,
          }))
          .filter(u => {
            if (!u.email || seen.has(u.email)) return false
            seen.add(u.email)
            return true
          })
      }
    },

    async saveOrgToApi({ name, website, scheduleSettings }) {
      const authStore = useAuthStore()
      if (!authStore.isLoggedIn || !authStore.organization?._id) return false
      try {
        const res = await fetch(`${API()}/organizations/${authStore.organization._id}`, {
          method:  'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${authStore.token}`,
            Organization:   authStore.organization._id,
          },
          body: JSON.stringify({
            name,
            contact: { webSite: website },
            scheduleSettings,
          }),
        })
        if (!res.ok) return false
        const org = await res.json()
        authStore.setOrganization(org)
        return true
      } catch { return false }
    },

    async saveUserPrefsToApi({ lang, weekStart, tempUnit, dateFormat }) {
      const authStore = useAuthStore()
      if (!authStore.isLoggedIn) return false
      try {
        const res = await fetch(`${API()}/users/me`, {
          method:  'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${authStore.token}`,
            ...(authStore.organization?._id ? { Organization: authStore.organization._id } : {}),
          },
          body: JSON.stringify({ schedulePrefs: { lang, weekStart, tempUnit, dateFormat } }),
        })
        if (!res.ok) return false
        const data = await res.json()
        if (data?._id) {
          authStore.user = data
          authStore._persist()
        }
        return true
      } catch { return false }
    },

    async uploadLogoToApi(dataUrl) {
      const authStore = useAuthStore()
      if (!authStore.isLoggedIn || !authStore.organization?._id) return null
      try {
        const res = await fetch(`${API()}/organizations/${authStore.organization._id}/logo`, {
          method:  'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${authStore.token}`,
            Organization:   authStore.organization._id,
          },
          body: JSON.stringify({ imgUrl: dataUrl }),
        })
        if (!res.ok) return null
        const data = await res.json()
        return data.imgUrl || null
      } catch { return null }
    },

    async inviteUserToApi(email) {
      const authStore = useAuthStore()
      if (!authStore.isLoggedIn || !authStore.organization?._id) return { ok: false, error: null }
      try {
        const res  = await fetch(`${API()}/organizations/${authStore.organization._id}/users`, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${authStore.token}`,
            Organization:   authStore.organization._id,
          },
          body: JSON.stringify({ email }),
        })
        const data = await res.json()
        if (!res.ok) return { ok: false, error: data.error || 'Error al invitar' }
        this._applyOrgToStore(data)
        return { ok: true }
      } catch { return { ok: false, error: 'Error de conexión' } }
    },

    async removeUserFromApi(userId) {
      const authStore = useAuthStore()
      if (!authStore.isLoggedIn || !authStore.organization?._id) return false
      try {
        // userId can be a MongoDB ObjectId or an email (for pending users without account)
        const encodedId = encodeURIComponent(userId)
        const res = await fetch(
          `${API()}/organizations/${authStore.organization._id}/users/${encodedId}`,
          {
            method:  'DELETE',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
              Organization:  authStore.organization._id,
            },
          }
        )
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          return { ok: false, error: body.error || null }
        }
        return { ok: true }
      } catch { return { ok: false, error: null } }
    },
  },
})
