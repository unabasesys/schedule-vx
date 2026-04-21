<template>
  <div class="schedule-page">
    <!-- Header (only when a project is selected) -->
    <div v-if="currentProject" class="main-hdr">
      <div class="hdr-proj-info">
        <div class="hdr-proj-name">
          {{ currentProject.name || currentProject.client }}
          <span
            v-if="currentProject.color"
            class="hdr-proj-dot"
            :style="{ background: currentProject.color }"
          ></span>
          <span v-if="isArchived" class="hdr-archived-badge">
            {{ globalStore.lang === 'en' ? 'Archived · Read only' : 'Archivado · Solo lectura' }}
          </span>
        </div>
        <div class="hdr-proj-meta">
          <span v-if="currentProject.client">{{ currentProject.client }}</span>
          <span v-if="currentProject.client && currentProject.agency" class="meta-sep">·</span>
          <span v-if="currentProject.agency">{{ currentProject.agency }}</span>
        </div>
      </div>

      <div class="hdr-center">
        <div class="view-tabs">
          <button
            class="view-tab"
            :class="{ active: globalStore.currentView === 'cal' }"
            @click="globalStore.setView('cal')"
          >{{ globalStore.lang === 'en' ? 'Calendar' : 'Calendario' }}</button>
          <button
            class="view-tab"
            :class="{ active: globalStore.currentView === 'list' }"
            @click="globalStore.setView('list')"
          >{{ globalStore.lang === 'en' ? 'Events' : 'Eventos' }}</button>
        </div>
      </div>

      <div class="hdr-actions">
        <ShareDropdown :project="currentProject" />
        <div class="hdr-sep"></div>
        <button
          class="lang-toggle-btn"
          :class="{ 'is-en': globalStore.lang === 'en' }"
          :title="globalStore.lang === 'en' ? 'Switch to Spanish' : 'Switch to English'"
          @click="setLang(globalStore.lang === 'en' ? 'es' : 'en')"
        >{{ globalStore.lang === 'en' ? 'US' : 'ES' }}</button>
      </div>
    </div>

    <!-- No project selected -->
    <div v-if="!currentProject && globalStore.currentView !== 'tmpl'" class="no-proj">
      <div class="no-proj-inner">

        <!-- Language selector -->
        <div class="no-proj-lang">
          <button
            class="no-proj-lang-opt"
            :class="{ active: globalStore.lang === 'es' }"
            @click="setLang('es')"
          >Español</button>
          <button
            class="no-proj-lang-opt"
            :class="{ active: globalStore.lang === 'en' }"
            @click="setLang('en')"
          >English</button>
        </div>

        <div class="no-proj-title">
          {{ globalStore.lang === 'en'
            ? 'The calendar the creative industry has been waiting for.'
            : 'El calendario que la industria creativa estaba esperando.' }}
        </div>
        <div class="no-proj-body">
          {{ globalStore.lang === 'en'
            ? 'Built for production companies, agencies, creative studios, post teams, and professionals who need to plan with speed, structure, and real production logic. Calendar by unabase combines the familiarity of tools you already know with a workflow that is far more useful for everyday production: stages, key dates, business or calendar days, holidays, weather, templates, versioning, and a clear structure to collaborate better with your team and share beautiful PDFs and live links with your clients.'
            : 'Diseñado para productoras, agencias, estudios creativos, equipos de post y profesionales que necesitan planificar con rapidez, orden y criterio real de producción. Calendar by unabase combina la familiaridad de herramientas que ya conoces con una lógica mucho más útil para el trabajo diario: stages, key dates, días hábiles o corridos, feriados, weather, templates, versionado y una estructura clara para colaborar mejor con tu equipo y compartir con tus clientes PDFs hermosos y links vivos.' }}
        </div>
        <div class="no-proj-tagline">
          {{ globalStore.lang === 'en'
            ? 'Less time building calendars from scratch. More consistency across projects. More clarity to share, present, and execute.'
            : 'Menos tiempo armando calendarios desde cero. Más consistencia entre proyectos. Más claridad para compartir, presentar y ejecutar.' }}
        </div>
        <a
          class="no-proj-cta"
          href="https://www.youtube.com/@unabase"
          target="_blank"
          rel="noopener"
        >
          <span class="no-proj-cta-play">▶</span>
          {{ globalStore.lang === 'en'
            ? 'Watch a short video and see how it works.'
            : 'Mira un video corto y descubre cómo funciona.' }}
        </a>
      </div>
    </div>

    <!-- Event List View -->
    <EventListView
      v-if="currentProject && globalStore.currentView === 'list'"
      :project="currentProject"
      :lang="globalStore.lang"
      :read-only="isArchived"
      @toggle-holidays="!isArchived && globalStore.toggleHolidaysPanel()"
    />

    <!-- Calendar View -->
    <CalendarView
      v-if="currentProject && globalStore.currentView === 'cal'"
      :project="currentProject"
      :projects="visibleProjects"
      :lang="globalStore.lang"
      :cal-year="globalStore.calYear"
      :cal-month="globalStore.calMonth"
      :week-start="globalStore.weekStart"
      :temp-unit="globalStore.tempUnit"
      :read-only="isArchived"
    />

    <!-- Templates View -->
    <div v-if="globalStore.currentView === 'tmpl'" class="tmpl-wrap">

      <!-- Header + filters -->
      <div class="tmpl-header">
        <div class="tmpl-title">Templates</div>
        <div class="tmpl-filters">
          <button
            class="tmpl-filter-btn"
            :class="{ active: tmplFilter === 'active' }"
            @click="tmplFilter = 'active'"
          >
            {{ globalStore.lang === 'en' ? 'Active' : 'Activos' }}
            <span class="tmpl-filter-count">{{ projectsStore.templates.filter(t => t.active !== false).length }}</span>
          </button>
          <button
            class="tmpl-filter-btn"
            :class="{ active: tmplFilter === 'inactive' }"
            @click="tmplFilter = 'inactive'"
          >
            {{ globalStore.lang === 'en' ? 'Inactive' : 'Inactivos' }}
            <span class="tmpl-filter-count">{{ projectsStore.templates.filter(t => t.active === false).length }}</span>
          </button>
        </div>
      </div>

      <!-- Helper message -->
      <div class="tmpl-helper">
        {{ globalStore.lang === 'en'
          ? 'Keep your templates updated as your projects evolve. Improve them after every job and remove the ones your team no longer uses. The better your templates, the faster and more consistently everyone works.'
          : 'Mantén tus plantillas actualizadas a medida que tus proyectos evolucionan. Mejóralas después de cada trabajo y elimina las que ya no uses. Cuanto mejores sean, más rápido y consistente trabaja todo el equipo.' }}
      </div>

      <!-- Empty state -->
      <div v-if="!filteredTemplates.length" class="tmpl-empty">
        {{ tmplFilter === 'inactive'
          ? (globalStore.lang === 'en' ? 'No inactive templates.' : 'No hay plantillas inactivas.')
          : (globalStore.lang === 'en' ? 'No active templates yet.' : 'Aún no hay plantillas activas.') }}
      </div>

      <!-- Template list -->
      <div v-else class="tmpl-list">
        <div v-for="tmpl in filteredTemplates" :key="tmpl.id" class="tmpl-item">

          <!-- Left: create calendar button -->
          <button
            class="tmpl-use-btn"
            :title="globalStore.lang === 'en' ? 'Create calendar from this template' : 'Crear calendario desde esta plantilla'"
            @click="createFromTemplate(tmpl.id)"
          >
            + {{ globalStore.lang === 'en' ? 'Calendar' : 'Calendario' }}
          </button>

          <!-- Center: name + meta -->
          <div class="tmpl-item-body">
            <div class="tmpl-item-name-row">
              <span class="tmpl-item-name">{{ tmpl.name }}</span>
              <span v-if="tmpl.useCount" class="tmpl-item-uses">({{ tmpl.useCount }})</span>
              <span v-if="tmpl.source === 'unabase'" class="tmpl-item-badge">unabase</span>
            </div>
            <div class="tmpl-item-meta">
              <span>{{ (tmpl.events || []).length }} {{ globalStore.lang === 'en' ? 'events' : 'eventos' }}</span>
              <span v-if="tmplStages(tmpl)" class="tmpl-meta-sep">·</span>
              <span v-if="tmplStages(tmpl)">{{ tmplStages(tmpl) }}</span>
              <span v-if="tmplGroups(tmpl)" class="tmpl-meta-sep">·</span>
              <span v-if="tmplGroups(tmpl)">{{ tmplGroups(tmpl) }} {{ globalStore.lang === 'en' ? 'groups' : 'grupos' }}</span>
            </div>
          </div>

          <!-- Right: actions -->
          <div class="tmpl-item-actions">
            <!-- Unabase templates: deactivate / activate only -->
            <template v-if="tmpl.source === 'unabase'">
              <button
                class="tmpl-action-btn"
                @click="projectsStore.toggleTemplateActive(tmpl.id)"
              >
                {{ tmpl.active !== false
                  ? (globalStore.lang === 'en' ? 'Deactivate' : 'Desactivar')
                  : (globalStore.lang === 'en' ? 'Activate' : 'Activar') }}
              </button>
            </template>
            <!-- Org templates: activate/deactivate + delete -->
            <template v-else>
              <button
                class="tmpl-action-btn"
                @click="projectsStore.toggleTemplateActive(tmpl.id)"
              >
                {{ tmpl.active !== false
                  ? (globalStore.lang === 'en' ? 'Deactivate' : 'Desactivar')
                  : (globalStore.lang === 'en' ? 'Activate' : 'Activar') }}
              </button>
              <button
                class="tmpl-action-btn tmpl-action-btn--danger"
                @click="deleteTemplate(tmpl.id)"
              >
                {{ globalStore.lang === 'en' ? 'Delete' : 'Eliminar' }}
              </button>
            </template>
          </div>

        </div>
      </div>
    </div>

    <div
      v-if="globalStore.holidaysPanelOpen"
      class="holidays-backdrop"
      @click="globalStore.holidaysPanelOpen = false"
    />
    <HolidaysPanel
      v-if="currentProject && !isArchived"
      :open="globalStore.holidaysPanelOpen"
      :project="currentProject"
      @close="globalStore.holidaysPanelOpen = false"
    />

    <!-- Modals — driven by globalStore so AppSidebar can open them too -->
    <ProjectModal
      v-if="globalStore.projectModalOpen"
      :editing-id="globalStore.editingProjectId"
      @close="globalStore.closeProjectModal()"
      @saved="globalStore.closeProjectModal()"
    />
    <CopyModal
      v-if="globalStore.copyModalOpen"
      :source-id="globalStore.copySourceId"
      @close="globalStore.closeCopyModal()"
    />
    <SettingsModal
      v-if="globalStore.settingsOpen"
      @close="globalStore.closeSettings()"
    />
    <HelpModal
      v-if="globalStore.helpOpen"
      @close="globalStore.closeHelp()"
    />
  </div>
</template>

<script setup>
const { locale } = useI18n()
const globalStore   = useGlobalStore()
const projectsStore = useProjectsStore()

const { currentProject } = storeToRefs(projectsStore)

const isArchived = computed(() => currentProject.value?.status === 'archived')

// All non-hidden, non-archived active projects — drives the combined Calendar View.
// Includes the selected project even if it happens to be hidden (it should always show).
const visibleProjects = computed(() =>
  projectsStore.projects.filter(p =>
    p.isActive !== false &&
    p.status !== 'archived' &&
    !p.hidden
  )
)

// Init stores on mount
onMounted(() => {
  projectsStore.init()
  // Sync i18n locale
  locale.value = globalStore.lang
})

function setLang(l) {
  globalStore.setLang(l)
  locale.value = l
  if (projectsStore.currentProject) {
    projectsStore.setProjectLang(projectsStore.currentProject.id, l)
  }
}

function deleteTemplate(id) {
  const lang = globalStore.lang
  const msg  = lang === 'en' ? 'Delete this template? This cannot be undone.' : '¿Eliminar esta plantilla? Esta acción no se puede deshacer.'
  if (confirm(msg)) {
    projectsStore.deleteTemplate(id)
  }
}

// ── Templates view ──────────────────────────────────────────────────
const tmplFilter = ref('active')

const filteredTemplates = computed(() => {
  const list = projectsStore.templates.filter(t =>
    tmplFilter.value === 'inactive' ? t.active === false : t.active !== false
  )
  // Sort most used → least used, then by name as tiebreaker
  return [...list].sort((a, b) => {
    const diff = (b.useCount || 0) - (a.useCount || 0)
    return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '')
  })
})

const STAGE_ORDER_MAP = { bid: 0, pre: 1, sht: 2, vpst: 3, spst: 4 }
const STAGE_NAMES = {
  es: { bid: 'Licitación', pre: 'Prepro', sht: 'Rodaje', vpst: 'Post Video', spst: 'Post Foto' },
  en: { bid: 'Bidding',    pre: 'Pre-Pro', sht: 'Shoot',  vpst: 'Video Post', spst: 'Still Post' },
}

function tmplStages(tmpl) {
  const labels = STAGE_NAMES[globalStore.lang] || STAGE_NAMES.es
  const keys   = [...new Set((tmpl.events || []).map(e => e.stage).filter(Boolean))]
  keys.sort((a, b) => (STAGE_ORDER_MAP[a] ?? 99) - (STAGE_ORDER_MAP[b] ?? 99))
  return keys.map(k => labels[k] || k).join(' · ')
}

function tmplGroups(tmpl) {
  return new Set((tmpl.events || []).flatMap(e => e.groups || []).filter(Boolean)).size
}

function createFromTemplate(tmplId) {
  globalStore.openProjectModal(null, tmplId)
}

</script>

<style scoped>
.holidays-backdrop {
  position: fixed;
  inset: 0;
  z-index: 199; /* justo debajo del panel (z-index: 200) */
  background: transparent;
  cursor: default;
}

.schedule-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── Header ── */
.main-hdr {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  min-height: 54px;
  position: relative;
}

.hdr-proj-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.hdr-proj-name {
  display: flex; align-items: center; gap: 6px;
  font-family: 'Syne', sans-serif;
  font-size: .95rem; font-weight: 700; color: var(--navy);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.hdr-proj-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
.hdr-proj-meta { font-size: .68rem; color: var(--muted); }
.meta-sep { margin: 0 4px; }
.hdr-archived-badge {
  font-size: .58rem; font-weight: 600; letter-spacing: .03em; text-transform: uppercase;
  background: rgba(0,0,0,.07); color: var(--muted);
  padding: 2px 7px; border-radius: 20px; flex-shrink: 0;
}

.hdr-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  pointer-events: none;
}
.hdr-center > * { pointer-events: auto; }
.view-tabs { display: flex; gap: 4px; }
.view-tab {
  padding: 5px 14px;
  border: 1.5px solid var(--border);
  border-radius: 7px;
  font-size: .72rem;
  font-weight: 600;
  cursor: pointer;
  background: #fff;
  color: var(--muted);
  font-family: inherit;
  transition: all .15s;
}
.view-tab.active { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.06); }
.view-tab:hover:not(.active) { border-color: var(--muted); color: var(--text); }

.hdr-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.hdr-icon-btn {
  background: none; border: 1.5px solid var(--border); border-radius: 7px;
  padding: 5px 9px; font-size: .8rem; cursor: pointer; color: var(--muted);
  transition: all .15s; display: inline-flex; align-items: center; justify-content: center;
}
.hdr-icon-btn:hover { border-color: var(--accent); color: var(--accent); }
.hdr-icon-btn--settings { padding: 5px 7px; }

.hdr-sep { width: 1px; height: 18px; background: var(--border); }

.lang-toggle-btn {
  padding: 3px 9px;
  border: 1.5px solid var(--border);
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
  font-size: .65rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
  letter-spacing: .5px;
}
.lang-toggle-btn.is-en { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.06); }
.lang-toggle-btn:hover { border-color: var(--accent); color: var(--accent); }

/* ── No project ── */
.no-proj {
  flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 60px;
}
.no-proj-inner {
  max-width: 560px; display: flex; flex-direction: column; gap: 18px; text-align: center;
}
.no-proj-title {
  font-family: 'Syne', sans-serif; font-size: 1.25rem; font-weight: 800;
  color: var(--navy); line-height: 1.3;
}
.no-proj-body {
  font-size: .8rem; color: var(--muted); line-height: 1.75;
}
.no-proj-tagline {
  font-size: .8rem; font-weight: 700; color: var(--navy); line-height: 1.6;
}
.no-proj-cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  align-self: center;
  padding: 9px 20px; background: var(--navy); color: #fff;
  border-radius: 20px; font-size: .75rem; font-weight: 700;
  font-family: 'Syne', sans-serif; letter-spacing: .3px;
  text-decoration: none; transition: all .2s; cursor: pointer;
}
.no-proj-cta:hover { background: var(--accent); color: var(--navy); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(6,204,180,.28); }
.no-proj-cta-play {
  font-size: .65rem; opacity: .85;
}
.no-proj-lang {
  display: flex; gap: 6px; justify-content: center; margin-bottom: 6px;
}
.no-proj-lang-opt {
  padding: 5px 16px; border: 1.5px solid var(--border); border-radius: 20px;
  background: transparent; color: var(--muted); font-size: .72rem; font-weight: 700;
  cursor: pointer; font-family: inherit; letter-spacing: .3px; transition: all .15s;
}
.no-proj-lang-opt:hover:not(.active) { border-color: var(--navy); color: var(--navy); }
.no-proj-lang-opt.active { background: var(--navy); border-color: var(--navy); color: #fff; }

/* ── Templates ── */
.tmpl-wrap { flex: 1; overflow-y: auto; padding: 20px 24px; }

.tmpl-header {
  display: flex; align-items: center; gap: 14px; margin-bottom: 12px;
}
.tmpl-title {
  font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700; color: var(--navy);
}
.tmpl-filters { display: flex; gap: 4px; }
.tmpl-filter-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border: 1.5px solid var(--border); border-radius: 6px;
  font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
  cursor: pointer; background: transparent; color: var(--muted); font-family: inherit;
  transition: all .15s;
}
.tmpl-filter-btn:hover { border-color: var(--navy); color: var(--navy); }
.tmpl-filter-btn.active { background: var(--accent); border-color: var(--accent); color: var(--navy); }
.tmpl-filter-count {
  font-size: .6rem; font-weight: 700; background: rgba(0,0,0,.08);
  border-radius: 8px; padding: 0 5px; line-height: 1.6;
}
.tmpl-filter-btn.active .tmpl-filter-count { background: rgba(0,44,62,.2); }

.tmpl-helper {
  font-size: .74rem; color: var(--muted); line-height: 1.6;
  padding: 10px 14px; background: var(--bg, #f8fbfc);
  border: 1px solid var(--border); border-radius: 8px;
  margin-bottom: 16px;
}

.tmpl-empty { font-size: .78rem; color: var(--muted); padding: 20px 0; }

.tmpl-list { display: flex; flex-direction: column; gap: 8px; }

.tmpl-item {
  padding: 12px 14px; border: 1.5px solid var(--border); border-radius: 9px;
  display: flex; align-items: center; gap: 12px; background: #fff;
  transition: border-color .13s;
}
.tmpl-item:hover { border-color: rgba(0,44,62,.2); }

.tmpl-use-btn {
  flex-shrink: 0;
  padding: 5px 10px; background: rgba(6,204,180,.1);
  border: 1.5px dashed rgba(6,204,180,.45); border-radius: 7px;
  color: var(--accent); font-size: .7rem; font-weight: 700;
  cursor: pointer; font-family: inherit; white-space: nowrap;
  transition: all .15s;
}
.tmpl-use-btn:hover { background: rgba(6,204,180,.2); border-color: var(--accent); }

.tmpl-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }

.tmpl-item-name-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.tmpl-item-name { font-size: .84rem; font-weight: 700; color: var(--navy); }
.tmpl-item-uses { font-size: .75rem; color: var(--muted); font-weight: 500; }
.tmpl-item-badge {
  font-size: .58rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  padding: 1px 6px; border-radius: 4px; background: rgba(6,204,180,.12); color: var(--accent);
}

.tmpl-item-meta {
  display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
  font-size: .7rem; color: var(--muted);
}
.tmpl-meta-sep { opacity: .4; }

.tmpl-item-actions { flex-shrink: 0; display: flex; gap: 5px; }
.tmpl-action-btn {
  padding: 4px 10px; border: 1.5px solid var(--border); border-radius: 6px;
  font-size: .68rem; font-weight: 600; cursor: pointer; background: transparent;
  color: var(--muted); font-family: inherit; transition: all .15s; white-space: nowrap;
}
.tmpl-action-btn:hover { border-color: var(--navy); color: var(--navy); }
.tmpl-action-btn--danger:hover { border-color: var(--danger); color: var(--danger); }
</style>
