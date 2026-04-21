<template>
  <div class="cal-month">
    <!-- Day headers -->
    <div class="cal-day-headers">
      <div v-for="d in dayHeaders" :key="d" class="cal-day-header">{{ d }}</div>
    </div>

    <!-- Week rows -->
    <div v-for="(week, wi) in weeks" :key="wi" class="cal-week-row">
      <!-- Date number row -->
      <div class="cal-week-days">
        <div
          v-for="cell in week.cells"
          :key="cell.dateStr"
          class="cal-day"
          :class="{
            'cal-day-other':           !cell.inMonth,
            'cal-day-today':            cell.isToday,
            'cal-day-weekend':          cell.isWeekend,
            'cal-day-holiday':          cell.isHoliday,
            'cal-day-droptarget':       cell.dateStr === dragoverDate && !!dragEvId && !isDropTargetInvalid,
            'cal-day-droptarget-invalid': cell.dateStr === dragoverDate && !!dragEvId && isDropTargetInvalid,
          }"
          @click="cell.inMonth && emit('day-select', cell.dateStr)"
          @dblclick="!readOnly && cell.inMonth && emit('day-click', cell.dateStr)"
          @dragover="onDayCellDragOver($event, cell)"
          @dragleave="onDayCellDragLeave(cell)"
          @drop="onDayCellDrop($event, cell)"
        >
          <div class="cal-day-num" :class="{ today: cell.isToday }">{{ cell.day }}</div>
          <span v-if="cell.isHoliday" class="cal-holiday-dot" :title="cell.holidayName"></span>
        </div>
      </div>

      <!-- Event bars layer — also a drop target for empty day columns -->
      <div
        class="cal-week-events"
        :style="{ height: weekEventsHeight(week) + 'px' }"
        @dragover="onBarsLayerDragOver($event, week)"
        @drop="onBarsLayerDrop($event, week)"
      >
        <div
          v-for="bar in week.bars"
          :key="bar.key"
          class="cal-ev-bar"
          :class="{
            'bar-internal':       bar.event?.internal,
            'bar-done':           bar.event?.completed,
            'bar-dragging':       bar.evId === dragEvId,
            'bar-dragover':       bar.evId === dragoverEvId,
            'bar-continues-left': bar.continuesLeft,
            'bar-continues-right':bar.continuesRight,
            'bar-holiday':        bar.isHoliday,
            'bar-out-of-month':   bar.outOfMonth,
          }"
          :style="{
            left:       `calc(${bar.col * COL_W}% + 3px)`,
            width:      `calc(${bar.span * COL_W}% - 6px)`,
            top:        (BASE_TOP + bar.lane * LANE_H) + 'px',
            background: bar.isKey ? '#111' : bar.color,
            color:      bar.isKey ? '#fff' : 'rgba(0,0,0,.78)',
          }"
          :title="bar.isHoliday ? bar.name : barTooltip(bar)"
          :draggable="!readOnly && !bar.isHoliday && !bar.outOfMonth"
          @click.stop="!readOnly && !bar.isHoliday && !bar.outOfMonth && emit('event-click', bar.event)"
          @dragstart="onBarDragStart($event, bar)"
          @dragover="onBarDragOver($event, bar)"
          @dragleave="onBarDragLeave(bar)"
          @drop="onBarDrop($event, bar)"
          @dragend="onBarDragEnd"
        >
          <span v-if="bar.continuesLeft" class="bar-arrow bar-arrow-left">←</span>
          <span v-if="bar.event?.internal" class="bar-internal-icon" title="Internal only">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.7;flex-shrink:0">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <!-- Dependency status icon -->
          <span v-if="bar.event?.dep?.active" class="bar-dep-icon bar-dep-active" title="Active dependency">
            <svg width="6" height="8" viewBox="0 0 9 12" fill="currentColor"><polygon points="0,0 9,6 0,12"/></svg>
          </span>
          <span v-else-if="bar.event?.dep?.eventId" class="bar-dep-icon bar-dep-paused" title="Paused dependency">
            <svg width="6" height="8" viewBox="0 0 9 12" fill="currentColor"><rect x="0" y="0" width="3" height="12"/><rect x="6" y="0" width="3" height="12"/></svg>
          </span>
          <span v-if="bar.isKey" class="bar-key-icon">★</span>
          <span v-if="bar.event?.completed" class="bar-done-icon">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
          <span class="bar-label">{{ bar.name }}</span>
          <span v-if="bar.continuesRight" class="bar-arrow bar-arrow-right">→</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { isoToday, describeDependency } from '~/utils/helpers'

const props = defineProps({
  year:      { type: Number, required: true },
  month:     { type: Number, required: true },
  events:    { type: Array,  default: () => [] },
  weekStart: { type: String, default: 'sun' },
  lang:      { type: String, default: 'es' },
  readOnly:  { type: Boolean, default: false },
  holidays:  { type: Array,  default: () => [] },
})

const emit = defineEmits(['day-click', 'day-select', 'event-click', 'reorder-events', 'reschedule-event'])

// ── Drag-and-drop: reorder within same day OR reschedule to a different day ────
const dragEvId     = ref(null)  // id of the event bar being dragged
const dragEvDate   = ref(null)  // start date of the event being dragged
const dragoverEvId = ref(null)  // id of the bar under the cursor (same-day highlight)
const dragoverDate = ref(null)  // date string of the day cell under the cursor (cross-day highlight)

// Is the event currently being dragged a Business Days event?
const isDragBusinessDay = computed(() => {
  if (!dragEvId.value) return false
  const ev = props.events.find(e => e.id === dragEvId.value)
  return ev?.durDayType === 'business'
})

// Is the current hover target an invalid drop zone for the dragged event?
// (Business Days events cannot land on weekends or active holidays)
const isDropTargetInvalid = computed(() => {
  if (!isDragBusinessDay.value || !dragoverDate.value) return false
  for (const week of weeks.value) {
    const cell = week.cells.find(c => c.dateStr === dragoverDate.value)
    if (cell) return cell.isWeekend || cell.isHoliday
  }
  return false
})

function clearDrag() {
  dragEvId.value     = null
  dragEvDate.value   = null
  dragoverEvId.value = null
  dragoverDate.value = null
}

function onBarDragStart(e, bar) {
  if (props.readOnly) return
  dragEvId.value   = bar.evId
  dragEvDate.value = bar.evStart
  e.dataTransfer.effectAllowed = 'move'
}

function onBarDragOver(e, bar) {
  if (props.readOnly || bar.evId === dragEvId.value) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  if (bar.evStart === dragEvDate.value) {
    // Same day → show bar-level highlight for reorder
    dragoverEvId.value = bar.evId
    dragoverDate.value = null
  } else {
    // Different day → show day-level highlight for reschedule
    dragoverEvId.value = null
    dragoverDate.value = bar.evStart
  }
}

function onBarDragLeave(bar) {
  if (dragoverEvId.value === bar.evId) dragoverEvId.value = null
  if (dragoverDate.value === bar.evStart) dragoverDate.value = null
}

function onBarDrop(e, bar) {
  e.preventDefault()
  if (!dragEvId.value || bar.evId === dragEvId.value) { clearDrag(); return }
  if (bar.evStart === dragEvDate.value) {
    // Same day: swap order (reorder lanes)
    emit('reorder-events', { evId1: dragEvId.value, evId2: bar.evId })
  } else {
    // Different day: reschedule event to the bar's start date
    emit('reschedule-event', { evId: dragEvId.value, newDate: bar.evStart })
  }
  clearDrag()
}

function onBarDragEnd() { clearDrag() }

// ── Day cell drop target (empty area between/below bars) ──────────────────────
function onDayCellDragOver(e, cell) {
  if (!dragEvId.value || props.readOnly) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dragoverEvId.value = null
  dragoverDate.value = cell.dateStr
}

function onDayCellDragLeave(cell) {
  if (dragoverDate.value === cell.dateStr) dragoverDate.value = null
}

function onDayCellDrop(e, cell) {
  e.preventDefault()
  if (!dragEvId.value) { clearDrag(); return }
  // Emit also when same day — CalendarView will reorder to lane 0
  emit('reschedule-event', { evId: dragEvId.value, newDate: cell.dateStr })
  clearDrag()
}

// Bars layer drop: detect which column (day) based on mouse X position
function getBarsLayerDate(e, week) {
  const rect = e.currentTarget.getBoundingClientRect()
  const col  = Math.min(6, Math.max(0, Math.floor((e.clientX - rect.left) / (rect.width / 7))))
  return week.cells[col]?.dateStr || null
}

function onBarsLayerDragOver(e, week) {
  if (!dragEvId.value || props.readOnly) return
  const dateStr = getBarsLayerDate(e, week)
  if (!dateStr) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dragoverEvId.value = null
  dragoverDate.value = dateStr
}

function onBarsLayerDrop(e, week) {
  if (!dragEvId.value) { clearDrag(); return }
  const dateStr = getBarsLayerDate(e, week)
  if (dateStr) {
    e.preventDefault()
    emit('reschedule-event', { evId: dragEvId.value, newDate: dateStr })
  }
  clearDrag()
}

const BASE_TOP = 6   // px from top of events layer to first lane
const LANE_H   = 23  // px per lane
const COL_W    = 100 / 7  // % width per day column
const MIN_H    = 110 // min height of events layer when no bars

const DAYS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const dayHeaders = computed(() => {
  const days  = props.lang === 'en' ? DAYS_EN : DAYS_ES
  const start = props.weekStart === 'mon' ? 1 : 0
  return Array.from({ length: 7 }, (_, i) => days[(start + i) % 7])
})

const today = isoToday()

function ds(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function weekEventsHeight(week) {
  const rawHeight = BASE_TOP + week.laneCount * LANE_H + 8
  return Math.max(rawHeight, MIN_H)
}

const weeks = computed(() => {
  const year  = props.year
  const month = props.month
  const startDow = props.weekStart === 'mon' ? 1 : 0

  // ── Business-day helpers ───────────────────────────────────────
  const holidayDates = new Set(props.holidays.map(h => h.date))

  function isBusinessDay(dateStr) {
    const dow = new Date(dateStr + 'T12:00:00').getDay()
    return dow !== 0 && dow !== 6 && !holidayDates.has(dateStr)
  }

  function calcBusinessEnd(startDate, duration) {
    if (duration <= 1) return startDate
    let count = 1, current = startDate
    while (count < duration) {
      current = addDays(current, 1)
      if (isBusinessDay(current)) count++
    }
    return current
  }

  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  let offset = firstDay.getDay() - startDow
  if (offset < 0) offset += 7

  const totalCells = Math.ceil((offset + lastDay.getDate()) / 7) * 7

  // Build flat cell list
  const allCells = []
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - offset
    let d, m, y
    if (dayOffset < 0) {
      const prev = new Date(year, month, dayOffset + 1)
      d = prev.getDate(); m = prev.getMonth(); y = prev.getFullYear()
    } else if (dayOffset >= lastDay.getDate()) {
      const next = new Date(year, month + 1, dayOffset - lastDay.getDate() + 1)
      d = next.getDate(); m = next.getMonth(); y = next.getFullYear()
    } else {
      d = dayOffset + 1; m = month; y = year
    }
    const dateStr = ds(y, m, d)
    const dow     = (startDow + i) % 7  // 0 = first day of week
    const realDow = new Date(y, m, d).getDay()
    const holiday = props.holidays.find(h => h.date === dateStr)
    allCells.push({
      dateStr,
      day:         d,
      inMonth:     m === month,
      isToday:     dateStr === today,
      isWeekend:   realDow === 0 || realDow === 6,
      isHoliday:   !!holiday,
      holidayName: holiday?.localName || holiday?.name || '',
    })
  }

  const numWeeks = totalCells / 7
  const result   = []

  for (let w = 0; w < numWeeks; w++) {
    const cells     = allCells.slice(w * 7, w * 7 + 7)
    const weekStart = cells[0].dateStr
    const weekEnd   = cells[6].dateStr

    // Collect bars for this week
    const bars = []
    for (const ev of props.events) {
      if (!ev.date || !ev.active) continue
      const dur         = ev.duration || ev.days || 1
      const evStart     = ev.date
      const isBusinessEv = ev.durDayType === 'business'
      const evEnd       = isBusinessEv
        ? calcBusinessEnd(evStart, dur)
        : addDays(ev.date, dur - 1)

      if (evEnd < weekStart || evStart > weekEnd) continue

      const name  = props.lang === 'en' ? (ev.nameEN || ev.name) : ev.name
      const color = ev._projColor || '#06CCB4'

      if (isBusinessEv) {
        // Business-day events: render only on actual business days,
        // split into separate segments wherever weekends/holidays interrupt.
        let segStartCol = -1, segEndCol = -1
        for (let ci = 0; ci < cells.length; ci++) {
          const date    = cells[ci].dateStr
          const inRange = date >= evStart && date <= evEnd
          const isBD    = inRange && isBusinessDay(date)
          if (isBD) {
            if (segStartCol < 0) segStartCol = ci
            segEndCol = ci
          } else if (segStartCol >= 0) {
            const contL = evStart < cells[segStartCol].dateStr
            const contR = evEnd   > cells[segEndCol].dateStr
            bars.push({ key: ev.id+'_w'+w+'_c'+segStartCol, event: ev, evId: ev.id, evStart, col: segStartCol, span: segEndCol - segStartCol + 1, name, color, isKey: ev.keyDate, lane: -1, continuesLeft: contL, continuesRight: contR, outOfMonth: !cells[segStartCol].inMonth })
            segStartCol = -1
          }
        }
        if (segStartCol >= 0) {
          const contL = evStart < cells[segStartCol].dateStr
          const contR = evEnd   > cells[segEndCol].dateStr
          bars.push({ key: ev.id+'_w'+w+'_c'+segStartCol, event: ev, evId: ev.id, evStart, col: segStartCol, span: segEndCol - segStartCol + 1, name, color, isKey: ev.keyDate, lane: -1, continuesLeft: contL, continuesRight: contR, outOfMonth: !cells[segStartCol].inMonth })
        }
      } else {
        // Calendar-day events: continuous bar across the week
        const barStart = evStart < weekStart ? weekStart : evStart
        const barEnd   = evEnd   > weekEnd   ? weekEnd   : evEnd
        const col    = cells.findIndex(c => c.dateStr === barStart)
        const colEnd = cells.findIndex(c => c.dateStr === barEnd)
        if (col < 0 || colEnd < 0) continue
        const contL = evStart < weekStart
        const contR = evEnd   > weekEnd
        bars.push({ key: ev.id+'_w'+w, event: ev, evId: ev.id, evStart, col, span: colEnd - col + 1, name, color, isKey: ev.keyDate, lane: -1, continuesLeft: contL, continuesRight: contR, outOfMonth: !cells[col].inMonth })
      }
    }

    // Add holiday bars (1-column, gray, non-interactive)
    for (let ci = 0; ci < cells.length; ci++) {
      const cell = cells[ci]
      if (!cell.isHoliday || !cell.inMonth) continue
      bars.push({
        key:            'hol-' + cell.dateStr,
        event:          null,
        evId:           'hol-' + cell.dateStr,
        evStart:        cell.dateStr,
        col:            ci,
        span:           1,
        name:           cell.holidayName,
        color:          '#ebebeb',
        isKey:          false,
        lane:           -1,
        continuesLeft:  false,
        continuesRight: false,
        isHoliday:      true,
      })
    }

    // ── Lane assignment (range-based, groups segments of same event) ──
    // Group bars by event so all segments of the same event share a lane.
    // Within the same start date, sort by the event's `order` field (creation/manual order).
    const byEvent = {}
    for (const bar of bars) {
      if (!byEvent[bar.evId]) byEvent[bar.evId] = { evStart: bar.evStart, order: bar.event?.order ?? 0, bars: [] }
      byEvent[bar.evId].bars.push(bar)
    }

    const sortedEvents = Object.values(byEvent).sort((a, b) => {
      if (a.evStart !== b.evStart) return a.evStart < b.evStart ? -1 : 1
      // Same start date → use user-defined order (creation order / manual drag order)
      return (a.order ?? 0) - (b.order ?? 0)
    })

    const laneRanges = [] // laneRanges[l] = [[colStart, colEnd], ...]
    for (const ev of sortedEvents) {
      const ranges = ev.bars.map(b => [b.col, b.col + b.span - 1])
      let assignedLane = -1
      for (let l = 0; l < laneRanges.length; l++) {
        let fits = true
        outer: for (const [sc, ec] of ranges) {
          for (const [oc, oe] of laneRanges[l]) {
            if (sc <= oe && oc <= ec) { fits = false; break outer }
          }
        }
        if (fits) { assignedLane = l; laneRanges[l].push(...ranges); break }
      }
      if (assignedLane < 0) { assignedLane = laneRanges.length; laneRanges.push([...ranges]) }
      for (const bar of ev.bars) bar.lane = assignedLane
    }

    const laneCount = bars.length > 0 ? Math.max(...bars.map(b => b.lane)) + 1 : 0
    result.push({ cells, bars, laneCount })
  }

  return result
})

// ── Bar tooltip: dependency-aware ─────────────────────────────────────────────
function barTooltip(bar) {
  const ev  = bar.event
  const dep = ev?.dep
  if (!dep?.eventId) return describeDependency(ev, null, props.lang)
  const refEvent = props.events.find(e => e.id === dep.eventId)
  return describeDependency(ev, refEvent || null, props.lang)
}
</script>

<style scoped>
.cal-month {
  display: flex; flex-direction: column; gap: 0;
  border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
}

.cal-day-headers {
  display: grid; grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--border);
}
.cal-day-header {
  text-align: center; font-size: .62rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .5px; color: var(--muted);
  padding: 6px 0;
}

/* ── Week row ── */
.cal-week-row {
  display: flex; flex-direction: column;
  border-bottom: 1px solid var(--border);
  background: #fff;
}
.cal-week-row:last-child { border-bottom: none; }

.cal-week-days {
  display: grid; grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid rgba(0,0,0,.05);
}

.cal-day {
  position: relative;
  padding: 5px 7px 3px;
  cursor: pointer; transition: background .1s;
  border-right: 1px solid var(--border);
  min-height: 32px;
}
.cal-day:last-child { border-right: none; }
.cal-day:hover:not(.cal-day-other) { background: rgba(6,204,180,.05); }
.cal-day-other { opacity: .3; cursor: default; }
.cal-day-today { background: rgba(6,204,180,.07) !important; }
.cal-day-weekend { background: rgba(0,0,0,.015); }
.cal-day-holiday { background: rgba(245,158,11,.04); }

.cal-day-num {
  font-size: .74rem; font-weight: 600; color: var(--text); line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px;
}
.cal-day-num.today {
  background: var(--accent); color: var(--navy); border-radius: 50%;
  font-weight: 800;
}

.cal-holiday-dot {
  position: absolute; top: 6px; right: 6px;
  width: 5px; height: 5px; background: var(--warning); border-radius: 50%;
}

/* ── Event bars layer ── */
.cal-week-events {
  position: relative; width: 100%;
}

.cal-ev-bar {
  position: absolute;
  min-height: 20px; height: auto; border-radius: 4px;
  display: flex; align-items: flex-start; padding: 3px 7px;
  cursor: pointer;
  transition: opacity .12s; box-sizing: border-box;
}
.cal-ev-bar:hover { opacity: .8; }
.cal-ev-bar.bar-internal { /* no extra pattern — lock icon is the sole indicator */ }
.cal-ev-bar.bar-continues-left  { border-top-left-radius:  2px; border-bottom-left-radius:  2px; }
.cal-ev-bar.bar-continues-right { border-top-right-radius: 2px; border-bottom-right-radius: 2px; }

.bar-arrow {
  font-size: .58rem; flex-shrink: 0; pointer-events: none;
  color: inherit; opacity: .7; line-height: 1;
}
.bar-arrow-right { margin-left: auto; }
.cal-ev-bar.bar-dragging  { opacity: .4; cursor: grabbing; }
.cal-ev-bar.bar-dragover  { outline: 2px solid rgba(0,0,0,.5); outline-offset: -1px; filter: brightness(1.15); }
.cal-day.cal-day-droptarget         { background: rgba(6,204,180,.13)  !important; outline: 2px solid var(--accent); outline-offset: -2px; }
.cal-day.cal-day-droptarget-invalid { background: rgba(239,68,68,.08)   !important; outline: 2px solid #ef4444;      outline-offset: -2px; }

.bar-label {
  font-size: .62rem; font-weight: 700; color: inherit;
  white-space: normal; word-break: break-word; line-height: 1.3;
  pointer-events: none;
}
.bar-internal-icon {
  display: inline-flex; align-items: center; flex-shrink: 0;
  margin-right: 3px; pointer-events: none; color: rgba(0,0,0,.6);
}

.bar-dep-icon {
  display: inline-flex; align-items: center; flex-shrink: 0;
  margin-right: 3px; pointer-events: none; align-self: center;
}
.bar-dep-active { color: inherit; opacity: .7; }
.bar-dep-paused { color: inherit; opacity: .35; }

.cal-ev-bar.bar-out-of-month {
  opacity: .3;
  pointer-events: none;   /* not clickable, not draggable */
  cursor: default;
}
.cal-ev-bar.bar-done { opacity: .55; }
.cal-ev-bar.bar-done .bar-label { text-decoration: line-through; }

.bar-done-icon {
  display: inline-flex; align-items: center; flex-shrink: 0;
  margin-right: 3px; pointer-events: none; color: rgba(0,0,0,.65);
}

.bar-key-icon {
  font-size: .52rem; flex-shrink: 0; margin-right: 3px;
  pointer-events: none; color: inherit; line-height: 1;
}

.cal-ev-bar.bar-holiday {
  cursor: default;
  border-left: 2px solid #bbb;
}
.cal-ev-bar.bar-holiday .bar-label {
  font-style: italic;
  color: #999;
  font-weight: 500;
}
</style>
