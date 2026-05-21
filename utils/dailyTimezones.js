// Curated timezone options for the Daily Schedule picker.
// Each option maps a friendly city/state/country label to an IANA timezone.
// `tz` mirrors `iana` for backward compatibility with existing stored data.

export const DAILY_TIMEZONE_OPTIONS = [
  // ── USA — Eastern Time ───────────────────────────────────────────────────────
  {
    label: 'Miami, Florida, USA — Eastern Time (ET)',
    shortLabel: 'Eastern Time (ET)',
    city: 'Miami', state: 'Florida', country: 'United States',
    iana: 'America/New_York', tz: 'America/New_York',
    timezoneGroup: 'Eastern Time', abbreviationGeneric: 'ET',
    tooltip: 'Eastern Time (ET). Common in New York, Miami, Washington DC, Atlanta, Boston and most of Florida. Uses EST or EDT depending on daylight saving time.',
    keywords: ['miami', 'florida', 'eastern', 'et', 'est', 'edt', 'usa'],
  },
  {
    label: 'New York, USA — Eastern Time (ET)',
    shortLabel: 'Eastern Time (ET)',
    city: 'New York', state: 'New York', country: 'United States',
    iana: 'America/New_York', tz: 'America/New_York',
    timezoneGroup: 'Eastern Time', abbreviationGeneric: 'ET',
    tooltip: 'Eastern Time (ET). Common in New York City, New Jersey and Connecticut. Uses EST or EDT depending on daylight saving time.',
    keywords: ['new york', 'ny', 'nyc', 'manhattan', 'eastern', 'et', 'est', 'edt', 'usa'],
  },
  {
    label: 'Washington DC, USA — Eastern Time (ET)',
    shortLabel: 'Eastern Time (ET)',
    city: 'Washington DC', state: 'DC', country: 'United States',
    iana: 'America/New_York', tz: 'America/New_York',
    timezoneGroup: 'Eastern Time', abbreviationGeneric: 'ET',
    tooltip: 'Eastern Time (ET). Washington DC and surrounding mid-Atlantic states. Uses EST or EDT depending on daylight saving time.',
    keywords: ['washington', 'dc', 'virginia', 'maryland', 'eastern', 'et', 'est', 'edt', 'usa'],
  },
  {
    label: 'Atlanta, Georgia, USA — Eastern Time (ET)',
    shortLabel: 'Eastern Time (ET)',
    city: 'Atlanta', state: 'Georgia', country: 'United States',
    iana: 'America/New_York', tz: 'America/New_York',
    timezoneGroup: 'Eastern Time', abbreviationGeneric: 'ET',
    tooltip: 'Eastern Time (ET). Common in Atlanta and the southeastern USA. Uses EST or EDT depending on daylight saving time.',
    keywords: ['atlanta', 'georgia', 'southeastern', 'eastern', 'et', 'est', 'edt', 'usa'],
  },

  // ── USA — Central Time ───────────────────────────────────────────────────────
  {
    label: 'Chicago, Illinois, USA — Central Time (CT)',
    shortLabel: 'Central Time (CT)',
    city: 'Chicago', state: 'Illinois', country: 'United States',
    iana: 'America/Chicago', tz: 'America/Chicago',
    timezoneGroup: 'Central Time', abbreviationGeneric: 'CT',
    tooltip: 'Central Time (CT). Common in Chicago, Dallas, Houston, Nashville and New Orleans. Uses CST or CDT depending on daylight saving time.',
    keywords: ['chicago', 'illinois', 'central', 'ct', 'cst', 'cdt', 'usa'],
  },
  {
    label: 'Dallas, Texas, USA — Central Time (CT)',
    shortLabel: 'Central Time (CT)',
    city: 'Dallas', state: 'Texas', country: 'United States',
    iana: 'America/Chicago', tz: 'America/Chicago',
    timezoneGroup: 'Central Time', abbreviationGeneric: 'CT',
    tooltip: 'Central Time (CT). Common in Dallas, Houston and Austin. Uses CST or CDT depending on daylight saving time.',
    keywords: ['dallas', 'houston', 'austin', 'texas', 'tx', 'central', 'ct', 'cst', 'cdt', 'usa'],
  },
  {
    label: 'Nashville, Tennessee, USA — Central Time (CT)',
    shortLabel: 'Central Time (CT)',
    city: 'Nashville', state: 'Tennessee', country: 'United States',
    iana: 'America/Chicago', tz: 'America/Chicago',
    timezoneGroup: 'Central Time', abbreviationGeneric: 'CT',
    tooltip: 'Central Time (CT). Common in Nashville and western Tennessee. Uses CST or CDT depending on daylight saving time.',
    keywords: ['nashville', 'tennessee', 'memphis', 'central', 'ct', 'cst', 'cdt', 'usa'],
  },

  // ── USA — Mountain Time ──────────────────────────────────────────────────────
  {
    label: 'Denver, Colorado, USA — Mountain Time (MT)',
    shortLabel: 'Mountain Time (MT)',
    city: 'Denver', state: 'Colorado', country: 'United States',
    iana: 'America/Denver', tz: 'America/Denver',
    timezoneGroup: 'Mountain Time', abbreviationGeneric: 'MT',
    tooltip: 'Mountain Time (MT). Common in Denver, Salt Lake City and Albuquerque. Uses MST or MDT depending on daylight saving time.',
    keywords: ['denver', 'colorado', 'salt lake', 'utah', 'albuquerque', 'new mexico', 'mountain', 'mt', 'mst', 'mdt', 'usa'],
  },
  {
    label: 'Phoenix, Arizona, USA — Arizona Time (MST)',
    shortLabel: 'Arizona Time (MST)',
    city: 'Phoenix', state: 'Arizona', country: 'United States',
    iana: 'America/Phoenix', tz: 'America/Phoenix',
    timezoneGroup: 'Arizona Time', abbreviationGeneric: 'MST',
    tooltip: 'Arizona Time. Most of Arizona does not observe daylight saving time, so this may differ from Mountain Time for part of the year.',
    keywords: ['phoenix', 'arizona', 'az', 'mst', 'no dst', 'usa'],
  },

  // ── USA — Pacific Time ───────────────────────────────────────────────────────
  {
    label: 'Los Angeles, California, USA — Pacific Time (PT)',
    shortLabel: 'Pacific Time (PT)',
    city: 'Los Angeles', state: 'California', country: 'United States',
    iana: 'America/Los_Angeles', tz: 'America/Los_Angeles',
    timezoneGroup: 'Pacific Time', abbreviationGeneric: 'PT',
    tooltip: 'Pacific Time (PT). Common in Los Angeles, San Francisco, Seattle, Las Vegas and Portland. Uses PST or PDT depending on daylight saving time.',
    keywords: ['los angeles', 'la', 'california', 'ca', 'san francisco', 'sf', 'seattle', 'las vegas', 'portland', 'pacific', 'pt', 'pst', 'pdt', 'usa'],
  },
  {
    label: 'Seattle, Washington, USA — Pacific Time (PT)',
    shortLabel: 'Pacific Time (PT)',
    city: 'Seattle', state: 'Washington', country: 'United States',
    iana: 'America/Los_Angeles', tz: 'America/Los_Angeles',
    timezoneGroup: 'Pacific Time', abbreviationGeneric: 'PT',
    tooltip: 'Pacific Time (PT). Common in Seattle, Portland and the Pacific Northwest. Uses PST or PDT depending on daylight saving time.',
    keywords: ['seattle', 'washington', 'wa', 'portland', 'oregon', 'pacific', 'pt', 'pst', 'pdt', 'usa'],
  },

  // ── USA — Alaska & Hawaii ────────────────────────────────────────────────────
  {
    label: 'Anchorage, Alaska, USA — Alaska Time (AKT)',
    shortLabel: 'Alaska Time (AKT)',
    city: 'Anchorage', state: 'Alaska', country: 'United States',
    iana: 'America/Anchorage', tz: 'America/Anchorage',
    timezoneGroup: 'Alaska Time', abbreviationGeneric: 'AKT',
    tooltip: 'Alaska Time (AKT). Common in Anchorage and most of Alaska. Uses AKST or AKDT depending on daylight saving time.',
    keywords: ['anchorage', 'alaska', 'ak', 'akt', 'akst', 'akdt', 'usa'],
  },
  {
    label: 'Honolulu, Hawaii, USA — Hawaii Time (HT)',
    shortLabel: 'Hawaii Time (HT)',
    city: 'Honolulu', state: 'Hawaii', country: 'United States',
    iana: 'Pacific/Honolulu', tz: 'Pacific/Honolulu',
    timezoneGroup: 'Hawaii Time', abbreviationGeneric: 'HT',
    tooltip: 'Hawaii Time (HT). Hawaii does not observe daylight saving time. Offset is always UTC-10.',
    keywords: ['honolulu', 'hawaii', 'hi', 'ht', 'hst', 'usa'],
  },

  // ── México ───────────────────────────────────────────────────────────────────
  {
    label: 'Ciudad de México, México — Hora del Centro',
    shortLabel: 'Hora del Centro (CST/CDT)',
    city: 'Ciudad de México', state: null, country: 'México',
    iana: 'America/Mexico_City', tz: 'America/Mexico_City',
    timezoneGroup: 'Central Mexico Time', abbreviationGeneric: 'CST',
    tooltip: 'Hora del Centro de México. Cubre CDMX, Guadalajara, Monterrey y la mayor parte de México. Puede diferir del US Central Time en las fechas de cambio de horario.',
    keywords: ['mexico', 'mexico city', 'ciudad de mexico', 'cdmx', 'guadalajara', 'monterrey', 'central', 'cst', 'cdt'],
  },
  {
    label: 'Guadalajara, México — Hora del Centro',
    shortLabel: 'Hora del Centro (CST/CDT)',
    city: 'Guadalajara', state: 'Jalisco', country: 'México',
    iana: 'America/Mexico_City', tz: 'America/Mexico_City',
    timezoneGroup: 'Central Mexico Time', abbreviationGeneric: 'CST',
    tooltip: 'Hora del Centro de México. Cubre Guadalajara, Jalisco y la mayor parte del occidente de México.',
    keywords: ['guadalajara', 'jalisco', 'mexico', 'central', 'cst'],
  },
  {
    label: 'Monterrey, México — Hora del Centro',
    shortLabel: 'Hora del Centro (CST/CDT)',
    city: 'Monterrey', state: 'Nuevo León', country: 'México',
    iana: 'America/Monterrey', tz: 'America/Monterrey',
    timezoneGroup: 'Central Mexico Time', abbreviationGeneric: 'CST',
    tooltip: 'Hora del Centro. Cubre Monterrey, Nuevo León y el norte industrial de México.',
    keywords: ['monterrey', 'nuevo leon', 'mexico', 'central', 'cst'],
  },
  {
    label: 'Tijuana, Baja California, México — Hora del Pacífico',
    shortLabel: 'Hora del Pacífico (PST/PDT)',
    city: 'Tijuana', state: 'Baja California', country: 'México',
    iana: 'America/Tijuana', tz: 'America/Tijuana',
    timezoneGroup: 'Pacific Time Mexico', abbreviationGeneric: 'PST',
    tooltip: 'Hora del Pacífico de México. Baja California sigue las mismas reglas de horario de verano que California, USA.',
    keywords: ['tijuana', 'baja california', 'ensenada', 'mexico', 'pacifico', 'pacific', 'pst'],
  },

  // ── Colombia / Perú / Ecuador ────────────────────────────────────────────────
  {
    label: 'Bogotá, Colombia — Colombia Time (COT)',
    shortLabel: 'Colombia Time (COT)',
    city: 'Bogotá', state: null, country: 'Colombia',
    iana: 'America/Bogota', tz: 'America/Bogota',
    timezoneGroup: 'Colombia Time', abbreviationGeneric: 'COT',
    tooltip: 'Colombia Time (COT). UTC-5. Cubre Bogotá y todo Colombia. No usa horario de verano.',
    keywords: ['bogota', 'colombia', 'cot', 'utc-5'],
  },
  {
    label: 'Lima, Perú — Peru Time (PET)',
    shortLabel: 'Peru Time (PET)',
    city: 'Lima', state: null, country: 'Perú',
    iana: 'America/Lima', tz: 'America/Lima',
    timezoneGroup: 'Peru Time', abbreviationGeneric: 'PET',
    tooltip: 'Peru Time (PET). UTC-5. Cubre Lima y todo Perú. No usa horario de verano.',
    keywords: ['lima', 'peru', 'pet', 'utc-5'],
  },
  {
    label: 'Quito, Ecuador — Ecuador Time (ECT)',
    shortLabel: 'Ecuador Time (ECT)',
    city: 'Quito', state: null, country: 'Ecuador',
    iana: 'America/Guayaquil', tz: 'America/Guayaquil',
    timezoneGroup: 'Ecuador Time', abbreviationGeneric: 'ECT',
    tooltip: 'Ecuador Time (ECT). UTC-5. Cubre Quito, Guayaquil y Ecuador. No usa horario de verano.',
    keywords: ['quito', 'guayaquil', 'ecuador', 'ect', 'utc-5'],
  },

  // ── Venezuela ────────────────────────────────────────────────────────────────
  {
    label: 'Caracas, Venezuela — Venezuela Time (VET)',
    shortLabel: 'Venezuela Time (VET)',
    city: 'Caracas', state: null, country: 'Venezuela',
    iana: 'America/Caracas', tz: 'America/Caracas',
    timezoneGroup: 'Venezuela Time', abbreviationGeneric: 'VET',
    tooltip: 'Venezuela Time (VET). UTC-4. Cubre Caracas y Venezuela. No usa horario de verano.',
    keywords: ['caracas', 'venezuela', 'vet', 'utc-4'],
  },

  // ── Bolivia / Paraguay ───────────────────────────────────────────────────────
  {
    label: 'La Paz, Bolivia — Bolivia Time (BOT)',
    shortLabel: 'Bolivia Time (BOT)',
    city: 'La Paz', state: null, country: 'Bolivia',
    iana: 'America/La_Paz', tz: 'America/La_Paz',
    timezoneGroup: 'Bolivia Time', abbreviationGeneric: 'BOT',
    tooltip: 'Bolivia Time (BOT). UTC-4. Cubre La Paz, Santa Cruz y Bolivia. No usa horario de verano.',
    keywords: ['la paz', 'santa cruz', 'bolivia', 'bot', 'utc-4'],
  },

  // ── Chile ─────────────────────────────────────────────────────────────────────
  {
    label: 'Santiago, Chile — Chile Time (CLT)',
    shortLabel: 'Chile Time (CLT)',
    city: 'Santiago', state: null, country: 'Chile',
    iana: 'America/Santiago', tz: 'America/Santiago',
    timezoneGroup: 'Chile Time', abbreviationGeneric: 'CLT',
    tooltip: 'Chile Time (CLT/CLST). Cubre Santiago y Chile continental. Chile puede aplicar horario de verano, siempre usa America/Santiago para cálculos correctos.',
    keywords: ['santiago', 'chile', 'clt', 'clst'],
  },

  // ── Argentina ────────────────────────────────────────────────────────────────
  {
    label: 'Buenos Aires, Argentina — Argentina Time (ART)',
    shortLabel: 'Argentina Time (ART)',
    city: 'Buenos Aires', state: null, country: 'Argentina',
    iana: 'America/Argentina/Buenos_Aires', tz: 'America/Argentina/Buenos_Aires',
    timezoneGroup: 'Argentina Time', abbreviationGeneric: 'ART',
    tooltip: 'Argentina Time (ART). UTC-3. Cubre Buenos Aires y la mayor parte de Argentina. Argentina no usa horario de verano.',
    keywords: ['buenos aires', 'argentina', 'art', 'utc-3'],
  },
  {
    label: 'Córdoba, Argentina — Argentina Time (ART)',
    shortLabel: 'Argentina Time (ART)',
    city: 'Córdoba', state: 'Córdoba', country: 'Argentina',
    iana: 'America/Argentina/Cordoba', tz: 'America/Argentina/Cordoba',
    timezoneGroup: 'Argentina Time', abbreviationGeneric: 'ART',
    tooltip: 'Argentina Time (ART). UTC-3. Cubre Córdoba y el centro de Argentina.',
    keywords: ['cordoba', 'córdoba', 'argentina', 'art', 'utc-3'],
  },

  // ── Uruguay ──────────────────────────────────────────────────────────────────
  {
    label: 'Montevideo, Uruguay — Uruguay Time (UYT)',
    shortLabel: 'Uruguay Time (UYT)',
    city: 'Montevideo', state: null, country: 'Uruguay',
    iana: 'America/Montevideo', tz: 'America/Montevideo',
    timezoneGroup: 'Uruguay Time', abbreviationGeneric: 'UYT',
    tooltip: 'Uruguay Time (UYT). UTC-3. Cubre Montevideo y Uruguay. Uruguay no usa horario de verano actualmente.',
    keywords: ['montevideo', 'uruguay', 'uyt', 'utc-3'],
  },

  // ── Brasil ───────────────────────────────────────────────────────────────────
  {
    label: 'São Paulo, Brasil — Brasília Time (BRT)',
    shortLabel: 'Brasília Time (BRT)',
    city: 'São Paulo', state: 'São Paulo', country: 'Brasil',
    iana: 'America/Sao_Paulo', tz: 'America/Sao_Paulo',
    timezoneGroup: 'Brasília Time', abbreviationGeneric: 'BRT',
    tooltip: 'Brasília Time (BRT). Cubre São Paulo, Río de Janeiro, Brasília y la mayor parte de Brasil. Brasil tiene múltiples zonas horarias.',
    keywords: ['sao paulo', 'são paulo', 'rio de janeiro', 'brasilia', 'brasil', 'brazil', 'brt'],
  },
  {
    label: 'Río de Janeiro, Brasil — Brasília Time (BRT)',
    shortLabel: 'Brasília Time (BRT)',
    city: 'Río de Janeiro', state: 'Rio de Janeiro', country: 'Brasil',
    iana: 'America/Sao_Paulo', tz: 'America/Sao_Paulo',
    timezoneGroup: 'Brasília Time', abbreviationGeneric: 'BRT',
    tooltip: 'Brasília Time (BRT). Cubre Río de Janeiro y el sudeste de Brasil.',
    keywords: ['rio', 'rio de janeiro', 'brasil', 'brazil', 'brt'],
  },

  // ── Caribe / Caribbean ───────────────────────────────────────────────────────
  {
    label: 'Santo Domingo, República Dominicana — Atlantic Standard Time',
    shortLabel: 'Atlantic ST (AST)',
    city: 'Santo Domingo', state: null, country: 'República Dominicana',
    iana: 'America/Santo_Domingo', tz: 'America/Santo_Domingo',
    timezoneGroup: 'Atlantic Standard Time', abbreviationGeneric: 'AST',
    tooltip: 'Atlantic Standard Time (AST). UTC-4. Cubre Santo Domingo y la República Dominicana. No usa horario de verano.',
    keywords: ['santo domingo', 'republica dominicana', 'dominican', 'caribe', 'caribbean', 'ast', 'utc-4'],
  },
  {
    label: 'San Juan, Puerto Rico — Atlantic Standard Time',
    shortLabel: 'Atlantic ST (AST)',
    city: 'San Juan', state: 'Puerto Rico', country: 'Puerto Rico',
    iana: 'America/Puerto_Rico', tz: 'America/Puerto_Rico',
    timezoneGroup: 'Atlantic Standard Time', abbreviationGeneric: 'AST',
    tooltip: 'Atlantic Standard Time (AST). UTC-4. Puerto Rico no usa horario de verano.',
    keywords: ['san juan', 'puerto rico', 'ast', 'utc-4'],
  },

  // ── España / Europe ──────────────────────────────────────────────────────────
  {
    label: 'Madrid, España — Central European Time (CET)',
    shortLabel: 'Central European Time (CET)',
    city: 'Madrid', state: null, country: 'España',
    iana: 'Europe/Madrid', tz: 'Europe/Madrid',
    timezoneGroup: 'Central European Time', abbreviationGeneric: 'CET',
    tooltip: 'Central European Time (CET/CEST). Cubre Madrid, Barcelona y España. Usa CET en invierno y CEST en verano.',
    keywords: ['madrid', 'barcelona', 'españa', 'spain', 'cet', 'cest', 'europe'],
  },
  {
    label: 'London, United Kingdom — Greenwich Mean Time (GMT)',
    shortLabel: 'GMT/BST',
    city: 'London', state: null, country: 'United Kingdom',
    iana: 'Europe/London', tz: 'Europe/London',
    timezoneGroup: 'Greenwich Mean Time', abbreviationGeneric: 'GMT',
    tooltip: 'Greenwich Mean Time (GMT/BST). United Kingdom. Uses GMT in winter and BST (British Summer Time) in summer.',
    keywords: ['london', 'uk', 'united kingdom', 'england', 'gmt', 'bst', 'europe'],
  },
  {
    label: 'Paris, France — Central European Time (CET)',
    shortLabel: 'Central European Time (CET)',
    city: 'Paris', state: null, country: 'France',
    iana: 'Europe/Paris', tz: 'Europe/Paris',
    timezoneGroup: 'Central European Time', abbreviationGeneric: 'CET',
    tooltip: 'Central European Time (CET/CEST). Covers Paris and France. Uses CET in winter and CEST in summer.',
    keywords: ['paris', 'france', 'cet', 'cest', 'europe'],
  },
]

// Search timezones by query string
export function searchTimezones(query) {
  const q = query.toLowerCase().trim()
  if (!q) return DAILY_TIMEZONE_OPTIONS

  return DAILY_TIMEZONE_OPTIONS.filter(opt => {
    if (opt.keywords.some(k => k.includes(q))) return true
    if (opt.label.toLowerCase().includes(q)) return true
    if (opt.city.toLowerCase().includes(q)) return true
    if ((opt.state || '').toLowerCase().includes(q)) return true
    if (opt.country.toLowerCase().includes(q)) return true
    if (opt.iana.toLowerCase().includes(q)) return true
    return false
  })
}
