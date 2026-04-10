<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <h2>{{ isEdit ? t('modalEditTitle') : t('modalNewTitle') }}</h2>

      <div class="modal-grid">
        <div class="field">
          <label>{{ t('fClient') }}</label>
          <input type="text" v-model="form.client" placeholder="Coca-Cola" />
        </div>
        <div class="field">
          <label>{{ t('fAgency') }}</label>
          <input type="text" v-model="form.agency" placeholder="McCann" />
        </div>
        <div class="field" style="grid-column:1/-1">
          <label>{{ t('fProject') }}</label>
          <input type="text" v-model="form.name" placeholder="Summer Campaign 2026" />
        </div>
        <div class="field">
          <label>{{ t('fDirector') }}</label>
          <input type="text" v-model="form.director" placeholder="Director name" />
        </div>
        <div class="field">
          <label>{{ t('fPhotographer') }}</label>
          <input type="text" v-model="form.photographer" placeholder="Photographer name" />
        </div>
        <div class="field">
          <label>{{ t('fEP') }}</label>
          <input type="text" v-model="form.ep" placeholder="EP name" />
        </div>
      </div>

      <!-- Location (new project only) -->
      <div v-if="!isEdit" style="margin-top:10px;position:relative;">
        <div class="field">
          <label>{{ t('locationLabel') }} <span style="font-weight:400;color:var(--muted)">{{ t('locationOpt') }}</span></label>
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
          <label>{{ t('fColor') }}</label>
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
          <label>{{ t('fStatus') }}</label>
          <select v-model="form.status">
            <option value="competing">{{ t('sCompeting') }}</option>
            <option value="awarded">{{ t('sAwarded') }}</option>
          </select>
        </div>
      </div>

      <!-- Template (new project only) -->
      <div v-if="!isEdit" style="margin-top:10px;">
        <div class="field">
          <label>{{ t('fTemplate') }}</label>
          <select v-model="form.templateId">
            <option value="">{{ t('fTemplateEmpty') }}</option>
            <option v-for="tmpl in templates" :key="tmpl.id" :value="tmpl.id">
              {{ tmpl.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-ghost" @click="$emit('close')">{{ t('btnCancel') }}</button>
        <button class="btn-primary" @click="save">
          {{ isEdit ? t('modalSaveEdit') : t('modalSaveNew') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { PALETTE } from '~/utils/constants'

const { t } = useI18n()
const projectsStore = useProjectsStore()
const globalStore   = useGlobalStore()
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
  ep:           editingProject.value?.ep           || '',
  status:       editingProject.value?.status       || 'competing',
  color:        editingProject.value?.color        || PALETTE[0],
  templateId:   '',
})

const citySearch    = ref('')
const citySuggestions = ref([])
const selectedCity  = ref(null)
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

function save() {
  if (!form.name && !form.client) {
    alert(lang.value === 'en' ? 'Enter at least a name or client' : 'Ingresa al menos un nombre o cliente')
    return
  }
  if (isEdit.value) {
    projectsStore.updateProject(props.editingId, {
      client: form.client, agency: form.agency, name: form.name,
      director: form.director, photographer: form.photographer, ep: form.ep,
      status: form.status, color: form.color,
    })
    $toast?.(t('toastUpdated'), { type: 'success' })
  } else {
    projectsStore.createProject({
      ...form,
      city: selectedCity.value,
    })
    $toast?.(t('toastCreated'), { type: 'success' })
  }
  emit('saved')
}
</script>

<style scoped>
.pm-loc-selected {
  display: flex; align-items: center; gap: 7px; padding: 5px 10px;
  background: #f0faf8; border: 1.5px solid var(--accent); border-radius: 7px;
  font-size: .76rem; font-weight: 600; color: var(--navy);
}
.pm-loc-clear {
  background: none; border: none; cursor: pointer; color: var(--muted);
  font-size: .8rem; margin-left: auto; padding: 0 2px; line-height: 1;
}
.pm-loc-clear:hover { color: #e53e3e; }

.pm-loc-suggestions {
  position: absolute; left: 0; right: 0; top: 100%; z-index: 200;
  background: #fff; border: 1.5px solid var(--accent); border-radius: 7px;
  box-shadow: 0 4px 18px rgba(0,0,0,.12); overflow: hidden; margin-top: 2px;
}
.pm-loc-item {
  padding: 7px 12px; cursor: pointer; font-size: .76rem;
  border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 1px;
}
.pm-loc-item:last-child { border-bottom: none; }
.pm-loc-item:hover { background: #f0faf8; }
.pm-loc-item strong { color: var(--navy); font-weight: 700; }
.pm-loc-item span { color: var(--muted); font-size: .66rem; }
</style>
