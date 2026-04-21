<template>
  <aside class="sidebar">
    <!-- Brand / Studio -->
    <div class="sb-brand">
      <div class="ub-logo">
        <svg class="ub-logo-icon" viewBox="0 0 30 28" fill="none">
          <!-- teal dot -->
          <circle cx="4" cy="5" r="3.8" fill="#00C9A7"/>
          <!-- checkmark: left arm shorter, right arm longer & higher -->
          <path d="M2 15 L10 25 L28 5" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
        <span class="ub-logo-text">unabase</span>
        <button
          class="sb-collapse-btn"
          :title="globalStore.lang === 'en' ? 'Collapse sidebar' : 'Colapsar menú'"
          @click="globalStore.toggleSidebar()"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>
      <div class="studio-row">
        <div class="studio-logo-wrap">
          <img v-if="settingsStore.logo" :src="settingsStore.logo" alt="studio logo" />
          <span v-else class="studio-logo-ph">🎬</span>
        </div>
        <div class="studio-info">
          <div class="studio-name-d">{{ settingsStore.studioName }}</div>
        </div>
        <button
          class="sb-org-settings-btn"
          :title="globalStore.lang === 'en' ? 'Organization settings' : 'Configuración de organización'"
          @click="globalStore.openSettings()"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="sb-filter-row">
      <div class="sb-filters">
        <button
          class="sb-filter-btn"
          :class="{ active: globalStore.sidebarFilter === 'active' }"
          @click="globalStore.setSidebarFilter('active')"
        ><span>{{ globalStore.lang === 'en' ? 'Active' : 'Activos' }}</span><span class="sb-count">{{ activeCount }}</span></button>
        <button
          class="sb-filter-btn"
          :class="{ active: globalStore.sidebarFilter === 'archived' }"
          @click="globalStore.setSidebarFilter('archived')"
        ><span>{{ globalStore.lang === 'en' ? 'Archived' : 'Archivados' }}</span><span class="sb-count">{{ archivedCount }}</span></button>
      </div>
    </div>

    <!-- Search -->
    <div class="sb-search-wrap">
      <input
        type="text"
        class="sb-search"
        v-model="globalStore.sidebarSearch"
        :placeholder="globalStore.lang === 'en' ? 'Search calendar…' : 'Buscar calendario…'"
      />
    </div>

    <!-- Project list -->
    <div class="sb-proj-list">
      <div v-if="!filteredProjects.length" class="sb-empty">
        <template v-if="globalStore.sidebarFilter === 'archived'">
          <div class="sb-empty-title">
            {{ globalStore.lang === 'en' ? 'You haven\'t archived any calendars yet.' : 'Aún no has archivado ningún calendario.' }}
          </div>
          <div class="sb-empty-sub">
            {{ globalStore.lang === 'en'
              ? 'When a project is finished, don\'t delete its calendar: archive it so you can review it later or duplicate it and reuse its structure for a new one.'
              : 'Cuando termines un proyecto, no borres su calendario: archívalo para poder consultarlo más adelante o hacer una copia y reutilizar su estructura en uno nuevo.' }}
          </div>
          <div class="sb-empty-sub" style="margin-top:8px;">
            {{ globalStore.lang === 'en'
              ? 'If a calendar no longer adds value, it is better to delete it and keep your data clean. Save only what is truly worth keeping.'
              : 'Los calendarios que ya no aporten valor, es mejor borrarlos para mantener tu data limpia. Guarda solo lo que realmente vale la pena.' }}
          </div>
        </template>
        <template v-else-if="globalStore.sidebarSearch">
          {{ globalStore.lang === 'en' ? 'No results' : 'Sin resultados' }}
        </template>
        <template v-else>
          <div class="sb-empty-title">
            {{ globalStore.lang === 'en' ? 'You don\'t have any calendars yet.' : 'Aún no tienes ningún calendario creado.' }}
          </div>
          <div class="sb-empty-sub">
            {{ globalStore.lang === 'en' ? 'Click + Calendar to create your first one. Once you try it, you won\'t want to stop.' : 'Haz click en + Calendario para crear el primero. Después de probarlo, no vas a querer parar.' }}
          </div>
        </template>
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
    <button class="sb-new-btn" @click="openNewProject">{{ globalStore.lang === 'en' ? '+ Calendar' : '+ Calendario' }}</button>
    <button
      class="sb-tmpl-btn"
      :class="{ 'sb-tmpl-btn-active': globalStore.currentView === 'tmpl' }"
      @click="globalStore.setView('tmpl')"
    >Templates</button>

  </aside>
</template>

<script setup>
const globalStore   = useGlobalStore()
const projectsStore = useProjectsStore()
const settingsStore = useSettingsStore()

const filteredProjects = computed(() =>
  projectsStore.filteredProjects(globalStore.sidebarFilter, globalStore.sidebarSearch)
)

const activeCount = computed(() =>
  projectsStore.projects.filter(p => p.status !== 'archived').length
)

const archivedCount = computed(() =>
  projectsStore.projects.filter(p => p.status === 'archived').length
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
  const proj = projectsStore.projects.find(p => p.id === id)
  const isRestoring = proj?.status === 'archived'
  projectsStore.archiveProject(id)
  // When restoring, switch sidebar to Activos so the calendar is visible
  if (isRestoring) {
    globalStore.setSidebarFilter('active')
  }
}

function deleteProject(id) {
  const msg = globalStore.lang === 'en'
    ? 'Are you sure you want to delete this calendar? Once deleted, it cannot be recovered.'
    : '¿Estás seguro de que quieres eliminar este calendario? Una vez eliminado, no podrás recuperarlo.'
  if (confirm(msg)) {
    projectsStore.deleteProject(id)
  }
}

function toggleVisible(id) {
  projectsStore.toggleVisible(id)
}

function cycleStatus(id) {
  projectsStore.cycleStatus(id)
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
.sb-collapse-btn {
  margin-left: auto; flex-shrink: 0;
  background: none; border: none; padding: 4px 5px; border-radius: 5px;
  color: rgba(255,255,255,.35); cursor: pointer; display: flex;
  align-items: center; justify-content: center; transition: background .15s, color .15s;
}
.sb-collapse-btn:hover { background: rgba(255,255,255,.1); color: rgba(255,255,255,.8); }
.ub-logo-icon { width: 30px; height: 30px; flex-shrink: 0; }
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
  background: rgba(255,255,255,.1);
}
.studio-logo-wrap img { width: 100%; height: 100%; object-fit: cover; }
.studio-logo-ph { font-size: 1rem; }
.studio-info { flex: 1; min-width: 0; }
.studio-name-d {
  font-size: .78rem; font-weight: 700; color: #fff; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.sb-org-settings-btn {
  flex-shrink: 0; background: none; border: none; padding: 4px 5px; border-radius: 5px;
  color: rgba(255,255,255,.35); cursor: pointer; display: flex;
  align-items: center; justify-content: center; transition: background .15s, color .15s;
}
.sb-org-settings-btn:hover { background: rgba(255,255,255,.1); color: rgba(255,255,255,.8); }

.sb-filter-row {
  display: flex; align-items: center; justify-content: space-between; padding: 6px 12px 2px;
}
.sb-filters { display: flex; gap: 4px; flex: 1; }
.sb-filter-btn {
  flex: 1; padding: 5px 4px; border: none; border-radius: 6px; font-size: .65rem;
  font-weight: 700; text-transform: uppercase; letter-spacing: .4px; cursor: pointer;
  transition: all .15s; background: rgba(255,255,255,.06); color: rgba(255,255,255,.4);
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.sb-filter-btn.active { background: var(--accent); color: var(--navy); }
.sb-count {
  display: inline-flex; align-items: center; justify-content: center;
  font-size: .58rem; font-weight: 700;
  background: rgba(255,255,255,.12); border-radius: 10px;
  padding: 0 5px; min-height: 14px;
}
.sb-filter-btn.active .sb-count {
  background: rgba(0,44,62,.25);
}

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
  text-align: center; padding: 24px 14px; color: rgba(255,255,255,.25); font-size: .74rem;
}
.sb-empty-title {
  font-size: .75rem; font-weight: 700; color: rgba(255,255,255,.35);
  margin-bottom: 8px; line-height: 1.4;
}
.sb-empty-sub {
  font-size: .68rem; color: rgba(255,255,255,.2); line-height: 1.55;
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
