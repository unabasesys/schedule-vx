// Minimal localStorage wrapper — only UI state, never project/org data.
// All project and org data lives on the server.

const SIDEBAR_KEY = 'ub_sidebar_collapsed'

export function usePersist() {
  function getSidebarCollapsed() {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  }

  function setSidebarCollapsed(val) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(SIDEBAR_KEY, val ? '1' : '0')
  }

  return { getSidebarCollapsed, setSidebarCollapsed }
}
