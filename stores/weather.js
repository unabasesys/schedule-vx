import { defineStore } from 'pinia'
import { toDisplayTemp } from '~/utils/helpers'
import { weatherEmoji } from '~/utils/weatherCodes'

export const useWeatherStore = defineStore('weather', {
  state: () => ({
    // keyed by projId+cityIndex: { temp, weatherCode, sunrise, sunset, forecast15 }
    data: {},
    loading: {},
  }),

  actions: {
    cacheKey(projId, cityIdx) {
      return `${projId}_${cityIdx}`
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
        url.searchParams.set('hourly',    'temperature_2m')
        url.searchParams.set('forecast_days', '15')
        url.searchParams.set('timezone',  'auto')

        const res  = await fetch(url.toString())
        const json = await res.json()

        const daily = json.daily || {}
        const dates = daily.time || []
        const idx   = dates.indexOf(dateStr)

        const entry = {
          temp:        idx >= 0 ? Math.round((daily.temperature_2m_max[idx] + daily.temperature_2m_min[idx]) / 2) : null,
          tempMax:     idx >= 0 ? Math.round(daily.temperature_2m_max[idx]) : null,
          tempMin:     idx >= 0 ? Math.round(daily.temperature_2m_min[idx]) : null,
          weatherCode: idx >= 0 ? daily.weather_code[idx] : null,
          sunrise:     idx >= 0 ? daily.sunrise[idx] : '',
          sunset:      idx >= 0 ? daily.sunset[idx]  : '',
          forecast15:  dates.map((d, i) => ({
            date:        d,
            weatherCode: daily.weather_code[i],
            tempMax:     Math.round(daily.temperature_2m_max[i]),
            tempMin:     Math.round(daily.temperature_2m_min[i]),
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
