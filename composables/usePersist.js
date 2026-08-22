// Minimal localStorage wrapper — only UI state, never project/org data.
// All project and org data lives on the server.

const SIDEBAR_KEY = 'ub_sidebar_collapsed'
const VIEW_KEY    = 'ub_current_view'
const GUIDE_KEY   = 'ub_guide_hidden'
const VALID_VIEWS = ['cal', 'list', 'daily', 'tmpl']

export function usePersist() {
  function getSidebarCollapsed() {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  }

  function setSidebarCollapsed(val) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(SIDEBAR_KEY, val ? '1' : '0')
  }

  function getView() {
    if (typeof localStorage === 'undefined') return 'cal'
    const v = localStorage.getItem(VIEW_KEY)
    return VALID_VIEWS.includes(v) ? v : 'cal'
  }

  function setView(val) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(VIEW_KEY, val)
  }

  // "Don't show the no-template guide again". Per-browser rather than per-user on the
  // server: it's a UI preference about one screen, and it belongs with the rest of the
  // local UI state. The help menu can clear it.
  function getGuideHidden() {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(GUIDE_KEY) === '1'
  }

  function setGuideHidden(val) {
    if (typeof localStorage === 'undefined') return
    if (val) localStorage.setItem(GUIDE_KEY, '1')
    else     localStorage.removeItem(GUIDE_KEY)
  }

  // El tema NO se guarda acá: vive en utils/theme.js, en una cookie de
  // .unabase.com, para que la elección siga al usuario entre Calendar,
  // Relations y Leads. Estas dos funciones son la puerta que usa el store.
  function getTheme() { return leerTema() }
  function setTheme(val) { guardarTema(val) }

  return { getSidebarCollapsed, setSidebarCollapsed, getView, setView, getGuideHidden, setGuideHidden, getTheme, setTheme }
}
