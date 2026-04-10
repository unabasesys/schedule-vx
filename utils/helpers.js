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

export function addDays(dateStr, n, dayType = 'calendar') {
  let d = new Date(dateStr + 'T12:00:00')
  if (dayType === 'calendar') {
    d.setDate(d.getDate() + n)
  } else {
    let added = 0
    const step = n >= 0 ? 1 : -1
    while (added < Math.abs(n)) {
      d.setDate(d.getDate() + step)
      const dow = d.getDay()
      if (dow !== 0 && dow !== 6) added++
    }
  }
  return d.toISOString().split('T')[0]
}

export function subtractDays(dateStr, n, dayType = 'calendar') {
  return addDays(dateStr, -n, dayType)
}

export function isoToday() {
  return new Date().toISOString().split('T')[0]
}

export function toDisplayTemp(c, unit) {
  return unit === 'F' ? Math.round(c * 9 / 5 + 32) : c
}

export function tempSymbol(unit) {
  return unit === 'F' ? '°F' : '°C'
}
