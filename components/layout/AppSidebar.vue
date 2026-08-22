<template>
  <aside class="sidebar">
    <!-- Brand -->
    <div class="sb-brand">
      <div class="ub-logo">
        <img src="/images/white-unabase.png" class="ub-logo-img" alt="unabase" />
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

      <!-- User row -->
      <div v-if="authStore.isLoggedIn" class="sb-user-row">
        <div class="sb-user-avatar">
          <img v-if="userAvatar" :src="userAvatar" :alt="userName" />
          <span v-else class="sb-user-initials">{{ userInitials }}</span>
        </div>
        <div class="sb-user-info">
          <div class="sb-user-name">{{ userName }}</div>
          <div class="sb-user-email">{{ authStore.user?.email }}</div>
        </div>
      </div>

      <!-- Org row / switcher -->
      <OrgSwitcher />
    </div>

    <!-- Lanzador de apps (§8.1): las tres siempre visibles, las cerradas con candado.
         Mismo lugar que en el front de Relations, justo debajo del OrgSwitcher. -->
    <AppSwitcher />

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
        @save-template="saveAsTemplate(proj.id)"
      />
    </div>

    <!-- Bottom actions -->
    <button class="sb-new-btn" @click="openNewProject">{{ globalStore.lang === 'en' ? '+ Calendar' : '+ Calendario' }}</button>
    <button class="sb-tmpl-btn" @click="globalStore.openContacts()">{{ globalStore.lang === 'en' ? 'Contacts' : 'Contactos' }}</button>
    <button
      class="sb-tmpl-btn"
      :class="{ 'sb-tmpl-btn-active': globalStore.currentView === 'tmpl' }"
      @click="globalStore.setView('tmpl')"
    >Templates</button>

    <!-- Ayuda. Esto faltaba: HelpModal existía, se montaba con globalStore.helpOpen y
         NADA llamaba a openHelp() — así que era inalcanzable. Y no es un extra: es el
         único lugar donde se puede volver a mostrar la guía de funciones, justamente lo
         que la guía promete al ocultarla ("está en el menú de ayuda"). -->
    <button class="sb-suggest-btn" @click="globalStore.openHelp()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.2-3 4"/><line x1="12" y1="17.5" x2="12" y2="17.5"/></svg>
      {{ globalStore.lang === 'en' ? 'Help' : 'Ayuda' }}
    </button>

    <!-- Modo claro / oscuro — mismo botón, mismo texto y mismo lugar que en el
         pie del sidebar de Relations y Leads. El texto dice A DÓNDE lleva el
         clic, no dónde estamos. La elección se comparte entre las tres apps. -->
    <button class="sb-suggest-btn" @click="globalStore.toggleTheme()">
      <svg v-if="globalStore.theme === 'light'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      {{ globalStore.theme === 'light'
          ? (globalStore.lang === 'en' ? 'Dark mode' : 'Modo oscuro')
          : (globalStore.lang === 'en' ? 'Light mode' : 'Modo claro') }}
    </button>

    <!-- Sugerir una idea — mismo flujo que en Relations -->
    <button class="sb-suggest-btn" @click="globalStore.openSuggest()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>
      {{ globalStore.lang === 'en' ? 'Suggest an idea' : 'Sugerir una idea' }}
    </button>

    <button class="sb-logout-btn" @click="logout">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      {{ globalStore.lang === 'en' ? 'Sign out' : 'Cerrar sesión' }}
    </button>

    <!-- App version + last update — opens the what's-new history -->
    <button class="sb-version-btn" @click="globalStore.openWhatsNew()">
      {{ APP_VERSION_SHORT }} · {{ globalStore.lang === 'en' ? 'updated' : 'actualizado' }} {{ formatVersionDate(globalStore.lang) }}
    </button>

  </aside>
</template>

<script setup>
import { APP_VERSION_SHORT, formatVersionDate } from '~/utils/changelog'

const globalStore   = useGlobalStore()
const projectsStore = useProjectsStore()
const authStore     = useAuthStore()

// ── User computed ─────────────────────────────────────────────────────────────
const userName = computed(() => {
  const u = authStore.user
  if (!u) return ''
  const first = u.data?.name?.first || ''
  const last  = u.data?.name?.last  || ''
  return `${first} ${last}`.trim() || u.email || ''
})

const userInitials = computed(() => {
  const u = authStore.user
  if (!u) return '?'
  const first = u.data?.name?.first?.[0] || ''
  const last  = u.data?.name?.last?.[0]  || ''
  return (first + last).toUpperCase() || (u.email?.[0] || '?').toUpperCase()
})

const userAvatar = computed(() => authStore.user?.imgUrl || null)

function logout() {
  authStore.logout()
}

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

async function deleteProject(id) {
  const lang = globalStore.lang
  const ok = await useDialog().confirm({
    title:        lang === 'en' ? 'Delete calendar?'    : '¿Eliminar calendario?',
    body:         lang === 'en'
      ? 'Are you sure you want to delete this calendar? Once deleted, it cannot be recovered.'
      : '¿Estás seguro de que quieres eliminar este calendario? Una vez eliminado, no podrás recuperarlo.',
    confirmLabel: lang === 'en' ? 'Delete'  : 'Eliminar',
    cancelLabel:  lang === 'en' ? 'Cancel'  : 'Cancelar',
  })
  if (ok) projectsStore.deleteProject(id)
}

function toggleVisible(id) {
  projectsStore.toggleVisible(id)
}

function cycleStatus(id) {
  projectsStore.cycleStatus(id)
}

async function saveAsTemplate(id) {
  const lang = globalStore.lang
  const proj = projectsStore.projects.find(p => p.id === id)
  const name = await useDialog().prompt({
    title:        lang === 'en' ? 'Save this calendar as a template' : 'Guardar este calendario como template',
    label:        lang === 'en' ? 'Template name'                    : 'Nombre del template',
    placeholder:  lang === 'en' ? 'Enter template name'             : 'Escribe el nombre del template',
    defaultValue: proj?.name || proj?.client || 'Template',
    confirmLabel: 'OK',
    cancelLabel:  lang === 'en' ? 'Cancel' : 'Cancelar',
  })
  if (name === null) return
  projectsStore.saveAsTemplate(id, name)
  useNuxtApp().$toast?.(lang === 'en' ? 'Template saved' : 'Template guardado', { type: 'success' })
}
</script>

<style scoped>
.sidebar {
  background: var(--sb-bg, var(--surface));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--wash-2);
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
  color: var(--muted); cursor: pointer; display: flex;
  align-items: center; justify-content: center; transition: background .15s, color .15s;
}
.sb-collapse-btn:hover { background: var(--wash-2); color: var(--text); }
.ub-logo-img { height: 22px; width: auto; flex-shrink: 0; }

/* User row */
.sb-user-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 2px 8px;
}
.sb-user-avatar {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  overflow: hidden; background: var(--green-soft);
  display: flex; align-items: center; justify-content: center;
}
.sb-user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.sb-user-initials {
  font-size: .65rem; font-weight: 700; color: var(--accent);
}
.sb-user-info { flex: 1; min-width: 0; }
.sb-user-name {
  font-size: .74rem; font-weight: 600; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sb-user-email {
  font-size: .62rem; color: var(--muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}


.sb-filter-row {
  display: flex; align-items: center; justify-content: space-between; padding: 6px 12px 2px;
}
.sb-filters { display: flex; gap: 4px; flex: 1; }
.sb-filter-btn {
  flex: 1; padding: 5px 4px; border: none; border-radius: 6px; font-size: .65rem;
  font-weight: 700; text-transform: uppercase; letter-spacing: .4px; cursor: pointer;
  transition: all .15s; background: var(--wash-1); color: var(--muted);
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.sb-filter-btn.active { background: var(--accent); color: var(--navy); }
.sb-count {
  display: inline-flex; align-items: center; justify-content: center;
  font-size: .58rem; font-weight: 700;
  background: var(--wash-2); border-radius: 10px;
  padding: 0 5px; min-height: 14px;
}
.sb-filter-btn.active .sb-count {
  background: var(--surface);
}

.sb-search-wrap { padding: 8px 12px; flex-shrink: 0; }
.sb-search {
  width: 100%; padding: 6px 10px; background: var(--wash-2);
  border: 1px solid var(--wash-2); border-radius: 7px; color: var(--text); font-size: .75rem;
  font-family: inherit; outline: none;
}
.sb-search::placeholder { color: var(--muted); }
.sb-search:focus { border-color: var(--accent); }

.sb-proj-list {
  flex: 1; overflow-y: auto; padding: 4px 8px 8px;
}
.sb-empty {
  text-align: center; padding: 24px 14px; color: var(--dim); font-size: .74rem;
}
.sb-empty-title {
  font-size: .75rem; font-weight: 700; color: var(--muted);
  margin-bottom: 8px; line-height: 1.4;
}
.sb-empty-sub {
  font-size: .68rem; color: var(--dim); line-height: 1.55;
}

.sb-new-btn {
  margin: 8px 12px 4px; padding: 8px; background: var(--green-soft);
  border: 1.5px dashed var(--accent-line); border-radius: 8px; color: var(--accent);
  font-size: .74rem; font-weight: 700; text-align: center; cursor: pointer;
  transition: all .15s; flex-shrink: 0;
}
.sb-new-btn:hover { background: var(--green-soft); border-color: var(--accent); }

.sb-tmpl-btn {
  margin: 0 12px 12px; padding: 7px 8px; background: transparent;
  border: 1.5px solid var(--wash-line); border-radius: 8px; color: var(--muted);
  font-size: .72rem; font-weight: 600; text-align: center; cursor: pointer;
  transition: all .15s; flex-shrink: 0;
}
.sb-tmpl-btn:hover { background: var(--wash-1); color: var(--text); }
.sb-tmpl-btn-active {
  background: var(--accent-soft) !important;
  color: var(--accent) !important;
  border-color: var(--accent-line) !important;
}

.sb-logout-btn {
  margin: 0 12px 10px;
  padding: 6px 8px;
  background: transparent;
  border: none;
  border-radius: 7px;
  color: var(--dim);
  font-size: .68rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  transition: color .15s, background .15s;
  flex-shrink: 0;
}
.sb-logout-btn:hover { color: var(--text-2); background: var(--wash-1); }

.sb-suggest-btn {
  margin: 0 12px 10px; padding: 9px 11px; border-radius: 10px; cursor: pointer; font-family: inherit;
  display: flex; align-items: center; gap: 10px; text-align: left;
  background: var(--wash-1); border: 1px solid var(--wash-2);
  color: var(--text-2); font-size: .78rem; font-weight: 600; flex-shrink: 0;
  transition: background .15s, color .15s, border-color .15s;
}
.sb-suggest-btn svg { color: var(--accent); flex-shrink: 0; }
.sb-suggest-btn:hover { background: var(--accent-soft); color: var(--text); border-color: var(--accent); }

.sb-version-btn {
  margin: 0 12px 12px; padding: 0; background: none; border: none; cursor: pointer;
  font-family: inherit; font-size: .64rem; font-weight: 600; text-align: center;
  color: var(--dim); flex-shrink: 0; transition: color .15s;
}
.sb-version-btn:hover { color: var(--text-2); }
</style>
