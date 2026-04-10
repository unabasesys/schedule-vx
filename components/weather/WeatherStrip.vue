<template>
  <div class="weather-strip" v-if="project.cities?.length">
    <span class="weather-date-label">
      {{ lang === 'en' ? 'Today' : 'Hoy' }} · {{ formattedDate }}
    </span>

    <div
      v-for="(city, idx) in project.cities"
      :key="idx"
      class="weather-city"
    >
      <span class="weather-city-name">{{ city.name }}</span>
      <template v-if="getWeather(idx)">
        <span class="weather-icon">{{ weatherStore.emoji(getWeather(idx)?.weatherCode) }}</span>
        <span class="weather-temp">
          {{ weatherStore.formatTemp(getWeather(idx)?.temp, tempUnit) }}{{ tempUnit === 'F' ? '°F' : '°C' }}
        </span>
        <span class="weather-sun" v-if="getWeather(idx)?.sunrise">
          ↑{{ formatTime(getWeather(idx)?.sunrise) }}
          ↓{{ formatTime(getWeather(idx)?.sunset) }}
        </span>
      </template>
      <template v-else>
        <span class="weather-loading">…</span>
      </template>
      <button class="weather-del" @click="removeCity(idx)" title="Remove city">✕</button>
    </div>

    <button class="weather-add-btn" @click="showAddCity = !showAddCity">
      {{ lang === 'en' ? '+ City' : '+ Ciudad' }}
    </button>

    <!-- Add city input -->
    <div v-if="showAddCity" class="weather-add-wrap" ref="addWrap">
      <input
        type="text"
        class="weather-add-input"
        v-model="newCitySearch"
        :placeholder="lang === 'en' ? 'City name…' : 'Nombre de ciudad…'"
        @input="searchNewCity"
        autofocus
      />
      <div v-if="newCitySuggestions.length" class="weather-suggestions">
        <div
          v-for="s in newCitySuggestions"
          :key="s.id"
          class="weather-suggestion-item"
          @click="addCity(s)"
        >
          <strong>{{ s.name }}</strong>
          <span>{{ s.region }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const weatherStore  = useWeatherStore()
const projectsStore = useProjectsStore()

const props = defineProps({
  project:  { type: Object, required: true },
  tempUnit: { type: String, default: 'C' },
  lang:     { type: String, default: 'es' },
  dateStr:  { type: String, default: '' },
})

const showAddCity     = ref(false)
const newCitySearch   = ref('')
const newCitySuggestions = ref([])
let cityTimer = null

const formattedDate = computed(() => {
  const d = props.dateStr || new Date().toISOString().split('T')[0]
  const [y, m, day] = d.split('-')
  return props.lang === 'en'
    ? `${parseInt(m)}/${parseInt(day)}/${y}`
    : `${parseInt(day)}/${parseInt(m)}/${y}`
})

// Fetch weather for all cities on mount
onMounted(() => {
  const date = props.dateStr || new Date().toISOString().split('T')[0]
  ;(props.project.cities || []).forEach((_, i) => {
    weatherStore.fetchWeather(props.project, i, date)
  })
})

function getWeather(idx) {
  return weatherStore.getWeather(props.project.id, idx)
}

function formatTime(iso) {
  if (!iso) return ''
  const parts = iso.split('T')
  if (!parts[1]) return iso
  return parts[1].slice(0, 5)
}

function removeCity(idx) {
  const updatedCities = [...(props.project.cities || [])]
  updatedCities.splice(idx, 1)
  projectsStore.updateProject(props.project.id, { cities: updatedCities })
}

async function searchNewCity() {
  clearTimeout(cityTimer)
  const val = newCitySearch.value.trim()
  if (!val || val.length < 2) { newCitySuggestions.value = []; return }
  cityTimer = setTimeout(async () => {
    try {
      const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=10&language=${props.lang}`)
      const data = await res.json()
      if (!data.results?.length) { newCitySuggestions.value = []; return }
      newCitySuggestions.value = data.results.slice(0, 5).map(r => ({
        id:     `${r.latitude}_${r.longitude}`,
        name:   r.name,
        region: [r.admin1, r.country].filter(Boolean).join(', '),
        lat:    r.latitude,
        lon:    r.longitude,
      }))
    } catch { newCitySuggestions.value = [] }
  }, 300)
}

function addCity(s) {
  const city = { name: s.name, lat: s.lat, lon: s.lon, weatherData: {}, sunrise: '', sunset: '' }
  const updatedCities = [...(props.project.cities || []), city]
  projectsStore.updateProject(props.project.id, { cities: updatedCities })
  showAddCity.value = false
  newCitySearch.value = ''
  newCitySuggestions.value = []
  // Fetch weather for new city
  const date = props.dateStr || new Date().toISOString().split('T')[0]
  const idx  = updatedCities.length - 1
  weatherStore.fetchWeather(props.project, idx, date)
}
</script>

<style scoped>
.weather-strip {
  flex-shrink: 0; border-bottom: 1px solid var(--border); background: #fafcfd;
  padding: 8px 16px; display: flex; align-items: center; gap: 12px; overflow-x: auto; min-height: 52px;
}
.weather-strip::-webkit-scrollbar { height: 3px; }
.weather-strip::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

.weather-date-label { font-size: .65rem; color: var(--muted); font-style: italic; flex-shrink: 0; }

.weather-city {
  display: flex; align-items: center; gap: 9px; padding: 6px 14px;
  border: 1px solid var(--border); border-radius: 8px; background: #f8fbfc;
  flex-shrink: 0; font-size: .76rem;
}
.weather-city-name { font-weight: 700; color: var(--navy); font-size: .74rem; }
.weather-icon { font-size: 1.3rem; }
.weather-temp { color: var(--text); font-weight: 700; font-size: .8rem; }
.weather-sun { font-size: .62rem; color: var(--muted); }
.weather-loading { font-size: .7rem; color: var(--muted); }

.weather-del {
  background: none; border: none; cursor: pointer; color: #ccc; font-size: .65rem;
  padding: 1px 3px; border-radius: 3px; margin-left: 2px;
}
.weather-del:hover { color: var(--danger); }

.weather-add-btn {
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
  border: 1.5px dashed var(--border); border-radius: 8px; font-size: .68rem; font-weight: 600;
  cursor: pointer; color: var(--muted); background: transparent; white-space: nowrap; flex-shrink: 0;
}
.weather-add-btn:hover { border-color: var(--accent); color: var(--accent); }

.weather-add-wrap { position: relative; flex-shrink: 0; }
.weather-add-input {
  padding: 5px 9px; border: 1.5px solid var(--accent); border-radius: 7px;
  font-size: .76rem; font-family: inherit; outline: none; color: var(--text); width: 160px;
}

.weather-suggestions {
  position: absolute; top: 100%; left: 0; z-index: 200;
  background: #fff; border: 1.5px solid var(--accent); border-radius: 7px;
  box-shadow: 0 4px 18px rgba(0,0,0,.12); overflow: hidden; min-width: 200px;
}
.weather-suggestion-item {
  padding: 7px 12px; cursor: pointer; font-size: .76rem;
  border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 1px;
}
.weather-suggestion-item:last-child { border-bottom: none; }
.weather-suggestion-item:hover { background: #f0faf8; }
.weather-suggestion-item strong { color: var(--navy); font-weight: 700; }
.weather-suggestion-item span { color: var(--muted); font-size: .66rem; }
</style>
