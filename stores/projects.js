import { defineStore } from 'pinia'
import { uid } from '~/utils/helpers'
import { MASTER_TEMPLATE, DEFAULT_STAGES, DEFAULT_GROUPS, DEFAULT_CITIES, STAGE_ORDER } from '~/utils/constants'
import { usePersist } from '~/composables/usePersist'
import { useDependencyEngine } from '~/composables/useDependencyEngine'
import { useGlobalStore } from '~/stores/global'
import { useSettingsStore } from '~/stores/settings'

// ── Migration helpers ──────────────────────────────────────────────────────────
function buildMasterMaps() {
  const byId      = {}
  const byEN      = {}
  const byENStage = {}
  MASTER_TEMPLATE.forEach(t => {
    byId[t.id] = t
    if (t.nameEN) {
      byEN[t.nameEN] = t
      byENStage[t.nameEN + '|' + t.stage] = t
    }
  })
  return { byId, byEN, byENStage }
}

function fixEvent(ev, maps) {
  const { byId, byEN, byENStage } = maps
  if (ev.active == null)    ev.active    = true
  if (ev.completed == null) ev.completed = false
  if (!ev.dep) ev.dep = { active: false, eventId: '', relation: 'after', days: 1, dayType: 'calendar', broken: false }
  if (!ev.nameEN)     ev.nameEN     = ev.name || ''
  if (!ev.groups)     ev.groups     = []
  if (!ev.whenToUse)  ev.whenToUse  = ''
  if (!ev.whenToUseEN) ev.whenToUseEN = ''
  if (!ev.dateMode)   ev.dateMode   = 'manual'
  if (!ev.durDayType) ev.durDayType = 'calendar'
  if (ev.keyDate == null) ev.keyDate = false

  const stageKey = (n) => n + '|' + (ev.stage || '')
  const entry = (ev.templateId && byId[ev.templateId])
    || byENStage[stageKey(ev.name)]
    || byENStage[stageKey(ev.nameEN)]
    || byEN[ev.name]
    || byEN[ev.nameEN]

  if (entry) {
    if (!ev.templateId || !byId[ev.templateId]) ev.templateId = entry.id
    if (ev.name === entry.nameEN || ev.name === ev.nameEN) ev.name = entry.name
    ev.nameEN = entry.nameEN || entry.name
    if (!ev.whenToUse)   ev.whenToUse   = entry.whenToUse   || ''
    if (!ev.whenToUseEN) ev.whenToUseEN = entry.whenToUseEN || ''
  }
}

export function migrateProjects(projects, templates, lang = 'es') {
  const maps = buildMasterMaps()
  projects.forEach(proj => {
    if (!proj.stages)  proj.stages  = DEFAULT_STAGES.map(s => ({ id: 's-' + s.key, key: s.key, name: s.name, active: true }))
    if (!proj.groups)  proj.groups  = DEFAULT_GROUPS.map(g => ({ id: 'g-' + g.key, key: g.key, name: g.name, active: true }))
    if (!proj.holidays) proj.holidays = []
    if (!proj.cities)   proj.cities  = []
    if (proj.version == null)     proj.version    = 1
    if (proj.hasChanges == null)  proj.hasChanges  = false
    if (!proj.shareToken)         proj.shareToken  = null
    if (proj.shareActive == null) proj.shareActive = false
    if (proj.shareViews == null)  proj.shareViews  = 0
    if (!proj.lang)               proj.lang        = lang
    if (proj.photographer == null) proj.photographer = ''
    ;(proj.events || []).forEach(e => fixEvent(e, maps))
  })
  ;(templates || []).forEach(tmpl => {
    ;(tmpl.events || []).forEach(e => fixEvent(e, maps))
  })
}

// ── Project creation helpers ──────────────────────────────────────────────────
function createProjectDefaults(lang = 'es') {
  const stages = DEFAULT_STAGES.map(s => ({
    id: 's-' + s.key, key: s.key,
    name: lang === 'en' ? s.nameEN : s.name, active: true,
  }))
  const groups = DEFAULT_GROUPS.map(g => ({
    id: 'g-' + g.key, key: g.key,
    name: lang === 'en' ? g.nameEN : g.name, active: true,
  }))
  return { stages, groups }
}

function eventsFromTemplate(tmpl) {
  const idMap  = {}
  const events = tmpl.events.map((te, i) => {
    const newId = uid()
    idMap[te.id || uid()] = newId
    return {
      id: newId, templateId: te.templateId, fromTemplateId: te.id,
      name: te.name, nameEN: te.nameEN || te.name,
      stage: te.stage, active: te.active !== false,
      date: '', dateMode: 'manual',
      duration: te.duration, durDayType: te.durDayType || 'calendar',
      dep: {
        active:   !!(te.dep?.active && te.dep?.eventId),
        eventId:  te.dep?.eventId  || '',
        relation: te.dep?.relation || 'after',
        days:     te.dep?.days     ?? 1,
        dayType:  te.dep?.dayType  || 'calendar',
        broken:   false,
      },
      locked: false, notes: '', order: te.order ?? i,
      completed: false, keyDate: false,
      whenToUse: te.whenToUse || '', whenToUseEN: te.whenToUseEN || '',
      groups: te.groups || [],
    }
  })
  events.forEach(e => {
    if (e.dep.eventId && idMap[e.dep.eventId]) e.dep.eventId = idMap[e.dep.eventId]
  })
  return events
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects:   [],
    templates:  [],
    selectedId: null,
    loadings: { create: false, copy: false },
  }),

  getters: {
    currentProject: (s) => s.projects.find(p => p.id === s.selectedId) || null,

    filteredProjects: (s) => (filter, search = '') => {
      let list = s.projects.filter(p => p.isActive !== false)
      if (filter === 'archived') {
        list = s.projects.filter(p => p.status === 'archived')
      } else if (filter === 'active') {
        list = s.projects.filter(p => p.status !== 'archived' && p.isActive !== false)
      }
      if (search) {
        const q = search.toLowerCase()
        list = list.filter(p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.client || '').toLowerCase().includes(q) ||
          (p.agency || '').toLowerCase().includes(q)
        )
      }
      return list
    },

    sortedEvents: () => (proj, filter = 'all', filterKey = false, _lang = 'es') => {
      if (!proj) return []
      let evs = [...proj.events]
      if (filter === 'active')    evs = evs.filter(e => e.active)
      if (filter === 'conflicts') evs = evs.filter(e => e.active && e.dep?.broken)
      if (filterKey)              evs = evs.filter(e => e.keyDate)
      evs.sort((a, b) => {
        const so = (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99)
        if (so !== 0) return so
        return (a.order ?? 0) - (b.order ?? 0)
      })
      return evs
    },
  },

  actions: {
    init() {
      const { load, loadLogo } = usePersist()
      const data = load()
      this.projects   = data.projects
      this.templates  = data.templates
      this.selectedId = data.selectedId

      // Sync global and settings stores
      const globalStore   = useGlobalStore()
      const settingsStore = useSettingsStore()

      globalStore.lang      = data.lang
      globalStore.weekStart = data.weekStart
      globalStore.tempUnit  = data.tempUnit
      settingsStore.studioName    = data.studioName
      settingsStore.company       = data.company
      settingsStore.users         = data.users
      const logo = loadLogo()
      if (logo) settingsStore.logo = logo

      // Validate selectedId
      if (this.selectedId && !this.projects.find(p => p.id === this.selectedId)) {
        this.selectedId = null
      }

      migrateProjects(this.projects, this.templates, globalStore.lang)

      // Seed built-in IPS template
      try { this.seedInitialData() } catch(e) { console.warn('seedInitialData error', e) }

      // Auto-select first active project if none selected
      if (!this.selectedId) {
        const first = this.projects.find(p => p.status !== 'archived' && p.isActive !== false)
        if (first) this.selectedId = first.id
      }
    },

    seedInitialData() {
      const ipsId = 'builtin-ips'
      const existing = this.templates.find(t => t.id === ipsId)
      if (!existing) {
        const master = MASTER_TEMPLATE.map((te, i) => ({
          id: uid(), templateId: te.id, fromTemplateId: te.id,
          name: te.name, nameEN: te.nameEN || te.name,
          stage: te.stage, active: true,
          date: '', dateMode: 'manual',
          duration: te.days || 1, durDayType: 'calendar',
          dep: { active: false, eventId: '', relation: 'after', days: 1, dayType: 'calendar', broken: false },
          locked: false, notes: '', order: i,
          completed: false, keyDate: false,
          whenToUse: te.whenToUse || '', whenToUseEN: te.whenToUseEN || '',
          groups: te.groups || [],
        }))
        const tmpl = {
          id: ipsId,
          name: 'Integrated Production Schedule',
          client: '',
          events: master,
          stages: DEFAULT_STAGES.map(s => ({ id: 's-' + s.key, key: s.key, name: s.name, active: true })),
          groups: DEFAULT_GROUPS.map(g => ({ id: 'g-' + g.key, key: g.key, name: g.name, active: true })),
          useCount: 0,
          createdAt: new Date().toISOString().split('T')[0],
        }
        this.templates.unshift(tmpl)
        this.save()
      }
    },

    save() {
      const { persist } = usePersist()
      const globalStore   = useGlobalStore()
      const settingsStore = useSettingsStore()
      persist({
        projects:   this.projects,
        templates:  this.templates,
        selectedId: this.selectedId,
        lang:       globalStore.lang,
        weekStart:  globalStore.weekStart,
        tempUnit:   globalStore.tempUnit,
        studioName: settingsStore.studioName,
        company:    settingsStore.company,
        users:      settingsStore.users,
      })
    },

    selectProject(id) {
      this.selectedId = id
      const globalStore = useGlobalStore()
      const proj = this.projects.find(p => p.id === id)
      if (proj) {
        const dates = (proj.events || []).map(e => e.date).filter(Boolean).sort()
        if (dates.length) {
          const earliest = new Date(dates[0] + 'T00:00:00')
          globalStore.calYear  = earliest.getFullYear()
          globalStore.calMonth = earliest.getMonth()
        }
        globalStore.currentView = 'cal'
      }
      this.save()
    },

    createProject(data) {
      const globalStore = useGlobalStore()
      const lang = globalStore.lang
      const { stages, groups } = createProjectDefaults(lang)

      let events = []
      const tmpl = data.templateId ? this.templates.find(t => t.id === data.templateId) : null
      if (tmpl) {
        tmpl.useCount = (tmpl.useCount || 0) + 1
        events = eventsFromTemplate(tmpl)
      }

      const proj = {
        id: uid(),
        client:       data.client      || '',
        agency:       data.agency      || '',
        name:         data.name        || '',
        director:     data.director    || '',
        photographer: data.photographer|| '',
        ep:           data.ep          || '',
        status:       data.status      || 'competing',
        color:        data.color       || '#06CCB4',
        lang,
        createdAt:    new Date().toISOString().split('T')[0],
        version:      1,
        lastDownloadedAt: null,
        hasChanges:   false,
        shareToken:   null,
        shareActive:  false,
        shareViews:   0,
        stages,
        groups,
        holidays: [],
        cities: data.city
          ? [{ name: data.city.name, lat: data.city.lat, lon: data.city.lon, weatherData: {}, sunrise: '', sunset: '' }]
          : DEFAULT_CITIES.map(c => ({ name: c.name, lat: c.lat, lon: c.lon, weatherData: {}, sunrise: '', sunset: '' })),
        events,
        isActive: true,
      }
      this.projects.unshift(proj)
      this.selectedId = proj.id
      globalStore.currentView = 'list'
      this.save()
      return proj
    },

    updateProject(id, data) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj) return
      Object.assign(proj, data)
      proj.hasChanges = true
      this.save()
    },

    deleteProject(id) {
      this.projects = this.projects.filter(p => p.id !== id)
      if (this.selectedId === id) this.selectedId = null
      this.save()
    },

    archiveProject(id) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj) return
      if (proj.status === 'archived') proj.status = 'competing'
      else { proj.status = 'archived'; if (this.selectedId === id) this.selectedId = null }
      this.save()
    },

    toggleVisible(id) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj) return
      proj.hidden = !proj.hidden
      this.save()
    },

    cycleStatus(id) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj || proj.status === 'archived') return
      proj.status = proj.status === 'competing' ? 'awarded' : 'competing'
      this.save()
    },

    copyProject(id, opts = {}) {
      const src = this.projects.find(p => p.id === id)
      if (!src) return null

      const idMap = {}
      const newEvents = (src.events || []).map(ev => {
        const newId = uid()
        idMap[ev.id] = newId
        const copy = JSON.parse(JSON.stringify(ev))
        copy.id = newId
        if (opts.clearDates) { copy.date = ''; copy.dep = { ...copy.dep, broken: false } }
        copy.completed = false
        return copy
      })
      newEvents.forEach(e => {
        if (e.dep?.eventId && idMap[e.dep.eventId]) e.dep.eventId = idMap[e.dep.eventId]
      })

      const proj = {
        ...JSON.parse(JSON.stringify(src)),
        id:          uid(),
        client:      opts.client       ?? src.client,
        agency:      opts.agency       ?? src.agency,
        name:        opts.name         ?? (src.name + ' (copia)'),
        director:    opts.director     ?? src.director,
        photographer:opts.photographer ?? src.photographer,
        ep:          opts.ep           ?? src.ep,
        events:      newEvents,
        version:     1, hasChanges: false,
        shareToken:  null, shareActive: false, shareViews: 0,
        createdAt:   new Date().toISOString().split('T')[0],
      }
      this.projects.unshift(proj)
      this.selectedId = proj.id
      this.save()
      return proj
    },

    // ── Event mutations ──────────────────────────────────────────────────────

    addEvent(projId, ev) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.events.push(ev)
      proj.hasChanges = true
      this.save()
    },

    updateEvent(projId, evId, body) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const ev = proj.events.find(e => e.id === evId)
      if (!ev) return
      Object.assign(ev, body)
      proj.hasChanges = true
    },

    deleteEvent(projId, evId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.events = proj.events.filter(e => e.id !== evId)
      proj.hasChanges = true
      this.save()
    },

    recalcAndSave(projId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const { recalcProject } = useDependencyEngine()
      recalcProject(proj)
      this.save()
    },

    // ── Templates ────────────────────────────────────────────────────────────

    saveAsTemplate(projId, name) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const tmpl = {
        id:       uid(),
        name:     name || proj.name || proj.client || 'Template',
        client:   proj.client,
        events:   JSON.parse(JSON.stringify(proj.events || [])),
        stages:   JSON.parse(JSON.stringify(proj.stages || [])),
        groups:   JSON.parse(JSON.stringify(proj.groups || [])),
        useCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
      }
      tmpl.events.forEach(e => { e.date = ''; e.completed = false })
      this.templates.unshift(tmpl)
      this.save()
      return tmpl
    },

    deleteTemplate(id) {
      this.templates = this.templates.filter(t => t.id !== id)
      this.save()
    },

    // ── Share ─────────────────────────────────────────────────────────────────

    async toggleShare(id) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj) return
      if (!proj.shareToken) proj.shareToken = uid() + uid()
      proj.shareActive = !proj.shareActive
      this.save()
      try {
        const { useSupabase } = await import('~/composables/useSupabase')
        const { sbPushShare } = useSupabase()
        await sbPushShare(proj)
      } catch (e) {
        // Supabase may not be configured
      }
    },

    markChanged(projId) {
      const proj = this.projects.find(p => p.id === (projId || this.selectedId))
      if (proj && !proj.hasChanges) proj.hasChanges = true
    },

    bumpVersion(projId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.version = (proj.version || 1) + 1
      proj.hasChanges = false
      proj.lastDownloadedAt = new Date().toISOString().split('T')[0]
      this.save()
    },
  },
})
