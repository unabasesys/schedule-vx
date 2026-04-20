<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal wide">
      <h2>{{ L.companyTitle }}</h2>

      <div class="modal-grid" style="margin-bottom:14px;">
        <div class="field">
          <label>{{ L.companyName }}</label>
          <input type="text" v-model="form.name" />
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

      <!-- Week start -->
      <div class="settings-row">
        <span class="settings-label">{{ L.weekStartLabel }}</span>
        <select class="settings-select" v-model="localWeekStart" @change="globalStore.setWeekStart(localWeekStart)">
          <option value="sun">{{ L.weekSun }}</option>
          <option value="mon">{{ L.weekMon }}</option>
        </select>
      </div>

      <!-- Temp unit -->
      <div class="settings-row" style="margin-top:8px;">
        <span class="settings-label">{{ L.tempUnitLabel }}</span>
        <select class="settings-select" v-model="localTempUnit" @change="globalStore.setTempUnit(localTempUnit)">
          <option value="C">Celsius (°C)</option>
          <option value="F">Fahrenheit (°F)</option>
        </select>
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

      <!-- Users -->
      <div style="margin-top:16px;">
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
          />
          <button class="btn-primary" @click="inviteUser" style="padding:7px 14px;font-size:.75rem;">{{ L.inviteBtn }}</button>
        </div>
        <div class="users-list">
          <div v-for="user in settingsStore.users" :key="user.id" class="user-row">
            <span class="user-email">{{ user.email }}</span>
            <span class="user-status" :class="user.status">{{ statusLabel(user.status) }}</span>
            <button class="btn-ghost" style="padding:3px 8px;font-size:.65rem;" @click="removeUser(user.id)">✕</button>
          </div>
          <div v-if="!settingsStore.users.length" style="font-size:.75rem;color:var(--muted);">
            {{ lang === 'en' ? 'No users invited yet' : 'No hay usuarios invitados' }}
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-ghost" @click="$emit('close')">{{ L.btnCancel }}</button>
        <button class="btn-primary" @click="save">{{ lang === 'en' ? 'Save' : 'Guardar' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const settingsStore = useSettingsStore()
const globalStore   = useGlobalStore()
const projectsStore = useProjectsStore()

const emit = defineEmits(['close'])

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
  name:    settingsStore.company.name    || '',
  website: settingsStore.company.website || '',
  logo:    settingsStore.logo            || '',
})

const localWeekStart  = ref(globalStore.weekStart)
const localTempUnit   = ref(globalStore.tempUnit)
const localDateFormat = ref(globalStore.dateFormat || 'DD/MM/AA')
const inviteEmail     = ref('')

function statusLabel(s) {
  const map = {
    invited:     { es: 'Invitado',    en: 'Invited' },
    active:      { es: 'Activo',      en: 'Active' },
    deactivated: { es: 'Desactivado', en: 'Deactivated' },
  }
  return map[s]?.[lang.value] || s
}

function handleLogoUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => { form.logo = e.target.result }
  reader.readAsDataURL(file)
}

function removeLogo() {
  form.logo = ''
}

function inviteUser() {
  if (!inviteEmail.value.trim()) return
  settingsStore.inviteUser(inviteEmail.value.trim())
  inviteEmail.value = ''
}

function removeUser(id) {
  settingsStore.removeUser(id)
}

function save() {
  settingsStore.setCompany({ name: form.name, website: form.website })
  settingsStore.setStudioName(form.name)
  settingsStore.saveLogo(form.logo)
  globalStore.setWeekStart(localWeekStart.value)
  globalStore.setTempUnit(localTempUnit.value)
  globalStore.setDateFormat(localDateFormat.value)
  projectsStore.save()
  emit('close')
}

// ── Keyboard: Enter = save, Esc = close ────────────────────────────────────────
function onKeydown(e) {
  if (e.key === 'Escape') { emit('close') }
  if (e.key === 'Enter' && e.target.tagName !== 'INPUT') { save() }
}
onMounted(()   => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
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
.user-status.invited     { background: rgba(245,158,11,.12); color: var(--warning); }
.user-status.active      { background: rgba(34,197,94,.12);  color: var(--success); }
.user-status.deactivated { background: rgba(107,143,160,.1); color: var(--muted); }

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
.date-fmt-toggle button.active { background: var(--navy); color: #fff; }
</style>
