<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal wide">
      <h2>{{ creationMode ? (lang === 'en' ? 'New organization' : 'Nueva organización') : L.companyTitle }}</h2>

      <div class="modal-grid" style="margin-bottom:14px;">
        <div class="field">
          <label>{{ L.companyName }}</label>
          <input
            type="text"
            v-model="form.name"
            placeholder=""
          />
        </div>
        <div class="field">
          <label>{{ L.companyWeb }}</label>
          <input type="text" v-model="form.website" placeholder="https://" />
        </div>
      </div>

      <!-- Logo -->
      <div class="settings-row" style="margin-bottom:14px;align-items:flex-start;gap:12px;">
        <span class="settings-label" style="padding-top:6px;">{{ L.logoLabel }}</span>
        <div>
          <div v-if="form.logo" style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
            <img :src="form.logo" alt="Logo" class="logo-thumb" />
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label class="btn-ghost logo-replace-btn">
                {{ L.uploadLogo }}
                <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" style="display:none;" @change="handleLogoUpload" />
              </label>
              <button class="btn-ghost btn-remove-logo" @click="removeLogo">{{ L.removeLogo }}</button>
            </div>
          </div>
          <label v-else class="logo-upload-btn">
            <span>＋</span> {{ L.uploadLogo }}
            <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" style="display:none;" @change="handleLogoUpload" />
          </label>
          <div class="logo-hint">{{ L.logoHint }}</div>
        </div>
      </div>

      <!-- Language -->
      <div class="settings-row">
        <span class="settings-label">{{ L.langLabel }}</span>
        <div class="date-fmt-toggle">
          <button :class="{ active: localLang === 'es' }" @click="localLang = 'es'">Español</button>
          <button :class="{ active: localLang === 'en' }" @click="localLang = 'en'">English</button>
        </div>
      </div>

      <!-- Date format -->
      <div class="settings-row" style="margin-top:8px;">
        <span class="settings-label">{{ L.dateFormatLabel }}</span>
        <div class="date-fmt-toggle">
          <button
            :class="{ active: localDateFormat === 'DD/MM/AA' }"
            @click="localDateFormat = 'DD/MM/AA'"
          >DD/MM/AA</button>
          <button
            :class="{ active: localDateFormat === 'MM/DD/AA' }"
            @click="localDateFormat = 'MM/DD/AA'"
          >MM/DD/AA</button>
        </div>
      </div>

      <!-- Default week start (org-wide; each calendar can override it) -->
      <div class="settings-row" style="margin-top:8px;">
        <span class="settings-label">{{ L.weekStartLabel }}</span>
        <div class="date-fmt-toggle">
          <button
            :class="{ active: localWeekStart === 'sun' }"
            @click="localWeekStart = 'sun'"
          >{{ lang === 'en' ? 'Sunday' : 'Domingo' }}</button>
          <button
            :class="{ active: localWeekStart === 'mon' }"
            @click="localWeekStart = 'mon'"
          >{{ lang === 'en' ? 'Monday' : 'Lunes' }}</button>
        </div>
      </div>

      <!-- Operating Cities -->
      <div style="margin-top:16px;">
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:6px;">
          {{ lang === 'en' ? 'Default weather cities' : 'Ciudades de clima por defecto' }}
        </div>
        <div style="font-size:.68rem;color:var(--muted);margin-bottom:10px;">
          {{ lang === 'en' ? 'Which cities would you like to show by default in the weather widgets for new calendars?' : '¿Qué ciudades querés mostrar por defecto en los widgets de clima de los calendarios nuevos?' }}
        </div>

        <!-- Selected chips -->
        <div v-if="localOrgCities.length" class="org-cities-chips">
          <div v-for="c in localOrgCities" :key="c.name" class="org-city-chip">
            <span>{{ c.name }}</span>
            <button @click="removeOrgCity(c.name)">✕</button>
          </div>
        </div>

        <!-- Search input + suggestions -->
        <div style="position:relative;margin-top:6px;">
          <input
            type="text"
            v-model="citySearchText"
            :placeholder="lang === 'en' ? 'Search and add a city…' : 'Buscar y agregar ciudad…'"
            autocomplete="off"
            class="org-city-input"
            @input="onCitySearchInput"
            @focus="onCitySearchFocus"
            @blur="hideCitySuggestions"
          />
          <div v-if="orgCitySuggestions.length" class="org-city-dropdown">
            <div
              v-for="s in orgCitySuggestions"
              :key="s.name + s.lat"
              class="org-city-option"
              @mousedown.prevent="addOrgCity(s)"
            >
              <strong>{{ s.name }}</strong>
              <span v-if="s.region">{{ s.region }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Default Holidays -->
      <div style="margin-top:16px;">
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:6px;">
          {{ lang === 'en' ? 'Default holidays' : 'Feriados por defecto' }}
        </div>
        <div style="font-size:.68rem;color:var(--muted);margin-bottom:10px;">
          {{ lang === 'en' ? 'These countries\' holidays will be loaded automatically in every new calendar.' : 'Los feriados de estos países se cargarán automáticamente en cada nuevo calendario.' }}
        </div>

        <!-- Selected country chips -->
        <div v-if="localOrgDefaultHolidays.length" class="org-cities-chips" style="margin-bottom:8px;">
          <div v-for="c in localOrgDefaultHolidays" :key="c.countryCode" class="org-city-chip">
            <span>{{ c.name }}</span>
            <button @click="removeDefaultHoliday(c.countryCode)">✕</button>
          </div>
        </div>

        <!-- Search input -->
        <div style="position:relative;">
          <input
            type="text"
            v-model="holidaySearchText"
            :placeholder="lang === 'en' ? 'Search and add country…' : 'Buscar y agregar país…'"
            autocomplete="off"
            class="org-city-input"
            @input="onHolidaySearchInput"
            @blur="hideHolidaySuggestions"
          />
          <div v-if="holidaySuggestions.length" class="org-city-dropdown">
            <div
              v-for="s in holidaySuggestions"
              :key="s.countryCode"
              class="org-city-option"
              @mousedown.prevent="addDefaultHoliday(s)"
            >
              <strong>{{ s.name }}</strong>
              <span style="color:var(--muted);font-size:.65rem;margin-left:4px;">({{ s.countryCode }})</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Users — hidden during org creation -->
      <div v-if="!creationMode" style="margin-top:16px;">
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:8px;">{{ L.usersLabel }}</div>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <input
            type="email"
            v-model="inviteEmail"
            :placeholder="lang === 'en' ? 'email@example.com' : 'email@ejemplo.com'"
            style="flex:1;padding:7px 10px;border:1.5px solid var(--border);border-radius:7px;font-size:.78rem;font-family:inherit;outline:none;"
            @focus="$event.target.style.borderColor='var(--accent)'"
            @blur="$event.target.style.borderColor='var(--border)'"
            @keydown.enter="inviteUser"
            @input="inviteError = ''; inviteSuccess = ''"
          />
          <button class="btn-primary" @click="inviteUser" style="padding:7px 14px;font-size:.75rem;">{{ L.inviteBtn }}</button>
        </div>
        <div v-if="inviteSuccess" class="invite-feedback invite-feedback--ok">
          {{ lang === 'en' ? `Invitation sent to ${inviteSuccess}` : `Invitación enviada a ${inviteSuccess}` }}
        </div>
        <div v-if="inviteError" class="invite-feedback invite-feedback--err">
          {{ inviteError }}
        </div>
        <div class="users-list">
          <div v-for="user in settingsStore.users" :key="user.id" class="user-row">
            <span class="user-email">{{ user.email }}</span>
            <span class="user-status" :class="user.status">{{ statusLabel(user.status) }}</span>
            <span v-if="isOrgOwner(user)" class="user-owner-badge">{{ lang === 'en' ? 'owner' : 'propietario' }}</span>
            <button v-else class="btn-ghost" style="padding:3px 8px;font-size:.65rem;" @click="removeUser(user.id)">✕</button>
          </div>
          <div v-if="!settingsStore.users.length" style="font-size:.75rem;color:var(--muted);">
            {{ lang === 'en' ? 'No users invited yet' : 'No hay usuarios invitados' }}
          </div>
        </div>
      </div>

      <div v-if="orgError" class="org-error">{{ orgError }}</div>

      <!-- Danger zone — owner only, hidden during org creation -->
      <div v-if="isCurrentUserOwner && authStore.isLoggedIn && !creationMode" class="danger-zone">
        <div class="danger-zone-label">{{ lang === 'en' ? 'Danger zone' : 'Zona de peligro' }}</div>
        <div class="danger-zone-row">
          <div class="danger-zone-desc">
            <strong>{{ lang === 'en' ? 'Delete organization' : 'Eliminar organización' }}</strong>
            <span>{{ lang === 'en'
              ? 'Permanently deletes this organization and all its calendars. This action cannot be undone.'
              : 'Elimina permanentemente esta organización y todos sus calendarios. Esta acción no se puede deshacer.' }}</span>
          </div>
          <button class="btn-danger" @click="handleDeleteOrg" :disabled="saving">
            {{ lang === 'en' ? 'Delete org' : 'Eliminar org' }}
          </button>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-ghost" @click="$emit('close')" :disabled="saving">{{ L.btnCancel }}</button>
        <button class="btn-primary" @click="save" :disabled="saving">
          {{ saving ? (lang === 'en' ? 'Saving...' : 'Guardando...') : (lang === 'en' ? 'Save' : 'Guardar') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  creationMode: { type: Boolean, default: false },
})

const settingsStore = useSettingsStore()
const globalStore   = useGlobalStore()
const projectsStore = useProjectsStore()
const authStore     = useAuthStore()

const emit    = defineEmits(['close', 'created'])
const saving  = ref(false)
const orgError = ref(null)

// ── Inline translations (avoids @nuxtjs/i18n runtime bug in v-if modals) ──────
const LABELS = {
  es: {
    companyTitle:    'Empresa y usuarios',
    companyName:     'Nombre empresa',
    companyWeb:      'Sitio web',
    logoLabel:       'Logo',
    logoHint:        'Recomendado: 192×192 px · PNG, SVG o WebP',
    uploadLogo:      'Subir logo',
    removeLogo:      'Quitar logo',
    langLabel:       'Idioma',
    weekStartLabel:  'Inicio de semana',
    weekSun:         'Domingo',
    weekMon:         'Lunes',
    tempUnitLabel:   'Temperatura',
    dateFormatLabel: 'Formato de fecha',
    usersLabel:      'Usuarios',
    inviteBtn:       'Invitar',
    btnCancel:       'Cancelar',
  },
  en: {
    companyTitle:    'Company & users',
    companyName:     'Company name',
    companyWeb:      'Website',
    logoLabel:       'Logo',
    logoHint:        'Recommended: 192×192 px · PNG, SVG or WebP',
    uploadLogo:      'Upload logo',
    removeLogo:      'Remove logo',
    langLabel:       'Language',
    weekStartLabel:  'Week starts on',
    weekSun:         'Sunday',
    weekMon:         'Monday',
    tempUnitLabel:   'Temperature',
    dateFormatLabel: 'Date format',
    usersLabel:      'Users',
    inviteBtn:       'Invite',
    btnCancel:       'Cancel',
  },
}

const lang = computed(() => globalStore.lang || 'es')
const L    = computed(() => LABELS[lang.value] ?? LABELS.es)

const form = reactive({
  name:    props.creationMode ? '' : (settingsStore.company.name    || ''),
  website: props.creationMode ? '' : (settingsStore.company.website || ''),
  logo:    props.creationMode ? '' : (settingsStore.logo            || ''),
})

const localLang       = ref(globalStore.lang || 'es')
const localDateFormat = ref(globalStore.dateFormat || 'DD/MM/AA')
const localWeekStart  = ref(props.creationMode ? 'sun' : (settingsStore.orgWeekStart || 'sun'))
const inviteEmail     = ref('')
const inviteError     = ref('')
const inviteSuccess   = ref('')

// ── Operating cities ──────────────────────────────────────────────────────────
import { DEFAULT_CITIES } from '~/utils/constants'

const localOrgCities     = ref(props.creationMode ? [] : JSON.parse(JSON.stringify(settingsStore.orgCities || [])))
const citySearchText     = ref('')
const orgCitySuggestions = ref([])
let citySearchTimer      = null

function onCitySearchFocus() {
  if (!citySearchText.value.trim()) {
    // Show DEFAULT_CITIES that haven't been added yet
    const selected = localOrgCities.value.map(c => c.name)
    orgCitySuggestions.value = DEFAULT_CITIES
      .filter(c => !selected.includes(c.name))
      .map(c => ({ name: c.name, lat: c.lat, lon: c.lon, region: '' }))
  }
}

function onCitySearchInput() {
  clearTimeout(citySearchTimer)
  const val = citySearchText.value.trim()
  if (!val || val.length < 2) {
    onCitySearchFocus()
    return
  }
  const selected = localOrgCities.value.map(c => c.name)
  // First filter DEFAULT_CITIES locally
  const local = DEFAULT_CITIES
    .filter(c => !selected.includes(c.name) && c.name.toLowerCase().includes(val.toLowerCase()))
    .map(c => ({ name: c.name, lat: c.lat, lon: c.lon, region: '' }))

  if (local.length) {
    orgCitySuggestions.value = local
  } else {
    // Fall back to geocoding API
    citySearchTimer = setTimeout(async () => {
      try {
        const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=20&language=${lang.value}`)
        const data = await res.json()
        if (!data.results?.length) { orgCitySuggestions.value = []; return }
        const MAJOR = ['PPLC','PPLA','PPLA2']
        let filtered = data.results.filter(r => MAJOR.includes(r.feature_code) || (r.population && r.population >= 50000))
        if (!filtered.length) filtered = data.results
        orgCitySuggestions.value = filtered.slice(0, 6)
          .filter(r => !selected.includes(r.name))
          .map(r => ({
            name:   r.name,
            lat:    r.latitude,
            lon:    r.longitude,
            region: [r.admin1, r.country].filter(Boolean).join(', '),
          }))
      } catch { orgCitySuggestions.value = [] }
    }, 300)
  }
}

function addOrgCity(city) {
  if (localOrgCities.value.find(c => c.name === city.name)) return
  localOrgCities.value.push({ name: city.name, lat: city.lat, lon: city.lon })
  citySearchText.value     = ''
  orgCitySuggestions.value = []
}

function removeOrgCity(name) {
  localOrgCities.value = localOrgCities.value.filter(c => c.name !== name)
}

function hideCitySuggestions() {
  setTimeout(() => { orgCitySuggestions.value = [] }, 180)
}

// ── Default holiday countries ─────────────────────────────────────────────────
const holidaysStore = useHolidaysStore()

const localOrgDefaultHolidays = ref(props.creationMode ? [] : JSON.parse(JSON.stringify(settingsStore.orgDefaultHolidays || [])))
const holidaySearchText = ref('')
const holidaySuggestions = ref([])

onMounted(() => {
  holidaysStore.loadAllCountries()
})

function onHolidaySearchInput() {
  const val = holidaySearchText.value.trim()
  if (!val) { holidaySuggestions.value = []; return }
  const selected = new Set(localOrgDefaultHolidays.value.map(c => c.countryCode))
  holidaySuggestions.value = holidaysStore.searchCountries(val)
    .filter(c => !selected.has(c.countryCode))
    .slice(0, 8)
}

function addDefaultHoliday(c) {
  if (localOrgDefaultHolidays.value.find(x => x.countryCode === c.countryCode)) return
  localOrgDefaultHolidays.value.push({ countryCode: c.countryCode, name: c.name })
  holidaySearchText.value = ''
  holidaySuggestions.value = []
}

function removeDefaultHoliday(code) {
  localOrgDefaultHolidays.value = localOrgDefaultHolidays.value.filter(c => c.countryCode !== code)
}

function hideHolidaySuggestions() {
  setTimeout(() => { holidaySuggestions.value = [] }, 180)
}

function isOrgOwner(user) {
  return user.role === 'owner'
}

const isCurrentUserOwner = computed(() => {
  const currentOrgId = authStore.organization?._id?.toString()
  if (!currentOrgId) return false
  const current = authStore.organizations.find(o => o._id?.toString() === currentOrgId)
  return current?.isOwner === true
})

async function handleDeleteOrg() {
  const orgName = authStore.organization?.name || ''
  const confirmed = await useDialog().confirm({
    title:        lang.value === 'en' ? 'Delete organization?' : '¿Eliminar organización?',
    body:         lang.value === 'en'
      ? `This will permanently delete "${orgName}" and all its calendars. This action cannot be undone.`
      : `Esto eliminará permanentemente "${orgName}" y todos sus calendarios. Esta acción no se puede deshacer.`,
    confirmLabel: lang.value === 'en' ? 'Yes, delete' : 'Sí, eliminar',
    cancelLabel:  lang.value === 'en' ? 'Cancel' : 'Cancelar',
  })
  if (!confirmed) return

  saving.value = true
  const result = await authStore.deleteOrg(authStore.organization._id)
  saving.value = false

  if (!result.ok) {
    orgError.value = result.error || (lang.value === 'en' ? 'Could not delete the organization.' : 'No se pudo eliminar la organización.')
  } else {
    await useDialog().alert({
      title: lang.value === 'en' ? 'Organization deleted' : 'Organización eliminada',
      body:  lang.value === 'en'
        ? `"${orgName}" has been successfully deleted.`
        : `"${orgName}" se ha eliminado con éxito.`,
      confirmLabel: 'OK',
    })
    emit('close')
  }
}

function statusLabel(s) {
  const map = {
    pending:     { es: 'Pendiente',   en: 'Pending' },
    active:      { es: 'Activo',      en: 'Active' },
    deactivated: { es: 'Desactivado', en: 'Deactivated' },
  }
  return map[s]?.[lang.value] || s
}

function handleLogoUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  const MAX_SIZE = 512 * 1024 // 512 KB
  if (file.size > MAX_SIZE) {
    useDialog().alert({
      title: lang.value === 'en' ? 'Image too large'                              : 'Imagen demasiado grande',
      body:  lang.value === 'en' ? 'Please use an image under 512 KB.'           : 'Por favor usá una imagen menor a 512 KB.',
    })
    event.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => { form.logo = e.target.result }
  reader.readAsDataURL(file)
}

function removeLogo() {
  form.logo = ''
}

async function inviteUser() {
  if (!inviteEmail.value.trim()) return
  const email = inviteEmail.value.trim()
  inviteError.value   = ''
  inviteSuccess.value = ''

  if (authStore.isLoggedIn) {
    const result = await settingsStore.inviteUserToApi(email)
    if (!result.ok) {
      inviteError.value = result.error || (lang.value === 'en' ? 'Could not send the invitation' : 'No se pudo enviar la invitación')
      return
    }
  } else {
    settingsStore.inviteUser(email)
  }
  inviteSuccess.value = email
  inviteEmail.value   = ''
}

async function removeUser(id) {
  const user = settingsStore.users.find(u => u.id === id)
  if (!user) return

  const name = user.name || user.email
  const ok = await useDialog().confirm({
    title:        lang.value === 'en' ? 'Remove user?' : '¿Eliminar usuario?',
    body:         lang.value === 'en'
      ? `Are you sure you want to remove ${name} from this organization?`
      : `¿Estás seguro de que querés eliminar a ${name} de la organización?`,
    confirmLabel: lang.value === 'en' ? 'Remove' : 'Eliminar',
    cancelLabel:  lang.value === 'en' ? 'Cancel' : 'Cancelar',
  })
  if (!ok) return

  if (authStore.isLoggedIn) {
    const isSelf = authStore.user?.email && user.email === authStore.user.email
    const target = (isSelf && authStore.user?._id) ? authStore.user._id : (user._userId || user.email)
    if (target) {
      const result = await settingsStore.removeUserFromApi(target)
      if (!result.ok) {
        orgError.value = result.error || (lang.value === 'en' ? 'Failed to remove user.' : 'No se pudo eliminar el usuario.')
        return
      }
    }
  }
  settingsStore.removeUser(id)
  await authStore.fetchMyOrgs()
}

async function save() {
  saving.value  = true
  orgError.value = null

  if (props.creationMode) {
    if (!form.name.trim()) {
      orgError.value = lang.value === 'en' ? 'Organization name is required.' : 'El nombre de la organización es requerido.'
      saving.value = false
      return
    }
    const result = await authStore.createOrg(form.name.trim())
    if (!result.ok) {
      orgError.value = result.error || (lang.value === 'en' ? 'Could not create organization. Try again.' : 'No se pudo crear la organización. Intentá de nuevo.')
      saving.value = false
      return
    }
    globalStore.setLang(localLang.value)
    globalStore.setDateFormat(localDateFormat.value)
    settingsStore.setCompany({ name: form.name, website: form.website })
    settingsStore.setStudioName(form.name)
    settingsStore.setOrgCities(localOrgCities.value)
    settingsStore.setOrgDefaultHolidays(localOrgDefaultHolidays.value)
    settingsStore.setOrgWeekStart(localWeekStart.value)
    if (form.logo && form.logo.startsWith('data:')) {
      const url = await settingsStore.uploadLogoToApi(form.logo)
      if (url) form.logo = url
    }
    await Promise.all([
      settingsStore.saveOrgToApi({
        name:    form.name,
        website: form.website,
        scheduleSettings: {
          cities:          localOrgCities.value,
          defaultHolidays: localOrgDefaultHolidays.value,
          weekStart:       localWeekStart.value,
        },
      }),
      settingsStore.saveUserPrefsToApi({
        lang:       localLang.value,
        weekStart:  globalStore.weekStart,
        tempUnit:   globalStore.tempUnit,
        dateFormat: localDateFormat.value,
      }),
    ])
    settingsStore.saveLogo(form.logo)
    saving.value = false
    emit('created')
    emit('close')
    return
  }

  // Local preferences first (always saved)
  settingsStore.setCompany({ name: form.name, website: form.website })
  settingsStore.setStudioName(form.name)
  settingsStore.setOrgCities(localOrgCities.value)
  settingsStore.setOrgDefaultHolidays(localOrgDefaultHolidays.value)
  settingsStore.setOrgWeekStart(localWeekStart.value)
  globalStore.setLang(localLang.value)
  globalStore.setDateFormat(localDateFormat.value)
  projectsStore.save()

  if (authStore.isLoggedIn) {
    // Upload logo if it's a new data URL (base64)
    if (form.logo && form.logo.startsWith('data:')) {
      const url = await settingsStore.uploadLogoToApi(form.logo)
      if (url) form.logo = url
    }

    await Promise.all([
      settingsStore.saveOrgToApi({
        name:     form.name,
        website:  form.website,
        scheduleSettings: {
          cities:          localOrgCities.value,
          defaultHolidays: localOrgDefaultHolidays.value,
          weekStart:       localWeekStart.value,
        },
      }),
      settingsStore.saveUserPrefsToApi({
        lang:       localLang.value,
        weekStart:  globalStore.weekStart,
        tempUnit:   globalStore.tempUnit,
        dateFormat: localDateFormat.value,
      }),
    ])
  }

  settingsStore.saveLogo(form.logo)
  saving.value = false
  emit('close')
}

// ── Keyboard: Enter = save, Esc = close ────────────────────────────────────────
function onKeydown(e) {
  if (e.key === 'Escape') { emit('close') }
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { save() }
}
onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  if (authStore.isLoggedIn && !props.creationMode) {
    const org = await settingsStore.fetchOrg()
    if (org) {
      form.name    = org.name || ''
      form.website = org.contact?.webSite || ''
      form.logo    = org.imgUrl || settingsStore.logo || ''
      if (org.scheduleSettings?.cities?.length)
        localOrgCities.value = JSON.parse(JSON.stringify(org.scheduleSettings.cities))
      if (org.scheduleSettings?.defaultHolidays?.length)
        localOrgDefaultHolidays.value = JSON.parse(JSON.stringify(org.scheduleSettings.defaultHolidays))
    }
  }
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.invite-feedback {
  font-size: .73rem; font-weight: 600; padding: 5px 10px;
  border-radius: 6px; margin-top: -2px;
}
.invite-feedback--ok  { background: rgba(32,167,137,.10); color: var(--accent); }
.invite-feedback--err { background: rgba(234,78,73,.10);  color: var(--danger); }

.users-list { display: flex; flex-direction: column; gap: 6px; }
.user-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border: 1px solid var(--border); border-radius: 7px;
}
.user-email { flex: 1; font-size: .78rem; color: var(--text); }
.user-status {
  font-size: .62rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .4px; padding: 2px 7px; border-radius: 3px;
}
.user-status.pending     { background: rgba(245,158,11,.12); color: var(--warning); }
.user-status.active      { background: rgba(34,197,94,.12);  color: var(--success); }
.user-status.deactivated { background: rgba(107,143,160,.1); color: var(--muted); }
.user-owner-badge {
  font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(42,79,158,.15); color: var(--accent);
}

.logo-thumb {
  width: 56px; height: 56px; object-fit: contain;
  border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-soft, #f5f7fa);
}
.logo-upload-btn {
  display: inline-flex; align-items: center; gap: 5px; cursor: pointer;
  padding: 6px 12px; border: 1.5px dashed var(--border); border-radius: 7px;
  font-size: .75rem; color: var(--muted); background: none;
  font-family: inherit; transition: border-color .15s, color .15s;
}
.logo-upload-btn:hover { border-color: var(--accent); color: var(--accent); }
.logo-replace-btn {
  display: inline-flex; align-items: center; cursor: pointer;
  font-size: .72rem;
}
.btn-remove-logo { font-size: .72rem; color: var(--danger, #e05252); }
.btn-remove-logo:hover { color: var(--danger, #c0392b); }

.org-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--danger);
  margin-top: 8px;
}
.logo-hint { font-size: .67rem; color: var(--muted); margin-top: 5px; }

.date-fmt-toggle {
  display: flex; border: 1.5px solid var(--border); border-radius: 6px; overflow: hidden;
}
.date-fmt-toggle button {
  background: none; border: none; padding: 6px 14px;
  font-size: .72rem; font-weight: 700; cursor: pointer;
  color: var(--muted); font-family: inherit; letter-spacing: .3px;
  transition: all .12s;
}
.date-fmt-toggle button + button { border-left: 1.5px solid var(--border); }
.date-fmt-toggle button.active { background: var(--accent); color: #fff; }

/* Operating cities */
.org-cities-chips {
  display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 2px;
}
.org-city-chip {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(32,167,137,.12); border: 1px solid rgba(32,167,137,.35);
  border-radius: 20px; padding: 3px 8px 3px 10px;
  font-size: .7rem; font-weight: 600; color: var(--accent);
}
.org-city-chip button {
  background: none; border: none; cursor: pointer; padding: 0 1px;
  font-size: .65rem; color: var(--accent); opacity: .6; line-height: 1;
}
.org-city-chip button:hover { opacity: 1; }
.org-city-input {
  width: 100%; padding: 7px 10px; border: 1.5px solid var(--border);
  border-radius: 7px; font-size: .78rem; font-family: inherit; outline: none;
  background: var(--bg); color: var(--text);
  box-sizing: border-box; transition: border-color .15s;
}
.org-city-input:focus { border-color: var(--accent); }
.org-city-dropdown {
  position: absolute; left: 0; right: 0; top: 100%; z-index: 300;
  background: var(--surface); border: 1.5px solid var(--accent); border-radius: 7px;
  box-shadow: 0 4px 18px rgba(0,0,0,.12); overflow: hidden; margin-top: 3px;
}
.org-city-option {
  padding: 7px 12px; cursor: pointer; font-size: .76rem;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: baseline; gap: 7px;
}
.org-city-option:last-child { border-bottom: none; }
.org-city-option:hover { background: #f0faf8; }
.org-city-option strong { color: var(--text); font-weight: 700; }
.org-city-option span { color: var(--muted); font-size: .66rem; }

.danger-zone {
  margin-top: 20px;
  border: 1px solid rgba(234,78,73,.3);
  border-radius: 8px;
  overflow: hidden;
}
.danger-zone-label {
  background: rgba(234,78,73,.07);
  padding: 6px 14px;
  font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  color: var(--danger);
}
.danger-zone-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
}
.danger-zone-desc {
  flex: 1; display: flex; flex-direction: column; gap: 3px;
}
.danger-zone-desc strong { font-size: .78rem; color: var(--text); }
.danger-zone-desc span   { font-size: .7rem;  color: var(--muted); }
.btn-danger {
  flex-shrink: 0;
  padding: 6px 14px; border-radius: 6px; border: none; cursor: pointer;
  font-size: .72rem; font-weight: 700; font-family: inherit;
  background: rgba(234,78,73,.1); color: var(--danger);
  transition: background .12s;
}
.btn-danger:hover:not(:disabled) { background: var(--danger); color: #fff; }
.btn-danger:disabled { opacity: .45; cursor: not-allowed; }
</style>
