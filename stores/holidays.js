import { defineStore } from 'pinia'

// In-flight requests, keyed like the cache. Two components asking for the same
// country/year at once (the calendar prefetch and a date recalculation) must share
// one request, or a retry can fire while the first is still on the wire.
const _inFlight = new Map()

export const useHolidaysStore = defineStore('holidays', {
  state: () => ({
    allCountries: null,       // cache from Nager.Date
    countryHolidays: {},      // keyed by "countryCode_year"
    failed: {},               // keyed the same way — last fetch for this key failed
    loading: false,
  }),

  actions: {
    async loadAllCountries() {
      if (this.allCountries) return this.allCountries
      this.loading = true
      try {
        const res = await fetch('https://date.nager.at/api/v3/AvailableCountries')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        this.allCountries = await res.json()
      } catch (e) {
        // Leave it null instead of caching an empty list: caching [] turned one
        // network blip into "no country exists" for the rest of the session.
        this.allCountries = null
      } finally {
        this.loading = false
      }
      return this.allCountries || []
    },

    searchCountries(query) {
      if (!this.allCountries) return []
      const q = query.toLowerCase()
      return this.allCountries.filter(c =>
        c.name.toLowerCase().includes(q) || c.countryCode.toLowerCase().includes(q)
      ).slice(0, 8)
    },

    // Returns the holiday list, or **null** when it couldn't be loaded. Callers that
    // compute business-day dates must treat null as "unknown", never as "no holidays":
    // recalculating without the list produces dates that land on holidays, and those
    // dates get persisted.
    async fetchHolidaysForYear(countryCode, year) {
      const key = `${countryCode}_${year}`
      if (this.isLoaded(countryCode, year)) return this.countryHolidays[key]
      if (_inFlight.has(key)) return _inFlight.get(key)

      const req = (async () => {
        try {
          const res  = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          this.countryHolidays[key] = Array.isArray(data) ? data : []
          delete this.failed[key]
          return this.countryHolidays[key]
        } catch (e) {
          // Do NOT cache the failure. It used to be stored as [], which is
          // indistinguishable from a country that genuinely has no holidays, so
          // nothing ever retried and every later recalculation ignored holidays.
          this.failed[key] = true
          return null
        } finally {
          _inFlight.delete(key)
        }
      })()

      _inFlight.set(key, req)
      return req
    },

    // True only when this country/year was actually fetched successfully.
    isLoaded(countryCode, year) {
      return Array.isArray(this.countryHolidays[`${countryCode}_${year}`])
    },

    getHolidaysForYear(countryCode, year) {
      return this.countryHolidays[`${countryCode}_${year}`] || []
    },

    isHoliday(dateStr, countryCodes, year) {
      for (const code of countryCodes) {
        const holidays = this.getHolidaysForYear(code, year)
        if (holidays.some(h => h.date === dateStr)) return true
      }
      return false
    },
  },
})
