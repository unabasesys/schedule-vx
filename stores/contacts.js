import { defineStore } from 'pinia'

// Organization-wide contacts, shared across all calendars. Persisted on the
// backend (/contacts). Loaded lazily the first time the Contacts panel opens.
const normalize = (c) => ({ ...c, id: c._id?.toString?.() || c._id || c.id })

let _inflight = null   // the in-flight loadContacts promise, shared by concurrent callers

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
    // Concurrent callers share one request AND one promise. This matters because the
    // participants picker awaits it before creating a contact from a typed name: a
    // caller that got an early `return` while the first load was still in flight would
    // check an empty directory and create a duplicate of someone already in it.
    async loadContacts(force = false) {
      const authStore = useAuthStore()
      if (!authStore?.isLoggedIn) return
      if (this.loaded && !force) return
      if (_inflight) return _inflight

      this.loading = true
      _inflight = (async () => {
        try {
          const data = await useApi().get('/contacts')
          this.contacts = (data || []).map(normalize)
          this.loaded = true
        } catch (e) {
          console.warn('loadContacts failed:', e.message)
        } finally {
          this.loading = false
          _inflight = null
        }
      })()
      return _inflight
    },

    // The API is idempotent on email: posting a contact whose email already exists
    // returns the existing one instead of a second row. So this replaces rather than
    // blindly pushes, or that contact would appear twice in the directory.
    async addContact(payload) {
      const created = normalize(await useApi().post('/contacts', payload))
      const idx = this.contacts.findIndex(c => c.id === created.id)
      if (idx !== -1) this.contacts[idx] = created
      else            this.contacts.push(created)
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
