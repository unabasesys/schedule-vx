<template>
  <div class="holidays-panel" :class="{ open }">
    <div class="holidays-panel-hdr">
      <span class="holidays-panel-title">{{ t('holidaysTitle') }}</span>
      <button class="holidays-panel-close" @click="$emit('close')">✕</button>
    </div>

    <!-- Search -->
    <div class="holidays-search-wrap" style="position:relative;">
      <input
        type="text"
        class="holidays-search"
        v-model="searchQuery"
        :placeholder="t('holidaysSearch')"
        @input="onSearch"
      />
      <div v-if="searchResults.length" class="holidays-results">
        <div
          v-for="c in searchResults"
          :key="c.countryCode"
          class="holidays-results-item"
          @click="addCountry(c)"
        >{{ c.name }} ({{ c.countryCode }})</div>
      </div>
    </div>

    <!-- Holiday list -->
    <div class="holidays-list">
      <div v-if="!project.holidays?.length" class="holidays-empty">
        {{ t('holidaysEmpty') }}
      </div>
      <div v-else>
        <div
          v-for="country in project.holidays"
          :key="country.countryCode"
          class="holiday-country-section"
        >
          <div class="holiday-country-row">
            <span class="holiday-country-name">{{ country.name }}</span>
            <span class="holiday-country-count">{{ countHolidays(country.countryCode) }}</span>
            <button class="holiday-del-btn" @click="removeCountry(country.countryCode)">✕</button>
          </div>
          <div
            v-for="h in getHolidays(country.countryCode)"
            :key="h.date"
            class="holiday-item"
          >
            <span class="holiday-item-date">{{ formatDate(h.date) }}</span>
            <span class="holiday-item-name">{{ h.localName || h.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n()
const holidaysStore = useHolidaysStore()
const projectsStore = useProjectsStore()
const globalStore   = useGlobalStore()

const props = defineProps({
  open:    { type: Boolean, default: false },
  project: { type: Object, required: true },
})
const emit = defineEmits(['close'])

const searchQuery   = ref('')
const searchResults = ref([])

const year = computed(() => new Date().getFullYear())
const lang = computed(() => globalStore.lang)

// Load all countries on mount
onMounted(async () => {
  await holidaysStore.loadAllCountries()
  // Fetch holidays for existing countries
  ;(props.project.holidays || []).forEach(h => {
    holidaysStore.fetchHolidaysForYear(h.countryCode, year.value)
  })
})

function onSearch() {
  if (!searchQuery.value.trim()) { searchResults.value = []; return }
  searchResults.value = holidaysStore.searchCountries(searchQuery.value)
}

function addCountry(c) {
  const already = (props.project.holidays || []).find(h => h.countryCode === c.countryCode)
  if (already) return
  const updatedHolidays = [...(props.project.holidays || []), { countryCode: c.countryCode, name: c.name }]
  projectsStore.updateProject(props.project.id, { holidays: updatedHolidays })
  holidaysStore.fetchHolidaysForYear(c.countryCode, year.value)
  searchQuery.value = ''
  searchResults.value = []
}

function removeCountry(code) {
  const updatedHolidays = (props.project.holidays || []).filter(h => h.countryCode !== code)
  projectsStore.updateProject(props.project.id, { holidays: updatedHolidays })
}

function getHolidays(code) {
  return holidaysStore.getHolidaysForYear(code, year.value).slice(0, 15)
}

function countHolidays(code) {
  return holidaysStore.getHolidaysForYear(code, year.value).length
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return lang.value === 'en'
    ? `${parseInt(m)}/${parseInt(d)}`
    : `${parseInt(d)}/${parseInt(m)}`
}
</script>

<style scoped>
.holidays-panel {
  position: fixed; top: 0; right: 0; bottom: 0; width: 320px;
  background: #fff; border-left: 1px solid var(--border);
  box-shadow: -4px 0 20px rgba(0,30,45,.1); z-index: 200;
  display: flex; flex-direction: column;
  transform: translateX(100%); transition: transform .25s;
}
.holidays-panel.open { transform: translateX(0); }

.holidays-panel-hdr {
  padding: 16px 18px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
}
.holidays-panel-title {
  font-family: 'Syne', sans-serif; font-size: .9rem; font-weight: 700; color: var(--navy); flex: 1;
}
.holidays-panel-close {
  background: none; border: none; cursor: pointer; color: var(--muted); font-size: 1.1rem; padding: 2px 6px; border-radius: 5px;
}
.holidays-panel-close:hover { background: var(--bg); color: var(--text); }

.holidays-search-wrap { padding: 12px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.holidays-search {
  width: 100%; padding: 7px 10px; border: 1.5px solid var(--border); border-radius: 7px;
  font-size: .78rem; font-family: inherit; outline: none; color: var(--text);
}
.holidays-search:focus { border-color: var(--accent); }

.holidays-results {
  position: absolute; top: 100%; left: 16px; right: 16px; z-index: 10;
  background: #fff; border: 1.5px solid var(--border); border-radius: 7px;
  box-shadow: 0 8px 20px rgba(0,30,45,.1); max-height: 180px; overflow-y: auto; margin-top: 2px;
}
.holidays-results-item {
  padding: 7px 12px; font-size: .78rem; cursor: pointer; border-bottom: 1px solid var(--border);
}
.holidays-results-item:last-child { border-bottom: none; }
.holidays-results-item:hover { background: var(--bg); }

.holidays-list { flex: 1; overflow-y: auto; padding: 8px 0; }
.holidays-empty { padding: 16px; font-size: .75rem; color: var(--muted); line-height: 1.6; }

.holiday-country-section { border-bottom: 1px solid var(--border); margin-bottom: 4px; }
.holiday-country-row {
  display: flex; align-items: center; gap: 8px; padding: 8px 16px;
}
.holiday-country-name { flex: 1; font-size: .8rem; font-weight: 600; color: var(--text); }
.holiday-country-count { font-size: .68rem; color: var(--muted); }
.holiday-del-btn {
  background: none; border: none; cursor: pointer; font-size: .75rem; color: #ccc; padding: 2px 4px; border-radius: 4px;
}
.holiday-del-btn:hover { color: var(--danger); }

.holiday-item {
  display: flex; gap: 10px; padding: 4px 16px 4px 24px; font-size: .72rem;
}
.holiday-item-date { color: var(--accent); font-weight: 600; flex-shrink: 0; min-width: 36px; }
.holiday-item-name { color: var(--text); }
</style>
