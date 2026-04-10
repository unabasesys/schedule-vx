import { addDays, subtractDays } from '~/utils/helpers'

export function useDependencyEngine() {
  /**
   * Topological sort + recalculate dates for all auto events in a project.
   * Mutates proj.events in place.
   */
  function recalcProject(proj) {
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

      const days    = ev.dep.days    || 0
      const dayType = ev.dep.dayType || 'calendar'

      if (ev.dep.relation === 'same') {
        ev.date = base.date
      } else if (ev.dep.relation === 'after') {
        ev.date = addDays(base.date, days, dayType)
      } else {
        ev.date = subtractDays(base.date, days, dayType)
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

  return { recalcProject, hasCircularDep }
}
