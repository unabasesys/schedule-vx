import { defineStore } from 'pinia'

// El icono de la pestaña también tiene dos versiones: el isotipo de tinta oscura
// no se ve en una pestaña oscura, y el tile oscuro parece un parche en una clara.
function aplicarFavicon(theme) {
  const link = document.querySelector('link[rel="icon"]')
  if (link) link.href = theme === 'light' ? '/favicon-light.png' : '/favicon.png'
}

export const useGlobalStore = defineStore('global', {
  state: () => ({
    currentView: 'cal',   // 'cal' | 'list' | 'tmpl' | 'daily'
    lang: 'es',
    // Modo claro u oscuro. La app nació oscura y ese sigue siendo el valor por
    // defecto; el claro es una elección del usuario, guardada en el navegador y
    // COMPARTIDA con Relations y Leads (utils/theme.js).
    theme: 'dark',   // 'dark' | 'light'
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
    contactsOpen:      false,
    assistantOpen:     false,
    sidebarCollapsed:  false,
    // "Don't show the no-template guide again". Lives here rather than in the component
    // because two places touch it: the guide's own checkbox and the Help modal's "show it
    // again" — and localStorage isn't reactive, so a component-local copy would leave the
    // guide hidden until a reload.
    guideHidden:       false,
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
    // El tema se aplica pintando el atributo en <html>: todo el color de la app
    // sale de las variables de colors.css, así que con eso cambia la app entera.
    setTheme(t) {
      const theme = t === 'light' ? 'light' : 'dark'
      this.theme = theme
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = theme
        aplicarFavicon(theme)
      }
      usePersist().setTheme(theme)
    },
    toggleTheme() {
      this.setTheme(this.theme === 'light' ? 'dark' : 'light')
    },
    // Al arrancar: el script del <head> ya pintó el atributo antes de que se viera
    // nada (para que nadie vea un parpadeo negro); acá solo sincronizamos el store.
    initTheme() {
      this.theme = usePersist().getTheme()
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = this.theme
        aplicarFavicon(this.theme)
      }
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

    setGuideHidden(val) {
      this.guideHidden = !!val
      usePersist().setGuideHidden(this.guideHidden)
    },

    openSettings() { this.settingsOpen = true },
    closeSettings() { this.settingsOpen = false },
    openHelp()    { this.helpOpen = true },
    closeHelp()   { this.helpOpen = false },
    openSuggest()  { this.suggestOpen = true },
    closeSuggest() { this.suggestOpen = false },
    openWhatsNew()  { this.whatsNewOpen = true },
    closeWhatsNew() { this.whatsNewOpen = false },
    openContacts()  { this.contactsOpen = true },
    closeContacts() { this.contactsOpen = false },
    openAssistant()  { this.assistantOpen = true },
    closeAssistant() { this.assistantOpen = false },
  },
})
