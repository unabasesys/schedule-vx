import { defineStore } from 'pinia'

export const useHolidaysStore = defineStore('holidays', {
  state: () => ({
    allCountries: null,       // cache from Nager.Date
    countryHolidays: {},      // keyed by "countryCode_year"
    loading: false,
  }),

  actions: {
    async loadAllCountries() {
      if (this.allCountries) return this.allCountries
      this.loading = true
      try {
        const res = await fetch('https://date.nager.at/api/v3/AvailableCountries')
        this.allCountries = await res.json()
      } catch (e) {
        this.allCountries = []
      } finally {
        this.loading = false
      }
      return this.allCountries
    },

    searchCountries(query) {
      if (!this.allCountries) return []
      const q = query.toLowerCase()
      return this.allCountries.filter(c =>
        c.name.toLowerCase().includes(q) || c.countryCode.toLowerCase().includes(q)
      ).slice(0, 8)
    },

    async fetchHolidaysForYear(countryCode, year) {
      const key = `${countryCode}_${year}`
      if (this.countryHolidays[key]) return this.countryHolidays[key]
      try {
        const res  = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`)
        const data = await res.json()
        this.countryHolidays[key] = Array.isArray(data) ? data : []
      } catch (e) {
        this.countryHolidays[key] = []
      }
      return this.countryHolidays[key]
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
