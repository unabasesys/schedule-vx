<template>
  <aside class="sidebar">
    <!-- Brand / Studio -->
    <div class="sb-brand">
      <div class="ub-logo">
        <svg class="ub-logo-icon" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="var(--accent)"/>
          <path d="M7 10h14M7 14h10M7 18h12" stroke="#002C3E" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="ub-logo-text">unabase</span>
      </div>
      <div class="studio-row">
        <div
          class="studio-logo-wrap"
          title="Change logo"
          @click="triggerLogoUpload"
        >
          <img v-if="settingsStore.logo" :src="settingsStore.logo" alt="studio logo" />
          <span v-else class="studio-logo-ph">🎬</span>
        </div>
        <div class="studio-info">
          <div
            v-if="!editingName"
            class="studio-name-d"
            @click="startEditName"
          >{{ settingsStore.studioName }}</div>
          <input
            v-else
            ref="nameInput"
            class="studio-name-i"
            type="text"
            :value="settingsStore.studioName"
            @blur="commitName"
            @keydown.enter="commitName"
            @keydown.escape="editingName = false"
          />
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="sb-filter-row">
      <div class="sb-filters">
        <button
          class="sb-filter-btn"
          :class="{ active: globalStore.sidebarFilter === 'active' }"
          @click="globalStore.setSidebarFilter('active')"
        >{{ t('filterActive') }}</button>
        <button
          class="sb-filter-btn"
          :class="{ active: globalStore.sidebarFilter === 'archived' }"
          @click="globalStore.setSidebarFilter('archived')"
        >{{ t('filterArchived') }}</button>
      </div>
    </div>

    <!-- Search -->
    <div class="sb-search-wrap">
      <input
        type="text"
        class="sb-search"
        v-model="globalStore.sidebarSearch"
        :placeholder="t('searchPlaceholder')"
      />
    </div>

    <!-- Project list -->
    <div class="sb-proj-list">
      <div v-if="!filteredProjects.length" class="sb-empty">
        {{ globalStore.sidebarFilter === 'archived' ? t('sbEmptyArch') : globalStore.sidebarSearch ? t('sbNoResults') : t('sbEmpty') }}
      </div>
      <ProjectItem
        v-for="proj in filteredProjects"
        :key="proj.id"
        :project="proj"
        :selected="proj.id === projectsStore.selectedId"
        :lang="globalStore.lang"
        @select="selectProject(proj.id)"
        @edit="openEdit(proj.id)"
        @copy="openCopy(proj.id)"
        @archive="archiveProject(proj.id)"
        @delete="deleteProject(proj.id)"
        @toggle-visible="toggleVisible(proj.id)"
        @cycle-status="cycleStatus(proj.id)"
      />
    </div>

    <!-- Bottom actions -->
    <button class="sb-new-btn" @click="openNewProject">{{ t('newCalendar') }}</button>
    <button
      class="sb-tmpl-btn"
      :class="{ 'sb-tmpl-btn-active': globalStore.currentView === 'tmpl' }"
      @click="globalStore.setView('tmpl')"
    >{{ t('tabTemplates') }}</button>

    <!-- Hidden logo input -->
    <input
      ref="logoInput"
      type="file"
      accept="image/*"
      style="display:none"
      @change="uploadLogo"
    />
  </aside>
</template>

<script setup>
const { t } = useI18n()
const globalStore   = useGlobalStore()
const projectsStore = useProjectsStore()
const settingsStore = useSettingsStore()

const editingName = ref(false)
const nameInput   = ref(null)
const logoInput   = ref(null)

const filteredProjects = computed(() =>
  projectsStore.filteredProjects(globalStore.sidebarFilter, globalStore.sidebarSearch)
)

function selectProject(id) {
  projectsStore.selectProject(id)
}

function openNewProject() {
  globalStore.openProjectModal(null)
}

function openEdit(id) {
  globalStore.openProjectModal(id)
}

function openCopy(id) {
  globalStore.openCopyModal(id)
}

function archiveProject(id) {
  projectsStore.archiveProject(id)
}

function deleteProject(id) {
  if (confirm(t('confirmDeleteProject'))) {
    projectsStore.deleteProject(id)
  }
}

function toggleVisible(id) {
  projectsStore.toggleVisible(id)
}

function cycleStatus(id) {
  projectsStore.cycleStatus(id)
}

function startEditName() {
  editingName.value = true
  nextTick(() => nameInput.value?.focus())
}

function commitName(e) {
  const val = (e.target.value || '').trim()
  if (val) settingsStore.setStudioName(val)
  editingName.value = false
  projectsStore.save()
}

function triggerLogoUpload() {
  logoInput.value?.click()
}

function uploadLogo(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    settingsStore.saveLogo(ev.target.result)
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped>
.sidebar {
  background: var(--sb-bg, #002C3E);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid rgba(255,255,255,.04);
}

.sb-brand {
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--sb-border);
  flex-shrink: 0;
}

.ub-logo {
  display: flex; align-items: center; gap: 7px; margin-bottom: 10px;
}
.ub-logo-icon { width: 28px; height: 28px; flex-shrink: 0; }
.ub-logo-text {
  font-size: 1.15rem; font-weight: 700; color: #fff; letter-spacing: -.5px;
  line-height: 1; font-family: 'Syne', sans-serif;
}

.studio-row {
  display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,.06);
  border-radius: 8px; padding: 7px 9px;
}
.studio-logo-wrap {
  width: 32px; height: 32px; border-radius: 6px; overflow: hidden; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.1); cursor: pointer;
}
.studio-logo-wrap:hover { background: rgba(255,255,255,.18); }
.studio-logo-wrap img { width: 100%; height: 100%; object-fit: cover; }
.studio-logo-ph { font-size: 1rem; }
.studio-info { flex: 1; min-width: 0; }
.studio-name-d {
  font-size: .78rem; font-weight: 700; color: #fff; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; cursor: pointer;
}
.studio-name-d:hover { color: var(--accent); }
.studio-name-i {
  background: rgba(255,255,255,.1); border: 1.5px solid var(--accent); border-radius: 4px;
  color: #fff; font-size: .78rem; font-weight: 700; padding: 2px 6px; width: 100%;
  font-family: inherit; outline: none;
}

.sb-filter-row {
  display: flex; align-items: center; justify-content: space-between; padding: 6px 12px 2px;
}
.sb-filters { display: flex; gap: 4px; flex: 1; }
.sb-filter-btn {
  flex: 1; padding: 5px 4px; border: none; border-radius: 6px; font-size: .65rem;
  font-weight: 700; text-transform: uppercase; letter-spacing: .4px; cursor: pointer;
  transition: all .15s; background: rgba(255,255,255,.06); color: rgba(255,255,255,.4);
}
.sb-filter-btn.active { background: var(--accent); color: var(--navy); }

.sb-search-wrap { padding: 8px 12px; flex-shrink: 0; }
.sb-search {
  width: 100%; padding: 6px 10px; background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.1); border-radius: 7px; color: #fff; font-size: .75rem;
  font-family: inherit; outline: none;
}
.sb-search::placeholder { color: rgba(255,255,255,.3); }
.sb-search:focus { border-color: var(--accent); }

.sb-proj-list {
  flex: 1; overflow-y: auto; padding: 4px 8px 8px;
}
.sb-empty {
  text-align: center; padding: 20px 10px; color: rgba(255,255,255,.25); font-size: .74rem;
}

.sb-new-btn {
  margin: 8px 12px 4px; padding: 8px; background: rgba(6,204,180,.15);
  border: 1.5px dashed rgba(6,204,180,.35); border-radius: 8px; color: var(--accent);
  font-size: .74rem; font-weight: 700; text-align: center; cursor: pointer;
  transition: all .15s; flex-shrink: 0;
}
.sb-new-btn:hover { background: rgba(6,204,180,.25); border-color: var(--accent); }

.sb-tmpl-btn {
  margin: 0 12px 12px; padding: 7px 8px; background: transparent;
  border: 1.5px solid rgba(255,255,255,.15); border-radius: 8px; color: rgba(255,255,255,.4);
  font-size: .72rem; font-weight: 600; text-align: center; cursor: pointer;
  transition: all .15s; flex-shrink: 0;
}
.sb-tmpl-btn:hover { background: rgba(255,255,255,.06); color: #fff; }
.sb-tmpl-btn-active {
  background: rgba(6,204,180,.12) !important;
  color: var(--accent) !important;
  border-color: rgba(6,204,180,.5) !important;
}
</style>
