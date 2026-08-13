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
      const ds  = ymd(d)
      if (dow !== 0 && dow !== 6 && (!holidayDates || !holidayDates.has(ds))) added++
    }
  }
  return ymd(d)
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
    return ymd(dt)
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

/**
 * "YYYY-MM-DD" for a Date, read in the LOCAL calendar.
 *
 * Never use `toISOString().split('T')[0]` for this: that reads the date in UTC, so a
 * Date built from local parts comes back shifted a day whenever the local clock and
 * UTC disagree about which day it is — which is most of every evening in the Americas.
 * The date strings in this app ARE the user's calendar days, so they have to be read
 * the way the user reads them.
 */
export function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isoToday() {
  return ymd(new Date())
}

const MONTHS_SHORT_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const MONTHS_SHORT_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/**
 * When something happened, phrased the way a person would say it: relative while
 * that still carries information ("hace 4 min"), absolute once it doesn't
 * ("el 3 jun, 14:20" beats "hace 5 días" when you're deciding whether to trust
 * what's on your screen). Returns '' for a missing or unparseable value, so
 * callers can render nothing rather than "Invalid Date".
 */
export function fmtWhen(value, en = false) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''

  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 0)   return ''                                     // clock skew — say nothing
  if (mins < 1)   return en ? 'just now'     : 'recién'
  if (mins < 60)  return en ? `${mins} min ago` : `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return en ? `${hrs}h ago`  : `hace ${hrs} h`

  // The preposition belongs here, not at the call sites: every caller drops this
  // into a sentence ("Ana guardó este calendario ___", "Actualizado ___ por Ana")
  // and only the absolute form needs one.
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return en
    ? `on ${MONTHS_SHORT_EN[d.getMonth()]} ${d.getDate()}, ${time}`
    : `el ${d.getDate()} ${MONTHS_SHORT_ES[d.getMonth()]}, ${time}`
}

/**
 * Participants of a daily event, each with the role (`title`) the directory has for
 * them — "Ana Pérez · Productora". The role is looked up at render time instead of
 * being baked into the saved `participants` string, so changing a cargo in Contacts
 * updates every event that person is in.
 *
 * Order matches what the event stored: linked contacts first, then ad-hoc names.
 * Anyone whose contact can't be resolved (deleted from the directory, or the
 * directory hasn't loaded yet) is recovered from the saved string, so a participant
 * never disappears just because we couldn't look them up.
 *
 * @param {object} item          - daily event
 * @param {object} contactById   - map of contact id → contact
 * @param {object} [contactByName] - map of lowercased name → contact, or null if
 *                                 ambiguous; used to give legacy events their roles
 * @returns {Array<{name: string, role: string}>}
 */
export function participantEntries(item, contactById = {}, contactByName = {}) {
  const ids   = Array.isArray(item?.participantIds)   ? item.participantIds   : []
  const extra = Array.isArray(item?.participantNames) ? item.participantNames : []
  const saved = String(item?.participants || '').split(',').map(s => s.trim()).filter(Boolean)

  const roleFor = (name) => contactByName?.[String(name || '').trim().toLowerCase()]?.title || ''

  const out  = []
  const seen = new Set()
  const push = (name, role) => {
    if (!name) return
    out.push({ name, role: role || '' })
    seen.add(name)
  }

  for (const id of ids) {
    const c = contactById?.[id]
    if (c?.name) push(c.name, c.title)
  }
  for (const n of extra) push(n, roleFor(n))
  for (const n of saved) if (!seen.has(n)) push(n, roleFor(n))

  return out
}

/**
 * Lowercased name → contact, but only for names that belong to exactly one contact.
 * Two people called "Ana" make the name useless as a key, and guessing which cargo
 * to print is worse than printing none.
 */
export function contactsByUniqueName(contacts = []) {
  const m = {}
  for (const c of contacts) {
    const k = String(c?.name || '').trim().toLowerCase()
    if (!k) continue
    m[k] = k in m ? null : c
  }
  return m
}

export function toDisplayTemp(c, unit) {
  return unit === 'F' ? Math.round(c * 9 / 5 + 32) : c
}

export function tempSymbol(unit) {
  return unit === 'F' ? '°F' : '°C'
}

/**
 * Convert HH:MM from one IANA timezone to another for a given calendar date.
 * Returns 'HH:MM' (24h) or null on error.
 */
export function convertTimezone(dateStr, timeHHMM, fromTz, toTz) {
  if (!dateStr || !timeHHMM || !fromTz || !toTz || fromTz === toTz) return timeHHMM
  try {
    const [y, mo, d] = dateStr.split('-').map(Number)
    const [h, mi]    = timeHHMM.split(':').map(Number)
    const naiveUTC   = new Date(Date.UTC(y, mo - 1, d, h, mi, 0))
    const shown = new Intl.DateTimeFormat('en-US', {
      timeZone: fromTz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(naiveUTC)
    const [shRaw, sm] = shown.split(':').map(Number)
    const sh      = shRaw === 24 ? 0 : shRaw  // Intl returns "24:00" for midnight
    const diffMin = (h * 60 + mi) - (sh * 60 + sm)
    const realUTC  = new Date(naiveUTC.getTime() + diffMin * 60000)
    return new Intl.DateTimeFormat('en-US', {
      timeZone: toTz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(realUTC)
  } catch { return null }
}

/** Format HH:MM (24h) as "h:MM AM/PM" */
export function fmt12h(timeHHMM) {
  if (!timeHHMM) return ''
  const [h, m] = timeHHMM.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12    = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
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
