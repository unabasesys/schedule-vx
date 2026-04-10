<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal wide">
      <h2>{{ t('companyTitle') }}</h2>

      <div class="modal-grid" style="margin-bottom:14px;">
        <div class="field">
          <label>{{ t('companyName') }}</label>
          <input type="text" v-model="form.name" />
        </div>
        <div class="field">
          <label>{{ t('companyWeb') }}</label>
          <input type="text" v-model="form.website" placeholder="https://" />
        </div>
      </div>

      <!-- Week start -->
      <div class="settings-row">
        <span class="settings-label">{{ t('weekStartLabel') }}</span>
        <select class="settings-select" v-model="localWeekStart" @change="globalStore.setWeekStart(localWeekStart)">
          <option value="sun">{{ t('weekSun') }}</option>
          <option value="mon">{{ t('weekMon') }}</option>
        </select>
      </div>

      <!-- Temp unit -->
      <div class="settings-row" style="margin-top:8px;">
        <span class="settings-label">{{ t('tempUnitLabel') }}</span>
        <select class="settings-select" v-model="localTempUnit" @change="globalStore.setTempUnit(localTempUnit)">
          <option value="C">Celsius (°C)</option>
          <option value="F">Fahrenheit (°F)</option>
        </select>
      </div>

      <!-- Users -->
      <div style="margin-top:16px;">
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:8px;">{{ t('usersLabel') }}</div>
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
          <button class="btn-primary" @click="inviteUser" style="padding:7px 14px;font-size:.75rem;">{{ t('inviteBtn') }}</button>
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
        <button class="btn-ghost" @click="$emit('close')">{{ t('btnCancel') }}</button>
        <button class="btn-primary" @click="save">{{ lang === 'en' ? 'Save' : 'Guardar' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n()
const settingsStore = useSettingsStore()
const globalStore   = useGlobalStore()
const projectsStore = useProjectsStore()

const emit = defineEmits(['close'])

const lang = computed(() => globalStore.lang)

const form = reactive({
  name:    settingsStore.company.name    || '',
  website: settingsStore.company.website || '',
})

const localWeekStart = ref(globalStore.weekStart)
const localTempUnit  = ref(globalStore.tempUnit)
const inviteEmail    = ref('')

function statusLabel(s) {
  const map = {
    invited:     { es: 'Invitado',    en: 'Invited' },
    active:      { es: 'Activo',      en: 'Active' },
    deactivated: { es: 'Desactivado', en: 'Deactivated' },
  }
  return map[s]?.[lang.value] || s
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
  globalStore.setWeekStart(localWeekStart.value)
  globalStore.setTempUnit(localTempUnit.value)
  projectsStore.save()
  emit('close')
}
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
</style>
