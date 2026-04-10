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
            'cal-day-other':   !cell.inMonth,
            'cal-day-today':    cell.isToday,
            'cal-day-weekend':  cell.isWeekend,
            'cal-day-holiday':  cell.isHoliday,
          }"
          @click="!readOnly && cell.inMonth && $emit('day-click', cell.dateStr)"
        >
          <div class="cal-day-num" :class="{ today: cell.isToday }">{{ cell.day }}</div>
          <span v-if="cell.isHoliday" class="cal-holiday-dot" :title="cell.holidayName"></span>
        </div>
      </div>

      <!-- Event bars layer -->
      <div
        class="cal-week-events"
        :style="{ height: weekEventsHeight(week) + 'px' }"
      >
        <div
          v-for="bar in week.bars"
          :key="bar.key"
          class="cal-ev-bar"
          :class="{ 'bar-key': bar.isKey }"
          :style="{
            left:       (bar.col * COL_W) + '%',
            width:      (bar.span * COL_W) + '%',
            top:        (BASE_TOP + bar.lane * LANE_H) + 'px',
            background: bar.color,
          }"
          :title="bar.name"
          @click.stop="!readOnly && $emit('event-click', bar.event)"
        >
          <span class="bar-label">{{ bar.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { isoToday } from '~/utils/helpers'

const props = defineProps({
  year:      { type: Number, required: true },
  month:     { type: Number, required: true },
  events:    { type: Array,  default: () => [] },
  weekStart: { type: String, default: 'sun' },
  lang:      { type: String, default: 'es' },
  readOnly:  { type: Boolean, default: false },
  holidays:  { type: Array,  default: () => [] },
})

defineEmits(['day-click', 'event-click'])

const BASE_TOP = 4   // px from top of events layer to first lane
const LANE_H   = 17  // px per lane
const COL_W    = 100 / 7  // % width per day column
const MIN_H    = 8   // min height of events layer when no bars

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
  if (!week.laneCount) return MIN_H
  return BASE_TOP + week.laneCount * LANE_H + 4
}

const weeks = computed(() => {
  const year  = props.year
  const month = props.month
  const startDow = props.weekStart === 'mon' ? 1 : 0

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
      const dur    = ev.duration || ev.days || 1
      const evStart = ev.date
      const evEnd   = addDays(ev.date, dur - 1)
      if (evEnd < weekStart || evStart > weekEnd) continue

      const barStart = evStart < weekStart ? weekStart : evStart
      const barEnd   = evEnd   > weekEnd   ? weekEnd   : evEnd
      const col      = cells.findIndex(c => c.dateStr === barStart)
      const colEnd   = cells.findIndex(c => c.dateStr === barEnd)
      if (col < 0 || colEnd < 0) continue

      const span  = colEnd - col + 1
      const name  = props.lang === 'en' ? (ev.nameEN || ev.name) : ev.name
      const color = ev._projColor || '#06CCB4'

      bars.push({
        key:    ev.id + '_w' + w,
        event:  ev,
        evId:   ev.id,
        evStart,
        col,
        span,
        name,
        color,
        isKey:  ev.keyDate,
        lane:   -1,
      })
    }

    // Sort: by start date, then longest span first
    bars.sort((a, b) => {
      if (a.evStart !== b.evStart) return a.evStart < b.evStart ? -1 : 1
      return b.span - a.span
    })

    // Greedy lane assignment — no two bars in the same lane overlap columns
    const laneEnds = []  // laneEnds[lane] = rightmost col (inclusive) used in that lane
    for (const bar of bars) {
      let assigned = -1
      for (let l = 0; l < laneEnds.length; l++) {
        if (laneEnds[l] < bar.col) {
          assigned    = l
          laneEnds[l] = bar.col + bar.span - 1
          break
        }
      }
      if (assigned === -1) {
        assigned = laneEnds.length
        laneEnds.push(bar.col + bar.span - 1)
      }
      bar.lane = assigned
    }

    const laneCount = bars.length > 0 ? Math.max(...bars.map(b => b.lane)) + 1 : 0
    result.push({ cells, bars, laneCount })
  }

  return result
})
</script>

<style scoped>
.cal-month { display: flex; flex-direction: column; gap: 2px; }

.cal-day-headers {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
}
.cal-day-header {
  text-align: center; font-size: .6rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .4px; color: var(--muted);
  padding: 3px 0;
}

/* ── Week row ── */
.cal-week-row {
  display: flex; flex-direction: column;
  border: 1px solid var(--border); border-radius: 6px; overflow: hidden;
  background: #fff;
}

.cal-week-days {
  display: grid; grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--border);
}

.cal-day {
  position: relative;
  padding: 4px 5px 2px;
  cursor: pointer; transition: background .1s;
  border-right: 1px solid var(--border);
  min-height: 28px;
}
.cal-day:last-child { border-right: none; }
.cal-day:hover:not(.cal-day-other) { background: rgba(6,204,180,.04); }
.cal-day-other { opacity: .4; cursor: default; }
.cal-day-today { background: rgba(6,204,180,.06) !important; }
.cal-day-weekend { background: #fafcfd; }
.cal-day-holiday { background: rgba(245,158,11,.04); }

.cal-day-num {
  font-size: .7rem; font-weight: 600; color: var(--text); line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px;
}
.cal-day-num.today {
  background: var(--accent); color: var(--navy); border-radius: 50%;
  font-weight: 800;
}

.cal-holiday-dot {
  position: absolute; top: 5px; right: 5px;
  width: 4px; height: 4px; background: var(--warning); border-radius: 50%;
}

/* ── Event bars layer ── */
.cal-week-events {
  position: relative; width: 100%;
}

.cal-ev-bar {
  position: absolute;
  height: 15px; border-radius: 3px;
  display: flex; align-items: center; padding: 0 5px;
  cursor: pointer; overflow: hidden;
  transition: opacity .12s; box-sizing: border-box;
}
.cal-ev-bar:hover { opacity: .8; }
.cal-ev-bar.bar-key { outline: 2px solid var(--warning); outline-offset: -1px; }

.bar-label {
  font-size: .58rem; font-weight: 700; color: rgba(0,0,0,.7);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none;
}
</style>
