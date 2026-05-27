<template>
  <div class="org-switcher" ref="root">

    <!-- No org: CTA to create one -->
    <div v-if="!authStore.organization" class="no-org-cta" @click="openCreate">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>{{ lang === 'en' ? 'Create an organization here' : 'Crea una organización aquí' }}</span>
    </div>

    <!-- Org row (only when org exists) -->
    <div
      v-else
      class="studio-row is-clickable"
      @click="toggleOpen()"
    >
      <div class="studio-logo-wrap">
        <img v-if="orgLogo" :src="orgLogo" alt="org logo" />
        <span v-else class="studio-logo-ph">🎬</span>
      </div>
      <div class="studio-info">
        <div class="studio-name-d">{{ orgName }}</div>
      </div>
      <!-- Chevron -->
      <svg
        class="org-chevron"
        :class="{ open: isOpen }"
        width="11" height="11" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9"/>
      </svg>
      <!-- Settings gear -->
      <button
        class="sb-org-settings-btn"
        :title="lang === 'en' ? 'Organization settings' : 'Configuración de organización'"
        @click.stop="globalStore.openSettings()"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </div>

    <!-- Dropdown -->
    <Transition name="org-drop">
      <div v-if="isOpen" class="org-dropdown">
        <button
          v-for="org in authStore.organizations"
          :key="org._id"
          class="org-option"
          :class="{ current: org.isCurrent }"
          :disabled="org.isCurrent || switching"
          @click="select(org._id)"
        >
          <div class="org-opt-logo">
            <img v-if="org.imgUrl" :src="org.imgUrl" alt="" />
            <span v-else class="org-opt-ph">🎬</span>
          </div>
          <span class="org-opt-name">{{ org.name }}</span>
          <svg v-if="org.isCurrent" class="org-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span v-else-if="switching && switchingId === org._id" class="org-loading">...</span>
        </button>

        <div class="org-drop-divider"></div>

        <button class="org-create-btn" @click="openCreate">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {{ lang === 'en' ? 'New organization' : 'Nueva organización' }}
        </button>
      </div>
    </Transition>

    <!-- Create org modal -->
    <SettingsModal v-if="showCreate" :creation-mode="true" @close="showCreate = false" @created="onCreated" />
  </div>
</template>

<script setup>
const authStore    = useAuthStore()
const globalStore  = useGlobalStore()
const settingsStore = useSettingsStore()
const { $toast }   = useNuxtApp()

const lang = computed(() => globalStore.lang || 'es')

const isOpen     = ref(false)
const switching  = ref(false)
const switchingId = ref(null)
const showCreate = ref(false)
const root       = ref(null)

const hasMultiple = computed(() => authStore.organizations.length > 1)

const orgName = computed(() =>
  settingsStore.studioName || authStore.organization?.name || (lang.value === 'en' ? 'My Studio' : 'Mi Productora')
)
const orgLogo = computed(() =>
  authStore.organization?.imgUrl || settingsStore.logo || null
)

function toggleOpen() {
  isOpen.value = !isOpen.value
  if (isOpen.value) authStore.fetchMyOrgs()
}

function close() {
  isOpen.value = false
}

async function select(orgId) {
  if (switching.value) return
  const org = authStore.organizations.find(o => o._id === orgId)
  if (org?.isCurrent) { close(); return }

  switching.value  = true
  switchingId.value = orgId
  const ok = await authStore.switchOrg(orgId)
  switching.value  = false
  switchingId.value = null
  if (!ok) {
    $toast(lang.value === 'en' ? 'Could not switch organization' : 'No se pudo cambiar la organización', { type: 'error' })
    return
  }
  close()
}

function openCreate() {
  close()
  showCreate.value = true
}

function onCreated() {
  showCreate.value = false
}

// Close dropdown on outside click
onMounted(() => {
  document.addEventListener('click', onOutsideClick)
})
onUnmounted(() => {
  document.removeEventListener('click', onOutsideClick)
})
function onOutsideClick(e) {
  if (root.value && !root.value.contains(e.target)) close()
}
</script>

<style scoped>
.org-switcher { position: relative; }

.no-org-cta {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 10px; border-radius: 8px; cursor: pointer;
  border: 1.5px dashed rgba(255,255,255,.2);
  color: rgba(255,255,255,.45); font-size: .75rem; font-weight: 600;
  transition: border-color .15s, color .15s;
}
.no-org-cta:hover { border-color: var(--accent); color: var(--accent); }

.studio-row {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,.06);
  border-radius: 8px; padding: 7px 9px;
  transition: background .15s;
}
.studio-row.is-clickable { cursor: pointer; }
.studio-row.is-clickable:hover { background: rgba(255,255,255,.1); }

.studio-logo-wrap {
  width: 32px; height: 32px; border-radius: 6px; overflow: hidden; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.1);
}
.studio-logo-wrap img { width: 100%; height: 100%; object-fit: cover; }
.studio-logo-ph { font-size: 1rem; }
.studio-info { flex: 1; min-width: 0; }
.studio-name-d {
  font-size: .78rem; font-weight: 700; color: #fff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.org-chevron {
  flex-shrink: 0; color: rgba(255,255,255,.35);
  transition: transform .2s;
}
.org-chevron.open { transform: rotate(180deg); }

.sb-org-settings-btn {
  flex-shrink: 0; background: none; border: none; padding: 4px 5px; border-radius: 5px;
  color: rgba(255,255,255,.35); cursor: pointer; display: flex;
  align-items: center; justify-content: center; transition: background .15s, color .15s;
}
.sb-org-settings-btn:hover { background: rgba(255,255,255,.1); color: rgba(255,255,255,.8); }

/* Dropdown */
.org-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  background: #1a2230;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
  padding: 4px;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0,0,0,.4);
}

.org-option {
  width: 100%; display: flex; align-items: center; gap: 8px;
  padding: 7px 8px; border: none; background: none; border-radius: 7px;
  color: rgba(255,255,255,.7); font-size: .76rem; font-weight: 500;
  cursor: pointer; text-align: left; transition: background .12s;
}
.org-option:hover:not(:disabled) { background: rgba(255,255,255,.08); color: #fff; }
.org-option.current { color: #fff; cursor: default; }
.org-option:disabled { opacity: .7; }

.org-opt-logo {
  width: 22px; height: 22px; border-radius: 4px; overflow: hidden; flex-shrink: 0;
  background: rgba(255,255,255,.1); display: flex; align-items: center; justify-content: center;
}
.org-opt-logo img { width: 100%; height: 100%; object-fit: cover; }
.org-opt-ph { font-size: .7rem; }
.org-opt-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.org-check { flex-shrink: 0; color: var(--accent); }
.org-loading { flex-shrink: 0; font-size: .7rem; color: rgba(255,255,255,.4); }

.org-drop-divider { height: 1px; background: rgba(255,255,255,.08); margin: 4px 0; }

.org-create-btn {
  width: 100%; display: flex; align-items: center; gap: 6px;
  padding: 7px 8px; border: none; background: none; border-radius: 7px;
  color: rgba(255,255,255,.4); font-size: .73rem; font-weight: 600;
  cursor: pointer; transition: background .12s, color .12s;
}
.org-create-btn:hover { background: rgba(255,255,255,.06); color: rgba(255,255,255,.7); }

/* Transition */
.org-drop-enter-active,
.org-drop-leave-active { transition: opacity .15s, transform .15s; }
.org-drop-enter-from,
.org-drop-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
