// localStorage read/write wrapper

const KEYS = {
  projects:  'ub_projects',
  templates: 'ub_templates',
  studio:    'ub_studio',
  selected:  'ub_selected',
  lang:      'ub_lang',
  weekStart: 'ub_weekstart',
  tempUnit:  'ub_tempunit',
  company:   'ub_company',
  users:     'ub_users',
  logo:      'ub_logo',
}

export function usePersist() {
  function persist(state) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(KEYS.projects,  JSON.stringify(state.projects  || []))
    localStorage.setItem(KEYS.templates, JSON.stringify(state.templates || []))
    localStorage.setItem(KEYS.studio,    state.studioName || 'Mi Productora')
    localStorage.setItem(KEYS.selected,  state.selectedId || '')
    localStorage.setItem(KEYS.lang,      state.lang       || 'es')
    localStorage.setItem(KEYS.weekStart, state.weekStart  || 'sun')
    localStorage.setItem(KEYS.tempUnit,  state.tempUnit   || 'C')
    localStorage.setItem(KEYS.company,   JSON.stringify(state.company || {}))
    localStorage.setItem(KEYS.users,     JSON.stringify(state.users   || []))
  }

  function load() {
    if (typeof localStorage === 'undefined') {
      return {
        projects: [], templates: [], studioName: 'Mi Productora',
        selectedId: null, lang: 'es', weekStart: 'sun', tempUnit: 'C',
        company: { name: 'Mi Productora', logo: '', website: '' },
        users: [], logo: null,
      }
    }
    const rawP = localStorage.getItem(KEYS.projects)
    const rawT = localStorage.getItem(KEYS.templates)
    const rawC = localStorage.getItem(KEYS.company)
    const rawU = localStorage.getItem(KEYS.users)

    return {
      projects:   rawP  ? JSON.parse(rawP)  : [],
      templates:  rawT  ? JSON.parse(rawT)  : [],
      studioName: localStorage.getItem(KEYS.studio)    || 'Mi Productora',
      selectedId: localStorage.getItem(KEYS.selected)  || null,
      lang:       localStorage.getItem(KEYS.lang)      || 'es',
      weekStart:  localStorage.getItem(KEYS.weekStart) || 'sun',
      tempUnit:   localStorage.getItem(KEYS.tempUnit)  || 'C',
      company:    rawC  ? JSON.parse(rawC)  : { name: 'Mi Productora', logo: '', website: '' },
      users:      rawU  ? JSON.parse(rawU)  : [],
      logo:       localStorage.getItem(KEYS.logo)      || null,
    }
  }

  function saveLogo(dataUrl) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(KEYS.logo, dataUrl)
  }

  function loadLogo() {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(KEYS.logo)
  }

  return { persist, load, saveLogo, loadLogo }
}
