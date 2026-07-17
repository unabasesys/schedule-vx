import { defineStore } from 'pinia'

export const useGlobalStore = defineStore('global', {
  state: () => ({
    currentView: 'cal',   // 'cal' | 'list' | 'tmpl' | 'daily'
    lang: 'es',
    sidebarFilter: 'active',  // 'active' | 'archived' | 'all'
    evFilter: 'all',           // 'all' | 'active' | 'conflicts'
    filterKeyDates: false,
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    weekStart: 'sun',      // 'sun' | 'mon'
    tempUnit: 'C',         // 'C' | 'F'
    dateFormat: 'DD/MM/AA', // 'DD/MM/AA' | 'MM/DD/AA'
    sidebarSearch: '',
    holidaysPanelOpen: false,
    highlightHolidayDate: null,
    // Modal state (global so layout and sidebar can share)
    projectModalOpen:       false,
    editingProjectId:       null,
    projectModalTemplateId: null,
    copyModalOpen:     false,
    copySourceId:      null,
    settingsOpen:      false,
    helpOpen:          false,
    suggestOpen:       false,
    whatsNewOpen:      false,
    sidebarCollapsed:  false,
  }),

  getters: {
    isCalView:   (s) => s.currentView === 'cal',
    isListView:  (s) => s.currentView === 'list',
    isTmplView:  (s) => s.currentView === 'tmpl',
    isDailyView: (s) => s.currentView === 'daily',
  },

  actions: {
    setView(view) {
      this.currentView = view
      usePersist().setView(view)
    },
    setLang(l) {
      this.lang = l
    },
    setSidebarFilter(f) {
      this.sidebarFilter = f
    },
    setEvFilter(f) {
      this.evFilter = f
    },
    toggleKeyFilter() {
      this.filterKeyDates = !this.filterKeyDates
    },
    setCalMonth(year, month) {
      this.calYear  = year
      this.calMonth = month
    },
    setWeekStart(ws) {
      this.weekStart = ws
    },
    setTempUnit(tu) {
      this.tempUnit = tu
    },
    setDateFormat(f) {
      this.dateFormat = f
    },
    toggleHolidaysPanel() {
      this.holidaysPanelOpen = !this.holidaysPanelOpen
    },
    openHolidaysPanelAt(date) {
      this.holidaysPanelOpen    = true
      this.highlightHolidayDate = date
    },

    openProjectModal(id = null, templateId = null) {
      this.editingProjectId       = id
      this.projectModalTemplateId = templateId
      this.projectModalOpen       = true
    },
    closeProjectModal() {
      this.projectModalOpen       = false
      this.editingProjectId       = null
      this.projectModalTemplateId = null
    },
    openCopyModal(id) {
      this.copySourceId = id
      this.copyModalOpen = true
    },
    closeCopyModal() {
      this.copyModalOpen = false
      this.copySourceId = null
    },
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
      usePersist().setSidebarCollapsed(this.sidebarCollapsed)
    },

    openSettings() { this.settingsOpen = true },
    closeSettings() { this.settingsOpen = false },
    openHelp()    { this.helpOpen = true },
    closeHelp()   { this.helpOpen = false },
    openSuggest()  { this.suggestOpen = true },
    closeSuggest() { this.suggestOpen = false },
    openWhatsNew()  { this.whatsNewOpen = true },
    closeWhatsNew() { this.whatsNewOpen = false },
  },
})
