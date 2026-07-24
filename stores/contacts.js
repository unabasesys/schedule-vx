import { defineStore } from 'pinia'

// Organization-wide contacts, shared across all calendars. Persisted on the
// backend (/contacts). Loaded lazily the first time the Contacts panel opens.
const normalize = (c) => ({ ...c, id: c._id?.toString?.() || c._id || c.id })

export const useContactsStore = defineStore('contacts', {
  state: () => ({
    contacts: [],
    loading:  false,
    loaded:   false,
  }),

  getters: {
    sorted: (s) => [...s.contacts].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })),
  },

  actions: {
    async loadContacts(force = false) {
      const authStore = useAuthStore()
      if (!authStore?.isLoggedIn) return
      if (this.loaded && !force) return
      this.loading = true
      try {
        const data = await useApi().get('/contacts')
        this.contacts = (data || []).map(normalize)
        this.loaded = true
      } catch (e) {
        console.warn('loadContacts failed:', e.message)
      } finally {
        this.loading = false
      }
    },

    async addContact(payload) {
      const created = normalize(await useApi().post('/contacts', payload))
      this.contacts.push(created)
      return created
    },

    async updateContact(id, payload) {
      const updated = normalize(await useApi().put(`/contacts/${id}`, payload))
      const idx = this.contacts.findIndex(c => c.id === id)
      if (idx !== -1) this.contacts[idx] = updated
      return updated
    },

    async deleteContact(id) {
      await useApi().delete(`/contacts/${id}`)
      this.contacts = this.contacts.filter(c => c.id !== id)
    },
  },
})
