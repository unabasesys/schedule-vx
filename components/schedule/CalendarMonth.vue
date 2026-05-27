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
            'cal-day-focused':          cell.dateStr === focusDate && cell.inMonth,
            'cal-day-droptarget':       cell.dateStr === dragoverDate && (!!dragEvId || !!activeDrag?.evId) && !isDropTargetInvalid,
            'cal-day-droptarget-invalid': cell.dateStr === dragoverDate && (!!dragEvId || !!activeDrag?.evId) && isDropTargetInvalid,
          }"
          @click="cell.inMonth && emit('day-select', cell.dateStr)"
          @dblclick="!readOnly && cell.inMonth && emit('day-click', cell.dateStr)"
          @dragover="onDayCellDragOver($event, cell)"
          @dragleave="onDayCellDragLeave(cell)"
          @drop="onDayCellDrop($event, cell)"
        >
          <div class="cal-day-num" :class="{ today: cell.isToday }">{{ cell.day }}</div>

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
            'bar-key':            bar.isKey,
            'bar-out-of-month':   bar.outOfMonth,
            'bar-saving':         bar.evId === props.savingEvId,
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
          @click.stop="onBarClick(bar)"
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
          <span v-if="!bar.isHoliday && dailyEventIds.has(bar.evId)" class="bar-daily-dot" title="Has daily schedule items"></span>
          <span v-if="bar.continuesRight" class="bar-arrow bar-arrow-right">→</span>
        </div>

        <!-- +more badges — one per day column that exceeds MAX_LANES -->
        <div
          v-for="ov in week.overflows"
          :key="'more-' + ov.col"
          class="cal-more-badge"
          :style="{
            left:  `calc(${ov.col * COL_W}% + 3px)`,
            width: `calc(${COL_W}% - 6px)`,
            top:   (BASE_TOP + MAX_LANES * LANE_H) + 'px',
          }"
          @click.stop="openOverflow(week.cells[ov.col], ov)"
        >+{{ ov.count }} {{ lang === 'en' ? 'more' : 'más' }}</div>
      </div>
    </div>
  </div>

  <!-- Day overflow modal -->
  <Teleport to="body">
    <div v-if="overflowModal.open" class="cal-overflow-backdrop" @click.self="closeOverflow">
      <div class="cal-overflow-modal">
        <div class="cal-overflow-header">
          <span class="cal-overflow-title">{{ formatOverflowDate(overflowModal.dateStr) }}</span>
          <button class="cal-overflow-close" @click="closeOverflow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="cal-overflow-list">
          <div
            v-for="bar in overflowModal.bars"
            :key="bar.evId"
            class="cal-overflow-item"
            :class="{ 'cal-overflow-done': bar.event?.completed }"
            :style="{ borderLeftColor: bar.isKey ? '#111' : bar.color }"
            @click="!readOnly && onOverflowEventClick(bar.event)"
          >
            <span v-if="bar.isKey" class="cal-overflow-key">★</span>
            {{ bar.name }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { isoToday, describeDependency } from '~/utils/helpers'

const props = defineProps({
  year:        { type: Number, required: true },
  month:       { type: Number, required: true },
  events:      { type: Array,  default: () => [] },
  weekStart:   { type: String, default: 'sun' },
  lang:        { type: String, default: 'es' },
  readOnly:    { type: Boolean, default: false },
  holidays:    { type: Array,  default: () => [] },
  focusDate:     { type: String, default: '' },
  savingEvId:    { type: String, default: null },
  dailySchedule: { type: Array,  default: () => [] },
})

const dailyCountByEvent = computed(() => {
  const map = new Map()
  for (const item of props.dailySchedule) {
    if (item.relatedCalendarEventId) {
      map.set(item.relatedCalendarEventId, (map.get(item.relatedCalendarEventId) || 0) + 1)
    }
  }
  return map
})

const dailyEventIds = computed(() => new Set(dailyCountByEvent.value.keys()))

const emit = defineEmits(['day-click', 'day-select', 'event-click', 'holiday-click', 'reorder-events', 'reschedule-event'])

function onBarClick(bar) {
  if (props.readOnly) return
  if (bar.isHoliday) {
    emit('holiday-click', { date: bar.evStart, name: bar.name })
  } else if (!bar.outOfMonth) {
    emit('event-click', bar.event)
  }
}

// Shared drag state injected from CalendarView — enables cross-month drag
const activeDrag = inject('calDrag', null)

// ── Drag-and-drop: reorder within same day OR reschedule to a different day ────
const dragEvId     = ref(null)  // id of the event bar being dragged (local month only)
const dragEvDate   = ref(null)  // start date of the event being dragged (local month only)
const dragoverEvId = ref(null)  // id of the bar under the cursor (same-day highlight)
const dragoverDate = ref(null)  // date string of the day cell under the cursor (cross-day highlight)

// Is the event currently being dragged a Business Days event?
const isDragBusinessDay = computed(() => {
  if (dragEvId.value) {
    const ev = props.events.find(e => e.id === dragEvId.value)
    return ev?.durDayType === 'business'
  }
  if (activeDrag?.evId) return activeDrag.isBusiness
  return false
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
  if (activeDrag) {
    activeDrag.evId       = null
    activeDrag.evStart    = null
    activeDrag.isBusiness = false
  }
}

function onBarDragStart(e, bar) {
  if (props.readOnly) return
  dragEvId.value   = bar.evId
  dragEvDate.value = bar.evStart
  e.dataTransfer.effectAllowed = 'move'
  if (activeDrag) {
    const ev = props.events.find(ev => ev.id === bar.evId)
    activeDrag.evId       = bar.evId
    activeDrag.evStart    = bar.evStart
    activeDrag.isBusiness = ev?.durDayType === 'business'
  }
}

// When a drag that started in another month ends, clear local hover state
if (activeDrag) {
  watch(() => activeDrag.evId, (newId) => {
    if (!newId) { dragoverEvId.value = null; dragoverDate.value = null }
  })
}

function onBarDragOver(e, bar) {
  const sourceEvId    = dragEvId.value    || activeDrag?.evId
  const sourceEvStart = dragEvDate.value  || activeDrag?.evStart
  if (props.readOnly || !sourceEvId || bar.evId === sourceEvId) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  if (bar.evStart === sourceEvStart) {
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
  const evId    = dragEvId.value   || activeDrag?.evId
  const evStart = dragEvDate.value || activeDrag?.evStart
  if (!evId || bar.evId === evId) { clearDrag(); return }
  if (bar.evStart === evStart) {
    emit('reorder-events', { evId1: evId, evId2: bar.evId })
  } else {
    emit('reschedule-event', { evId, newDate: bar.evStart })
  }
  clearDrag()
}

function onBarDragEnd() { clearDrag() }

// ── Day cell drop target (empty area between/below bars) ──────────────────────
function onDayCellDragOver(e, cell) {
  if (props.readOnly) return
  if (!dragEvId.value && !activeDrag?.evId) return
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
  const evId = dragEvId.value || activeDrag?.evId
  if (!evId) { clearDrag(); return }
  emit('reschedule-event', { evId, newDate: cell.dateStr })
  clearDrag()
}

// Bars layer drop: detect which column (day) based on mouse X position
function getBarsLayerDate(e, week) {
  const rect = e.currentTarget.getBoundingClientRect()
  const col  = Math.min(6, Math.max(0, Math.floor((e.clientX - rect.left) / (rect.width / 7))))
  return week.cells[col]?.dateStr || null
}

function onBarsLayerDragOver(e, week) {
  if (props.readOnly) return
  if (!dragEvId.value && !activeDrag?.evId) return
  const dateStr = getBarsLayerDate(e, week)
  if (!dateStr) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dragoverEvId.value = null
  dragoverDate.value = dateStr
}

function onBarsLayerDrop(e, week) {
  const evId = dragEvId.value || activeDrag?.evId
  if (!evId) { clearDrag(); return }
  const dateStr = getBarsLayerDate(e, week)
  if (dateStr) {
    e.preventDefault()
    emit('reschedule-event', { evId, newDate: dateStr })
  }
  clearDrag()
}

const BASE_TOP  = 6          // px from top of events layer to first lane
const LANE_H    = 23         // px per lane
const COL_W     = 100 / 7   // % width per day column
const MIN_H     = 110        // min height of events layer when no bars
const MAX_LANES = 6          // visible lanes before +more overflow
const MORE_ROW  = 20         // height reserved for the +more badge row

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
  const extra    = week.hasOverflow ? MORE_ROW : 0
  const rawHeight = BASE_TOP + week.laneCount * LANE_H + extra + 8
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
      const color = ev._stageColor || ev._projColor || '#20a789'

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

    // ── Overflow: cap visible bars at MAX_LANES, collect per-column +more data ──
    const overflows = []
    for (let ci = 0; ci < 7; ci++) {
      if (!cells[ci].inMonth) continue
      const hiddenSet = new Set(), allSet = new Set()
      const hiddenBars = [], allBarsForDay = []
      for (const b of bars) {
        if (b.isHoliday) continue
        if (b.col > ci || b.col + b.span - 1 < ci) continue
        if (!allSet.has(b.evId)) { allSet.add(b.evId); allBarsForDay.push(b) }
        if (b.lane >= MAX_LANES && !hiddenSet.has(b.evId)) { hiddenSet.add(b.evId); hiddenBars.push(b) }
      }
      if (hiddenBars.length > 0) {
        overflows.push({ col: ci, count: hiddenBars.length, allBars: allBarsForDay })
      }
    }

    const visibleBars = bars.filter(b => b.isHoliday || b.lane < MAX_LANES)
    const laneCount   = visibleBars.length > 0 ? Math.max(...visibleBars.map(b => b.lane)) + 1 : 0
    const hasOverflow = overflows.length > 0
    result.push({ cells, bars: visibleBars, laneCount, overflows, hasOverflow })
  }

  return result
})

// ── Bar tooltip: dependency-aware + daily events count ───────────────────────
function barTooltip(bar) {
  const ev  = bar.event
  const dep = ev?.dep
  const depText = dep?.eventId
    ? describeDependency(ev, props.events.find(e => e.id === dep.eventId) || null, props.lang)
    : null

  const count = dailyCountByEvent.value.get(bar.evId)
  if (!count) return depText || ''
  const dailyText = props.lang === 'en'
    ? `${count} daily event${count === 1 ? '' : 's'} linked`
    : `${count} evento${count === 1 ? '' : 's'} del daily vinculado${count === 1 ? '' : 's'}`
  return depText ? `${depText}\n${dailyText}` : dailyText
}

// ── Day overflow modal ────────────────────────────────────────────────────────
const overflowModal = reactive({ open: false, dateStr: '', bars: [] })

function openOverflow(cell, ov) {
  overflowModal.dateStr = cell.dateStr
  overflowModal.bars    = ov.allBars
  overflowModal.open    = true
}

function closeOverflow() { overflowModal.open = false }

function onOverflowEventClick(ev) {
  closeOverflow()
  if (ev) emit('event-click', ev)
}

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW_ES    = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const DOW_EN    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function formatOverflowDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  return props.lang === 'en'
    ? `${DOW_EN[dow]}, ${MONTHS_EN[m - 1]} ${d}`
    : `${DOW_ES[dow]} ${d} de ${MONTHS_ES[m - 1]}`
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
  background: var(--surface);
}
.cal-week-row:last-child { border-bottom: none; }

.cal-week-days {
  display: grid; grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid rgba(255,255,255,.04);
}

.cal-day {
  position: relative;
  padding: 5px 7px 3px;
  cursor: pointer; transition: background .1s;
  border-right: 1px solid var(--border);
  min-height: 32px;
}
.cal-day:last-child { border-right: none; }
.cal-day:hover:not(.cal-day-other) { background: rgba(32,167,137,.05); }
.cal-day-other { opacity: .3; cursor: default; }
.cal-day-today { background: rgba(32,167,137,.07) !important; }
.cal-day-weekend { background: rgba(0,0,0,.08); }
.cal-day-holiday { background: rgba(245,158,11,.04); }
.cal-day-focused { background: rgba(32,167,137,.13) !important; outline: 2px solid var(--accent); outline-offset: -2px; }

.cal-day-num {
  font-size: .74rem; font-weight: 600; color: var(--text); line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px;
}
.cal-day-num.today {
  background: var(--accent); color: #fff; border-radius: 50%;
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
  min-height: 20px; border-radius: 4px;
  display: flex; align-items: center; padding: 3px 7px;
  cursor: pointer; overflow: hidden;
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
@keyframes bar-save-pulse {
  0%   { opacity: 1;   filter: brightness(1); }
  35%  { opacity: .55; filter: brightness(1.2); }
  100% { opacity: 1;   filter: brightness(1); }
}
.cal-ev-bar.bar-saving { animation: bar-save-pulse .65s ease-out; pointer-events: none; }
.cal-day.cal-day-droptarget         { background: rgba(32,167,137,.13)  !important; outline: 2px solid var(--accent); outline-offset: -2px; }
.cal-day.cal-day-droptarget-invalid { background: rgba(239,68,68,.08)   !important; outline: 2px solid #ef4444;      outline-offset: -2px; }

.bar-label {
  font-size: .62rem; font-weight: 700; color: inherit;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  line-height: 1.3;
  pointer-events: none;
  flex: 1; min-width: 0;
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
  pointer-events: none; color: inherit;
  display: inline-flex; align-items: center;
}

.bar-daily-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: rgba(0,0,0,.35);
  flex-shrink: 0; margin-left: 4px; pointer-events: none;
  align-self: center;
}
.cal-ev-bar.bar-key .bar-daily-dot {
  background: rgba(255,255,255,.55);
}

.cal-ev-bar.bar-holiday {
  cursor: pointer;
  border-left: 2px solid #bbb;
}
.cal-ev-bar.bar-holiday .bar-label {
  font-style: italic;
  color: #555;
  font-weight: 500;
}

/* ── +more overflow badge ── */
.cal-more-badge {
  position: absolute;
  font-size: .58rem; font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--surface-2, rgba(255,255,255,.06));
  border: 1px solid var(--border);
  line-height: 1.4; white-space: nowrap;
  box-sizing: border-box;
  transition: background .12s, color .12s, border-color .12s;
}
.cal-more-badge:hover {
  color: var(--text);
  background: rgba(32,167,137,.12);
  border-color: var(--accent);
}

/* ── Day overflow modal ── */
.cal-overflow-backdrop {
  position: fixed; inset: 0; z-index: 400;
  background: rgba(0,0,0,.28);
  display: flex; align-items: center; justify-content: center;
}
.cal-overflow-modal {
  background: var(--surface); border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0,0,0,.22);
  width: 320px; max-width: 92vw;
  max-height: 70vh; display: flex; flex-direction: column;
  overflow: hidden;
}
.cal-overflow-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.cal-overflow-title {
  font-size: .84rem; font-weight: 700; color: var(--text);
}
.cal-overflow-close {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border: none;
  background: transparent; color: var(--muted);
  cursor: pointer; border-radius: 6px;
  transition: background .12s, color .12s;
}
.cal-overflow-close:hover { background: rgba(255,255,255,.08); color: var(--text); }
.cal-overflow-list {
  overflow-y: auto; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 4px;
}
.cal-overflow-item {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 10px; border-radius: 6px;
  border-left: 3px solid transparent;
  font-size: .76rem; font-weight: 600; color: var(--text);
  cursor: pointer; background: var(--surface-2, rgba(255,255,255,.04));
  transition: background .1s;
}
.cal-overflow-item:hover { background: rgba(32,167,137,.1); }
.cal-overflow-done { opacity: .55; text-decoration: line-through; }
.cal-overflow-key  { font-size: .52rem; flex-shrink: 0; }
</style>
