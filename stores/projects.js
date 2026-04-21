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
  if (ev.keyDate  == null) ev.keyDate  = false
  if (ev.internal == null) ev.internal = false

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
    if (!proj.stages)  proj.stages  = []
    proj.stages.forEach((s, i) => {
      if (s.order   == null) s.order   = STAGE_ORDER[s.key] ?? i
      if (s.visible == null) s.visible = true
    })
    if (!proj.groups)  proj.groups  = DEFAULT_GROUPS.map(g => ({ id: 'g-' + g.key, key: g.key, name: g.name, active: true }))
    if (!proj.holidays)         proj.holidays         = []
    if (!proj.disabledHolidays) proj.disabledHolidays = []
    if (!proj.cities)   proj.cities  = []
    if (proj.version == null)     proj.version    = 0
    if (proj.hasChanges == null)  proj.hasChanges  = false
    if (!proj.shareToken)         proj.shareToken  = null
    if (proj.shareActive == null) proj.shareActive = false
    if (proj.shareViews == null)  proj.shareViews  = 0
    if (!proj.lang)               proj.lang        = lang
    if (proj.photographer == null) proj.photographer = ''
    if (!proj.updatedAt)          proj.updatedAt   = proj.createdAt || new Date().toISOString().split('T')[0]
    ;(proj.events || []).forEach(e => fixEvent(e, maps))
  })
  ;(templates || []).forEach(tmpl => {
    if (tmpl.source == null) tmpl.source = tmpl.id === 'builtin-ips' ? 'unabase' : 'org'
    if (tmpl.active == null) tmpl.active = true
    ;(tmpl.events || []).forEach(e => fixEvent(e, maps))
  })
}

// ── Project creation helpers ──────────────────────────────────────────────────
function createProjectDefaults(lang = 'es') {
  const stages = []
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
      completed: false, keyDate: false, internal: false,
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
          (p.name         || '').toLowerCase().includes(q) ||
          (p.client       || '').toLowerCase().includes(q) ||
          (p.agency       || '').toLowerCase().includes(q) ||
          (p.director     || '').toLowerCase().includes(q) ||
          (p.photographer || '').toLowerCase().includes(q) ||
          (p.ep           || '').toLowerCase().includes(q)
        )
      }
      // Orden: último editado arriba
      list.sort((a, b) => {
        const ta = a.updatedAt || a.createdAt || ''
        const tb = b.updatedAt || b.createdAt || ''
        return tb > ta ? 1 : tb < ta ? -1 : 0
      })
      return list
    },

    sortedEvents: () => (proj, filter = 'all', filterKey = false, _lang = 'es') => {
      if (!proj) return []
      // Build order map from the project's own stages (respects custom order + new stages)
      const stageOrderMap = {}
      ;(proj.stages || []).forEach(s => { stageOrderMap[s.key] = s.order ?? STAGE_ORDER[s.key] ?? 99 })
      let evs = [...proj.events]
      if (filter === 'active')    evs = evs.filter(e => e.active)
      if (filter === 'conflicts') evs = evs.filter(e => e.active && e.dep?.broken)
      if (filterKey)              evs = evs.filter(e => e.keyDate)
      evs.sort((a, b) => {
        const so = (stageOrderMap[a.stage] ?? 99) - (stageOrderMap[b.stage] ?? 99)
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

      globalStore.lang       = data.lang
      globalStore.weekStart  = data.weekStart
      globalStore.tempUnit   = data.tempUnit
      globalStore.dateFormat = data.dateFormat || 'DD/MM/AA'
      settingsStore.studioName    = data.studioName
      settingsStore.company       = data.company
      settingsStore.users         = data.users
      settingsStore.orgCities          = data.orgCities || []
      settingsStore.orgDefaultHolidays = data.orgDefaultHolidays || []
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
          source: 'unabase',
          active: true,
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
        dateFormat: globalStore.dateFormat,
        studioName:          settingsStore.studioName,
        company:             settingsStore.company,
        users:               settingsStore.users,
        orgCities:           settingsStore.orgCities,
        orgDefaultHolidays:  settingsStore.orgDefaultHolidays,
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
        // Inherit stages and groups from template if available
        if (tmpl.stages?.length) {
          stages.push(...tmpl.stages.map(s => ({ ...s, id: uid() })))
        }
        if (tmpl.groups?.length) {
          groups.length = 0
          groups.push(...tmpl.groups.map(g => ({ ...g, id: uid() })))
        }
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
        updatedAt:    new Date().toISOString(),
        version:      0,
        hasChanges:   false,
        shareToken:   null,
        shareActive:  false,
        shareViews:   0,
        stages,
        groups,
        holidays: (() => {
          const settingsStore = useSettingsStore()
          return (settingsStore.orgDefaultHolidays || []).map(c => ({ countryCode: c.countryCode, name: c.name }))
        })(),
        disabledHolidays: [],
        cities: data.city
          ? [{ name: data.city.name, lat: data.city.lat, lon: data.city.lon, weatherData: {}, sunrise: '', sunset: '' }]
          : (() => {
              const settingsStore = useSettingsStore()
              const base = (settingsStore.orgCities?.length ? settingsStore.orgCities : DEFAULT_CITIES)
              return base.map(c => ({ name: c.name, lat: c.lat, lon: c.lon, weatherData: {}, sunrise: '', sunset: '' }))
            })(),
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
      proj.updatedAt = new Date().toISOString()
      this.save()
    },

    // Visual-only preference — does NOT activate the version asterisk
    setProjectLang(id, lang) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj) return
      proj.lang = lang
      this.save()
    },

    deleteProject(id) {
      this.projects = this.projects.filter(p => p.id !== id)
      if (this.selectedId === id) {
        // Select the most recently edited active calendar, or null if none left
        const remaining = this.projects
          .filter(p => p.status !== 'archived')
          .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
        this.selectedId = remaining.length ? remaining[0].id : null
      }
      this.save()
    },

    archiveProject(id) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj) return
      if (proj.status === 'archived') {
        proj.status = 'competing'
        proj.updatedAt = new Date().toISOString()   // float to top of active list
        this.selectedId = id
      } else {
        proj.status = 'archived'
        if (this.selectedId === id) {
          // Auto-select the most recently edited active project
          const next = this.projects
            .filter(p => p.id !== id && p.status !== 'archived' && p.isActive !== false)
            .sort((a, b) => {
              const ta = a.updatedAt || a.createdAt || ''
              const tb = b.updatedAt || b.createdAt || ''
              return tb > ta ? 1 : tb < ta ? -1 : 0
            })[0]
          this.selectedId = next ? next.id : null
        }
      }
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
      const cycle = { competing: 'awarded', awarded: 'lost', lost: 'competing' }
      proj.status = cycle[proj.status] || 'competing'
      proj.updatedAt = new Date().toISOString()
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
        version:     0, hasChanges: false,
        shareToken:  null, shareActive: false, shareViews: 0,
        createdAt:   new Date().toISOString().split('T')[0],
        updatedAt:   new Date().toISOString(),
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
      proj.updatedAt = new Date().toISOString()
      this.save()
    },

    updateEvent(projId, evId, body) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const ev = proj.events.find(e => e.id === evId)
      if (!ev) return
      Object.assign(ev, body)
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      this.save()
    },

    deleteEvent(projId, evId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.events = proj.events.filter(e => e.id !== evId)
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      this.save()
    },

    // Move an event in the list view:
    // - Change its stage to targetStageKey
    // - Insert it above/below targetEvId (or at end of stage if targetEvId is null)
    moveEventInList(projId, evId, targetEvId, position, targetStageKey) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const ev = proj.events.find(e => e.id === evId)
      if (!ev) return

      ev.stage = targetStageKey

      if (!targetEvId) {
        // Dropped on stage header → append at end
        const others = proj.events.filter(e => e.stage === targetStageKey && e.id !== evId)
        ev.order = others.reduce((max, e) => Math.max(max, e.order ?? 0), -1) + 1
      } else {
        // Dropped on a specific row → insert before or after
        const stageEvs = proj.events
          .filter(e => e.stage === targetStageKey && e.id !== evId)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        const targetIdx = stageEvs.findIndex(e => e.id === targetEvId)
        const insertAt  = position === 'above' ? targetIdx : targetIdx + 1
        stageEvs.splice(insertAt, 0, ev)
        stageEvs.forEach((e, i) => { e.order = i })
      }

      proj.hasChanges = true
      proj.updatedAt  = new Date().toISOString()
      this.recalcAndSave(projId)
    },

    addGroup(projId, name) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const newGroup = { id: uid(), key: uid(), name, active: true }
      proj.groups.push(newGroup)
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      this.save()
      return newGroup
    },

    addStage(projId, name) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const maxOrder = proj.stages.reduce((m, s) => Math.max(m, s.order ?? 0), -1)
      const newStage = { id: uid(), key: uid(), name, active: true, order: maxOrder + 1 }
      proj.stages.push(newStage)
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      this.save()
      return newStage
    },

    renameStage(projId, stageId, newName) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const stage = proj.stages.find(s => s.id === stageId)
      if (!stage || !newName?.trim()) return
      stage.name = newName.trim()
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      this.save()
    },

    deleteStage(projId, stageId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const stage = proj.stages.find(s => s.id === stageId)
      if (!stage) return
      // Remove all events belonging to this stage
      proj.events = proj.events.filter(e => e.stage !== stage.key)
      proj.stages = proj.stages.filter(s => s.id !== stageId)
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      this.save()
    },

    moveStageUp(projId, stageId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const sorted = [...proj.stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      const idx = sorted.findIndex(s => s.id === stageId)
      if (idx <= 0) return
      const [a, b] = [sorted[idx], sorted[idx - 1]]
      ;[a.order, b.order] = [b.order, a.order]
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      this.save()
    },

    moveStageDown(projId, stageId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const sorted = [...proj.stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      const idx = sorted.findIndex(s => s.id === stageId)
      if (idx < 0 || idx >= sorted.length - 1) return
      const [a, b] = [sorted[idx], sorted[idx + 1]]
      ;[a.order, b.order] = [b.order, a.order]
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      this.save()
    },

    toggleStageVisible(projId, stageId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const stage = proj.stages.find(s => s.id === stageId)
      if (!stage) return
      const wasVisible = stage.visible !== false
      stage.visible = !wasVisible
      // Regla 1: al apagar una etapa, desactivar por defecto todos sus eventos.
      // One-way — al reactivar la etapa, los eventos NO se vuelven a prender automáticamente.
      if (wasVisible) {
        ;(proj.events || []).forEach(ev => {
          if (ev.stage === stage.key) ev.active = false
        })
      }
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      // recalcAndSave marca como broken cualquier dep que apunte a un evento recién desactivado.
      this.recalcAndSave(projId)
    },

    deleteGroup(projId, groupId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.groups = proj.groups.filter(g => g.id !== groupId)
      // Remove groupId from all events so no orphan references remain
      proj.events.forEach(ev => {
        if (ev.groups) ev.groups = ev.groups.filter(gId => gId !== groupId)
      })
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      this.save()
    },

    // Swap the order values of two events (used for drag-and-drop reordering in calendar)
    reorderEvents(projId, evId1, evId2) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const ev1 = proj.events.find(e => e.id === evId1)
      const ev2 = proj.events.find(e => e.id === evId2)
      if (!ev1 || !ev2) return
      const tmp = ev1.order ?? 0
      ev1.order  = ev2.order ?? 0
      ev2.order  = tmp
      proj.hasChanges = true
      proj.updatedAt  = new Date().toISOString()
      this.save()
    },

    recalcAndSave(projId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const { recalcProject } = useDependencyEngine()

      // Build the set of active (non-disabled) holiday dates so the dependency
      // engine can treat them as non-working days in Business Days calculations.
      const holidaysStore  = useHolidaysStore()
      const disabled       = new Set(proj.disabledHolidays || [])
      const years          = new Set(
        (proj.events || []).filter(e => e.date).map(e => Number(e.date.slice(0, 4)))
      )
      const activeHolidayDates = new Set()
      ;(proj.holidays || []).forEach(({ countryCode }) => {
        years.forEach(year => {
          holidaysStore.getHolidaysForYear(countryCode, year).forEach(h => {
            if (!disabled.has(h.date)) activeHolidayDates.add(h.date)
          })
        })
      })

      recalcProject(proj, activeHolidayDates.size ? activeHolidayDates : null)
      this.save()
    },

    // Toggle individual holidays on/off (non-visual: affects business-day calculation)
    updateDisabledHolidays(projId, disabledDates) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.disabledHolidays = disabledDates
      proj.hasChanges = true
      proj.updatedAt  = new Date().toISOString()
      this.recalcAndSave(projId)
    },

    // ── Templates ────────────────────────────────────────────────────────────

    saveAsTemplate(projId, name) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const tmpl = {
        id:       uid(),
        source:   'org',
        active:   true,
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

    toggleTemplateActive(id) {
      const tmpl = this.templates.find(t => t.id === id)
      if (!tmpl) return
      tmpl.active = !tmpl.active
      this.save()
    },

    deleteTemplate(id) {
      const tmpl = this.templates.find(t => t.id === id)
      if (!tmpl || tmpl.source === 'unabase') return   // builtin templates cannot be deleted
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
        // Embed org date-format so the share view can format dates correctly
        const globalStore = useGlobalStore()
        const snapshot = { ...proj, orgDateFormat: globalStore.dateFormat || 'DD/MM/AA' }
        await sbPushShare(snapshot)
      } catch (e) {
        // Supabase may not be configured
      }
    },

    // Shift all event dates by N calendar days (positive = forward, negative = backward)
    moveCalendar(projId, days) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      function shiftDate(dateStr, n) {
        const d = new Date(dateStr + 'T12:00:00')
        d.setDate(d.getDate() + n)
        return d.toISOString().split('T')[0]
      }
      ;(proj.events || []).forEach(ev => {
        if (ev.date) ev.date = shiftDate(ev.date, days)
      })
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      this.recalcAndSave(projId)
    },

    setAllDeps(projId, enabled) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.events.forEach(ev => {
        if (ev.dep?.eventId) ev.dep.active = enabled
      })
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      this.recalcAndSave(projId)
    },

    markChanged(projId) {
      const proj = this.projects.find(p => p.id === (projId || this.selectedId))
      if (proj) {
        proj.hasChanges = true
        proj.updatedAt = new Date().toISOString()
      }
    },

    bumpVersion(projId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.version = (proj.version ?? 0) + 1
      proj.hasChanges = false
      proj.updatedAt = new Date().toISOString()
      this.save()
    },
  },
})
