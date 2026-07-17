<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <h2>{{ isEdit ? (lang === 'en' ? 'Edit calendar' : 'Editar calendario') : (lang === 'en' ? 'New calendar' : 'Nuevo calendario') }}</h2>

      <div class="modal-grid">
        <div class="field">
          <label>{{ lang === 'en' ? 'Client' : 'Cliente' }}</label>
          <input ref="clientInputRef" type="text" v-model="form.client" placeholder="Coca-Cola" />
        </div>
        <div class="field">
          <label>{{ lang === 'en' ? 'Agency' : 'Agencia' }}</label>
          <input type="text" v-model="form.agency" placeholder="McCann" />
        </div>
        <div class="field" style="grid-column:1/-1">
          <label>{{ lang === 'en' ? 'Project name' : 'Proyecto' }}</label>
          <input type="text" v-model="form.name" placeholder="Summer Campaign 2026" />
        </div>
        <div class="field">
          <label>{{ lang === 'en' ? 'Director' : 'Director/a' }}</label>
          <input type="text" v-model="form.director" placeholder="Director name" />
        </div>
        <div class="field">
          <label>{{ lang === 'en' ? 'Photographer' : 'Fotógrafo/a' }}</label>
          <input type="text" v-model="form.photographer" placeholder="Photographer name" />
        </div>
        <div class="field">
          <label>{{ lang === 'en' ? 'Executive producer' : 'Productor/a Ejecutivo/a' }}</label>
          <input type="text" v-model="form.ep" placeholder="EP name" />
        </div>
        <div class="field">
          <label>{{ lang === 'en' ? 'Agency producer' : 'Productor/a de Agencia' }}</label>
          <input type="text" v-model="form.agencyProducer" placeholder="Agency producer name" />
        </div>
      </div>

      <!-- Location -->
      <div style="margin-top:10px;position:relative;">
        <div class="field">
          <label>{{ lang === 'en' ? 'Production city' : 'Ciudad de producción' }} <span style="font-weight:400;color:var(--muted)">{{ lang === 'en' ? '(optional)' : '(opcional)' }}</span></label>
          <div v-if="selectedCity" class="pm-loc-selected">
            <span>📍</span>
            <span>{{ selectedCity.name }}<span v-if="selectedCity.region"> · {{ selectedCity.region }}</span></span>
            <button class="pm-loc-clear" @click="clearCity">✕</button>
          </div>
          <input
            v-else
            type="text"
            v-model="citySearch"
            :placeholder="lang === 'en' ? 'e.g. Miami, Buenos Aires, Madrid…' : 'Ej: Miami, Buenos Aires, Madrid…'"
            autocomplete="off"
            @input="searchCity"
            @blur="hideSuggestions"
          />
          <div v-if="citySuggestions.length" class="pm-loc-suggestions">
            <div
              v-for="s in citySuggestions"
              :key="s.id"
              class="pm-loc-item"
              @mousedown.prevent="selectCity(s)"
            >
              <strong>{{ s.name }}</strong>
              <span>{{ s.region }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Color -->
      <div style="margin-top:12px;">
        <div class="field">
          <label>{{ lang === 'en' ? 'Project color' : 'Color' }}</label>
          <div class="color-row">
            <div
              v-for="c in PALETTE"
              :key="c"
              class="color-swatch"
              :class="{ selected: form.color === c }"
              :style="{ background: c }"
              @click="form.color = c"
            ></div>
          </div>
        </div>
      </div>

      <!-- Status -->
      <div style="margin-top:10px;">
        <div class="field">
          <label>{{ lang === 'en' ? 'Status' : 'Estado' }}</label>
          <div class="status-btn-row">
            <button
              class="status-btn"
              :class="{ active: form.status === 'competing', 'status-competing': true }"
              @click="form.status = 'competing'"
            >{{ lang === 'en' ? 'Competing' : 'Compitiendo' }}</button>
            <button
              class="status-btn"
              :class="{ active: form.status === 'awarded', 'status-awarded': true }"
              @click="form.status = 'awarded'"
            >{{ lang === 'en' ? 'Won' : 'Ganado' }}</button>
            <button
              class="status-btn"
              :class="{ active: form.status === 'lost', 'status-lost': true }"
              @click="form.status = 'lost'"
            >{{ lang === 'en' ? 'Lost' : 'Perdido' }}</button>
          </div>
        </div>
      </div>

      <!-- Week start & temp unit (always shown) -->
      <div style="margin-top:10px;display:flex;gap:10px;">
        <div class="field" style="flex:1;">
          <label>{{ lang === 'en' ? 'Week starts' : 'Semana inicia' }}</label>
          <select v-model="form.weekStart" class="pm-select">
            <option value="sun">{{ lang === 'en' ? 'Sunday' : 'Domingo' }}</option>
            <option value="mon">{{ lang === 'en' ? 'Monday' : 'Lunes' }}</option>
          </select>
        </div>
        <div class="field" style="flex:1;">
          <label>{{ lang === 'en' ? 'Temperature' : 'Temperatura' }}</label>
          <select v-model="form.tempUnit" class="pm-select">
            <option value="C">Celsius (°C)</option>
            <option value="F">Fahrenheit (°F)</option>
          </select>
        </div>
      </div>

      <!-- Template (new project only) -->
      <div v-if="!isEdit" style="margin-top:10px;">
        <div class="field">
          <label>{{ lang === 'en' ? 'Use template (optional)' : 'Usar template (opcional)' }}</label>
          <select v-model="form.templateId">
            <option value="">{{ lang === 'en' ? '— Start from blank template —' : '— Partir desde plantilla vacía —' }}</option>
            <option v-for="tmpl in templates" :key="tmpl.id" :value="tmpl.id">
              {{ tmpl.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-ghost" @click="$emit('close')">{{ lang === 'en' ? 'Cancel' : 'Cancelar' }}</button>
        <button class="btn-primary" @click="save">
          {{ isEdit ? (lang === 'en' ? 'Save changes' : 'Guardar cambios') : (lang === 'en' ? 'Create calendar' : 'Crear calendario') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, nextTick } from 'vue'
import { PALETTE } from '~/utils/constants'

const projectsStore = useProjectsStore()
const globalStore   = useGlobalStore()
const settingsStore = useSettingsStore()
const { $toast }    = useNuxtApp()

const props = defineProps({
  editingId: { type: String, default: null },
})
const emit = defineEmits(['close', 'saved'])

const lang = computed(() => globalStore.lang)

const isEdit = computed(() => !!props.editingId)
const templates = computed(() => projectsStore.templates)

const editingProject = computed(() =>
  props.editingId ? projectsStore.projects.find(p => p.id === props.editingId) : null
)

const form = reactive({
  client:       editingProject.value?.client       || '',
  agency:       editingProject.value?.agency       || '',
  name:         editingProject.value?.name         || '',
  director:     editingProject.value?.director     || '',
  photographer: editingProject.value?.photographer || '',
  ep:             editingProject.value?.ep             || '',
  agencyProducer: editingProject.value?.agencyProducer || '',
  status:       editingProject.value?.status       || 'competing',
  color:        editingProject.value?.color        || PALETTE[0],
  templateId:   '',
  weekStart:    editingProject.value?.weekStart    || settingsStore.orgWeekStart || globalStore.weekStart || 'sun',
  tempUnit:     editingProject.value?.tempUnit     || globalStore.tempUnit  || 'C',
})

const clientInputRef = ref(null)

const citySearch    = ref('')
const citySuggestions = ref([])
const firstCity     = editingProject.value?.cities?.[0]
const selectedCity  = ref(firstCity
  ? { id: `${firstCity.lat}_${firstCity.lon}`, name: firstCity.name, region: '', lat: firstCity.lat, lon: firstCity.lon }
  : null)
let cityTimer       = null

async function searchCity() {
  clearTimeout(cityTimer)
  const val = citySearch.value.trim()
  if (!val || val.length < 2) { citySuggestions.value = []; return }
  cityTimer = setTimeout(async () => {
    try {
      const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=20&language=${lang.value}`)
      const data = await res.json()
      if (!data.results?.length) { citySuggestions.value = []; return }
      const MAJOR = ['PPLC','PPLA','PPLA2']
      let filtered = data.results.filter(r => MAJOR.includes(r.feature_code) || (r.population && r.population >= 50000))
      if (!filtered.length) filtered = data.results
      citySuggestions.value = filtered.slice(0, 6).map(r => ({
        id:     `${r.latitude}_${r.longitude}`,
        name:   r.name || val,
        region: [r.admin1, r.country].filter(Boolean).join(', '),
        lat:    r.latitude,
        lon:    r.longitude,
      }))
    } catch { citySuggestions.value = [] }
  }, 300)
}

function selectCity(s) {
  selectedCity.value = s
  citySearch.value   = ''
  citySuggestions.value = []
}

function clearCity() {
  selectedCity.value = null
  citySearch.value   = ''
}

function hideSuggestions() {
  setTimeout(() => { citySuggestions.value = [] }, 180)
}

async function save() {
  if (!form.name && !form.client) {
    await useDialog().alert({
      title: lang.value === 'en' ? 'Missing required field'              : 'Falta información',
      body:  lang.value === 'en' ? 'Enter at least a name or client.' : 'Ingresa al menos un nombre o cliente.',
    })
    return
  }
  if (isEdit.value) {
    const proj = editingProject.value
    const cityUpdate = selectedCity.value ? (() => {
      const rest = (proj?.cities || []).slice(1)
      return { cities: [
        { name: selectedCity.value.name, lat: selectedCity.value.lat, lon: selectedCity.value.lon, weatherData: {}, sunrise: '', sunset: '' },
        ...rest,
      ]}
    })() : {}
    projectsStore.updateProject(props.editingId, {
      client: form.client, agency: form.agency, name: form.name,
      director: form.director, photographer: form.photographer, ep: form.ep, agencyProducer: form.agencyProducer,
      status: form.status, color: form.color,
      ...cityUpdate,
    })
    projectsStore.setProjectWeekStart(props.editingId, form.weekStart)
    projectsStore.setProjectTempUnit(props.editingId, form.tempUnit)
    // Flush now — the debounced sync dies if the user reloads right after saving
    projectsStore.syncProjectNow(props.editingId)
  } else {
    projectsStore.createProject({
      ...form,
      city: selectedCity.value,
    })
  }
  emit('saved')
}

function onKeydown(e) {
  if (e.key === 'Escape') { e.stopPropagation(); emit('close') }
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault(); save()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  if (!isEdit.value) {
    nextTick(() => clientInputRef.value?.focus())
  }
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.pm-loc-selected {
  display: flex; align-items: center; gap: 7px; padding: 5px 10px;
  background: rgba(6,204,180,.08); border: 1.5px solid var(--accent); border-radius: 7px;
  font-size: .76rem; font-weight: 600; color: var(--text);
}
.pm-loc-clear {
  background: none; border: none; cursor: pointer; color: var(--muted);
  font-size: .8rem; margin-left: auto; padding: 0 2px; line-height: 1;
}
.pm-loc-clear:hover { color: #e53e3e; }

.pm-loc-suggestions {
  position: absolute; left: 0; right: 0; top: 100%; z-index: 200;
  background: var(--surface); border: 1.5px solid var(--accent); border-radius: 7px;
  box-shadow: 0 4px 18px rgba(0,0,0,.12); overflow: hidden; margin-top: 2px;
}
.pm-loc-item {
  padding: 7px 12px; cursor: pointer; font-size: .76rem;
  border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 1px;
}
.pm-loc-item:last-child { border-bottom: none; }
.pm-loc-item:hover { background: rgba(6,204,180,.08); }
.pm-loc-item strong { color: var(--text); font-weight: 700; }
.pm-loc-item span { color: var(--muted); font-size: .66rem; }

.pm-select {
  width: 100%; padding: 6px 10px; border-radius: 7px; border: 1.5px solid var(--border);
  background: var(--surface); color: var(--text); font-size: .76rem; font-family: inherit;
  cursor: pointer; appearance: auto;
}
.pm-select:focus { outline: none; border-color: var(--accent); }

.status-btn-row {
  display: flex; gap: 6px;
}
.status-btn {
  flex: 1; padding: 7px 10px; border-radius: 7px; border: 1.5px solid var(--border);
  font-size: .72rem; font-weight: 700; cursor: pointer; font-family: inherit;
  background: none; color: #fff; transition: all .12s; letter-spacing: .2px;
}
.status-btn:hover { opacity: .8; }

/* Competing — amber */
.status-btn.status-competing.active {
  background: rgba(245,158,11,.15); border-color: #f59e0b; color: #fff;
}
/* Won — emerald */
.status-btn.status-awarded.active {
  background: rgba(16,185,129,.15); border-color: #10b981; color: #fff;
}
/* Lost — rose */
.status-btn.status-lost.active {
  background: rgba(244,63,94,.12); border-color: #f43f5e; color: #fff;
}
</style>
