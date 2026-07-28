// ── Novedades de la app ("What's new") ─────────────────────────────────────────
// Fuente de verdad del versionado visible de Calendar. Cada deploy con mejoras
// visibles para el usuario agrega una entrada AL INICIO del array, con sus
// bullets en ambos idiomas. La entrada [0] es la versión vigente: alimenta el
// numerito del sidebar y el aviso de novedades (se muestra una sola vez por
// versión, comparando contra localStorage `ub_seen_version`).
//
// Nota de producto: esto es la versión DE LA APP — nunca confundir con la
// "Versión" de un calendario (v0/v1/v2 del PDF), que es un concepto del
// dominio de producción. Por eso la UI dice "Novedades", no "Nueva versión".

export const CHANGELOG = [
  {
    version: '1.2.0',
    date: '2026-07-26',
    es: [
      'Si alguien de tu equipo guarda el calendario, tu pantalla se pone al día sola al volver a ella. Antes una pestaña abierta podía quedar días desactualizada sin avisar.',
      'El header muestra la última actualización del calendario: cuándo fue y quién la hizo.',
      'Cuando el calendario avanzó mientras editabas, el aviso ahora dice quién guardó y a qué hora, y se resuelve con un solo botón.',
      'El menú Compartir usa los mismos nombres en todas partes: "Para: Cliente / Interno" tanto en el calendario como en el Daily Schedule, y el PDF indica para quién es.',
      'Un calendario nuevo sin plantilla ya no llega con departamentos de publicidad precargados: partes con los tuyos.',
      'Los calendarios que parten sin plantilla ahora abren con una guía interactiva de las funciones de la barra: qué hace cada una, paso a paso o todo de una. Se puede omitir, y si la ocultas la recuperas desde el menú de ayuda.',
    ],
    en: [
      'If a teammate saves the calendar, your screen catches up on its own when you come back to it. Before, an open tab could sit days out of date without saying so.',
      'The header shows the calendar’s last update: when it happened and who made it.',
      'When the calendar moved on while you were editing, the notice now names who saved and at what time, and clears with a single button.',
      'The Share menu uses the same words everywhere: "For: Client / Internal" in both the calendar and the Daily Schedule, and the PDF states who it is for.',
      'A new calendar started without a template no longer arrives preloaded with advertising departments: you start with your own.',
      'Calendars started without a template now open with an interactive guide to the toolbar: what each function does, step by step or all at once. It can be skipped, and if you hide it you can bring it back from the help menu.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-17',
    es: [
      'Nueva sección "Sin etapa" en la lista de Eventos: los eventos que quedaron sin etapa ya no se ocultan y se pueden arrastrar a una etapa real.',
      'El ícono del ojito ya no deja en blanco las pestañas Eventos y Daily del calendario seleccionado.',
      'El PDF imprime el número de versión correcto y sale en el idioma del calendario.',
      'Los colores de cada etapa ahora se ven en el PDF.',
      'Nuevo selector "Inicio de semana" en Configuración: define el default de la organización; cada calendario puede sobrescribirlo y el cambio ya persiste.',
      'Al crear un evento desde el calendario, escribir su nombre sugiere eventos sin fecha para asignarles ese día.',
      'El selector de fecha se cierra al elegir el día y ya no aparece cortado en los últimos eventos de la lista.',
      'Sugerencias: nuevo botón "Sugerir una idea" en la barra lateral.',
    ],
    en: [
      'New "No stage" section in the Events list: events left without a stage are no longer hidden and can be dragged into a real stage.',
      'The eye toggle no longer blanks the Events and Daily tabs of the selected calendar.',
      'The PDF prints the correct version number and uses the calendar’s language.',
      'Per-stage colors now show in the PDF.',
      'New "Week starts on" selector in Settings: sets the organization default; each calendar can override it and the change now persists.',
      'When creating an event from the calendar, typing its name suggests undated events so you can assign them that date.',
      'The date picker closes after picking a day and no longer renders cut off on the last rows.',
      'Suggestions: new "Suggest an idea" button in the sidebar.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-08',
    es: [
      'Línea de base pública de Calendar by unabase: calendarios de producción con etapas, dependencias, feriados, clima, Daily Schedule y exportación a PDF con versionado.',
    ],
    en: [
      'Public baseline of Calendar by unabase: production calendars with stages, dependencies, holidays, weather, Daily Schedule and versioned PDF export.',
    ],
  },
]

export const APP_VERSION      = CHANGELOG[0].version
export const APP_VERSION_DATE = CHANGELOG[0].date

// "v1.1" — sin el patch, para la UI
export const APP_VERSION_SHORT = 'v' + APP_VERSION.split('.').slice(0, 2).join('.')

export function formatVersionDate(lang = 'es') {
  const [y, m, d] = APP_VERSION_DATE.split('-').map(Number)
  const months = lang === 'en'
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return lang === 'en' ? `${months[m - 1]} ${d}, ${y}` : `${d} ${months[m - 1]} ${y}`
}
