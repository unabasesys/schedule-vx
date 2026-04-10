import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    studioName: 'Mi Productora',
    logo: null,        // base64 data URL
    company: {
      name: 'Mi Productora',
      logo: '',
      website: '',
    },
    users: [],
  }),

  actions: {
    setStudioName(name) {
      this.studioName = name
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
      const exists = this.users.find(u => u.email === email)
      if (exists) return
      this.users.push({
        email,
        status: 'invited',
        id: Math.random().toString(36).slice(2),
      })
    },

    removeUser(id) {
      this.users = this.users.filter(u => u.id !== id)
    },
  },
})
