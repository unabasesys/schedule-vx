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
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ub_logo', dataUrl)
      }
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
      if (!authStore.isLoggedIn) return null
      try {
        const res = await fetch(`${API()}/organizations/my`, {
          headers: {
            Authorization: `Bearer ${authStore.token}`,
            ...(authStore.organization?._id ? { Organization: authStore.organization._id } : {}),
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
      if (org.imgUrl) this.logo = org.imgUrl
      if (org.scheduleSettings?.cities?.length) {
        this.orgCities = org.scheduleSettings.cities
      }
      if (org.scheduleSettings?.defaultHolidays?.length) {
        this.orgDefaultHolidays = org.scheduleSettings.defaultHolidays
      }
      if (org.users?.length) {
        this.users = org.users.map(u => ({
          id:     u.user?._id || u.email,
          email:  u.user?.email || u.email || '',
          name:   u.user?.data?.name
            ? `${u.user.data.name.first || ''} ${u.user.data.name.last || ''}`.trim()
            : '',
          status: u.status || 'active',
          _userId: u.user?._id || null,
        }))
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

    async uploadLogoToApi(dataUrl) {
      const authStore = useAuthStore()
      if (!authStore.isLoggedIn || !authStore.organization?._id) return null
      try {
        const blob     = await fetch(dataUrl).then(r => r.blob())
        const formData = new FormData()
        formData.append('logo', blob, 'logo.png')

        const res = await fetch(`${API()}/organizations/${authStore.organization._id}/logo`, {
          method:  'PUT',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
            Organization:  authStore.organization._id,
          },
          body: formData,
        })
        if (!res.ok) return null
        const data = await res.json()
        return data.imgUrl || null
      } catch { return null }
    },

    async inviteUserToApi(email) {
      const authStore = useAuthStore()
      if (!authStore.isLoggedIn || !authStore.organization?._id) return false
      try {
        const res = await fetch(`${API()}/organizations/${authStore.organization._id}/users`, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${authStore.token}`,
            Organization:   authStore.organization._id,
          },
          body: JSON.stringify({ email, status: 'pending' }),
        })
        return res.ok
      } catch { return false }
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
        return res.ok
      } catch { return false }
    },
  },
})
