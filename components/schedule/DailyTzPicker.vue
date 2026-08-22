<template>
  <div class="dtp" ref="rootEl">

    <!-- Selected state — shows label + IANA + clear -->
    <div v-if="hasValue && !searching" class="dtp-val" @click="openSearch">
      <div class="dtp-val-text">
        <span class="dtp-val-label">{{ displayLabel }}</span>
        <span class="dtp-val-iana">{{ displayIana }}</span>
      </div>
      <button class="dtp-val-clear" @click.stop="clear" :title="isEN ? 'Change timezone' : 'Cambiar zona horaria'">×</button>
    </div>

    <!-- Search state -->
    <div v-else class="dtp-search-wrap">
      <input
        ref="inputEl"
        v-model="query"
        class="dtp-input"
        :placeholder="isEN ? 'City, state or country...' : 'Ciudad, estado o país...'"
        @focus="dropOpen = true"
        @input="dropOpen = true"
        @blur="onBlur"
        @keydown.escape="close"
        @keydown.enter.prevent="pickFirst"
      />

      <!-- Dropdown -->
      <div v-if="dropOpen" class="dtp-drop">
        <div v-if="!query" class="dtp-drop-header">
          {{ isEN ? 'Common timezones' : 'Zonas horarias comunes' }}
        </div>

        <div
          v-for="opt in filteredOpts"
          :key="opt.iana + opt.city + opt.state"
          class="dtp-opt"
          :title="opt.tooltip"
          @mousedown.prevent="pick(opt)"
        >
          <div class="dtp-opt-main">{{ opt.label }}</div>
          <div class="dtp-opt-iana">{{ opt.iana }}</div>
        </div>

        <div v-if="query && !filteredOpts.length" class="dtp-no-match">
          {{ isEN ? 'No matches. Try a different city or country.' : 'Sin resultados. Probá otra ciudad o país.' }}
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { DAILY_TIMEZONE_OPTIONS, searchTimezones } from '~/utils/dailyTimezones'

const props = defineProps({
  modelValue: { type: Object, default: null },
  isEN:       { type: Boolean, default: false },
  isPrimary:  { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const rootEl   = ref(null)
const inputEl  = ref(null)
const query    = ref('')
const dropOpen = ref(false)
const searching = ref(false)

const hasValue = computed(() =>
  !!(props.modelValue?.iana || props.modelValue?.tz)
)
const displayLabel = computed(() =>
  props.modelValue?.label || props.modelValue?.tz || ''
)
const displayIana = computed(() =>
  props.modelValue?.iana || props.modelValue?.tz || ''
)

const filteredOpts = computed(() => {
  if (!query.value) return DAILY_TIMEZONE_OPTIONS.slice(0, 14)
  return searchTimezones(query.value).slice(0, 20)
})

function openSearch() {
  searching.value = true
  query.value = ''
  dropOpen.value = true
  nextTick(() => inputEl.value?.focus())
}

function close() {
  dropOpen.value = false
  if (hasValue.value) {
    searching.value = false
  }
  query.value = ''
}

function onBlur() {
  setTimeout(() => {
    dropOpen.value = false
    if (hasValue.value) searching.value = false
    query.value = ''
  }, 160)
}

function pick(opt) {
  emit('update:modelValue', {
    tz:                  opt.iana,
    iana:                opt.iana,
    label:               opt.label,
    shortLabel:          opt.shortLabel,
    city:                opt.city,
    state:               opt.state || null,
    country:             opt.country,
    timezoneGroup:       opt.timezoneGroup,
    abbreviationGeneric: opt.abbreviationGeneric,
    primary: props.isPrimary,
  })
  searching.value = false
  dropOpen.value  = false
  query.value     = ''
}

function pickFirst() {
  if (filteredOpts.value.length) pick(filteredOpts.value[0])
}

function clear() {
  emit('update:modelValue', null)
  searching.value = true
  query.value     = ''
  dropOpen.value  = true
  nextTick(() => inputEl.value?.focus())
}

onMounted(() => {
  if (!hasValue.value) {
    searching.value = true
    nextTick(() => inputEl.value?.focus())
  }
})
</script>

<style scoped>
.dtp {
  flex: 1;
  position: relative;
  min-width: 0;
}

/* ── Selected value display ── */
.dtp-val {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 7px;
  cursor: pointer;
  transition: border-color .15s;
  min-width: 0;
}
.dtp-val:hover { border-color: var(--accent); }

.dtp-val-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.dtp-val-label {
  font-size: .75rem;
  color: var(--text);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dtp-val-iana {
  font-size: .62rem;
  color: var(--muted);
  opacity: .8;
  font-family: 'JetBrains Mono', monospace;
}
.dtp-val-clear {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  transition: color .15s;
}
.dtp-val-clear:hover { color: var(--danger); }

/* ── Search input ── */
.dtp-search-wrap { position: relative; }

.dtp-input {
  width: 100%;
  padding: 6px 10px;
  background: var(--surface);
  border: 1.5px solid var(--accent);
  border-radius: 7px;
  font-size: .75rem;
  color: var(--text);
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
}
.dtp-input::placeholder { color: var(--muted); opacity: .7; }

/* ── Dropdown ── */
.dtp-drop {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  z-index: 200;
  max-height: 240px;
  overflow-y: auto;
  box-shadow: 0 6px 24px var(--shadow-ink-2);
}

.dtp-drop-header {
  font-size: .6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--muted);
  padding: 7px 10px 5px;
  border-bottom: 1px solid var(--border);
}

.dtp-opt {
  padding: 7px 10px;
  cursor: pointer;
  border-bottom: 1px solid var(--wash-2);
  transition: background .1s;
}
.dtp-opt:last-child { border-bottom: none; }
.dtp-opt:hover { background: var(--accent-soft); }

.dtp-opt-main {
  font-size: .74rem;
  color: var(--text);
  font-weight: 500;
  line-height: 1.3;
}
.dtp-opt-iana {
  font-size: .6rem;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  margin-top: 1px;
}

.dtp-no-match {
  padding: 12px 10px;
  font-size: .72rem;
  color: var(--muted);
  font-style: italic;
}
</style>
