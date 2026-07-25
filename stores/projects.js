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
  if (!ev.dep) ev.dep = { active: false, eventId: '', relation: 'after', days: 1, broken: false }
  if (!ev.nameEN)     ev.nameEN     = ev.name || ''
  if (!ev.groups)     ev.groups     = []
  if (!ev.dateMode)   ev.dateMode   = 'manual'
  if (!ev.durDayType) ev.durDayType = 'calendar'
  if (ev.keyDate       == null) ev.keyDate       = false
  if (ev.internal      == null) ev.internal      = false
  if (ev.nameCustomized == null) ev.nameCustomized = false

  const stageKey = (n) => n + '|' + (ev.stage || '')
  const entry = (ev.templateId && byId[ev.templateId])
    || byENStage[stageKey(ev.name)]
    || byENStage[stageKey(ev.nameEN)]
    || byEN[ev.name]
    || byEN[ev.nameEN]

  if (entry) {
    if (!ev.templateId || !byId[ev.templateId]) ev.templateId = entry.id
    // Only normalize names from the template if the user hasn't manually edited them.
    // Once nameCustomized is true the names are independent of the master template.
    if (!ev.nameCustomized) {
      if (ev.name === entry.nameEN || ev.name === ev.nameEN) ev.name = entry.name
      ev.nameEN = entry.nameEN || entry.name
    }
  }
}

export function migrateProjects(projects, templates, lang = 'es') {
  const maps = buildMasterMaps()
  projects.forEach(proj => {
    if (!proj.stages)  proj.stages  = []
    proj.stages.forEach((s, i) => {
      if (s.order   == null) s.order   = STAGE_ORDER[s.key] ?? i
      if (s.visible == null) s.visible = true
      if (s.color   === undefined) s.color = null
    })
    if (!proj.groups)  proj.groups  = DEFAULT_GROUPS.map(g => ({ id: 'g-' + g.key, key: g.key, name: g.name, active: true }))
    if (!proj.dailySchedule) proj.dailySchedule = []
    if (!proj.dailyConfig)   proj.dailyConfig   = { timezones: [] }
    if (!proj.holidays)         proj.holidays         = []
    if (!proj.disabledHolidays) proj.disabledHolidays = []
    if (!proj.cities)   proj.cities  = []
    if (proj.version == null)     proj.version    = 0
    if (proj.rev == null)         proj.rev         = 0
    if (proj.hasChanges == null)  proj.hasChanges  = false
    if (proj.hidden == null)      proj.hidden      = false
    if (!proj.lang)               proj.lang        = lang
    if (proj.photographer == null) proj.photographer = ''
    if (!proj.updatedAt) {
      const base = proj.createdAt || ''
      proj.updatedAt = base ? (base.includes('T') ? base : base + 'T00:00:00.000Z') : new Date().toISOString()
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(proj.updatedAt)) {
      proj.updatedAt = proj.updatedAt + 'T00:00:00.000Z'
    }
    // `editedAt` = "last meaningful user edit", used for the sidebar order.
    // The server-managed `updatedAt` is unreliable for this because bulk/automated
    // saves stamp every calendar at once. Seed a missing value from createdAt so the
    // initial order is by creation (newest on top); real user edits bump it to now.
    if (!proj.editedAt) {
      const base = proj.createdAt || proj.updatedAt || ''
      proj.editedAt = base ? (base.includes('T') ? base : base + 'T00:00:00.000Z') : new Date().toISOString()
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(proj.editedAt)) {
      proj.editedAt = proj.editedAt + 'T00:00:00.000Z'
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
        broken:   false,
      },
      notes: '', order: te.order ?? i,
      completed: false, keyDate: false, internal: false,
      groups: te.groups || [],
    }
  })
  events.forEach(e => {
    if (e.dep.eventId && idMap[e.dep.eventId]) e.dep.eventId = idMap[e.dep.eventId]
  })
  return events
}

// ── API helpers (module-level) ────────────────────────────────────────────────
const _syncTimers             = new Map()
const _dailySyncTimers        = new Map()
const _inFlight               = new Set()   // projIds with a PUT in flight — serializes saves so we never send a stale baseRev
let   _unloadListenerRegistered = false

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
    cloudLoading: false,
  }),

  getters: {
    currentProject: (s) => s.projects.find(p => p.id === s.selectedId) || null,

    localOnlyProjects: (s) => s.projects.filter(p => !isMongoId(p.id)),

    // Plain (non-factory) getter — Pinia correctly tracks s.projects and proj.updatedAt
    // as reactive dependencies. Re-evaluates whenever any project's updatedAt changes,
    // which propagates down to filteredProjects and then to the sidebar computed.
    projectsSortedByUpdated: (s) => [...s.projects].sort((a, b) => {
      // Order by last meaningful user edit (editedAt), falling back to the
      // server timestamp / creation date only when editedAt is absent.
      const ta = Date.parse(a.editedAt || a.updatedAt || a.createdAt || '') || 0
      const tb = Date.parse(b.editedAt || b.updatedAt || b.createdAt || '') || 0
      if (tb !== ta) return tb - ta
      return (b.id || '').localeCompare(a.id || '')
    }),

    // Regular function (not arrow) so 'this' accesses the store's other getters.
    // Accessing this.projectsSortedByUpdated in the outer scope registers it as a
    // Pinia-level dependency — when the sorted list changes, this getter re-evaluates
    // and returns a new inner function, causing AppSidebar's computed to re-run.
    filteredProjects(s) {
      const sorted = this.projectsSortedByUpdated
      return (filter, search = '') => {
        let list = sorted.filter(p => p.isActive !== false)
        if (filter === 'archived') {
          list = sorted.filter(p => p.status === 'archived')
        } else if (filter === 'active') {
          list = sorted.filter(p => p.status !== 'archived' && p.isActive !== false)
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
        return list
      }
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
      const globalStore   = useGlobalStore()
      const authStore     = useAuthStore()

      // UI state — safe to keep locally
      const { getSidebarCollapsed, getView } = usePersist()
      globalStore.sidebarCollapsed = getSidebarCollapsed()
      globalStore.currentView      = getView()

      // Preferences come from the user's schedulePrefs (returned with auth session)
      const prefs = authStore.user?.schedulePrefs || {}
      globalStore.lang       = prefs.lang       || (() => {
        const bl = (typeof navigator !== 'undefined' ? navigator.language : '') || ''
        return bl.toLowerCase().startsWith('es') ? 'es' : 'en'
      })()
      globalStore.weekStart  = prefs.weekStart  || 'sun'
      globalStore.tempUnit   = prefs.tempUnit   || 'C'
      globalStore.dateFormat = prefs.dateFormat || 'DD/MM/AA'

      if (authStore?.isLoggedIn) {
        // Projects, templates and org data always come from the server
        this.loadFromApi()
      }
    },

    async loadFromApi() {
      const authStore = useAuthStore()
      if (!authStore?.isLoggedIn) return
      this.cloudLoading = true
      try {
        const api = useApi()
        const [apiProjects, apiTemplates] = await Promise.all([
          api.get('/projects'),
          api.get('/schedule-templates'),
        ])

        const normProjects  = apiProjects.map(normalizeDoc)
        const normTemplates = apiTemplates.map(normalizeDoc)
        const globalStore   = useGlobalStore()

        // Apply per-user calendar visibility prefs — each user decides what they see
        const visibilityMap = authStore.user?.schedulePrefs?.calendarVisibility || {}
        normProjects.forEach(p => {
          const pref = visibilityMap[p.id] ?? visibilityMap[p.uid]
          p.hidden = pref !== undefined ? pref : false
        })

        migrateProjects(normProjects, normTemplates, globalStore.lang)

        // Preserve local updatedAt when it's newer than the server's value.
        // This prevents an auth-refresh reload from clobbering unsaved local edits
        // and reverting the sidebar sort order before the debounced sync fires.
        normProjects.forEach(serverProj => {
          const localProj = this.projects.find(p => p.id === serverProj.id)
          if (localProj && localProj.updatedAt > (serverProj.updatedAt || '')) {
            serverProj.updatedAt = localProj.updatedAt
          }
          // Same guard for editedAt so a reload before the debounced sync fires
          // can't revert the sidebar order after a fresh local edit.
          if (localProj && (localProj.editedAt || '') > (serverProj.editedAt || '')) {
            serverProj.editedAt = localProj.editedAt
          }
        })

        // API is the single source of truth — replace local state entirely
        this.projects = normProjects

        // Built-in IPS template is always bundled locally (never stored per-org in the API)
        const ipsTemplate = this.templates.find(t => t.source === 'unabase')
        this.templates = [
          ...(ipsTemplate ? [ipsTemplate] : []),
          ...normTemplates,
        ]

        // Select most recently edited active project if current selection is gone
        if (!this.selectedId || !this.projects.find(p => p.id === this.selectedId)) {
          const active = this.projects.filter(p => p.status !== 'archived' && p.isActive !== false)
          active.sort((a, b) => (Date.parse(b.updatedAt || b.createdAt || '') || 0) - (Date.parse(a.updatedAt || a.createdAt || '') || 0))
          if (active[0]) this.selectedId = active[0].id
        }

        this.migrationPending = false

        try { this.seedInitialData() } catch(e) { console.warn('seedInitialData error', e) }
        this._registerUnloadFlush()
      } catch (err) {
        console.warn('loadFromApi failed:', err)
      } finally {
        this.cloudLoading = false
      }
    },

    // Debounced PUT for a single project to the API
    _scheduleSyncProject(projId) {
      if (!isMongoId(projId)) return
      const proj = this.projects.find(p => p.id === projId)
      if (proj?.conflicted) return   // autosave paused until the user reloads
      if (_syncTimers.has(projId)) clearTimeout(_syncTimers.get(projId))
      _syncTimers.set(projId, setTimeout(() => {
        _syncTimers.delete(projId)
        this._putProject(projId)
      }, 1500))
    },

    // Immediate sync — flushes any pending debounce first. Await this before
    // opening the print pages: they re-fetch the project from the API, so a
    // debounced sync still in flight makes the PDF render stale data
    // (classic symptom: PDF one version behind the app).
    async syncProjectNow(projId) {
      if (!isMongoId(projId)) return
      if (_syncTimers.has(projId)) {
        clearTimeout(_syncTimers.get(projId))
        _syncTimers.delete(projId)
      }
      await this._putProject(projId)
    },

    // The single writer for project PUTs. Carries baseRev (optimistic
    // concurrency), adopts the server-assigned rev on success, and on a 409
    // conflict hands off to the conflict flow instead of overwriting. Saves are
    // serialized per project so an in-flight PUT can't be followed by another
    // one carrying a now-stale baseRev.
    async _putProject(projId) {
      if (!isMongoId(projId)) return
      const proj = this.projects.find(p => p.id === projId)
      if (!proj || proj.conflicted) return

      // Another save for this project is still in flight — retry shortly so we
      // send the freshly-adopted rev rather than a stale one.
      if (_inFlight.has(projId)) {
        if (_syncTimers.has(projId)) clearTimeout(_syncTimers.get(projId))
        _syncTimers.set(projId, setTimeout(() => {
          _syncTimers.delete(projId)
          this._putProject(projId)
        }, 400))
        return
      }

      _inFlight.add(projId)
      try {
        const { hidden: _hidden, conflicted: _conflicted, ...payload } = proj
        payload.baseRev = proj.rev ?? 0
        const updated = normalizeDoc(await useApi().put(`/projects/${projId}`, payload))
        const live = this.projects.find(p => p.id === projId)
        if (live) {
          live.rev = updated.rev
          if ((updated.updatedAt || '') > (live.updatedAt || '')) live.updatedAt = updated.updatedAt
        }
      } catch (e) {
        if (e.status === 409) {
          await this._handleConflict(projId, e.data?.project)
        } else {
          console.warn('Project sync failed:', projId, e.message)
        }
      } finally {
        _inFlight.delete(projId)
      }
    },

    // Someone else saved this calendar first. Pause autosave immediately (so
    // nothing clobbers their work) and let the user choose: load the fresh
    // server version, or keep editing locally without saving.
    async _handleConflict(projId, serverProject) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return

      proj.conflicted = true
      if (_syncTimers.has(projId)) { clearTimeout(_syncTimers.get(projId)); _syncTimers.delete(projId) }

      const globalStore = useGlobalStore()
      const en = globalStore.lang === 'en'
      const { choice } = useDialog()
      const pick = await choice({
        title: en ? 'Someone else saved changes' : 'Otra persona guardó cambios',
        body: en
          ? 'Another user saved this calendar while you were editing. To avoid overwriting their work, choose how to continue:'
          : 'Otra persona guardó este calendario mientras lo editabas. Para no pisar su trabajo, elegí cómo seguir:',
        choices: [
          { label: en ? 'Load the latest version' : 'Ver la versión más reciente', value: 'reload', primary: true },
          { label: en ? 'Keep mine (stop saving)'  : 'Seguir con la mía (no guardar)', value: 'keep' },
        ],
      })

      if (pick === 'reload') {
        this._adoptServerProject(projId, serverProject)
      } else {
        // Stay paused. Let the user know their edits won't persist until reload.
        try {
          useNuxtApp().$toast(
            en ? 'Your changes will not be saved until you reload the page.'
               : 'Tus cambios no se guardarán hasta que recargues la página.',
            { type: 'error' },
          )
        } catch { /* toast unavailable */ }
      }
    },

    // Replace the local copy of a project with the authoritative server copy.
    _adoptServerProject(projId, serverProject) {
      const idx = this.projects.findIndex(p => p.id === projId)
      if (idx === -1) return
      const globalStore = useGlobalStore()

      const finish = (doc) => {
        migrateProjects([doc], [], globalStore.lang)
        doc.hidden     = this.projects[idx]?.hidden ?? false   // per-user, not part of the shared doc
        doc.conflicted = false
        this.projects[idx] = doc
      }

      if (serverProject) {
        finish(normalizeDoc(serverProject))
      } else {
        useApi().get(`/projects/${projId}`)
          .then(fresh => finish(normalizeDoc(fresh)))
          .catch(e => console.warn('Reload after conflict failed:', e.message))
      }
    },

    // Registers pagehide + visibilitychange listeners that flush pending debounced syncs
    // before the page unloads. keepalive:true tells the browser to complete the fetch
    // even when the page is already navigating away (fixes the "Cmd+R too fast" problem).
    _registerUnloadFlush() {
      if (_unloadListenerRegistered) return
      _unloadListenerRegistered = true

      const config = useRuntimeConfig()
      const BASE   = config.public.apiUrl

      const flush = () => {
        let token = '', orgId = ''
        try {
          const authStore = useAuthStore()
          token = authStore.token || ''
          orgId = authStore.organization?._id || ''
        } catch { /* auth store unavailable */ }

        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` }  : {}),
          ...(orgId ? { Organization: orgId }               : {}),
        }

        for (const [projId, timer] of [..._syncTimers]) {
          clearTimeout(timer)
          _syncTimers.delete(projId)
          const proj = this.projects.find(p => p.id === projId)
          if (!proj || proj.conflicted) continue
          const { hidden: _h, conflicted: _c, ...payload } = proj
          payload.baseRev = proj.rev ?? 0   // carries the guard: a stale flush is rejected, never clobbers
          fetch(`${BASE}/projects/${projId}`, {
            method: 'PUT', keepalive: true, headers,
            body: JSON.stringify(payload),
          }).catch(() => {})
        }

        for (const [projId, timer] of [..._dailySyncTimers]) {
          clearTimeout(timer)
          _dailySyncTimers.delete(projId)
          const proj = this.projects.find(p => p.id === projId)
          if (!proj) continue
          fetch(`${BASE}/projects/${projId}/daily`, {
            method: 'PATCH', keepalive: true, headers,
            body: JSON.stringify({ dailySchedule: proj.dailySchedule, dailyConfig: proj.dailyConfig }),
          }).catch(() => {})
        }
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('pagehide', flush)
        window.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') flush()
        })
      }
    },

    // Debounced PATCH for daily-only changes — does NOT bump updatedAt on the server.
    _scheduleSyncDaily(projId) {
      if (!isMongoId(projId)) return
      if (_dailySyncTimers.has(projId)) clearTimeout(_dailySyncTimers.get(projId))
      _dailySyncTimers.set(projId, setTimeout(async () => {
        _dailySyncTimers.delete(projId)
        const proj = this.projects.find(p => p.id === projId)
        if (!proj) return
        try {
          await useApi().patch(`/projects/${projId}/daily`, {
            dailySchedule: proj.dailySchedule,
            dailyConfig:   proj.dailyConfig,
          })
        } catch (e) {
          console.warn('Daily sync failed:', projId, e.message)
        }
      }, 1500))
    },

    async _saveCalendarVisibilityPref(projectId, hidden) {
      const authStore = useAuthStore()
      if (!authStore?.isLoggedIn) return
      const current = authStore.user?.schedulePrefs?.calendarVisibility || {}
      const updated = { ...current, [projectId]: hidden }
      if (authStore.user?.schedulePrefs) {
        authStore.user.schedulePrefs.calendarVisibility = updated
      }
      try {
        await useApi().put('/users/me', { schedulePrefs: { calendarVisibility: updated } })
      } catch (e) {
        console.warn('Calendar visibility sync failed:', e.message)
      }
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
          dep: { active: false, eventId: '', relation: 'after', days: 1, broken: false },
          notes: '', order: i,
          completed: false, keyDate: false,
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
      // Schedule API sync for any project with unsaved changes
      try {
        const authStore = useAuthStore()
        if (authStore?.isLoggedIn) {
          this.projects
            .filter(p => p.hasChanges && isMongoId(p.id) && !p.conflicted)
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
        ep:             data.ep             || '',
        agencyProducer: data.agencyProducer || '',
        status:         data.status         || 'competing',
        color:        data.color        || '#06CCB4',
        lang,
        weekStart:    globalStore.weekStart || 'sun',
        tempUnit:     globalStore.tempUnit  || 'C',
        createdAt:    new Date().toISOString().split('T')[0],
        updatedAt:    new Date().toISOString(),
        editedAt:     new Date().toISOString(),
        version:      0,
        hasChanges:   false,
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
        dailySchedule: [],
        dailyConfig: { timezones: [] },
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
          const localEditedAt  = this.projects[idx].editedAt
          Object.assign(this.projects[idx], created, { id: created.id })
          if (localUpdatedAt > (this.projects[idx].updatedAt || '')) {
            this.projects[idx].updatedAt = localUpdatedAt
          }
          if ((localEditedAt || '') > (this.projects[idx].editedAt || '')) {
            this.projects[idx].editedAt = localEditedAt
          }
        }
        // Select the first project (newly created, unshifted to front)
        const first = this.projects[0]
        if (first) this.selectProject(first.id)
      } catch (e) {
        console.warn('Failed to create project on API:', e.message)
      }
    },

    updateProject(id, data) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj) return
      Object.assign(proj, data)
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
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

    setProjectWeekStart(id, weekStart) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj) return
      proj.weekStart = weekStart
      this.save()
      this._scheduleSyncProject(id)
    },

    setProjectTempUnit(id, tempUnit) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj) return
      proj.tempUnit = tempUnit
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
        proj.updatedAt = proj.editedAt = new Date().toISOString()
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
      this._saveCalendarVisibilityPref(id, proj.hidden)
    },

    cycleStatus(id) {
      const proj = this.projects.find(p => p.id === id)
      if (!proj || proj.status === 'archived') return
      const cycle = { competing: 'awarded', awarded: 'lost', lost: 'competing' }
      proj.status = cycle[proj.status] || 'competing'
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
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
        ep:             opts.ep             ?? src.ep,
        agencyProducer: opts.agencyProducer ?? src.agencyProducer,
        events:      newEvents,
        dailySchedule: opts.clearDates ? [] : JSON.parse(JSON.stringify(src.dailySchedule || [])),
        dailyConfig: JSON.parse(JSON.stringify(src.dailyConfig || { timezones: [] })),
        version:     0, hasChanges: false,
        createdAt:   new Date().toISOString().split('T')[0],
        updatedAt:   new Date().toISOString(),
        editedAt:    new Date().toISOString(),
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
      proj.updatedAt = proj.editedAt = new Date().toISOString()
      this.save()
    },

    updateEvent(projId, evId, body) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const ev = proj.events.find(e => e.id === evId)
      if (!ev) return
      Object.assign(ev, body)
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
      this.save()
    },

    deleteEvent(projId, evId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.events = proj.events.filter(e => e.id !== evId)
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
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
      proj.updatedAt = proj.editedAt = new Date().toISOString()
      this.save()
      return newGroup
    },

    addStage(projId, name) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const maxOrder = proj.stages.reduce((m, s) => Math.max(m, s.order ?? 0), -1)
      const newStage = { id: uid(), key: uid(), name, active: true, order: maxOrder + 1, color: null }
      proj.stages.push(newStage)
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
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
      proj.updatedAt = proj.editedAt = new Date().toISOString()
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
      proj.updatedAt = proj.editedAt = new Date().toISOString()
      this.save()
    },

    // Swap with the *visible* neighbor: the list hides inactive stages, so
    // swapping with a hidden one looks like the arrow did nothing. Orders are
    // re-normalized with the same sort criterion the views use, which also
    // fixes stages sharing a duplicate/missing order value.
    _moveStage(projId, stageId, dir) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const sorted = [...proj.stages]
        .sort((a, b) => (a.order ?? STAGE_ORDER[a.key] ?? 99) - (b.order ?? STAGE_ORDER[b.key] ?? 99))
      sorted.forEach((s, i) => { s.order = i })
      const visible = sorted.filter(s => s.active !== false)
      const idx  = visible.findIndex(s => s.id === stageId)
      const nIdx = dir === 'up' ? idx - 1 : idx + 1
      if (idx < 0 || nIdx < 0 || nIdx >= visible.length) return
      ;[visible[idx].order, visible[nIdx].order] = [visible[nIdx].order, visible[idx].order]
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
      this.save()
    },

    moveStageUp(projId, stageId)   { this._moveStage(projId, stageId, 'up') },

    moveStageDown(projId, stageId) { this._moveStage(projId, stageId, 'down') },

    setStageColor(projId, stageId, color) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const stage = proj.stages.find(s => s.id === stageId)
      if (!stage) return
      stage.color = color || null
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
      this.save()
    },

    // Clears every stage's custom color so all events fall back to the project
    // color. Used when the user sets a calendar color while stages have their
    // own colors (they confirm the override in ProjectModal first).
    clearStageColors(projId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      let changed = false
      ;(proj.stages || []).forEach(s => { if (s.color) { s.color = null; changed = true } })
      if (!changed) return
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
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
      } else {
        ;(proj.events || []).forEach(ev => {
          if (ev.stage === stage.key) ev.active = true
        })
      }
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
      this.recalcAndSave(projId)
    },

    deleteGroup(projId, groupId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const grp = proj.groups.find(g => g.id === groupId)
      proj.groups = proj.groups.filter(g => g.id !== groupId)
      proj.events.forEach(ev => {
        if (ev.groups) ev.groups = ev.groups.filter(gId => gId !== groupId && gId !== grp?.key)
      })
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
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
      proj.updatedAt = proj.editedAt = new Date().toISOString()
      this.recalcAndSave(projId)
    },

    setAllDeps(projId, enabled) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.events.forEach(ev => {
        if (ev.dep?.eventId) ev.dep.active = enabled
      })
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
      this.recalcAndSave(projId)
    },

    markChanged(projId) {
      const proj = this.projects.find(p => p.id === (projId || this.selectedId))
      if (proj) {
        proj.hasChanges = true
        proj.updatedAt = proj.editedAt = new Date().toISOString()
      }
    },

    bumpVersion(projId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.version = (proj.version ?? 0) + 1
      proj.hasChanges = false
      proj.updatedAt = proj.editedAt = new Date().toISOString()
      this.save()
      // Explicitly sync since hasChanges is now false (save() won't pick it up)
      this._scheduleSyncProject(projId)
    },

    // ── Daily Schedule ────────────────────────────────────────────────────────

    addDailyEvent(projId, item) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      if (!proj.dailySchedule) proj.dailySchedule = []
      proj.dailySchedule.push(item)
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
      this.save()
      this._scheduleSyncDaily(projId)
    },

    updateDailyEvent(projId, itemId, body) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      const item = (proj.dailySchedule || []).find(i => i.id === itemId)
      if (!item) return
      Object.assign(item, body)
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
      this.save()
      this._scheduleSyncDaily(projId)
    },

    deleteDailyEvent(projId, itemId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.dailySchedule = (proj.dailySchedule || []).filter(i => i.id !== itemId)
      proj.hasChanges = true
      proj.updatedAt = proj.editedAt = new Date().toISOString()
      this.save()
      this._scheduleSyncDaily(projId)
    },

    updateDailyConfig(projId, config) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return
      proj.dailyConfig = { ...(proj.dailyConfig || {}), ...config }
      this._scheduleSyncDaily(projId)
    },
  },
})
