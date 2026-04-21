export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

/**
 * Add N days to a date string.
 * @param {string} dateStr   - ISO date "YYYY-MM-DD"
 * @param {number} n         - days to add (negative = subtract)
 * @param {'calendar'|'business'} dayType
 * @param {Set<string>|null} holidayDates - active project holiday dates to skip in business mode
 */
export function addDays(dateStr, n, dayType = 'calendar', holidayDates = null) {
  let d = new Date(dateStr + 'T12:00:00')
  if (dayType === 'calendar') {
    d.setDate(d.getDate() + n)
  } else {
    let added = 0
    const step = n >= 0 ? 1 : -1
    while (added < Math.abs(n)) {
      d.setDate(d.getDate() + step)
      const dow = d.getDay()
      const ds  = d.toISOString().split('T')[0]
      if (dow !== 0 && dow !== 6 && (!holidayDates || !holidayDates.has(ds))) added++
    }
  }
  return d.toISOString().split('T')[0]
}

export function subtractDays(dateStr, n, dayType = 'calendar', holidayDates = null) {
  return addDays(dateStr, -n, dayType, holidayDates)
}

/**
 * Return true if a date string falls on a valid business day.
 * @param {string} dateStr
 * @param {Set<string>|null} holidayDates - active holiday dates to treat as non-working
 */
export function isBusinessDay(dateStr, holidayDates = null) {
  if (!dateStr) return false
  const dow = new Date(dateStr + 'T12:00:00').getDay()
  return dow !== 0 && dow !== 6 && (!holidayDates || !holidayDates.has(dateStr))
}

/**
 * Return the nearest valid business day to dateStr.
 * Rules per spec:
 *   Saturday  → search backward (Friday direction) first
 *   Sunday    → search forward  (Monday direction) first
 *   Weekday holiday → alternate backward / forward from the date
 * @param {string} dateStr
 * @param {Set<string>|null} holidayDates
 */
export function nearestBusinessDay(dateStr, holidayDates = null) {
  if (isBusinessDay(dateStr, holidayDates)) return dateStr

  function offset(d, n) {
    const dt = new Date(d + 'T12:00:00')
    dt.setDate(dt.getDate() + n)
    return dt.toISOString().split('T')[0]
  }

  const dow = new Date(dateStr + 'T12:00:00').getDay()

  if (dow === 6) {
    // Saturday → backward first
    for (let i = 1; i <= 14; i++) {
      const d = offset(dateStr, -i)
      if (isBusinessDay(d, holidayDates)) return d
    }
  } else if (dow === 0) {
    // Sunday → forward first
    for (let i = 1; i <= 14; i++) {
      const d = offset(dateStr, i)
      if (isBusinessDay(d, holidayDates)) return d
    }
  } else {
    // Weekday holiday → alternate backward / forward
    for (let i = 1; i <= 14; i++) {
      const prev = offset(dateStr, -i)
      if (isBusinessDay(prev, holidayDates)) return prev
      const next = offset(dateStr, i)
      if (isBusinessDay(next, holidayDates)) return next
    }
  }
  return dateStr // fallback
}

export function isoToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function toDisplayTemp(c, unit) {
  return unit === 'F' ? Math.round(c * 9 / 5 + 32) : c
}

export function tempSymbol(unit) {
  return unit === 'F' ? '°F' : '°C'
}

/**
 * Build a human-readable sentence describing an event's dependency.
 * Used by the calendar bar tooltip and the event edit modal.
 *
 * @param {object} ev          - the dependent event (has .name, .nameEN, .dep)
 * @param {object|null} refEv  - the base event ev.dep.eventId points to (null if missing)
 * @param {'es'|'en'} lang
 * @returns {string} a one-line explanation
 */
export function describeDependency(ev, refEv, lang = 'es') {
  const isEN = lang === 'en'
  const dep  = ev?.dep
  if (!dep?.eventId) return isEN ? 'No dependency' : 'Sin dependencia'

  const thisName = isEN ? (ev.nameEN || ev.name) : ev.name
  if (!refEv) {
    return isEN
      ? `"${thisName}" depends on a deleted or inactive event`
      : `"${thisName}" depende de un evento eliminado o desactivado`
  }

  const refName  = isEN ? (refEv.nameEN || refEv.name) : refEv.name
  const days     = dep.days    ?? 1
  // Day type comes from the event's own config, not the dep
  const dayType  = ev.durDayType || 'calendar'
  const anchor   = dep.anchor  || 'start'
  const rel      = dep.relation || 'after'
  const paused   = !dep.active

  if (isEN) {
    const anchorLabel = anchor === 'end' ? 'ends' : 'starts'
    const head = paused ? `(Paused) "${thisName}" would start` : `"${thisName}" starts`
    if (rel === 'same' || days === 0) {
      return `${head} the same day "${refName}" ${anchorLabel}`
    }
    const dayLabel = days === 1 ? 'day' : 'days'
    const relLabel = rel === 'after' ? 'after' : 'before'
    return `${head} ${days} ${dayLabel} ${relLabel} "${refName}" ${anchorLabel}`
  } else {
    const anchorLabel = anchor === 'end' ? 'termine' : 'comience'
    const head = paused ? `(Pausada) "${thisName}" empezaría` : `"${thisName}" empieza`
    if (rel === 'same' || days === 0) {
      return `${head} el mismo día en que "${refName}" ${anchorLabel}`
    }
    const dayLabel = days === 1 ? 'día' : 'días'
    const relLabel = rel === 'after' ? 'después de que' : 'antes de que'
    return `${head} ${days} ${dayLabel} ${relLabel} "${refName}" ${anchorLabel}`
  }
}
