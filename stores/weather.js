import { defineStore } from 'pinia'
import { toDisplayTemp } from '~/utils/helpers'
import { weatherEmoji } from '~/utils/weatherCodes'

export const useWeatherStore = defineStore('weather', {
  state: () => ({
    // keyed by projId+cityIndex: { temp, tempMax, tempMin, weatherCode, sunrise, sunset, forecast15, _isStats }
    data: {},
    loading: {},
  }),

  actions: {
    cacheKey(projId, cityIdx) {
      return `${projId}_${cityIdx}`
    },

    // Returns true when dateStr falls within the Open-Meteo 15-day forecast window
    isInForecastRange(dateStr) {
      const today = new Date().toISOString().split('T')[0]
      const limit = new Date()
      limit.setDate(limit.getDate() + 15)
      const limitStr = limit.toISOString().split('T')[0]
      return dateStr >= today && dateStr <= limitStr
    },

    async fetchWeather(proj, cityIdx, dateStr) {
      const city = proj.cities?.[cityIdx]
      if (!city) return
      const key = this.cacheKey(proj.id, cityIdx)
      this.loading[key] = true

      try {
        const url = new URL('https://api.open-meteo.com/v1/forecast')
        url.searchParams.set('latitude',  city.lat)
        url.searchParams.set('longitude', city.lon)
        url.searchParams.set('daily',     'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset')
        url.searchParams.set('forecast_days', '16')
        url.searchParams.set('timezone',  'auto')

        const res  = await fetch(url.toString())
        const json = await res.json()

        const daily = json.daily || {}
        const dates = daily.time || []
        const idx   = dateStr ? dates.indexOf(dateStr) : 0

        const entry = {
          temp:        idx >= 0 ? Math.round((daily.temperature_2m_max[idx] + daily.temperature_2m_min[idx]) / 2) : null,
          tempMax:     idx >= 0 ? Math.round(daily.temperature_2m_max[idx]) : null,
          tempMin:     idx >= 0 ? Math.round(daily.temperature_2m_min[idx]) : null,
          weatherCode: idx >= 0 ? daily.weather_code[idx] : null,
          sunrise:     idx >= 0 ? daily.sunrise[idx] : '',
          sunset:      idx >= 0 ? daily.sunset[idx]  : '',
          _isStats:    false,
          forecast15:  dates.map((d, i) => ({
            date:        d,
            weatherCode: daily.weather_code[i],
            tempMax:     Math.round(daily.temperature_2m_max[i]),
            tempMin:     Math.round(daily.temperature_2m_min[i]),
            sunrise:     daily.sunrise[i] || '',
            sunset:      daily.sunset[i]  || '',
          })),
        }

        // Also store on the city object for sharing
        if (proj.cities[cityIdx]) {
          proj.cities[cityIdx].weatherData = entry
          proj.cities[cityIdx].sunrise = entry.sunrise
          proj.cities[cityIdx].sunset  = entry.sunset
        }

        this.data[key] = entry
      } catch (e) {
        // silently fail weather
      } finally {
        this.loading[key] = false
      }
    },

    // Fetch historical archive data for a specific date (same date, previous year)
    // Used as stats fallback when date is outside the 16-day forecast window
    async fetchWeatherStats(proj, cityIdx, dateStr) {
      const city = proj.cities?.[cityIdx]
      if (!city) return
      const key = this.cacheKey(proj.id, cityIdx)
      this.loading[key] = true

      try {
        const [y, m, d] = dateStr.split('-')
        const refYear   = parseInt(y) - 1
        const refDate   = `${refYear}-${m}-${d}`

        const url = new URL('https://archive-api.open-meteo.com/v1/archive')
        url.searchParams.set('latitude',   city.lat)
        url.searchParams.set('longitude',  city.lon)
        url.searchParams.set('start_date', refDate)
        url.searchParams.set('end_date',   refDate)
        url.searchParams.set('daily',      'weather_code,temperature_2m_max,temperature_2m_min')
        url.searchParams.set('timezone',   'auto')

        const res  = await fetch(url.toString())
        const json = await res.json()

        const daily = json.daily || {}
        if (daily.time?.length) {
          const prev = this.data[key] || {}
          this.data[key] = {
            ...prev,
            temp:        Math.round((daily.temperature_2m_max[0] + daily.temperature_2m_min[0]) / 2),
            tempMax:     Math.round(daily.temperature_2m_max[0]),
            tempMin:     Math.round(daily.temperature_2m_min[0]),
            weatherCode: daily.weather_code[0],
            sunrise:     '',
            sunset:      '',
            _isStats:    true,
          }
        }
      } catch (e) {
        // silently fail
      } finally {
        this.loading[key] = false
      }
    },

    // Smart update: use cached forecast15 if the date is already in it,
    // otherwise fetch forecast (in-range) or archive stats (out-of-range)
    async updateForDate(proj, cityIdx, dateStr) {
      const key    = this.cacheKey(proj.id, cityIdx)
      const cached = this.data[key]

      // Try the cached forecast15 first
      if (cached?.forecast15) {
        const day = cached.forecast15.find(d => d.date === dateStr)
        if (day) {
          this.data[key] = {
            ...cached,
            temp:        Math.round((day.tempMax + day.tempMin) / 2),
            tempMax:     day.tempMax,
            tempMin:     day.tempMin,
            weatherCode: day.weatherCode,
            sunrise:     day.sunrise || '',
            sunset:      day.sunset  || '',
            _isStats:    false,
          }
          return
        }
      }

      // Not in cache — decide which API to use
      if (this.isInForecastRange(dateStr)) {
        await this.fetchWeather(proj, cityIdx, dateStr)
      } else {
        await this.fetchWeatherStats(proj, cityIdx, dateStr)
      }
    },

    getWeather(projId, cityIdx) {
      return this.data[this.cacheKey(projId, cityIdx)] || null
    },

    formatTemp(val, unit) {
      if (val == null) return '--'
      return `${toDisplayTemp(val, unit)}°`
    },

    emoji(code) {
      return weatherEmoji(code)
    },
  },
})
