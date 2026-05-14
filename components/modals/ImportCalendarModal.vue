<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal icm-modal">
      <h2>{{ lang === 'en' ? 'Import calendar' : 'Importar calendario' }}</h2>

      <!-- mode tabs -->
      <div v-if="!parsedEvents.length" class="icm-tabs">
        <button :class="['icm-tab', { active: mode === 'pdf' }]" @click="mode = 'pdf'">PDF</button>
        <button :class="['icm-tab', { active: mode === 'text' }]" @click="mode = 'text'">
          {{ lang === 'en' ? 'Paste text' : 'Pegar texto' }}
        </button>
      </div>

      <!-- PDF input -->
      <div v-if="mode === 'pdf' && !parsedEvents.length">
        <div
          class="icm-drop"
          :class="{ 'icm-drop--active': dragging, 'icm-drop--file': !!selectedFile }"
          @click="$refs.fileInput.click()"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
        >
          <input ref="fileInput" type="file" accept=".pdf" style="display:none" @change="onFileChange" />
          <span v-if="!selectedFile">
            {{ lang === 'en' ? 'Drop PDF here or click to browse' : 'Arrastrá el PDF aquí o hacé click para buscarlo' }}
          </span>
          <span v-else>📄 {{ selectedFile.name }}</span>
        </div>
      </div>

      <!-- Text input -->
      <div v-if="mode === 'text' && !parsedEvents.length">
        <textarea
          v-model="pastedText"
          class="icm-textarea"
          :placeholder="lang === 'en'
            ? 'Paste your calendar text here…\ne.g.\n6/11 Shoot Day 1\n6/12–6/15 Edit'
            : 'Pegá el texto del calendario aquí…\nEj:\n11/6 Día de Rodaje\n12/6–15/6 Edición'"
        />
      </div>

      <!-- Error -->
      <p v-if="error" class="icm-error">{{ error }}</p>

      <!-- Preview -->
      <div v-if="parsedEvents.length" class="icm-preview">
        <p class="icm-preview-count">
          {{ parsedEvents.length }} {{ lang === 'en' ? 'events detected' : 'eventos detectados' }}
        </p>
        <div class="icm-preview-list">
          <div v-for="(ev, i) in parsedEvents" :key="i" class="icm-preview-row">
            <span class="icm-ev-name">{{ ev.name }}</span>
            <span class="icm-ev-date">
              {{ ev.date }}<span v-if="ev._endDate !== ev.date"> → {{ ev._endDate }}</span>
            </span>
            <span
              class="icm-ev-type"
              :title="ev.durDayType === 'calendar'
                ? (lang === 'en' ? 'Includes weekends' : 'Incluye fines de semana')
                : (lang === 'en' ? 'Business days only' : 'Solo días hábiles')"
            >
              {{ ev.durDayType === 'calendar' ? (lang === 'en' ? 'Calendar' : 'Corridos') : (lang === 'en' ? 'Business' : 'Hábiles') }}
            </span>
          </div>
        </div>
        <button class="icm-reset" @click="reset">
          ← {{ lang === 'en' ? 'Start over' : 'Volver' }}
        </button>
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <button class="btn-ghost" @click="$emit('close')">{{ lang === 'en' ? 'Cancel' : 'Cancelar' }}</button>
        <button
          v-if="!parsedEvents.length"
          class="btn-primary"
          :disabled="loading || (mode === 'pdf' ? !selectedFile : !pastedText.trim())"
          @click="parse"
        >
          {{ loading ? (lang === 'en' ? 'Parsing…' : 'Procesando…') : (lang === 'en' ? 'Parse calendar' : 'Leer calendario') }}
        </button>
        <button v-else class="btn-primary" @click="confirm">
          {{ lang === 'en' ? `Import ${parsedEvents.length} events` : `Importar ${parsedEvents.length} eventos` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const globalStore = useGlobalStore()
const lang = computed(() => globalStore.lang)
const config = useRuntimeConfig()

const emit = defineEmits(['close', 'imported'])

const mode = ref('pdf')
const dragging = ref(false)
const selectedFile = ref(null)
const pastedText = ref('')
const loading = ref(false)
const error = ref('')
const parsedEvents = ref([])

function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer.files[0]
  if (f?.type === 'application/pdf') selectedFile.value = f
}

function onFileChange(e) {
  selectedFile.value = e.target.files[0] || null
}

function reset() {
  parsedEvents.value = []
  error.value = ''
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function hasWeekend(startDate, endDate) {
  let d = new Date(startDate + 'T12:00:00')
  const e = new Date(endDate + 'T12:00:00')
  while (d <= e) {
    if (d.getDay() === 0 || d.getDay() === 6) return true
    d.setDate(d.getDate() + 1)
  }
  return false
}

function countDays(startDate, endDate, type) {
  let d = new Date(startDate + 'T12:00:00')
  const e = new Date(endDate + 'T12:00:00')
  let count = 0
  while (d <= e) {
    const dow = d.getDay()
    if (type === 'calendar' || (dow !== 0 && dow !== 6)) count++
    d.setDate(d.getDate() + 1)
  }
  return Math.max(1, count)
}

async function callClaude(messages) {
  const key = config.public.anthropicKey
  if (!key) throw new Error(lang.value === 'en' ? 'Anthropic API key not configured.' : 'API key de Anthropic no configurada.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

const PARSE_INSTRUCTION = `Extract all calendar events and return ONLY a valid JSON array. Each item must have exactly: {"name":"event name","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD"}. For single-day events, endDate equals startDate. Return no markdown, no explanation — only the raw JSON array.`

async function parse() {
  error.value = ''
  loading.value = true
  try {
    let rawText
    if (mode.value === 'pdf') {
      const b64 = await readFileAsBase64(selectedFile.value)
      rawText = await callClaude([{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
          { type: 'text', text: PARSE_INSTRUCTION },
        ],
      }])
    } else {
      const year = new Date().getFullYear()
      rawText = await callClaude([{
        role: 'user',
        content: `${PARSE_INSTRUCTION}\n\nAssume year ${year} if not specified in the text.\n\nCalendar text:\n${pastedText.value}`,
      }])
    }

    const clean = rawText.replace(/```(?:json)?\n?/g, '').trim()
    const raw = JSON.parse(clean)

    if (!Array.isArray(raw) || !raw.length) {
      error.value = lang.value === 'en' ? 'No events found.' : 'No se encontraron eventos.'
      return
    }

    parsedEvents.value = raw
      .filter(e => e.name && e.startDate)
      .map((e, i) => {
        const endDate = e.endDate || e.startDate
        const durDayType = hasWeekend(e.startDate, endDate) ? 'calendar' : 'business'
        const duration = countDays(e.startDate, endDate, durDayType)
        return {
          id: uid(),
          templateId: '',
          name: e.name,
          nameEN: e.name,
          stage: 'pre',
          date: e.startDate,
          _endDate: endDate,
          dateMode: 'manual',
          duration,
          durDayType,
          active: true,
          completed: false,
          keyDate: false,
          locked: false,
          notes: '',
          order: i,
          groups: [],
          internal: false,
          whenToUse: '',
          whenToUseEN: '',
          dep: { active: false, eventId: '', relation: 'after', days: 1, dayType: 'calendar', broken: false },
        }
      })
  } catch (err) {
    error.value = err.message || (lang.value === 'en' ? 'Error parsing calendar.' : 'Error al leer el calendario.')
  } finally {
    loading.value = false
  }
}

function confirm() {
  // Strip internal _endDate before emitting
  const events = parsedEvents.value.map(({ _endDate, ...ev }) => ev)
  emit('imported', events)
}
</script>

<style scoped>
.icm-modal { max-width: 520px; }

.icm-tabs {
  display: flex; gap: 6px; margin-bottom: 14px;
}
.icm-tab {
  padding: 6px 18px; border-radius: 20px; border: 1.5px solid var(--border);
  background: none; color: var(--muted); font-size: .76rem; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .12s;
}
.icm-tab.active { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.08); }

.icm-drop {
  border: 2px dashed var(--border); border-radius: 10px; padding: 36px 20px;
  text-align: center; cursor: pointer; color: var(--muted); font-size: .8rem;
  transition: all .15s; margin-bottom: 4px;
}
.icm-drop:hover, .icm-drop--active { border-color: var(--accent); color: var(--text); }
.icm-drop--file { border-style: solid; border-color: var(--accent); color: var(--text); font-weight: 600; }

.icm-textarea {
  width: 100%; min-height: 130px; resize: vertical;
  border: 1.5px solid var(--border); border-radius: 8px;
  background: var(--surface-2); color: var(--text);
  padding: 10px 12px; font-family: inherit; font-size: .78rem;
  box-sizing: border-box;
}
.icm-textarea:focus { outline: none; border-color: var(--accent); }

.icm-error { color: #f43f5e; font-size: .76rem; margin: 8px 0 0; }

.icm-preview { margin-top: 4px; }
.icm-preview-count { font-size: .76rem; color: var(--muted); margin-bottom: 8px; }
.icm-preview-list {
  max-height: 260px; overflow-y: auto;
  border: 1.5px solid var(--border); border-radius: 8px;
}
.icm-preview-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-bottom: 1px solid var(--border); font-size: .74rem;
}
.icm-preview-row:last-child { border-bottom: none; }
.icm-ev-name { flex: 1; font-weight: 600; color: var(--text); }
.icm-ev-date { color: var(--muted); white-space: nowrap; font-size: .7rem; }
.icm-ev-type {
  padding: 2px 7px; border-radius: 20px; font-size: .65rem; font-weight: 700;
  background: var(--surface-2); color: var(--muted); white-space: nowrap; cursor: help;
}

.icm-reset {
  background: none; border: none; color: var(--muted); font-size: .74rem;
  cursor: pointer; padding: 8px 0 0; font-family: inherit;
}
.icm-reset:hover { color: var(--text); }
</style>
