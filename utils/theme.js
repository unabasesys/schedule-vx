// Modo claro / oscuro — preferencia COMPARTIDA por toda la suite de unabase.
//
// Vive en una COOKIE de .unabase.com, no en localStorage. Relations/Leads y
// Calendar están en subdominios distintos, y localStorage es por origen: con él,
// quien elegía claro en Relations volvía a lo oscuro al entrar a Calendar —
// exactamente la costura que estamos sacando. La cookie la leen las tres.
//
// localStorage se sigue leyendo como RESPALDO (quien ya eligió claro antes de
// este cambio no pierde su elección) y se sigue escribiendo, porque en un
// entorno sin el dominio compartido es lo único que queda.
//
// ESTE ARCHIVO ESTÁ DUPLICADO A PROPÓSITO en los dos fronts y debe quedar
// IDÉNTICO: los repos son distintos, así que no hay import posible todavía.
// El script del <head> de cada nuxt.config.js repite esta misma lectura en
// miniatura, porque tiene que correr antes de que exista el bundle.
const KEY = 'ub_theme'

// En localhost la cookie va SIN dominio: las cookies ignoran el puerto, así que
// 3000 y 3001 la comparten igual y el desarrollo se comporta como producción.
function dominioCompartido() {
  if (typeof location === 'undefined') return ''
  return location.hostname.endsWith('unabase.com') ? '; domain=.unabase.com' : ''
}

export function leerTema() {
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)ub_theme=(light|dark)/)
    if (m) return m[1]
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
  }
  return 'dark'
}

export function guardarTema(val) {
  const t = val === 'light' ? 'light' : 'dark'
  if (typeof document !== 'undefined') {
    document.cookie = `${KEY}=${t}; path=/; max-age=31536000; samesite=lax${dominioCompartido()}`
  }
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, t)
}
