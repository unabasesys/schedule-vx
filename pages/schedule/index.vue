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
          >{{ t('tabCalendar') }}</button>
          <button
            class="view-tab"
            :class="{ active: globalStore.currentView === 'list' }"
            @click="globalStore.setView('list')"
          >{{ t('tabEvents') }}</button>
        </div>
      </div>

      <div class="hdr-actions">
        <ShareDropdown :project="currentProject" />
        <button class="hdr-icon-btn" title="Settings" @click="globalStore.openSettings()">⚙</button>
        <div class="hdr-sep"></div>
        <div class="lang-toggle">
          <button
            class="lang-opt"
            :class="{ active: globalStore.lang === 'es' }"
            @click="setLang('es')"
          >ES</button>
          <button
            class="lang-opt"
            :class="{ active: globalStore.lang === 'en' }"
            @click="setLang('en')"
          >EN</button>
        </div>
        <div class="hdr-sep"></div>
        <button class="about-pill-btn" @click="globalStore.openHelp()">
          <span class="about-pill-dot"></span>
          <span>{{ t('help') }}</span>
        </button>
      </div>
    </div>

    <!-- No project selected -->
    <div v-if="!currentProject && globalStore.currentView !== 'tmpl'" class="no-proj">
      <div class="no-proj-icon">📋</div>
      <div class="no-proj-title">{{ t('noProj') }}</div>
      <div class="no-proj-sub">{{ t('noProjSub') }}</div>
    </div>

    <!-- Event List View -->
    <EventListView
      v-if="currentProject && globalStore.currentView === 'list'"
      :project="currentProject"
      :lang="globalStore.lang"
      :ev-filter="globalStore.evFilter"
      :filter-key-dates="globalStore.filterKeyDates"
      @set-filter="globalStore.setEvFilter($event)"
      @toggle-key-filter="globalStore.toggleKeyFilter()"
      @toggle-holidays="globalStore.toggleHolidaysPanel()"
    />

    <!-- Calendar View -->
    <CalendarView
      v-if="currentProject && globalStore.currentView === 'cal'"
      :project="currentProject"
      :lang="globalStore.lang"
      :cal-year="globalStore.calYear"
      :cal-month="globalStore.calMonth"
      :week-start="globalStore.weekStart"
      :temp-unit="globalStore.tempUnit"
    />

    <!-- Templates View -->
    <div v-if="globalStore.currentView === 'tmpl'" class="tmpl-wrap">
      <div class="tmpl-header">
        <div class="tmpl-title">{{ t('tmplTitle') }}</div>
      </div>
      <div v-if="!projectsStore.templates.length" class="tmpl-empty">
        {{ t('noTemplates') }}
      </div>
      <div v-else class="tmpl-list">
        <div v-for="tmpl in projectsStore.templates" :key="tmpl.id" class="tmpl-item">
          <div class="tmpl-item-name">{{ tmpl.name }}</div>
          <div class="tmpl-item-meta">
            {{ tmpl.events?.filter(e => e.active).length }} {{ t('tmplActive') }} ·
            {{ tmpl.events?.length }} {{ t('tmplTotal') }}
            <span v-if="tmpl.useCount"> · {{ t('tmplUsed') }} {{ tmpl.useCount }} {{ tmpl.useCount === 1 ? t('tmplTime') : t('tmplTimes') }}</span>
          </div>
          <div class="tmpl-item-actions">
            <button class="btn-danger" style="padding:4px 10px;font-size:.7rem;" @click="deleteTemplate(tmpl.id)">{{ t('deleteProjectAction') }}</button>
          </div>
        </div>
      </div>
    </div>

    <HolidaysPanel
      v-if="currentProject"
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
const { t, locale } = useI18n()
const globalStore   = useGlobalStore()
const projectsStore = useProjectsStore()

const { currentProject } = storeToRefs(projectsStore)

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
    projectsStore.updateProject(projectsStore.currentProject.id, { lang: l })
  }
  projectsStore.save()
}

function deleteTemplate(id) {
  if (confirm(t('confirmDelete'))) {
    projectsStore.deleteTemplate(id)
  }
}

</script>

<style scoped>
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
}

.hdr-proj-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.hdr-proj-name {
  display: flex; align-items: center; gap: 6px;
  font-family: 'Syne', sans-serif;
  font-size: .95rem; font-weight: 700; color: var(--navy);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.hdr-proj-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
.hdr-proj-meta { font-size: .68rem; color: var(--muted); }
.meta-sep { margin: 0 4px; }

.hdr-center { flex: 1; display: flex; justify-content: center; }
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
  transition: all .15s;
}
.hdr-icon-btn:hover { border-color: var(--accent); color: var(--accent); }

.hdr-sep { width: 1px; height: 18px; background: var(--border); }

.lang-toggle { display: flex; gap: 3px; }
.lang-opt {
  padding: 3px 8px;
  border: 1.5px solid var(--border);
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
  font-size: .65rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
  letter-spacing: .3px;
}
.lang-opt.active { background: var(--accent); border-color: var(--accent); color: var(--navy); }
.lang-opt:hover:not(.active) { background: var(--bg); color: var(--text); }

.about-pill-btn {
  position: relative; display: flex; align-items: center; gap: 6px;
  padding: 5px 13px 5px 9px; background: var(--navy); border: none; border-radius: 20px;
  cursor: pointer; font-family: 'Syne', sans-serif; font-size: .61rem; font-weight: 800;
  color: #fff; letter-spacing: .5px; flex-shrink: 0; transition: all .22s; overflow: hidden; white-space: nowrap;
}
.about-pill-btn::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(120deg,rgba(6,204,180,.55) 0%,transparent 55%);
  opacity: 0; transition: opacity .22s;
}
.about-pill-btn:hover::before { opacity: 1; }
.about-pill-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(6,204,180,.28); }
.about-pill-dot {
  width: 6px; height: 6px; background: var(--accent); border-radius: 50%; flex-shrink: 0;
  animation: pulso 2.2s ease-in-out infinite;
}

/* ── No project ── */
.no-proj {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 40px;
}
.no-proj-icon { font-size: 3rem; }
.no-proj-title { font-family: 'Syne', sans-serif; font-size: 1.1rem; font-weight: 700; color: var(--navy); }
.no-proj-sub { font-size: .8rem; color: var(--muted); text-align: center; line-height: 1.6; white-space: pre-line; }

/* ── Templates ── */
.tmpl-wrap { flex: 1; overflow-y: auto; padding: 20px; }
.tmpl-header { margin-bottom: 16px; }
.tmpl-title { font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700; color: var(--navy); }
.tmpl-empty { font-size: .78rem; color: var(--muted); white-space: pre-line; }
.tmpl-list { display: flex; flex-direction: column; gap: 10px; }
.tmpl-item {
  padding: 14px 16px; border: 1.5px solid var(--border); border-radius: 9px;
  display: flex; align-items: center; gap: 12px; background: #fff;
}
.tmpl-item-name { font-size: .85rem; font-weight: 700; color: var(--navy); flex: 1; }
.tmpl-item-meta { font-size: .7rem; color: var(--muted); }
.tmpl-item-actions { flex-shrink: 0; }
</style>
