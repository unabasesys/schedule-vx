<template>
  <div ref="rootEl" class="dp" :class="{ bare }">
    <!-- La fecha se LEE completa y en el idioma de la app ("mié, 19 ago 2026"): el
         `input type="date"` nativo mostraba "08/19/2026" —el orden lo decide el idioma
         del SISTEMA, no el nuestro— y escondía el calendario en un icono de 15px. -->
    <button
      ref="triggerEl"
      type="button"
      class="dp-field"
      :class="{ active: open }"
      :disabled="disabled"
      :aria-expanded="open"
      @click="toggle"
    >
      <!-- Con `bare` el disparador lo dibuja quien lo usa (la fila de evento ya tiene
           su propio texto y su propio estado); si no, se ve como un campo del formulario. -->
      <slot>
        <span class="dp-val" :class="{ empty: !modelValue }">
          {{ label }}<em v-if="rel"> · {{ rel }}</em>
        </span>
      </slot>
      <span v-if="!bare" class="dp-ico" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      </span>
    </button>

    <!-- FLOTANTE y en posición fija, no dentro del flujo: en Calendar los campos de
         fecha viven en un drawer, en una fila de tabla y en un menú desplegable — todos
         con scroll propio, que recortarían un panel absoluto. La posición se calcula del
         rect del disparador y se recalcula al hacer scroll o cambiar el tamaño. -->
    <Teleport to="body">
      <div
        v-if="open"
        ref="calEl"
        class="dp-cal"
        :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
        @keydown="onKeydown"
      >
        <div class="dp-head">
          <button type="button" class="dp-nav" :aria-label="isEN ? 'Previous month' : 'Mes anterior'" @click="shiftMonth(-1)">‹</button>
          <select v-model.number="viewMonth" class="dp-sel">
            <option v-for="(m, i) in monthNames" :key="m" :value="i">{{ m }}</option>
          </select>
          <select v-model.number="viewYear" class="dp-sel dp-sel-year">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <button type="button" class="dp-nav" :aria-label="isEN ? 'Next month' : 'Mes siguiente'" @click="shiftMonth(1)">›</button>
        </div>

        <div class="dp-dows">
          <span v-for="(d, i) in dows" :key="i">{{ d }}</span>
        </div>

        <div ref="gridEl" class="dp-grid">
          <button
            v-for="c in cells"
            :key="c.iso"
            type="button"
            class="dp-day"
            :class="{ other: c.other, today: c.today, sel: c.iso === modelValue }"
            :disabled="c.disabled"
            :data-iso="c.iso"
            @click="pick(c.iso)"
          >{{ c.day }}</button>
        </div>

        <div v-if="chips.length" class="dp-quick">
          <button
            v-for="q in chips"
            :key="q.iso"
            type="button"
            class="dp-chip"
            :class="{ active: q.iso === modelValue }"
            @click="pick(q.iso)"
          >{{ q.label }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
// Calendario propio para elegir una fecha. Hermano del de Relations (mismos props y el
// mismo `v-model` en 'YYYY-MM-DD'), con dos diferencias que impone esta app:
//   1. El panel FLOTA (posición fija, teletransportado al body) porque acá los campos
//      viven dentro de contenedores con scroll que recortarían un panel en el flujo.
//   2. ESC se atrapa en fase de captura: Calendar no tiene la pila compartida de
//      `useEscToClose`, cada modal escucha en `window` por su cuenta, así que sin esto
//      la misma tecla cerraría también el modal de atrás.
const props = defineProps({
  modelValue:  { type: String, default: '' },
  lang:        { type: String, default: 'es' },
  // Límites opcionales, en 'YYYY-MM-DD' (p.ej. min = la fecha de inicio).
  min:         { type: String, default: '' },
  max:         { type: String, default: '' },
  // Atajos a mostrar: 'today' | 'yesterday' | 'tomorrow'. [] los apaga.
  quick:       { type: Array, default: () => ['today', 'tomorrow'] },
  placeholder: { type: String, default: '' },
  // El disparador lo dibuja quien lo usa (sin caja ni icono).
  bare:        { type: Boolean, default: false },
  disabled:    { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'change'])

const open      = ref(false)
const rootEl    = ref(null)
const triggerEl = ref(null)
const calEl     = ref(null)
const gridEl    = ref(null)
const pos       = ref({ top: 0, left: 0 })

const isEN = computed(() => props.lang === 'en')
const locale = computed(() => (isEN.value ? 'en-US' : 'es-CL'))

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Fechas SIEMPRE en hora local: `new Date('2026-08-19')` se interpreta en UTC y en
// Chile retrocedía un día.
function parse(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return null
  const [y, m, d] = String(s).split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return isNaN(dt) ? null : dt
}
function shiftDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }

const todayIso = iso(new Date())

const label = computed(() => {
  const d = parse(props.modelValue)
  if (!d) return props.placeholder || (isEN.value ? 'Pick a date' : 'Elegir fecha')
  return d.toLocaleDateString(locale.value, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
})
// "hoy" / "mañana" al lado de la fecha: confirma de un vistazo que es la correcta.
const rel = computed(() => {
  if (props.modelValue === todayIso) return isEN.value ? 'today' : 'hoy'
  if (props.modelValue === shiftDays(1)) return isEN.value ? 'tomorrow' : 'mañana'
  if (props.modelValue === shiftDays(-1)) return isEN.value ? 'yesterday' : 'ayer'
  return ''
})

const monthNames = computed(() => Array.from({ length: 12 }, (_, i) => {
  const n = new Date(2020, i, 1).toLocaleDateString(locale.value, { month: 'long' })
  return n.charAt(0).toUpperCase() + n.slice(1)
}))

const base = parse(props.modelValue) || new Date()
const viewMonth = ref(base.getMonth())
const viewYear  = ref(base.getFullYear())

const years = computed(() => {
  const now = new Date().getFullYear()
  const from = props.min ? Number(props.min.slice(0, 4)) : now - 5
  const to   = props.max ? Number(props.max.slice(0, 4)) : now + 5
  // Un valor guardado fuera del rango (un evento viejo) tiene que poder verse.
  const sel = props.modelValue ? Number(props.modelValue.slice(0, 4)) : now
  const lo = Math.min(from, sel), hi = Math.max(to, sel)
  return Array.from({ length: hi - lo + 1 }, (_, i) => hi - i)
})

function shiftMonth(n) {
  const m = viewMonth.value + n
  viewMonth.value = (m + 12) % 12
  if (m < 0) viewYear.value--
  if (m > 11) viewYear.value++
}

// La semana parte el lunes (Chile); en inglés, el domingo.
const weekStart = computed(() => (isEN.value ? 0 : 1))
const dows = computed(() => {
  const es = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá']
  const en = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const src = isEN.value ? en : es
  return Array.from({ length: 7 }, (_, i) => src[(i + weekStart.value) % 7])
})

const cells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const offset = (first.getDay() - weekStart.value + 7) % 7
  const days = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const total = Math.ceil((offset + days) / 7) * 7
  const out = []
  for (let i = 0; i < total; i++) {
    const d = new Date(viewYear.value, viewMonth.value, 1 - offset + i)
    const v = iso(d)
    out.push({
      iso: v,
      day: d.getDate(),
      other: d.getMonth() !== viewMonth.value,
      today: v === todayIso,
      // Boolean() a propósito: sin min/max esto daría '' y Vue trata la cadena vacía
      // como `disabled` presente (semántica HTML) — quedaba TODO el mes sin clickear.
      disabled: Boolean((props.min && v < props.min) || (props.max && v > props.max)),
    })
  }
  return out
})

const chips = computed(() => {
  const defs = {
    today:     { iso: todayIso,      label: isEN.value ? 'Today' : 'Hoy' },
    tomorrow:  { iso: shiftDays(1),  label: isEN.value ? 'Tomorrow' : 'Mañana' },
    yesterday: { iso: shiftDays(-1), label: isEN.value ? 'Yesterday' : 'Ayer' },
  }
  return props.quick
    .map((k) => defs[k])
    .filter((q) => q && !((props.min && q.iso < props.min) || (props.max && q.iso > props.max)))
})

// ── Posición del panel ──────────────────────────────────────────────────────
// Se abre debajo del campo, y arriba si no cabe. Si el campo se sale de la pantalla
// (scroll dentro de una tabla), el panel se cierra en vez de quedar flotando solo.
const CAL_W = 268
const CAL_H = 320
function place() {
  const el = triggerEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  if (r.bottom < 0 || r.top > window.innerHeight) { open.value = false; return }
  const below = window.innerHeight - r.bottom
  const top = below < CAL_H && r.top > CAL_H ? r.top - CAL_H - 6 : r.bottom + 6
  const left = Math.min(Math.max(8, r.left), window.innerWidth - CAL_W - 8)
  pos.value = { top: Math.max(8, top), left }
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    const d = parse(props.modelValue) || new Date()
    viewMonth.value = d.getMonth()
    viewYear.value = d.getFullYear()
    nextTick(place)
  }
}
function pick(v) {
  emit('update:modelValue', v)
  emit('change', v)
  open.value = false
}

// Flechas para moverse por el calendario con el teclado (±1 día, ±1 semana).
function onKeydown(e) {
  const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
  const step = map[e.key]
  if (!step) return
  const from = parse(e.target?.dataset?.iso) || parse(props.modelValue) || new Date()
  e.preventDefault()
  const to = new Date(from); to.setDate(to.getDate() + step)
  const target = iso(to)
  if (to.getMonth() !== viewMonth.value || to.getFullYear() !== viewYear.value) {
    viewMonth.value = to.getMonth()
    viewYear.value = to.getFullYear()
  }
  nextTick(() => gridEl.value?.querySelector(`[data-iso="${target}"]`)?.focus())
}

// ESC cierra SOLO el calendario. En captura y cortando la propagación porque los
// modales de esta app escuchan Escape en `window` por su cuenta: sin esto, elegir una
// fecha y arrepentirse cerraría el evento completo.
function onEsc(e) {
  if (e.key !== 'Escape' || !open.value) return
  e.stopImmediatePropagation()
  e.preventDefault()
  open.value = false
}
function onDocDown(e) {
  if (!open.value) return
  if (rootEl.value?.contains(e.target) || calEl.value?.contains(e.target)) return
  open.value = false
}
onMounted(() => {
  window.addEventListener('keydown', onEsc, true)
  document.addEventListener('mousedown', onDocDown)
  // `capture: true` para enterarse también del scroll de los contenedores internos
  // (el drawer, la tabla), que no burbujea.
  window.addEventListener('scroll', place, true)
  window.addEventListener('resize', place)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onEsc, true)
  document.removeEventListener('mousedown', onDocDown)
  window.removeEventListener('scroll', place, true)
  window.removeEventListener('resize', place)
})
</script>

<style scoped>
.dp { position: relative; display: inline-block; width: 100%; }
.dp.bare { width: auto; }

.dp-field {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; padding: 8px 11px; font-family: inherit; font-size: .84rem;
  background: var(--surface-2); color: var(--text); cursor: pointer;
  border: 1px solid var(--border); border-radius: 8px;
  transition: border-color .15s, box-shadow .15s;
}
.dp-field:hover:not(:disabled) { border-color: var(--accent); }
.dp-field.active { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
.dp-field:disabled { cursor: default; opacity: .6; }
/* Modo `bare`: la caja la pone quien lo usa. */
.dp.bare .dp-field {
  width: auto; padding: 0; background: none; border: none; border-radius: 0;
  box-shadow: none; color: inherit; font-size: inherit;
}
.dp.bare .dp-field.active { box-shadow: none; }

.dp-val { font-weight: 600; text-align: left; white-space: nowrap; }
.dp-val.empty { color: var(--muted); font-weight: 400; }
.dp-val em { font-style: normal; font-weight: 400; color: var(--muted); }
.dp-ico { display: inline-flex; color: var(--muted); }
.dp-field.active .dp-ico { color: var(--accent); }
</style>

<!-- El panel va teletransportado al body, así que su CSS no puede ser `scoped`: se
     acota con el prefijo `dp-` y con la clase raíz `.dp-cal`. -->
<style>
.dp-cal {
  position: fixed; z-index: 1200; width: 268px; padding: 10px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; box-shadow: var(--shadow-m, 0 20px 40px -8px var(--shadow-ink-2));
  font-family: inherit;
}
.dp-cal .dp-head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.dp-cal .dp-nav {
  width: 26px; height: 26px; flex: none; display: grid; place-items: center;
  background: none; border: 1px solid var(--border); border-radius: 8px;
  color: var(--text); font-size: 1rem; line-height: 1; cursor: pointer; font-family: inherit;
  transition: border-color .14s, color .14s;
}
.dp-cal .dp-nav:hover { border-color: var(--accent); color: var(--accent); }
.dp-cal .dp-sel {
  flex: 1; min-width: 0; padding: 5px 6px; font-family: inherit; font-size: .8rem; font-weight: 600;
  background: var(--surface-2); color: var(--text);
  border: 1px solid var(--border); border-radius: 8px; cursor: pointer; outline: none;
}
.dp-cal .dp-sel:focus { border-color: var(--accent); }
.dp-cal .dp-sel-year { flex: 0 0 76px; }

.dp-cal .dp-dows, .dp-cal .dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.dp-cal .dp-dows span {
  text-align: center; padding: 4px 0; font-size: .64rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .4px; color: var(--muted);
}
.dp-cal .dp-day {
  height: 32px; display: grid; place-items: center;
  background: none; border: 1px solid transparent; border-radius: 8px;
  color: var(--text); font-family: inherit; font-size: .8rem; font-weight: 600;
  cursor: pointer; transition: background .12s, color .12s, border-color .12s;
}
.dp-cal .dp-day:hover:not(:disabled) { background: var(--wash-2); }
.dp-cal .dp-day:focus-visible { outline: none; border-color: var(--accent); }
/* Días del mes vecino: se ven, pero no compiten con el mes en pantalla. */
.dp-cal .dp-day.other { color: var(--muted); font-weight: 400; opacity: .7; }
.dp-cal .dp-day.today { border-color: var(--accent); color: var(--accent); }
.dp-cal .dp-day.sel { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.dp-cal .dp-day:disabled { color: var(--muted); opacity: .35; cursor: default; }

.dp-cal .dp-quick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.dp-cal .dp-chip {
  padding: 5px 11px; border-radius: 999px; border: 1px solid var(--border);
  background: none; color: var(--muted); font-family: inherit;
  font-size: .74rem; font-weight: 700; cursor: pointer; transition: all .12s;
}
.dp-cal .dp-chip:hover { color: var(--text); border-color: var(--muted); }
.dp-cal .dp-chip.active { background: var(--green-soft); border-color: var(--accent); color: var(--accent); }
</style>
