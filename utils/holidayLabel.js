// Holiday names in the calendar's language, tagged with their country.
//
// Nager.Date gives two names per holiday: `name` (always English) and `localName`
// (the country's own language). Neither one alone follows the calendar language:
// a Spanish calendar with US holidays only gets English names. So:
//   en → `name`
//   es → `localName` when the country speaks Spanish, otherwise our translation of
//        `name`, falling back to the English name when we have none.

const SPANISH_SPEAKING = new Set([
  'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'ES', 'GQ', 'GT', 'HN',
  'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'UY', 'VE',
])

// English Nager names → Spanish. Mostly US, CA and GB, the non-Spanish countries
// productions use the most.
const ES = {
  "New Year's Day":                       'Año Nuevo',
  'Martin Luther King, Jr. Day':          'Día de Martin Luther King Jr.',
  "Lincoln's Birthday":                   'Natalicio de Lincoln',
  'Presidents Day':                       'Día de los Presidentes',
  "Washington's Birthday":                'Día de los Presidentes',
  'Maundy Thursday':                      'Jueves Santo',
  'Good Friday':                          'Viernes Santo',
  'Easter Sunday':                        'Domingo de Pascua',
  'Easter Monday':                        'Lunes de Pascua',
  'Truman Day':                           'Día de Truman',
  'Memorial Day':                         'Día de los Caídos',
  'Juneteenth National Independence Day': 'Juneteenth',
  'Juneteenth':                           'Juneteenth',
  'Independence Day':                     'Día de la Independencia',
  'Labour Day':                           'Día del Trabajo',
  'Labor Day':                            'Día del Trabajo',
  'Columbus Day':                         'Día de Colón',
  "Indigenous Peoples' Day":              'Día de los Pueblos Indígenas',
  'Veterans Day':                         'Día de los Veteranos',
  'Thanksgiving Day':                     'Día de Acción de Gracias',
  'Thanksgiving':                         'Día de Acción de Gracias',
  'Christmas Day':                        'Navidad',
  'Christmas Eve':                        'Nochebuena',
  "New Year's Eve":                       'Nochevieja',
  'Boxing Day':                           'Boxing Day',
  'Canada Day':                           'Día de Canadá',
  'Victoria Day':                         'Día de Victoria',
  'Civic Holiday':                        'Feriado Cívico',
  'Remembrance Day':                      'Día del Recuerdo',
  'National Day for Truth and Reconciliation': 'Día de la Verdad y la Reconciliación',
  'Early May Bank Holiday':               'Feriado bancario de mayo',
  'Spring Bank Holiday':                  'Feriado bancario de primavera',
  'Summer Bank Holiday':                  'Feriado bancario de verano',
  'All Saints Day':                       'Día de Todos los Santos',
  "All Saints' Day":                      'Día de Todos los Santos',
  'Assumption Day':                       'Asunción de la Virgen',
  'Ascension Day':                        'Ascensión',
  'Whit Monday':                          'Lunes de Pentecostés',
  'Pentecost':                            'Pentecostés',
  'Epiphany':                             'Epifanía',
  'Carnival':                             'Carnaval',
}

export function holidayName(h, lang) {
  if (!h) return ''
  if (lang === 'en') return h.name || h.localName || ''
  if (SPANISH_SPEAKING.has(h.countryCode)) return h.localName || h.name || ''
  return ES[h.name] || h.name || h.localName || ''
}

// Label for every holiday that falls on one date, across the project's countries.
// Same name in several countries is shown once: "Navidad (MX, US)". Different
// names are joined: "Día de Colón (US) · Día de la Raza (CL)". Nager repeats some
// holidays with different `types` (US Good Friday, Columbus Day), hence the dedupe.
export function holidayLabel(list, lang) {
  const byName = new Map()
  for (const h of list || []) {
    const name = holidayName(h, lang)
    if (!name) continue
    if (!byName.has(name)) byName.set(name, [])
    const codes = byName.get(name)
    if (h.countryCode && !codes.includes(h.countryCode)) codes.push(h.countryCode)
  }
  return [...byName]
    .map(([name, codes]) => codes.length ? `${name} (${codes.join(', ')})` : name)
    .join(' · ')
}
