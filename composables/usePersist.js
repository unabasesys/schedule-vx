// localStorage read/write wrapper

const KEYS = {
  projects:   'ub_projects',
  templates:  'ub_templates',
  studio:     'ub_studio',
  selected:   'ub_selected',
  lang:       'ub_lang',
  weekStart:  'ub_weekstart',
  tempUnit:   'ub_tempunit',
  dateFormat: 'ub_dateformat',
  company:    'ub_company',
  users:      'ub_users',
  logo:       'ub_logo',
  orgCities:          'ub_org_cities',
  orgDefaultHolidays: 'ub_org_default_holidays',
}

export function usePersist() {
  function persist(state) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(KEYS.projects,  JSON.stringify(state.projects  || []))
    localStorage.setItem(KEYS.templates, JSON.stringify(state.templates || []))
    localStorage.setItem(KEYS.studio,    state.studioName || 'Mi Productora')
    localStorage.setItem(KEYS.selected,  state.selectedId || '')
    localStorage.setItem(KEYS.lang,       state.lang       || 'es')
    localStorage.setItem(KEYS.weekStart,  state.weekStart  || 'sun')
    localStorage.setItem(KEYS.tempUnit,   state.tempUnit   || 'C')
    localStorage.setItem(KEYS.dateFormat, state.dateFormat || 'DD/MM/AA')
    localStorage.setItem(KEYS.company,   JSON.stringify(state.company   || {}))
    localStorage.setItem(KEYS.users,     JSON.stringify(state.users     || []))
    localStorage.setItem(KEYS.orgCities,          JSON.stringify(state.orgCities          || []))
    localStorage.setItem(KEYS.orgDefaultHolidays, JSON.stringify(state.orgDefaultHolidays || []))
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
      lang:       (() => {
        const saved = localStorage.getItem(KEYS.lang)
        if (saved) return saved
        // First visit — detect from browser language
        const bl = (navigator.language || '').toLowerCase()
        return bl.startsWith('es') ? 'es' : 'en'
      })(),
      weekStart:  localStorage.getItem(KEYS.weekStart)  || 'sun',
      tempUnit:   localStorage.getItem(KEYS.tempUnit)   || 'C',
      dateFormat: localStorage.getItem(KEYS.dateFormat) || 'DD/MM/AA',
      company:    rawC  ? JSON.parse(rawC)  : { name: 'Mi Productora', logo: '', website: '' },
      users:      rawU  ? JSON.parse(rawU)  : [],
      orgCities:          (() => { try { return JSON.parse(localStorage.getItem(KEYS.orgCities)          || '[]') } catch { return [] } })(),
      orgDefaultHolidays: (() => { try { return JSON.parse(localStorage.getItem(KEYS.orgDefaultHolidays) || '[]') } catch { return [] } })(),
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
