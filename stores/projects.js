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
    if (proj.hidden == null)      proj.hidden      = false
    if (!proj.lang)               proj.lang        = lang
    if (proj.photographer == null) proj.photographer = ''
    if (!proj.updatedAt) {
      const base = proj.createdAt || ''
      proj.updatedAt = base ? (base.includes('T') ? base : base + 'T00:00:00.000Z') : new Date().toISOString()
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(proj.updatedAt)) {
      proj.updatedAt = proj.updatedAt + 'T00:00:00.000Z'
    }
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

// ── API helpers (module-level) ────────────────────────────────────────────────
const _syncTimers = new Map()

const isMongoId = (id) => /^[0-9a-f]{24}$/i.test(id || '')

const normalizeDoc = (doc) => {
  if (!doc) return doc
  const id = doc._id?.toString?.() || doc._id || doc.id
  return { ...doc, id }
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects:   [],
    templates:  [],
    selectedId: null,
    loadings: { create: false, copy: false },
    migrationPending: false,
  }),

  getters: {
    currentProject: (s) => s.projects.find(p => p.id === s.selectedId) || null,

    localOnlyProjects: (s) => s.projects.filter(p => !isMongoId(p.id)),

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
      list.sort((a, b) => {
        const ta = Date.parse(a.updatedAt || a.createdAt || '') || 0
        const tb = Date.parse(b.updatedAt || b.createdAt || '') || 0
        return tb - ta
      })
      return list
    },

    sortedEvents: () => (proj, filter = 'all', filterKey = false, _lang = 'es') => {
      if (!proj) return []
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

      const globalStore   = useGlobalStore()
      const settingsStore = useSettingsStore()

      globalStore.lang             = data.lang
      globalStore.weekStart        = data.weekStart
      globalStore.tempUnit         = data.tempUnit
      globalStore.dateFormat       = data.dateFormat || 'DD/MM/AA'
      globalStore.sidebarCollapsed = data.sidebarCollapsed ?? false
      settingsStore.studioName    = data.studioName
      settingsStore.company       = data.company
      settingsStore.users         = data.users
      settingsStore.orgCities          = data.orgCities || []
      settingsStore.orgDefaultHolidays = data.orgDefaultHolidays || []
      const logo = loadLogo()
      if (logo) settingsStore.logo = logo

      if (this.selectedId && !this.projects.find(p => p.id === this.selectedId)) {
        this.selectedId = null
      }

      migrateProjects(this.projects, this.templates, globalStore.lang)

      try { this.seedInitialData() } catch(e) { console.warn('seedInitialData error', e) }

      if (!this.selectedId) {
        const first = this.projects.find(p => p.status !== 'archived' && p.isActive !== false)
        if (first) this.selectedId = first.id
      }

      this.migrationPending = this.projects.some(p => !isMongoId(p.id))

      // Refresh from API in background
      const authStore = useAuthStore()
      if (authStore?.isLoggedIn) {
        this.loadFromApi()
      }
    },

    async loadFromApi() {
      const authStore = useAuthStore()
      if (!authStore?.isLoggedIn) return
      try {
        const api = useApi()
        const [apiProjects, apiTemplates] = await Promise.all([
          api.get('/projects'),
          api.get('/schedule-templates'),
        ])

        // Snapshot SHOW/HIDE state before replacing — backend may not store this field
        const localHidden = new Map()
        this.projects.forEach(p => {
          if (p.hidden != null) {
            localHidden.set(p.id, p.hidden)
            if (p.uid) localHidden.set(p.uid, p.hidden)
          }
        })

        const normProjects  = apiProjects.map(normalizeDoc)
        const normTemplates = apiTemplates.map(normalizeDoc)
        const globalStore   = useGlobalStore()

        // hidden is a local-only UI preference — always win over whatever the API returns
        normProjects.forEach(p => {
          const localHid = localHidden.get(p.id) ?? localHidden.get(p.uid)
          if (localHid !== undefined) p.hidden = localHid
        })

        migrateProjects(normProjects, normTemplates, globalStore.lang)

        // Preserve local-only projects not yet in the API
        const apiUids  = new Set(normProjects.map(p => p.uid).filter(Boolean))
        const normIds  = new Set(normProjects.map(p => p.id))
        const localOnly = this.projects.filter(p =>
          // Local UUID not yet posted
          (!isMongoId(p.id) && !apiUids.has(p.id) && !apiUids.has(p.uid)) ||
          // Just posted (has MongoDB ID) but not yet in this GET snapshot (race condition)
          (isMongoId(p.id) && !normIds.has(p.id) && !apiUids.has(p.uid))
        )

        this.projects  = [...normProjects, ...localOnly]

        // Built-in IPS template is always local — never stored per-org in the API
        const ipsTemplate = this.templates.find(t => t.source === 'unabase')
        this.templates = [
          ...(ipsTemplate ? [ipsTemplate] : []),
          ...normTemplates,
          // Preserve local-only org templates not yet in the API
          ...this.templates.filter(t =>
            t.source !== 'unabase' &&
            !isMongoId(t.id) &&
            !normTemplates.some(nt => nt.uid === t.id || nt.uid === t.uid)
          ),
        ]

        // Fix selectedId if its UUID maps to a now-synced MongoDB project
        if (this.selectedId && !isMongoId(this.selectedId)) {
          const migrated = normProjects.find(p => p.uid === this.selectedId)
          if (migrated) this.selectedId = migrated.id
        }
        if (this.selectedId && !this.projects.find(p => p.id === this.selectedId)) {
          const first = this.projects.find(p => p.status !== 'archived' && p.isActive !== false)
          if (first) this.selectedId = first.id
          // Don't reset to null — keeps the view stable if no match found yet
        }

        this.migrationPending = localOnly.length > 0

        this._saveToLocalStorage()
      } catch (err) {
        console.warn('loadFromApi failed:', err)
      }
    },

    // Debounced PUT for a single project to the API
    _scheduleSyncProject(projId) {
      if (!isMongoId(projId)) return
      if (_syncTimers.has(projId)) clearTimeout(_syncTimers.get(projId))
      _syncTimers.set(projId, setTimeout(async () => {
        _syncTimers.delete(projId)
        const proj = this.projects.find(p => p.id === projId)
        if (!proj) return
        try {
          await useApi().put(`/projects/${projId}`, proj)
        } catch (e) {
          console.warn('Project sync failed:', projId, e.message)
        }
      }, 1500))
    },

    // Write localStorage only (no API — used internally after API load)
    _saveToLocalStorage() {
      const { persist } = usePersist()
      const globalStore   = useGlobalStore()
      const settingsStore = useSettingsStore()
      persist({
        projects:   this.projects,
        templates:  this.templates,
        selectedId: this.selectedId,
        lang:             globalStore.lang,
        weekStart:        globalStore.weekStart,
        tempUnit:         globalStore.tempUnit,
        dateFormat:       globalStore.dateFormat,
        sidebarCollapsed: globalStore.sidebarCollapsed,
        studioName:          settingsStore.studioName,
        company:             settingsStore.company,
        users:               settingsStore.users,
        orgCities:           settingsStore.orgCities,
        orgDefaultHolidays:  settingsStore.orgDefaultHolidays,
      })
    },

    seedInitialData() {
      const ipsId = 'builtin-ips'
      const existing = this.templates.find(t => t.id === ipsId || t.uid === ipsId || t.source === 'unabase')
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
          uid: ipsId,
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
      this._saveToLocalStorage()
      // Schedule API sync for any project with unsaved changes
      try {
        const authStore = useAuthStore()
        if (authStore?.isLoggedIn) {
          this.projects
            .filter(p => p.hasChanges && isMongoId(p.id))
            .forEach(p => this._scheduleSyncProject(p.id))
        }
      } catch { /* auth store may not be available during init */ }
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
        if (tmpl.stages?.length) {
          stages.push(...tmpl.stages.map(s => ({ ...s, id: uid() })))
        }
        if (tmpl.groups?.length) {
          groups.length = 0
          groups.push(...tmpl.groups.map(g => ({ ...g, id: uid() })))
        }
        // Notify API of template use (fire-and-forget)
        const authStore = useAuthStore()
        if (authStore?.isLoggedIn && isMongoId(tmpl.id)) {
          useApi().patch(`/schedule-templates/${tmpl.id}/used`).catch(() => {})
        }
      }

      const localId = uid()
      const proj = {
        id: localId,
        uid: localId,
        client:       data.client       || '',
        agency:       data.agency       || '',
        name:         data.name         || '',
        director:     data.director     || '',
        photographer: data.photographer || '',
        ep:           data.ep           || '',
        status:       data.status       || 'competing',
        color:        data.color        || '#06CCB4',
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
      this.selectProject(proj.id)
      this.save()

      // Sync to API in background
      this._apiCreateProject(proj)

      return proj
    },

    async _apiCreateProject(proj) {
      const authStore = useAuthStore()
      if (!authStore?.isLoggedIn) return
      try {
        const created = normalizeDoc(await useApi().post('/projects', proj))
        const idx = this.projects.findIndex(p => p.id === proj.id)
        if (idx !== -1) {
          const localUpdatedAt = this.projects[idx].updatedAt
          Object.assign(this.projects[idx], created, { id: created.id })
          if (localUpdatedAt > (this.projects[idx].updatedAt || '')) {
            this.projects[idx].updatedAt = localUpdatedAt
          }
        }
        // Select the first project (newly created, unshifted to front)
        const first = this.projects[0]
        if (first) this.selectProject(first.id)
        this._saveToLocalStorage()
      } catch (e) {
        console.warn('Failed to create project on API:', e.message)
      }
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
      this._scheduleSyncProject(id)
    },

    deleteProject(id) {
      this.projects = this.projects.filter(p => p.id !== id)
      if (this.selectedId === id) {
        const remaining = this.projects
          .filter(p => p.status !== 'archived')
          .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
        this.selectedId = remaining.length ? remaining[0].id : null
      }
      this.save()

      const authStore = useAuthStore()
      if (authStore?.isLoggedIn && isMongoId(id)) {
        useApi().delete(`/projects/${id}`).catch(e => console.warn('delete project API failed:', e.message))
      }
    },

    archiveProject(id) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj) return
      if (proj.status === 'archived') {
        proj.status = 'competing'
        proj.updatedAt = new Date().toISOString()
        this.selectedId = id
      } else {
        proj.status = 'archived'
        if (this.selectedId === id) {
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

      const authStore = useAuthStore()
      if (authStore?.isLoggedIn && isMongoId(id)) {
        useApi().patch(`/projects/${id}/archive`).catch(e => console.warn('archive API failed:', e.message))
      }
    },

    toggleVisible(id) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj) return
      proj.hidden = !proj.hidden
      this.save()
      this._scheduleSyncProject(id)
    },

    cycleStatus(id) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj || proj.status === 'archived') return
      const cycle = { competing: 'awarded', awarded: 'lost', lost: 'competing' }
      proj.status = cycle[proj.status] || 'competing'
      proj.hasChanges = true
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

      const localId = uid()
      const proj = {
        ...JSON.parse(JSON.stringify(src)),
        id:          localId,
        uid:         localId,
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

      // Sync copy to API in background
      this._apiCreateProject(proj)

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

    moveEventInList(projId, evId, targetEvId, position, targetStageKey) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const ev = proj.events.find(e => e.id === evId)
      if (!ev) return

      ev.stage = targetStageKey

      if (!targetEvId) {
        const others = proj.events.filter(e => e.stage === targetStageKey && e.id !== evId)
        ev.order = others.reduce((max, e) => Math.max(max, e.order ?? 0), -1) + 1
      } else {
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
      if (wasVisible) {
        ;(proj.events || []).forEach(ev => {
          if (ev.stage === stage.key) ev.active = false
        })
      }
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      this.recalcAndSave(projId)
    },

    deleteGroup(projId, groupId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.groups = proj.groups.filter(g => g.id !== groupId)
      proj.events.forEach(ev => {
        if (ev.groups) ev.groups = ev.groups.filter(gId => gId !== groupId)
      })
      proj.hasChanges = true
      proj.updatedAt = new Date().toISOString()
      this.save()
    },

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
      const localId = uid()
      const tmpl = {
        id:       localId,
        uid:      localId,
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

      // Sync to API in background
      const authStore = useAuthStore()
      if (authStore?.isLoggedIn) {
        useApi().post('/schedule-templates', tmpl)
          .then(created => {
            const normalized = normalizeDoc(created)
            const idx = this.templates.findIndex(t => t.id === localId)
            if (idx !== -1) Object.assign(this.templates[idx], normalized, { id: normalized.id })
            this._saveToLocalStorage()
          })
          .catch(e => console.warn('saveAsTemplate API failed:', e.message))
      }

      return tmpl
    },

    toggleTemplateActive(id) {
      const tmpl = this.templates.find(t => t.id === id)
      if (!tmpl) return
      tmpl.active = !tmpl.active
      this.save()

      const authStore = useAuthStore()
      if (authStore?.isLoggedIn && isMongoId(id)) {
        useApi().put(`/schedule-templates/${id}`, { active: tmpl.active })
          .catch(e => console.warn('toggleTemplateActive API failed:', e.message))
      }
    },

    deleteTemplate(id) {
      const tmpl = this.templates.find(t => t.id === id)
      if (!tmpl || tmpl.source === 'unabase') return
      this.templates = this.templates.filter(t => t.id !== id)
      this.save()

      const authStore = useAuthStore()
      if (authStore?.isLoggedIn && isMongoId(id)) {
        useApi().delete(`/schedule-templates/${id}`)
          .catch(e => console.warn('deleteTemplate API failed:', e.message))
      }
    },

    // ── Share ─────────────────────────────────────────────────────────────────

    async toggleShare(id) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj) return
      const newActive = !proj.shareActive
      proj.shareActive = newActive
      if (newActive && !proj.shareToken) proj.shareToken = uid() + uid()
      this.save()

      const authStore = useAuthStore()
      if (authStore?.isLoggedIn && isMongoId(id)) {
        try {
          const result = await useApi().patch(`/projects/${id}/share`, { active: newActive })
          proj.shareToken  = result.shareToken
          proj.shareActive = result.shareActive
          proj.shareViews  = result.shareViews
          this._saveToLocalStorage()
        } catch (e) {
          console.warn('toggleShare API failed:', e.message)
        }
      }
    },

    // ── Migration (Fase 1c) ───────────────────────────────────────────────────

    async importLocalProjects() {
      const localOnly = this.projects.filter(p => !isMongoId(p.id))
      if (!localOnly.length) { this.migrationPending = false; return { imported: 0 } }
      const api = useApi()
      const result = await api.post('/projects/import', {
        projects: localOnly.map(p => ({ ...p, uid: p.id })),
      })
      await this.loadFromApi()
      this.migrationPending = false
      return result
    },

    async importLocalTemplates() {
      const localOnly = this.templates.filter(t => !isMongoId(t.id) && t.source !== 'unabase')
      if (!localOnly.length) return { imported: 0 }
      const api = useApi()
      const result = await api.post('/schedule-templates/import', {
        templates: localOnly.map(t => ({ ...t, uid: t.id })),
      })
      await this.loadFromApi()
      return result
    },

    // ── Calendar helpers ──────────────────────────────────────────────────────

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
      // Explicitly sync since hasChanges is now false (save() won't pick it up)
      this._scheduleSyncProject(projId)
    },
  },
})
