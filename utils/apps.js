// Registro de apps del ecosistema unabase, visto desde Calendar.
//
// NO es una copia del registro del front de Relations, y no puede serlo: lo que en un
// front es la app local, en el otro es externa. Acá `calendar` es la de casa y
// Relations/Leads viven en el otro subdominio; allá es al revés. Por eso estos dos
// archivos no son gemelos (§8.9) y no hay test que los compare — lo que sí tiene que
// coincidir son las LLAVES, que son las de `Organization.apps` en la base compartida.
//
// EL ORDEN DE ESTA LISTA ES DE LA SUITE, NO DE LA APP. Va siempre
// Relations → Leads → Calendar, idéntico en los dos fronts. Antes cada front se
// ponía a sí mismo primero y el ítem SALTABA de lugar al cambiar de app: se veía
// como si el menú se desarmara, que es lo contrario de "una sola aplicación".
// Si se agrega una app, va en el MISMO lugar en los dos archivos.
export const APPS = [
  {
    key: 'relations',
    // Sin `route`: no se sirve desde este front. La URL sale de
    // runtimeConfig.public[urlKey], que el lanzador resuelve al navegar.
    external: true,
    urlKey: 'relationsUrl',
    label: 'Relations',
    // círculos enlazados (relaciones)
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="12" r="3"/><circle cx="17" cy="6" r="3"/><circle cx="17" cy="18" r="3"/><line x1="9.5" y1="10.5" x2="14.5" y2="7.5"/><line x1="9.5" y1="13.5" x2="14.5" y2="16.5"/></svg>',
  },
  {
    key: 'leads',
    external: true,
    // Comparte host con Relations —es una sección de ese front, no un subdominio
    // propio—, así que además del host lleva su ruta.
    urlKey: 'relationsUrl',
    path: '/leads',
    label: 'Leads',
    // embudo (pipeline de oportunidades)
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h18l-7 8v6l-4 2v-8L3 4z"/></svg>',
  },
  {
    key: 'calendar',
    route: '/calendar',
    label: 'Calendar',
    // hoja de calendario
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>',
  },
]

// Nombre visible de una app por su llave del entitlement.
//
// Incluye llaves que NO se abren desde acá: la asignación por persona (§8.7) se hace
// sobre TODAS las apps que la organización contrató, y la pantalla del dueño tiene que
// poder nombrar una app que este front no sirve. Si aparece una llave desconocida se
// muestra tal cual antes que en blanco: una casilla sin etiqueta no se puede marcar con
// criterio.
const APP_LABELS = { calendar: 'Calendar', relations: 'Relations', leads: 'Leads' }

export function appLabel(key) {
  return APP_LABELS[key] || key
}

// LA SUITE (decisión de Jorge, 2-sep-2026). Relations es un producto y se cobra en un
// solo valor, con sus módulos adentro: Clientes, Crew y Leads. Así que el entitlement de
// un módulo es el del producto que lo contiene.
//
// Esto vive acá aunque Calendar no abra ninguna de las dos, porque el lanzador de apps de
// este front pinta el candado de Relations y de Leads. Sin la regla, a un cliente que
// tiene Relations —y que arrastra el `apps.leads.enabled: false` con el que las
// organizaciones nacían— Calendar le mostraba Leads con candado de venta: le ofrecía
// comprar algo que ya estaba pagando.
//
// Calendar NO entra: es independiente y se cobra aparte (§8.2). Y es la de casa acá.
const MODULOS_DE_RELATIONS = ['leads']

export function appQueMandaSobre(key) {
  return MODULOS_DE_RELATIONS.includes(key) ? 'relations' : key
}

// ¿La organización tiene habilitada esta app?
//
// La misma regla que el backend, sin excepciones: habilitada solo si `enabled === true`
// en la app que manda.
//
// El front de Relations sí tiene una excepción —Relations abierta en una organización sin
// el objeto `apps`, por las orgs anteriores al entitlement— y acá no hace falta ninguna:
// toda organización que llega a Calendar tiene su `apps.calendar` escrito, porque lo
// escribe el `createOrg` de este back o el panel de plataforma al venderla. Una llave
// ausente significa "no contratada", igual que para el portero.
export function isAppEnabled(org, key) {
  return org?.apps?.[appQueMandaSobre(key)]?.enabled === true
}

// Las apps que ESTA persona tiene asignadas en la organización (§8.7). El dueño pasa
// siempre — misma regla que la puerta del backend (`personHasApp`).
// Devuelve `null` cuando no se puede saber: sin fila de membresía, o con la fila sin
// ninguna app escrita (organización anterior al backfill). Null ≠ ninguna.
export function myAppKeys(org, userId) {
  if (!org || !userId) return null
  if (String(org.owner?._id || org.owner || '') === String(userId)) return null
  const row = (org.users || []).find((u) => {
    const id = u.user?._id || u.user
    return id && String(id) === String(userId)
  })
  if (!row) return null
  if (row.role === 'owner') return null
  const keys = (row.apps || []).map((a) => a.key).filter(Boolean)
  return keys.length ? keys : null
}

// TODAS las apps del ecosistema con el estado de esta persona en cada una.
//
// Se devuelven todas, no solo las que se pueden abrir: §8.1 —«el candado *es* el mensaje
// de venta: no se vende algo que el cliente no sabe que existe»—. Es el caso que esa
// decisión tenía en mente: alguien que solo compró Calendar tiene que VER que Relations
// existe. Filtrar sigue siendo trivial (`.filter(a => a.state === 'open')`).
//
// Tres estados, porque tienen tres salidas distintas y confundirlas manda a la persona a
// resolver el problema equivocado — la misma razón por la que el backend devuelve tres
// códigos de 403 y no un booleano (§8.7):
//
//   'open'        entra.
//   'locked-org'  su organización no la contrató. Se compra.
//   'locked-seat' la organización SÍ la tiene y a esta persona no se la asignaron.
//                 No se compra: se la pide al dueño.
//
// `locked-seat` solo aparece cuando se sabe con certeza (`myAppKeys` no devuelve null).
// Ante la duda se muestra abierta: trabar de más deja a alguien sin su app y sin forma de
// darse cuenta, mientras que abrir de más termina, en el peor caso, en la pantalla del
// 403 que explica a quién pedírsela.
//
// VISIBLE NO ES ACCESIBLE (§8.1). Esto pinta candados; lo que cierra es `hasApp` en el
// backend. Quien abra la consola y navegue igual se choca con el 403.
export function appsWithState(org, userId = null) {
  const mine = myAppKeys(org, userId)
  return APPS.map((a) => {
    let state = 'open'
    if (!isAppEnabled(org, a.key)) state = 'locked-org'
    else if (mine && !mine.includes(a.key)) state = 'locked-seat'
    return { ...a, state }
  })
}
