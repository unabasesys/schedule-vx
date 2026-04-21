import { addDays, subtractDays } from '~/utils/helpers'

export function useDependencyEngine() {
  /**
   * Compute the end date of an event based on its start, duration, and dayType.
   * Duration of 1 means a single day → end = start.
   */
  function getEndDate(ev, activeHolidayDates = null) {
    if (!ev.date) return ev.date
    const n = Math.max(1, ev.duration || 1) - 1
    if (n === 0) return ev.date
    return addDays(ev.date, n, ev.durDayType || 'calendar', activeHolidayDates)
  }

  /**
   * Topological sort + recalculate dates for all auto events in a project.
   * Mutates proj.events in place.
   *
   * dep object fields used here:
   *   active    {boolean}
   *   eventId   {string}   — reference event
   *   anchor    {'start'|'end'} — which date of the reference event to use (default 'start')
   *   relation  {'after'|'before'|'same'}
   *   days      {number}
   *   dayType   {'calendar'|'business'}
   *
   * @param {Object} proj
   * @param {Set<string>|null} activeHolidayDates
   */
  function recalcProject(proj, activeHolidayDates = null) {
    const evMap = {}
    proj.events.forEach(e => { evMap[e.id] = e })

    const visited = new Set()
    const order = []

    function visit(evId, chain = []) {
      if (chain.includes(evId)) return
      if (visited.has(evId)) return
      visited.add(evId)
      const ev = evMap[evId]
      if (!ev) return
      if (ev.dep && ev.dep.active && ev.dep.eventId && ev.dateMode !== 'manual') {
        visit(ev.dep.eventId, [...chain, evId])
      }
      order.push(evId)
    }

    proj.events.forEach(e => visit(e.id))

    order.forEach(evId => {
      const ev = evMap[evId]
      if (!ev || ev.dateMode === 'manual' || !ev.dep || !ev.dep.active || !ev.dep.eventId) return

      const base = evMap[ev.dep.eventId]
      if (!base || !base.active || !base.date) {
        ev.dep.broken = true
        return
      }
      ev.dep.broken = false

      const days       = ev.dep.days    || 0
      // Count offset days using the event's own day type (calendar vs business),
      // not a separate dep.dayType — the event's configuration already defines
      // whether it works weekends or not, so the dependency must respect that.
      const dayType    = ev.durDayType  || 'calendar'

      // Determine the anchor date on the reference event
      const anchor     = ev.dep.anchor || 'start'
      const anchorDate = anchor === 'end'
        ? getEndDate(base, activeHolidayDates)
        : base.date

      if (ev.dep.relation === 'same') {
        ev.date = anchorDate
      } else if (ev.dep.relation === 'after') {
        ev.date = addDays(anchorDate, days, dayType, activeHolidayDates)
      } else {
        // 'before'
        ev.date = subtractDays(anchorDate, days, dayType, activeHolidayDates)
      }

      // If the event itself uses business-day duration, its start date must land
      // on a valid business day. If the dependency calculation placed it on a
      // weekend or holiday, snap it forward to the next business day.
      if ((ev.durDayType || 'calendar') === 'business' && ev.date) {
        const dow       = new Date(ev.date + 'T12:00:00').getDay()
        const onHoliday = activeHolidayDates ? activeHolidayDates.has(ev.date) : false
        if (dow === 0 || dow === 6 || onHoliday) {
          ev.date = addDays(ev.date, 1, 'business', activeHolidayDates)
        }
      }
    })
  }

  /**
   * DFS reachability check to detect circular dependencies.
   * Returns true if adding newDepId as dependency of evId would create a cycle.
   */
  function hasCircularDep(proj, evId, newDepId) {
    const evMap = {}
    proj.events.forEach(e => { evMap[e.id] = e })

    function reachable(from, target, vis = new Set()) {
      if (from === target) return true
      if (vis.has(from)) return false
      vis.add(from)
      const ev = evMap[from]
      if (!ev || !ev.dep || !ev.dep.active || !ev.dep.eventId) return false
      return reachable(ev.dep.eventId, target, vis)
    }

    return reachable(newDepId, evId)
  }

  return { recalcProject, hasCircularDep, getEndDate }
}
