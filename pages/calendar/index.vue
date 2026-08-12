<template>
  <div class="schedule-page">
    <!-- Cloud loading indicator -->
    <div v-if="projectsStore.cloudLoading" class="cloud-loading-bar">
      <div class="cloud-loading-track"><div class="cloud-loading-fill"></div></div>
    </div>


    <!-- Header (only when a project is selected) -->
    <div v-if="currentProject" class="main-hdr">
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
          <button
            class="view-tab"
            :class="{ active: globalStore.currentView === 'daily' }"
            @click="globalStore.setView('daily')"
          >Daily</button>

          <!-- Hidden on an archived calendar: Una's whole job is to ADD events, and
               everything else that writes is already locked there, so offering it only
               led to filling in a preview that could never be applied. -->
          <button
            v-if="!isArchived"
            class="hey-una-btn"
            :title="globalStore.lang === 'en' ? 'Ask Una — turn what you say into events' : 'Pídele a Una — convierte lo que dices en eventos'"
            @click="globalStore.openAssistant()"
          >
            <span class="hey-una-mic">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="2.5" width="6" height="11" rx="3" fill="currentColor"></rect><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>
            </span>
            Hey Una
          </button>
        </div>
      </div>

      <div class="hdr-actions">
        <!-- Save state: without this, a failing API looked exactly like a working one.
             In 'conflict' it's a button: autosave is paused waiting for a decision,
             so the user needs a way back to that decision. -->
        <component
          :is="projectsStore.saveState === 'conflict' ? 'button' : 'div'"
          v-if="projectsStore.saveState !== 'idle'"
          class="save-state"
          :class="`save-state--${projectsStore.saveState}`"
          :title="saveStateTitle"
          @click="projectsStore.saveState === 'conflict' && projectsStore.resolveConflict()"
        >
          <span class="save-state-dot"></span>
          <span class="save-state-txt">{{ saveStateLabel }}</span>
        </component>
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
            ? 'Built for production companies, agencies, creative studios and post teams: plan with speed, structure and real production logic — the familiarity of the tools you already use, with a workflow far more useful day to day.'
            : 'Diseñado para productoras, agencias, estudios creativos y equipos de post: planifica con rapidez, orden y criterio real de producción — con la familiaridad de las herramientas que ya usas y una lógica mucho más útil para el día a día.' }}
        </div>

        <!-- Feature highlights -->
        <div class="no-proj-features">
          <span v-for="f in features" :key="f.en" class="no-proj-chip">
            {{ globalStore.lang === 'en' ? f.en : f.es }}
          </span>
        </div>

        <div class="no-proj-tagline">
          {{ globalStore.lang === 'en'
            ? 'Less time building calendars from scratch. More consistency across projects. More clarity to present and execute.'
            : 'Menos tiempo armando calendarios desde cero. Más consistencia entre proyectos. Más claridad para presentar y ejecutar.' }}
        </div>

        <button class="no-proj-cta" @click="globalStore.openProjectModal(null)">
          <span class="no-proj-cta-plus">+</span>
          {{ globalStore.lang === 'en' ? 'Create my first calendar' : 'Crear mi primer calendario' }}
        </button>
        <div class="no-proj-hint">
          {{ globalStore.lang === 'en'
            ? 'Takes 30 seconds. Once you try it, you won’t want to stop.'
            : 'Toma 30 segundos. Después de probarlo, no vas a querer parar.' }}
        </div>
      </div>
    </div>

    <!-- Quién tiene la versión que está en el servidor, y cuándo. Un tab abierto
         hace dos días se veía idéntico a uno recién cargado; esto es la respuesta
         permanente a "¿estoy mirando lo de verdad?".

         Vive acá, en la franja que estaba vacía sobre el contenido, y NO apretado
         entre "Compartir" y el idioma: ahí competía por espacio con las acciones
         y se leía como una más. Alineado a la izquierda, es una nota al pie del
         encabezado — se lee cuando uno la busca y no estorba cuando no. -->
    <div v-if="currentProject && lastUpdateLabel" class="cal-last-update" :title="lastUpdateTitle">
      {{ lastUpdateLabel }}
    </div>

    <!-- Event List View -->
    <!-- `hidden` only removes the project from the calendar overlay — the
         selected project's own Events/Daily lists must always render -->
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
      :week-start="currentProject?.weekStart || settingsStore.orgWeekStart || globalStore.weekStart"
      :temp-unit="currentProject?.tempUnit || globalStore.tempUnit"
      :read-only="isArchived"
    />

    <!-- Daily Schedule View -->
    <DailyView
      v-if="currentProject && globalStore.currentView === 'daily'"
      :project="currentProject"
      :lang="globalStore.lang"
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
      @saved="onProjectSaved"
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
    <!-- Puerta de organización: no se puede cerrar, porque no hay nada detrás -->
    <CreateOrgModal v-if="needsOrg" mandatory @created="projectsStore.init()" />

    <HelpModal
      v-if="globalStore.helpOpen"
      @close="globalStore.closeHelp()"
    />
    <SuggestModal v-if="globalStore.suggestOpen" />
    <WhatsNewModal v-if="globalStore.whatsNewOpen" />
    <ContactsModal v-if="globalStore.contactsOpen" @close="globalStore.closeContacts()" />
    <AssistantDrawer v-if="globalStore.assistantOpen" />

    <!-- One-time "what's new" card, shown until the current version is seen -->
    <WhatsNewToast />
  </div>
</template>

<script setup>
definePageMeta({ middleware: 'auth' })
import { fmtWhen } from '~/utils/helpers'

const { locale } = useI18n()
const globalStore   = useGlobalStore()
const projectsStore = useProjectsStore()
const settingsStore = useSettingsStore()
const authStore     = useAuthStore()

const { currentProject } = storeToRefs(projectsStore)

const isArchived = computed(() => currentProject.value?.status === 'archived')

// Non-hidden, non-archived active projects — drives the combined Calendar View.
// A selected calendar in HIDE mode intentionally does not appear in the view.
const visibleProjects = computed(() =>
  projectsStore.projects.filter(p =>
    p.isActive !== false &&
    p.status !== 'archived' &&
    !p.hidden
  )
)

// Alguien que se registró y todavía no pertenece a ninguna organización. Desde que dejamos
// de crear una "<Nombre>'s Studio" automáticamente, este estado existe de verdad — y no es
// una pantalla vacía: sin organización, TODO endpoint protegido responde 400, así que la
// única cosa que se puede hacer es crearla o esperar una invitación.
const needsOrg = computed(() => authStore.isLoggedIn && !authStore.organization)

// Init stores on mount
onMounted(() => {
  // Sin organización no se llama a la API: cada request saldría sin el header Organization
  // y volvería 400. Se inicializa en cuanto exista una.
  if (!needsOrg.value) projectsStore.init()
  // Sync i18n locale
  locale.value = globalStore.lang
})

watch(needsOrg, (missing, wasMissing) => {
  if (wasMissing && !missing) projectsStore.init()
})

function setLang(l) {
  globalStore.setLang(l)
  locale.value = l
  if (projectsStore.currentProject) {
    projectsStore.setProjectLang(projectsStore.currentProject.id, l)
  }
}

const saveStateLabel = computed(() => {
  const en = globalStore.lang === 'en'
  switch (projectsStore.saveState) {
    case 'saving':   return en ? 'Saving…'  : 'Guardando…'
    case 'saved':    return en ? 'Saved'    : 'Guardado'
    case 'error':    return en ? 'Unsaved — retrying' : 'Sin guardar — reintentando'
    // Not retrying: it's waiting on the user, so don't imply a retry is coming.
    case 'conflict': return en ? 'Unsaved' : 'Sin guardar'
    default:         return ''
  }
})

// "Actualizado hace 4 min por Ana". Recomputed as `lastUpdate` changes, which the
// freshness probe refreshes every ~20s — so the relative time doesn't go stale
// either. Empty (and therefore hidden) for a calendar nobody has saved yet.
const lastUpdateLabel = computed(() => {
  const info = projectsStore.currentLastUpdate
  if (!info?.revAt) return ''
  const en   = globalStore.lang === 'en'
  const when = fmtWhen(info.revAt, en)
  if (!when) return ''
  const me   = authStore.user?._id || authStore.user?.id
  const who  = info.userId && String(info.userId) === String(me)
    ? (en ? 'you' : 'ti')
    : info.name
  return who
    ? (en ? `Updated ${when} by ${who}` : `Actualizado ${when} por ${who}`)
    : (en ? `Updated ${when}`           : `Actualizado ${when}`)
})

const lastUpdateTitle = computed(() => {
  const info = projectsStore.currentLastUpdate
  if (!info?.revAt) return ''
  const d = new Date(info.revAt)
  return isNaN(d.getTime()) ? '' : d.toLocaleString()
})

const saveStateTitle = computed(() => {
  if (projectsStore.saveState !== 'conflict') return saveStateLabel.value
  return globalStore.lang === 'en'
    ? 'Saving is paused because someone else saved this calendar. Click to resolve.'
    : 'El guardado está pausado porque otra persona guardó este calendario. Hacé clic para resolverlo.'
})

// Feature highlights shown on the empty-state landing.
const features = [
  { es: 'Stages',                  en: 'Stages' },
  { es: 'Key dates',               en: 'Key dates' },
  { es: 'Días hábiles o corridos', en: 'Business or calendar days' },
  { es: 'Feriados',                en: 'Holidays' },
  { es: 'Weather',                 en: 'Weather' },
  { es: 'Templates',               en: 'Templates' },
  { es: 'Versionado',              en: 'Versioning' },
  { es: 'PDFs para clientes',      en: 'Client PDFs' },
]

function onProjectSaved() {
  const isNew = !globalStore.editingProjectId
  globalStore.closeProjectModal()
  if (isNew) globalStore.setView('cal')
}

async function deleteTemplate(id) {
  const lang = globalStore.lang
  const ok = await useDialog().confirm({
    title:        lang === 'en' ? 'Delete template?'              : '¿Eliminar plantilla?',
    body:         lang === 'en' ? 'This action cannot be undone.' : 'Esta acción no se puede deshacer.',
    confirmLabel: lang === 'en' ? 'Delete'                        : 'Eliminar',
    cancelLabel:  lang === 'en' ? 'Cancel'                        : 'Cancelar',
  })
  if (ok) projectsStore.deleteTemplate(id)
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
  const labels    = STAGE_NAMES[globalStore.lang] || STAGE_NAMES.es
  const stagesMap = {}
  ;(tmpl.stages || []).forEach(s => {
    if (s.id)  stagesMap[s.id]  = globalStore.lang === 'en' ? (s.nameEN || s.name) : s.name
    if (s.key) stagesMap[s.key] = globalStore.lang === 'en' ? (s.nameEN || s.name) : s.name
  })
  const keys = [...new Set((tmpl.events || []).map(e => e.stage).filter(Boolean))]
  keys.sort((a, b) => (STAGE_ORDER_MAP[a] ?? 99) - (STAGE_ORDER_MAP[b] ?? 99))
  return keys.map(k => labels[k] || stagesMap[k] || '').filter(Boolean).join(' · ')
}

function tmplGroups(tmpl) {
  return new Set((tmpl.events || []).flatMap(e => e.groups || []).filter(Boolean)).size
}

function createFromTemplate(tmplId) {
  globalStore.openProjectModal(null, tmplId)
}

</script>

<style scoped>
/* Save-state pill — quiet when things work, loud only when they don't */
/* Standing status, not an alert: same size as the save pill but no border, no dot,
   so it reads as a caption and never competes with it. Truncates before it can
   push the header controls around. */
/* El sello de actualización, en la franja sobre el contenido. Los 16px de la
   izquierda son los mismos de la barra de Departamentos que va justo debajo, para
   que las dos líneas arranquen alineadas y se lean como un bloque. */
.cal-last-update {
  padding: 6px 16px 0;
  font-size: .68rem; color: var(--muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  flex-shrink: 0;
}

.save-state {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: .68rem; font-weight: 600; white-space: nowrap;
  padding: 4px 9px; border-radius: 999px;
  border: 1px solid var(--border); color: var(--muted);
  transition: color .15s, border-color .15s, opacity .3s;
  background: none; font-family: inherit;   /* renders as a <button> in 'conflict' */
}
.save-state-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: 0 0 6px; }
.save-state--saving { color: var(--muted); }
.save-state--saving .save-state-dot { animation: savePulse 1s ease-in-out infinite; }
.save-state--saved  { color: var(--accent); border-color: rgba(6,204,180,.35); }
.save-state--error  { color: var(--danger, #e05252); border-color: rgba(224,82,82,.45); background: rgba(224,82,82,.08); }
/* Conflict is amber, not red: nothing is broken, it's waiting on a decision —
   and it's the one state you can click, so it needs the affordance. */
.save-state--conflict {
  color: var(--warning, #e0a316); border-color: rgba(224,163,22,.5);
  background: rgba(224,163,22,.1); cursor: pointer;
}
.save-state--conflict:hover { border-color: var(--warning, #e0a316); background: rgba(224,163,22,.18); }
.save-state--conflict {
  color: var(--danger, #e05252); border-color: rgba(224,82,82,.45);
  background: rgba(224,82,82,.08); cursor: pointer;
}
.save-state--conflict:hover { background: rgba(224,82,82,.16); }
.save-state--conflict .save-state-dot { animation: savePulse 1.4s ease-in-out infinite; }
@keyframes savePulse { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
@media (max-width: 860px) { .save-state-txt { display: none; } }

/* "Hey Una" assistant button — lives in the top view-tabs bar */
.hey-una-btn {
  margin-left: 8px;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 16px 7px 11px; border: none; border-radius: 999px;
  background: linear-gradient(180deg, var(--accent) 0%, var(--accent-dark, var(--accent)) 100%);
  color: #062b24; font-size: .8rem; font-weight: 700; font-family: inherit; cursor: pointer;
  box-shadow: 0 4px 16px rgba(6,204,180,.28);
  animation: heyUnaPulse 2.6s ease-out infinite;
  transition: filter .13s, transform .13s;
}
.hey-una-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
.hey-una-btn:active { transform: translateY(0); }
.hey-una-mic {
  display: flex; align-items: center; justify-content: center;
  width: 19px; height: 19px; border-radius: 50%; background: rgba(6,43,36,.16);
}
@keyframes heyUnaPulse {
  0%   { box-shadow: 0 4px 16px rgba(6,204,180,.28), 0 0 0 0 rgba(6,204,180,.4); }
  70%  { box-shadow: 0 4px 16px rgba(6,204,180,.28), 0 0 0 12px rgba(6,204,180,0); }
  100% { box-shadow: 0 4px 16px rgba(6,204,180,.28), 0 0 0 0 rgba(6,204,180,0); }
}
@media (prefers-reduced-motion: reduce) { .hey-una-btn { animation: none; } }

.cloud-loading-bar {
  position: sticky; top: 0; z-index: 200; height: 3px;
}
.cloud-loading-track {
  width: 100%; height: 100%; background: transparent; overflow: hidden;
}
.cloud-loading-fill {
  height: 100%; background: var(--accent);
  animation: cloud-slide 1.2s ease-in-out infinite;
  transform-origin: left;
}
@keyframes cloud-slide {
  0%   { transform: translateX(-100%) scaleX(0.4); }
  50%  { transform: translateX(60%)   scaleX(0.6); }
  100% { transform: translateX(200%)  scaleX(0.4); }
}

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
  background: var(--header-bg);
  border-bottom: 1px solid rgba(255,255,255,.06);
  flex-shrink: 0;
  min-height: 54px;
  position: relative;
}

.hdr-proj-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.hdr-proj-name {
  display: flex; align-items: center; gap: 6px;
  font-family: 'Nunito', sans-serif;
  font-size: .95rem; font-weight: 700; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.hdr-proj-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
.hdr-proj-meta { font-size: .68rem; color: var(--muted); }
.meta-sep { margin: 0 4px; }
.hdr-archived-badge {
  font-size: .58rem; font-weight: 600; letter-spacing: .03em; text-transform: uppercase;
  background: rgba(255,255,255,.1); color: var(--muted);
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
  border: 1.5px solid rgba(255,255,255,.12);
  border-radius: 7px;
  font-size: .72rem;
  font-weight: 600;
  cursor: pointer;
  background: rgba(255,255,255,.05);
  color: var(--muted);
  font-family: inherit;
  transition: all .15s;
}
.view-tab.active { border-color: var(--accent); color: var(--accent); background: rgba(32,167,137,.15); }
.view-tab:hover:not(.active) { border-color: rgba(255,255,255,.2); color: var(--text); }

.hdr-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: auto; }
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
.lang-toggle-btn.is-en { border-color: var(--accent); color: var(--accent); background: rgba(32,167,137,.06); }
.lang-toggle-btn:hover { border-color: var(--accent); color: var(--accent); }

/* ── No project ── */
.no-proj {
  flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 60px;
}
.no-proj-inner {
  max-width: 560px; display: flex; flex-direction: column; gap: 18px; text-align: center;
}
.no-proj-title {
  font-family: 'Nunito', sans-serif; font-size: 1.25rem; font-weight: 800;
  color: var(--text-title); line-height: 1.3;
}
.no-proj-body {
  font-size: .8rem; color: var(--muted); line-height: 1.75;
}
.no-proj-tagline {
  font-size: .8rem; font-weight: 700; color: var(--text); line-height: 1.6;
}
.no-proj-cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  align-self: center;
  padding: 9px 20px; background: var(--accent); color: #fff;
  border-radius: 20px; font-size: .75rem; font-weight: 700;
  font-family: 'Nunito', sans-serif; letter-spacing: .3px;
  text-decoration: none; transition: all .2s; cursor: pointer;
}
.no-proj-cta:hover { background: var(--accent-dark); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(32,167,137,.35); }
.no-proj-cta-play {
  font-size: .65rem; opacity: .85;
}
.no-proj-cta { border: none; font-family: 'Nunito', sans-serif; }
.no-proj-cta-plus { font-size: 1rem; font-weight: 800; line-height: 1; }
.no-proj-hint { font-size: .72rem; color: var(--muted); margin-top: -6px; }

/* Feature highlights */
.no-proj-features {
  display: flex; flex-wrap: wrap; justify-content: center; gap: 7px;
  margin: 2px auto 0; max-width: 480px;
}
.no-proj-chip {
  font-size: .68rem; font-weight: 600; color: var(--text);
  padding: 4px 11px; border-radius: 20px;
  background: var(--surface-2); border: 1px solid var(--border);
  white-space: nowrap;
}
.no-proj-lang {
  display: flex; gap: 6px; justify-content: center; margin-bottom: 6px;
}
.no-proj-lang-opt {
  padding: 5px 16px; border: 1.5px solid var(--border); border-radius: 20px;
  background: transparent; color: var(--muted); font-size: .72rem; font-weight: 700;
  cursor: pointer; font-family: inherit; letter-spacing: .3px; transition: all .15s;
}
.no-proj-lang-opt:hover:not(.active) { border-color: var(--text); color: var(--text); }
.no-proj-lang-opt.active { background: var(--accent); border-color: var(--accent); color: #fff; }

/* ── Templates ── */
.tmpl-wrap { flex: 1; overflow-y: auto; padding: 20px 24px; }

.tmpl-header {
  display: flex; align-items: center; gap: 14px; margin-bottom: 12px;
}
.tmpl-title {
  font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: var(--text);
}
.tmpl-filters { display: flex; gap: 4px; }
.tmpl-filter-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border: 1.5px solid var(--border); border-radius: 6px;
  font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
  cursor: pointer; background: transparent; color: var(--muted); font-family: inherit;
  transition: all .15s;
}
.tmpl-filter-btn:hover { border-color: var(--text); color: var(--text); }
.tmpl-filter-btn.active { background: var(--accent); border-color: var(--accent); color: var(--text); }
.tmpl-filter-count {
  font-size: .6rem; font-weight: 700; background: rgba(0,0,0,.08);
  border-radius: 8px; padding: 0 5px; line-height: 1.6;
}
.tmpl-filter-btn.active .tmpl-filter-count { background: rgba(0,44,62,.2); }

.tmpl-helper {
  font-size: .74rem; color: var(--muted); line-height: 1.6;
  padding: 10px 14px; background: var(--surface-2);
  border: 1px solid var(--border); border-radius: 8px;
  margin-bottom: 16px;
}

.tmpl-empty { font-size: .78rem; color: var(--muted); padding: 20px 0; }

.tmpl-list { display: flex; flex-direction: column; gap: 8px; }

.tmpl-item {
  padding: 12px 14px; border: 1.5px solid var(--border); border-radius: 9px;
  display: flex; align-items: center; gap: 12px; background: var(--surface);
  transition: border-color .13s;
}
.tmpl-item:hover { border-color: rgba(0,44,62,.2); }

.tmpl-use-btn {
  flex-shrink: 0;
  padding: 5px 10px; background: rgba(32,167,137,.1);
  border: 1.5px dashed rgba(32,167,137,.45); border-radius: 7px;
  color: var(--accent); font-size: .7rem; font-weight: 700;
  cursor: pointer; font-family: inherit; white-space: nowrap;
  transition: all .15s;
}
.tmpl-use-btn:hover { background: rgba(32,167,137,.2); border-color: var(--accent); }

.tmpl-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }

.tmpl-item-name-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.tmpl-item-name { font-size: .84rem; font-weight: 700; color: var(--text); }
.tmpl-item-uses { font-size: .75rem; color: var(--muted); font-weight: 500; }
.tmpl-item-badge {
  font-size: .58rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  padding: 1px 6px; border-radius: 4px; background: rgba(32,167,137,.12); color: var(--accent);
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
.tmpl-action-btn:hover { border-color: var(--text); color: var(--text); }
.tmpl-action-btn--danger:hover { border-color: var(--danger); color: var(--danger); }
</style>
