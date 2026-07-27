import { defineStore } from 'pinia'
import { uid, fmtWhen } from '~/utils/helpers'
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
    // Legacy calendars with no departments field: recover only the ones their events
    // actually use, never the full production set (see createProjectDefaults).
    if (!proj.groups)  proj.groups  = groupsFromEvents(proj.events, proj.lang || lang)
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
// A calendar starts with NO departments: seeding Casting / Locaciones / Vestuario /
// Arte / Shooting Boards / Post assumes the user shoots commercials, and a law firm
// or an events agency has no use for them. Departments arrive with the template that
// needs them, or the user adds their own with the ＋ chip.
function createProjectDefaults() {
  return { stages: [], groups: [] }
}

// Departments a set of events actually references — so a calendar shows the chips its
// events need and nothing more. DEFAULT_GROUPS only supplies display names for the
// keys of the unabase production template; an unknown key shows as-is.
function groupsFromEvents(events, lang = 'es') {
  const keys = []
  ;(events || []).forEach(e => (e.groups || []).forEach(k => {
    if (k && !keys.includes(k)) keys.push(k)
  }))
  return keys.map(key => {
    const known = DEFAULT_GROUPS.find(g => g.key === key)
    return {
      id: 'g-' + key,
      key,
      name: known ? (lang === 'en' ? known.nameEN : known.name) : key,
      active: true,
    }
  })
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
const _pendingFlush           = new Map()   // projId → { baseRev, writes } sent by an unload flush whose response we couldn't read
const _retries                = new Map()   // projId → consecutive failed writes, for retry backoff
const _creating               = new Set()   // local ids with a create POST in flight
const _createTimers           = new Map()   // local id → retry timer for a failed create
const _createRetries          = new Map()   // local id → consecutive failed creates
const _conflictDialogs        = new Set()   // projIds whose conflict dialog is open
const _lastFreshCheck         = new Map()   // projId → ts of the last freshness probe
let   _freshTimer             = null        // interval that probes the open calendar
let   _freshListenersOn       = false
let   _savedFade              = null        // timer that hides the "saved" pill
let   _unloadListenerRegistered = false
let   _holidayWarnAt          = 0           // throttles the "holidays unavailable" notice

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
    // Save feedback. Until now every write failure was a console.warn, so if the
    // API went down the user kept working for half an hour believing their work
    // was saved. 'error' means there are unsaved changes and we're retrying.
    // 'conflict' is its own state: unlike 'error' it is NOT retrying — it waits for
    // the user to decide, so the pill must not promise a retry that never comes.
    saveState: 'idle',   // 'idle' | 'saving' | 'saved' | 'error' | 'conflict'
    // Who last saved each calendar on the SERVER, and when: projId → { revAt, name }.
    // Kept out of the project documents on purpose — those get replaced wholesale
    // when we adopt a fresh copy, and this has to survive that.
    lastUpdate: {},
  }),

  getters: {
    currentProject: (s) => s.projects.find(p => p.id === s.selectedId) || null,

    // "Last saved <when> by <who>" for the open calendar, or null when we've never
    // seen a write (a brand-new calendar) — in which case the header shows nothing.
    currentLastUpdate: (s) => s.lastUpdate[s.selectedId] || null,

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

        // API is the single source of truth — replace local state entirely, except
        // for calendars whose create POST hasn't landed yet: they only exist in
        // memory, so wiping the list here deleted them while a retry was pending.
        const pendingCreates = this.projects.filter(
          p => !isMongoId(p.id) && (_creating.has(p.id) || _createTimers.has(p.id))
        )
        this.projects = [...pendingCreates, ...normProjects]

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

        // "Last saved by X" comes free with this read — /projects carries revAt/revBy.
        normProjects.forEach(p => this._noteLastUpdate(p))

        try { this.seedInitialData() } catch(e) { console.warn('seedInitialData error', e) }
        this._registerUnloadFlush()
        this._registerFreshnessWatch()
      } catch (err) {
        console.warn('loadFromApi failed:', err)
      } finally {
        this.cloudLoading = false
      }
    },

    // ── Freshness: an open calendar must not silently fall behind ──────────────
    //
    // The app read from the server exactly once, at startup. A tab left open while
    // a teammate saved kept its stale `rev` forever and found out at the worst
    // possible moment: hours later, after the user had already edited on top of old
    // data, when the save came back 409. So ask on the way IN — when the user
    // returns to the calendar — instead of discovering it on the way out.
    //
    //  • Nothing moved         → NOTHING happens. No dialog, no toast, no spinner.
    //                            Someone who works alone never sees a trace of this.
    //  • Moved, nothing unsaved→ adopt the fresh copy and say who saved it.
    //  • Moved, unsaved edits  → leave it alone. Adopting here would be the same
    //                            data loss by the back door; the write path's own
    //                            409 guard owns that case.
    async checkFreshness(projId, { force = false } = {}) {
      const authStore = useAuthStore()
      if (!authStore?.isLoggedIn) return
      const id = projId || this.selectedId
      if (!isMongoId(id)) return
      const proj = this.projects.find(p => p.id === id)
      if (!proj || proj.conflicted) return

      // focus/visibilitychange arrive in bursts; one probe every few seconds is plenty.
      const last = _lastFreshCheck.get(id) || 0
      if (!force && Date.now() - last < 5000) return
      _lastFreshCheck.set(id, Date.now())

      let info
      try {
        info = await useApi().get(`/projects/${id}/rev`)
      } catch {
        return   // offline or transient. Staying quiet is right: the write path still guards.
      }

      const live = this.projects.find(p => p.id === id)
      if (!live || live.conflicted) return

      // Record who holds the current server version no matter what we do next — the
      // header shows it, and it's true even in the case where we can't adopt.
      if (info?.revAt) {
        this.lastUpdate = {
          ...this.lastUpdate,
          [id]: { revAt: info.revAt, name: this._resolveUserName(info.revBy), userId: info.revBy?.id || null },
        }
      }

      if ((info?.rev ?? 0) <= (live.rev ?? 0)) return   // up to date — say nothing

      // Unsaved work in the tab: don't touch it.
      if (live.hasChanges || _inFlight.has(id) || _syncTimers.has(id) || _dailySyncTimers.has(id)) return

      this._adoptServerProject(id, null, { quiet: true })

      // Own write from another tab: adopt it, but don't narrate it back to the user.
      const mine = info?.revBy?.id && String(info.revBy.id) === String(authStore.user?._id || authStore.user?.id)
      if (mine) return

      const globalStore = useGlobalStore()
      const en   = globalStore.lang === 'en'
      const who  = this.lastUpdate[id]?.name
      try {
        useNuxtApp().$toast(
          who
            ? (en ? `Updated with ${who}'s changes.` : `Actualizado con los cambios de ${who}.`)
            : (en ? 'Updated with your team\'s latest changes.' : 'Actualizado con los últimos cambios del equipo.'),
          { type: 'info' },
        )
      } catch { /* toast unavailable */ }
    },

    // Records "last saved by X at Y" from a full project document, where `revBy` is a
    // bare id (only the /rev probe populates it). Cheap enough to call on every read.
    _noteLastUpdate(doc) {
      if (!doc?.id || !doc.revAt) return
      const userId = doc.revBy?._id || doc.revBy?.id || doc.revBy || null
      // The /rev probe populates the user, so it can resolve a name even when the org
      // member list isn't loaded; a full-document read only carries the id. Don't let
      // the poorer source erase what the better one already found.
      const prev = this.lastUpdate[doc.id]
      const name = this._resolveUserName(userId ? { id: userId } : null)
        || (prev && String(prev.userId) === String(userId) ? prev.name : '')
      this.lastUpdate = {
        ...this.lastUpdate,
        [doc.id]: { revAt: doc.revAt, name, userId },
      }
    },

    // Prefer the org member list already in memory (it has real names); fall back to
    // whatever the API sent so we never show a raw id.
    _resolveUserName(revBy) {
      if (!revBy) return ''
      try {
        const settingsStore = useSettingsStore()
        const hit = (settingsStore.users || []).find(u => String(u.id) === String(revBy.id))
        if (hit?.name)  return hit.name
        if (hit?.email) return hit.email
      } catch { /* settings store unavailable */ }
      return revBy.name || revBy.email || ''
    },

    // Probe on the way back to the calendar, plus a slow tick so a tab left in the
    // foreground is never more than ~20s behind. Only while the tab is visible:
    // a backgrounded tab has nobody reading it.
    _registerFreshnessWatch() {
      if (_freshListenersOn || typeof window === 'undefined') return
      _freshListenersOn = true

      const probe = () => {
        if (document.visibilityState !== 'visible') return
        this.checkFreshness()
      }
      window.addEventListener('focus', probe)
      window.addEventListener('visibilitychange', probe)
      if (_freshTimer) clearInterval(_freshTimer)
      _freshTimer = setInterval(probe, 20000)
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
      this.saveState = 'saving'
      try {
        const { hidden: _hidden, conflicted: _conflicted, ...payload } = proj
        payload.baseRev = proj.rev ?? 0
        const updated = normalizeDoc(await useApi().put(`/projects/${projId}`, payload))
        const live = this.projects.find(p => p.id === projId)
        if (live) {
          live.rev = updated.rev
          if ((updated.updatedAt || '') > (live.updatedAt || '')) live.updatedAt = updated.updatedAt
        }
        this._onWriteOk(projId)
      } catch (e) {
        if (e.status === 409) {
          await this._handleConflict(projId, e.data?.project)
        } else {
          this._onWriteFailed(projId, e)
        }
      } finally {
        _inFlight.delete(projId)
      }
    },

    // ── Write outcome: surface it, and retry instead of dropping the edit ───────
    _onWriteOk(projId) {
      _retries.delete(projId)
      // Another calendar stuck in a conflict still has unsaved work — a successful
      // write here must not paint over that.
      if (this.projects.some(p => p.conflicted)) { this.saveState = 'conflict'; return }
      if (_syncTimers.size || _dailySyncTimers.size || _creating.size || _createTimers.size) {
        this.saveState = 'saving'
        return
      }
      this.saveState = 'saved'
      // Fade the confirmation away so the pill isn't permanent furniture; 'error'
      // never auto-hides, because that one the user needs to keep seeing.
      if (_savedFade) clearTimeout(_savedFade)
      _savedFade = setTimeout(() => {
        if (this.saveState === 'saved') this.saveState = 'idle'
      }, 2500)
    },

    // A failed save used to be a console.warn with no retry, so the edit was gone
    // and the UI looked normal. Retry with backoff and keep the state visible.
    _onWriteFailed(projId, err) {
      console.warn('Project sync failed:', projId, err?.message)
      this.saveState = 'error'
      const attempt = (_retries.get(projId) || 0) + 1
      _retries.set(projId, attempt)
      if (attempt > 6) return   // give up re-arming; the next user edit tries again
      const delay = Math.min(30000, 1000 * 2 ** (attempt - 1))   // 1s → 30s
      if (_syncTimers.has(projId)) clearTimeout(_syncTimers.get(projId))
      _syncTimers.set(projId, setTimeout(() => {
        _syncTimers.delete(projId)
        this._putProject(projId)
      }, delay))
    },

    // Someone else saved this calendar first. Pause autosave immediately (so
    // nothing clobbers their work) and let the user choose: load the fresh
    // server version, or keep editing locally without saving.
    //
    // The dialog cannot be dismissed. It used to be a plain choice dialog, where
    // Esc *and* Enter both resolved to something that wasn't 'reload' — so a reflex
    // keypress silently took the "keep mine, stop saving" branch and every later
    // edit in the session was quietly discarded.
    async _handleConflict(projId, serverProject) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return

      proj.conflicted = true
      this.saveState = 'conflict'   // autosave is paused: there ARE unsaved changes
      if (_syncTimers.has(projId)) { clearTimeout(_syncTimers.get(projId)); _syncTimers.delete(projId) }
      // Also drop any pending daily PATCH: it would fire after the conflict is
      // resolved, write the just-adopted server data straight back and bump rev,
      // handing every other editor a spurious conflict.
      if (_dailySyncTimers.has(projId)) { clearTimeout(_dailySyncTimers.get(projId)); _dailySyncTimers.delete(projId) }

      if (_conflictDialogs.has(projId)) return   // already asking; don't stack dialogs
      _conflictDialogs.add(projId)

      const globalStore = useGlobalStore()
      const en = globalStore.lang === 'en'
      const { alert } = useDialog()

      // Who got here first, so the notice can name them instead of saying "someone".
      const who = this._resolveUserName(
        serverProject?.revBy ? { id: serverProject.revBy?._id || serverProject.revBy } : null,
      ) || this.lastUpdate[projId]?.name || ''
      const when = fmtWhen(serverProject?.revAt || this.lastUpdate[projId]?.revAt, en)

      // ONE way out, on purpose. This used to offer "Keep mine (stop saving)" as a
      // peer option, and it read like the prudent choice — so people picked it after
      // twenty edits, kept working, and lost the entire session: there is no
      // localStorage behind this store, so those edits lived in the tab and nowhere
      // else. On a shared calendar the server copy wins; that was agreed the moment
      // the calendar was shared. All the user has to do here is find out.
      const attribution = who
        ? (en ? `${who} saved this calendar${when ? ` ${when}` : ''}.` : `${who} guardó este calendario${when ? ` ${when}` : ''}.`)
        : (en ? `Someone else saved this calendar${when ? ` ${when}` : ''}.` : `Otra persona guardó este calendario${when ? ` ${when}` : ''}.`)

      try {
        await alert({
          title: en ? 'This calendar moved on' : 'Este calendario avanzó',
          body: en
            ? `${attribution} Your view is being updated to their version, so you don't keep working on top of an old copy.`
            : `${attribution} Tu vista se actualiza a esa versión, para que no sigas trabajando sobre una copia vieja.`,
          confirmLabel: en ? 'OK' : 'Entendido',
        })
      } finally {
        _conflictDialogs.delete(projId)
      }

      // Only one outcome, including any dismissal we didn't foresee: get back in sync
      // with the server and resume saving.
      this._adoptServerProject(projId, serverProject)
    },

    // Reopens the conflict dialog for a paused calendar (from the header pill).
    // Always re-reads the server copy: by now the version carried by the original
    // 409 may itself be out of date.
    resolveConflict(projId) {
      const id = projId || this.selectedId
      const proj = this.projects.find(p => p.id === id) || this.projects.find(p => p.conflicted)
      if (!proj?.conflicted) return
      return this._handleConflict(proj.id, null)
    },

    // Replace the local copy of a project with the authoritative server copy.
    // `quiet` skips the save-state bump: adopting because the calendar moved ahead
    // is not a save, and flashing "Saved" for it would be a lie.
    _adoptServerProject(projId, serverProject, { quiet = false } = {}) {
      const idx = this.projects.findIndex(p => p.id === projId)
      if (idx === -1) return
      const globalStore = useGlobalStore()

      const finish = (doc) => {
        migrateProjects([doc], [], globalStore.lang)
        doc.hidden     = this.projects[idx]?.hidden ?? false   // per-user, not part of the shared doc
        doc.conflicted = false
        this.projects[idx] = doc
        this._noteLastUpdate(doc)
        _retries.delete(projId)
        if (!quiet) this._onWriteOk(projId)   // we're back in sync with the server
        else if (this.saveState === 'conflict' && !this.projects.some(p => p.conflicted)) {
          this.saveState = 'idle'
        }
      }

      if (serverProject) {
        finish(normalizeDoc(serverProject))
      } else {
        useApi().get(`/projects/${projId}`)
          .then(fresh => finish(normalizeDoc(fresh)))
          .catch(e => {
            console.warn('Reload after conflict failed:', e.message)
            // The notice just told the user their view was being updated, and it
            // wasn't. Say so: the calendar stays paused and the header pill is the
            // way back in.
            if (quiet) return
            const en = useGlobalStore().lang === 'en'
            try {
              useNuxtApp().$toast(
                en ? "Couldn't load the latest version. Nothing is being saved — click \"Unsaved\" in the header to try again."
                   : 'No se pudo cargar la versión más reciente. Nada se está guardando: hacé clic en "Sin guardar" en la cabecera para reintentar.',
                { type: 'error' },
              )
            } catch { /* toast unavailable */ }
          })
      }
    },

    // Flushes pending debounced syncs when the page is hidden or unloading.
    //
    // Two very different situations, handled differently on purpose:
    //  • Tab switch / app backgrounded (visibilitychange → hidden): the page stays
    //    alive, so we go through the normal writers. They carry baseRev, ADOPT the
    //    server's new rev, serialize against in-flight saves and surface genuine
    //    conflicts. Using fire-and-forget here used to leave the local rev one
    //    behind every time the user changed tabs — the next save then 409'd and the
    //    user got a phantom "someone else saved" dialog and lost work.
    //  • Real unload (pagehide): the page can die mid-request, so we must use
    //    keepalive fetches and cannot read the response. We record what we sent and
    //    reconcile if the page turns out to survive (bfcache restore, mobile resume).
    _registerUnloadFlush() {
      if (_unloadListenerRegistered) return
      _unloadListenerRegistered = true

      const config = useRuntimeConfig()
      const BASE   = config.public.apiUrl

      const flush = (isUnloading) => {
        if (!isUnloading) {
          for (const [projId, timer] of [..._syncTimers]) {
            clearTimeout(timer)
            _syncTimers.delete(projId)
            this._putProject(projId)
          }
          for (const [projId, timer] of [..._dailySyncTimers]) {
            clearTimeout(timer)
            _dailySyncTimers.delete(projId)
            this._patchDaily(projId)
          }
          return
        }

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

        // Remember baseRev + how many writes we fired per project, so a surviving
        // page can tell "my flush landed" from "someone else saved".
        const note = (projId, baseRev) => {
          const prev = _pendingFlush.get(projId)
          if (prev) prev.writes += 1
          else _pendingFlush.set(projId, { baseRev, writes: 1 })
        }

        for (const [projId, timer] of [..._syncTimers]) {
          clearTimeout(timer)
          _syncTimers.delete(projId)
          const proj = this.projects.find(p => p.id === projId)
          if (!proj || proj.conflicted) continue
          const { hidden: _h, conflicted: _c, ...payload } = proj
          payload.baseRev = proj.rev ?? 0   // carries the guard: a stale flush is rejected, never clobbers
          note(projId, payload.baseRev)
          fetch(`${BASE}/projects/${projId}`, {
            method: 'PUT', keepalive: true, headers,
            body: JSON.stringify(payload),
          }).catch(() => {})
        }

        for (const [projId, timer] of [..._dailySyncTimers]) {
          clearTimeout(timer)
          _dailySyncTimers.delete(projId)
          const proj = this.projects.find(p => p.id === projId)
          if (!proj || proj.conflicted) continue
          note(projId, proj.rev ?? 0)
          fetch(`${BASE}/projects/${projId}/daily`, {
            method: 'PATCH', keepalive: true, headers,
            body: JSON.stringify({
              dailySchedule: proj.dailySchedule,
              dailyConfig:   proj.dailyConfig,
              baseRev:       proj.rev ?? 0,   // carries the guard: a stale flush is rejected, never clobbers
            }),
          }).catch(() => {})
        }
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('pagehide', () => flush(true))
        window.addEventListener('pageshow', () => this._reconcileFlushed())
        window.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') flush(false)
          else this._reconcileFlushed()
        })
      }
    },

    // After an unload flush the page may come back alive (bfcache restore, mobile
    // app resume). We couldn't read those responses, so ask the server where the
    // rev landed:
    //   server === baseRev + writes → our flush landed; adopt the rev so the next
    //                                 save doesn't 409 against our own write.
    //   server === baseRev          → nothing landed; re-arm the save instead of
    //                                 silently dropping the user's last edits.
    //   anything else               → someone else wrote too; leave rev alone and
    //                                 let the guard surface a real conflict.
    async _reconcileFlushed() {
      if (!_pendingFlush.size) return
      for (const [projId, { baseRev, writes }] of [..._pendingFlush]) {
        _pendingFlush.delete(projId)
        const proj = this.projects.find(p => p.id === projId)
        if (!proj || proj.conflicted || !isMongoId(projId)) continue
        try {
          const fresh = await useApi().get(`/projects/${projId}`)
          const serverRev = fresh?.rev ?? 0
          const live = this.projects.find(p => p.id === projId)
          if (!live || live.conflicted) continue
          if (serverRev === baseRev + writes) live.rev = serverRev
          else if (serverRev === baseRev) this._scheduleSyncProject(projId)
        } catch { /* offline — leave state as is; the guard still protects us */ }
      }
    },

    // Debounced PATCH for daily-only changes — does NOT bump updatedAt on the server.
    //
    // Defers to a pending full-project PUT: every daily mutation also sets
    // hasChanges and calls save(), and that PUT already carries dailySchedule and
    // dailyConfig. Firing both was a redundant second write that (a) advanced rev
    // twice per edit, so a teammate's next save 409'd with a phantom "someone else
    // saved" conflict, and (b) during an unload flush raced the PUT with the same
    // baseRev, so whichever the server handled second was silently discarded.
    _scheduleSyncDaily(projId) {
      if (!isMongoId(projId)) return
      if (_syncTimers.has(projId) || _inFlight.has(projId)) return
      const proj = this.projects.find(p => p.id === projId)
      if (proj?.conflicted) return   // autosave paused until the user reloads
      if (_dailySyncTimers.has(projId)) clearTimeout(_dailySyncTimers.get(projId))
      _dailySyncTimers.set(projId, setTimeout(() => {
        _dailySyncTimers.delete(projId)
        this._patchDaily(projId)
      }, 1500))
    },

    // The single writer for daily PATCHes. Mirrors _putProject: carries baseRev
    // (optimistic concurrency), adopts the server-assigned rev on success, and
    // on a 409 hands off to the conflict flow. Shares `_inFlight` with
    // _putProject so a project PUT and a daily PATCH for the same project are
    // serialized and never race each other into a self-inflicted conflict.
    async _patchDaily(projId) {
      if (!isMongoId(projId)) return
      const proj = this.projects.find(p => p.id === projId)
      if (!proj || proj.conflicted) return

      // A save for this project is still in flight — retry shortly so we send
      // the freshly-adopted rev rather than a stale one.
      if (_inFlight.has(projId)) {
        if (_dailySyncTimers.has(projId)) clearTimeout(_dailySyncTimers.get(projId))
        _dailySyncTimers.set(projId, setTimeout(() => {
          _dailySyncTimers.delete(projId)
          this._patchDaily(projId)
        }, 400))
        return
      }

      _inFlight.add(projId)
      this.saveState = 'saving'
      try {
        const updated = await useApi().patch(`/projects/${projId}/daily`, {
          dailySchedule: proj.dailySchedule,
          dailyConfig:   proj.dailyConfig,
          baseRev:       proj.rev ?? 0,
        })
        const live = this.projects.find(p => p.id === projId)
        if (live && updated?.rev != null) live.rev = updated.rev
        this._onWriteOk(projId)
      } catch (e) {
        if (e.status === 409) {
          await this._handleConflict(projId, e.data?.project)
        } else {
          this._onWriteFailed(projId, e)
        }
      } finally {
        _inFlight.delete(projId)
      }
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
          // A calendar whose create never landed has no server id, so the sync above
          // skips it forever. Re-attempt the create instead of losing the calendar.
          this.projects
            .filter(p => !isMongoId(p.id) && !_creating.has(p.id) && !_createTimers.has(p.id))
            .forEach(p => this._apiCreateProject(p.id))
        }
      } catch { /* auth store may not be available during init */ }
    },

    selectProject(id) {
      this.selectedId = id
      // Opening a calendar is exactly the moment to find out whether it moved on.
      this.checkFreshness(id)
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
      const { stages, groups } = createProjectDefaults()

      let events = []
      const tmpl = data.templateId ? this.templates.find(t => t.id === data.templateId) : null
      if (tmpl) {
        tmpl.useCount = (tmpl.useCount || 0) + 1
        events = eventsFromTemplate(tmpl)
        if (tmpl.stages?.length) {
          stages.push(...tmpl.stages.map(s => ({ ...s, id: uid() })))
        }
        // Departments come from the template — its own list, or failing that the ones
        // its events reference. A calendar built from scratch gets none.
        if (tmpl.groups?.length) {
          groups.push(...tmpl.groups.map(g => ({ ...g, id: uid() })))
        } else {
          groups.push(...groupsFromEvents(events, lang))
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
      this._apiCreateProject(proj.id)

      return proj
    },

    // Creates the calendar on the API and swaps its local id for the server one.
    //
    // A failed create used to be a bare console.warn. The calendar kept its local
    // id, and every writer skips non-Mongo ids (`isMongoId` guard), so nothing ever
    // retried: the calendar looked completely normal and then vanished on reload,
    // events and all. Now it retries with backoff and reports through saveState.
    async _apiCreateProject(localId) {
      const authStore = useAuthStore()
      if (!authStore?.isLoggedIn) return
      if (_creating.has(localId)) return   // one POST at a time, or we'd create duplicates
      const proj = this.projects.find(p => p.id === localId)
      if (!proj || isMongoId(proj.id)) return

      if (_createTimers.has(localId)) { clearTimeout(_createTimers.get(localId)); _createTimers.delete(localId) }
      _creating.add(localId)
      this.saveState = 'saving'
      try {
        const created = normalizeDoc(await useApi().post('/projects', { ...proj }))
        const live = this.projects.find(p => p.id === localId)
        if (!live) {
          // Deleted while the POST was in flight — undo it on the server, otherwise
          // the calendar reappears on the next reload.
          if (isMongoId(created.id)) {
            useApi().delete(`/projects/${created.id}`).catch(() => {})
          }
        } else {
          // Adopt only the server-owned fields. Assigning the whole response over the
          // local copy discarded anything the user typed while the POST was in flight.
          live.id  = created.id
          live.uid = created.uid || live.uid
          live.rev = created.rev ?? 0
          if (created.createdAt) live.createdAt = created.createdAt
          if ((created.updatedAt || '') > (live.updatedAt || '')) live.updatedAt = created.updatedAt
          // Follow the selection instead of jumping to whatever sits at the top of
          // the list: the user may have switched calendars while the POST ran.
          if (this.selectedId === localId) this.selectedId = created.id
          // Edits made during the POST aren't on the server yet.
          if (live.hasChanges) this._scheduleSyncProject(live.id)
        }
        _createRetries.delete(localId)
        this._onWriteOk(localId)
      } catch (e) {
        this._onCreateFailed(localId, e)
      } finally {
        _creating.delete(localId)
      }
    },

    _onCreateFailed(localId, err) {
      console.warn('Failed to create project on API:', err?.message)
      this.saveState = 'error'
      const attempt = (_createRetries.get(localId) || 0) + 1
      _createRetries.set(localId, attempt)
      if (attempt > 6) return   // stop re-arming; the next user edit tries again via save()
      const delay = Math.min(30000, 1000 * 2 ** (attempt - 1))   // 1s → 30s
      if (_createTimers.has(localId)) clearTimeout(_createTimers.get(localId))
      _createTimers.set(localId, setTimeout(() => {
        _createTimers.delete(localId)
        this._apiCreateProject(localId)
      }, delay))
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
      // Cancel a pending create first, or the retry would resurrect the calendar
      // the user just deleted.
      if (_createTimers.has(id)) { clearTimeout(_createTimers.get(id)); _createTimers.delete(id) }
      _createRetries.delete(id)
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
        // Send the state we just switched to — the endpoint used to always archive,
        // so "restore" archived the calendar again on the server.
        useApi().patch(`/projects/${id}/archive`, { archived: proj.status === 'archived' })
          .catch(e => console.warn('archive API failed:', e.message))
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
      this._apiCreateProject(proj.id)

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

    // Recalculates dependent dates, then saves.
    //
    // Business-day math needs the holiday list, and a missing list is NOT the same
    // as "no holidays": recalculating without it puts dates on holidays and then
    // persists them, quietly corrupting a calendar that was right before. So if a
    // configured country/year isn't loaded, fetch it first; if it can't be fetched,
    // leave the dates untouched and tell the user. The already-loaded case (the
    // normal one, the calendar view prefetches) still runs synchronously — callers
    // read the recalculated dates right after this returns.
    recalcAndSave(projId) {
      const proj = this.projects.find(p => p.id === projId)
      if (!proj) return

      const holidaysStore = useHolidaysStore()
      const codes = (proj.holidays || []).map(h => h.countryCode).filter(Boolean)
      const years = [...new Set(
        (proj.events || []).filter(e => e.date).map(e => Number(e.date.slice(0, 4)))
      )]
      const missing = []
      codes.forEach(code => years.forEach(year => {
        if (!holidaysStore.isLoaded(code, year)) missing.push([code, year])
      }))

      if (!missing.length) { this._recalcNow(projId); return }

      // Persist the edit that triggered this right away — only the derived dates wait.
      this.save()
      Promise.all(missing.map(([code, year]) => holidaysStore.fetchHolidaysForYear(code, year)))
        .then(results => {
          if (results.some(r => r === null)) { this._warnHolidaysUnavailable(); return }
          this._recalcNow(projId)
        })
        .catch(() => this._warnHolidaysUnavailable())
    },

    // Holidays couldn't be loaded, so business-day dates weren't recalculated.
    // Silence here is what makes it dangerous: the user sees dates that look final.
    _warnHolidaysUnavailable() {
      const now = Date.now()
      if (now - _holidayWarnAt < 30000) return
      _holidayWarnAt = now
      const en = useGlobalStore().lang === 'en'
      try {
        useNuxtApp().$toast(
          en ? "Couldn't load the holiday list, so dates that depend on business days were left as they were. Check your connection and edit again."
             : 'No se pudo cargar la lista de feriados, así que las fechas que dependen de días hábiles quedaron como estaban. Revisá la conexión y volvé a editar.',
          { type: 'error' },
        )
      } catch { /* toast unavailable */ }
    },

    _recalcNow(projId) {
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
