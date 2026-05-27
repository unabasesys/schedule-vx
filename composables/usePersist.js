// Minimal localStorage wrapper — only UI state, never project/org data.
// All project and org data lives on the server.

const SIDEBAR_KEY = 'ub_sidebar_collapsed'
const VIEW_KEY    = 'ub_current_view'
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

  return { getSidebarCollapsed, setSidebarCollapsed, getView, setView }
}
