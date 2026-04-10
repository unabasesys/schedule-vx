import { defineStore } from 'pinia'

export const useGlobalStore = defineStore('global', {
  state: () => ({
    currentView: 'cal',   // 'cal' | 'list' | 'tmpl'
    lang: 'es',
    sidebarFilter: 'active',  // 'active' | 'archived' | 'all'
    evFilter: 'all',           // 'all' | 'active' | 'conflicts'
    filterKeyDates: false,
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    weekStart: 'sun',   // 'sun' | 'mon'
    tempUnit: 'C',      // 'C' | 'F'
    sidebarSearch: '',
    holidaysPanelOpen: false,
    // Modal state (global so layout and sidebar can share)
    projectModalOpen:  false,
    editingProjectId:  null,
    copyModalOpen:     false,
    copySourceId:      null,
    settingsOpen:      false,
    helpOpen:          false,
  }),

  getters: {
    isCalView: (s) => s.currentView === 'cal',
    isListView: (s) => s.currentView === 'list',
    isTmplView: (s) => s.currentView === 'tmpl',
  },

  actions: {
    setView(view) {
      this.currentView = view
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
    calPrev() {
      if (this.calMonth === 0) { this.calMonth = 11; this.calYear-- }
      else this.calMonth--
    },
    calNext() {
      if (this.calMonth === 11) { this.calMonth = 0; this.calYear++ }
      else this.calMonth++
    },
    calToday() {
      const now = new Date()
      this.calYear  = now.getFullYear()
      this.calMonth = now.getMonth()
    },
    setWeekStart(ws) {
      this.weekStart = ws
    },
    setTempUnit(tu) {
      this.tempUnit = tu
    },
    toggleHolidaysPanel() {
      this.holidaysPanelOpen = !this.holidaysPanelOpen
    },

    openProjectModal(id = null) {
      this.editingProjectId = id
      this.projectModalOpen = true
    },
    closeProjectModal() {
      this.projectModalOpen = false
      this.editingProjectId = null
    },
    openCopyModal(id) {
      this.copySourceId = id
      this.copyModalOpen = true
    },
    closeCopyModal() {
      this.copyModalOpen = false
      this.copySourceId = null
    },
    openSettings() { this.settingsOpen = true },
    closeSettings() { this.settingsOpen = false },
    openHelp()    { this.helpOpen = true },
    closeHelp()   { this.helpOpen = false },
  },
})
