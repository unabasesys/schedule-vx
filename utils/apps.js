// Apps del ecosistema unabase, para nombrarlas en la asignación por persona (§8.7).
//
// Calendar no abre las otras apps y no tiene switcher, pero SÍ tiene que poder nombrarlas:
// la asignación se hace sobre todas las apps que la organización contrató, y un cliente con
// Calendar + Relations administra a su gente desde cualquiera de las dos. Una llave sin
// nombre se muestra tal cual antes que en blanco: una casilla sin etiqueta no se puede
// marcar con criterio.
const APP_LABELS = { calendar: 'Calendar', relations: 'Relations', leads: 'Leads' }

export function appLabel(key) {
  return APP_LABELS[key] || key
}
