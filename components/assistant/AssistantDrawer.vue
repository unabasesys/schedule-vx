<template>
  <div class="una-backdrop" @click.self="close">
    <aside class="una-drawer">
      <!-- Header -->
      <div class="una-head">
        <div class="una-avatar">U</div>
        <div class="una-id">
          <div class="una-name">Una</div>
          <div class="una-role">{{ isEN ? 'Production assistant' : 'Asistente de producción' }}</div>
        </div>
        <div v-if="currentProject" class="una-board" :title="isEN ? 'Active board' : 'Board activo'">
          {{ currentProject.name || currentProject.client }}
        </div>
        <button class="una-x" @click="close" :title="isEN ? 'Close' : 'Cerrar'">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>
        </button>
      </div>

      <!-- Conversation -->
      <div class="una-body" ref="bodyRef">
        <div v-if="!currentProject" class="una-msg una-msg--bot una-warn">
          {{ isEN ? 'Open a calendar first so I can add events to it.' : 'Abre un calendario primero para poder agregarle eventos.' }}
        </div>

        <!-- Una intro (nothing sent yet) -->
        <div v-if="currentProject && !sentText && !parsed.length" class="una-msg una-msg--bot una-fade">
          {{ isEN
            ? 'Tell me what’s happening on set and I’ll turn it into calendar events — dates, durations, ranges. Just talk to me.'
            : 'Contame qué pasa en el set y lo convierto en eventos del calendario — fechas, duraciones, rangos. Hablame nomás.' }}
        </div>

        <!-- User's message bubble -->
        <div v-if="sentText" class="una-msg una-msg--user una-fade">{{ sentText }}</div>

        <!-- Thinking -->
        <div v-if="loading" class="una-msg una-msg--bot una-typing">
          <span class="una-dot"></span><span class="una-dot"></span><span class="una-dot"></span>
        </div>

        <!-- Error -->
        <div v-if="error" class="una-msg una-msg--bot una-err una-fade">{{ error }}</div>

        <!-- Una reply + parsed events -->
        <template v-if="parsed.length">
          <div class="una-msg una-msg--bot una-fade" v-html="replyText"></div>

          <div class="una-events una-fade">
            <div v-for="(ev, i) in parsed" :key="i" class="una-ev-card">
              <div class="una-ev-top">
                <input
                  class="una-ev-name"
                  v-model.trim="ev.name"
                  :placeholder="isEN ? 'Event name' : 'Nombre del evento'"
                />
                <button class="una-ev-x" @click="discardEvent(i)" :title="isEN ? 'Discard' : 'Descartar'">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>
                </button>
              </div>

              <div class="una-ev-fields">
                <div class="una-fld">
                  <span class="una-fld-lbl">{{ isEN ? 'Start' : 'Inicio' }}</span>
                  <DatePicker class="una-in-date-dp" v-model="ev.date" :lang="isEN ? 'en' : 'es'" @change="onStartChange(i)" />
                </div>

                <div v-if="ev.endDate" class="una-fld">
                  <span class="una-fld-lbl">
                    {{ isEN ? 'End' : 'Fin' }}
                    <button class="una-end-clear" @click="clearEnd(i)" :title="isEN ? 'Make it a single day' : 'Dejar en un solo día'">✕</button>
                  </span>
                  <DatePicker class="una-in-date-dp" v-model="ev.endDate" :lang="isEN ? 'en' : 'es'" :min="ev.date" @change="onEndChange(i)" />
                </div>
                <button
                  v-else
                  class="una-add-end"
                  :disabled="!ev.date"
                  @click="addEnd(i)"
                  :title="isEN ? 'Add an end date (multi-day event)' : 'Agregar fecha de fin (evento de varios días)'"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  {{ isEN ? 'End date' : 'Fecha de fin' }}
                </button>

                <div class="una-fld una-fld--stage">
                  <span class="una-fld-lbl">{{ isEN ? 'Stage' : 'Etapa' }}</span>
                  <div class="una-ev-stage">
                    <template v-if="newStageFor === i">
                      <input
                        :ref="el => setNewStageInput(el, i)"
                        class="una-newstage"
                        v-model.trim="newStageName"
                        :placeholder="isEN ? 'New stage' : 'Nueva etapa'"
                        @keydown.enter.prevent="confirmNewStage(i)"
                        @keydown.esc.stop.prevent="cancelNewStage"
                      />
                      <button class="una-newstage-ok" :disabled="!newStageName" @click="confirmNewStage(i)" :title="isEN ? 'Create' : 'Crear'">✓</button>
                      <button class="una-newstage-x" @click="cancelNewStage" :title="isEN ? 'Cancel' : 'Cancelar'">✕</button>
                    </template>
                    <select v-else class="una-stage-select" :value="ev.stage" @change="onStageChange($event, i)">
                      <option value="">{{ isEN ? '— No stage —' : '— Sin etapa —' }}</option>
                      <option v-for="s in stageOptions" :key="s.key" :value="s.key">{{ s.name }}</option>
                      <option value="__new__">{{ isEN ? '+ New stage…' : '+ Nueva etapa…' }}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button class="una-ev-add una-fade" @click="addBlankEvent">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            {{ isEN ? 'Add another event' : 'Agregar otro evento' }}
          </button>

          <div class="una-cta una-fade">
            <button class="una-cta-primary" :disabled="!creatable || creating" @click="createEvents">
              {{ createLabel }}
            </button>
            <button class="una-cta-ghost" @click="goBack">{{ isEN ? 'Discard' : 'Descartar' }}</button>
          </div>
        </template>
      </div>

      <!-- Composer -->
      <div class="una-composer">
        <div class="una-input-wrap" :class="{ 'is-disabled': !currentProject }">
          <textarea
            ref="ta"
            v-model="text"
            class="una-input"
            rows="1"
            :disabled="loading || !currentProject"
            :placeholder="isEN ? 'Tell Una what’s happening on set…' : 'Contale a Una qué pasa en el set…'"
            @keydown.enter.exact.prevent="run"
          ></textarea>

          <!-- Voice waveform — visual for now; animates while Una is thinking -->
          <div class="una-wave" :class="{ on: loading }" :title="isEN ? 'Voice input — coming soon' : 'Dictado por voz — pronto'">
            <span></span><span></span><span></span><span></span><span></span>
          </div>

          <button class="una-send" :disabled="!canRun || loading" @click="run" :title="isEN ? 'Send' : 'Enviar'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="9" y="2.5" width="6" height="11" rx="3" fill="currentColor"></rect><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>
          </button>
        </div>
        <div class="una-foot">
          {{ isEN ? 'Una writes to the active board' : 'Una escribe en el board activo' }}<template v-if="currentProject"> · {{ currentProject.name || currentProject.client }}</template>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { uid } from '~/utils/helpers'

const projectsStore = useProjectsStore()
const globalStore   = useGlobalStore()
const { $toast }    = useNuxtApp()

const isEN = computed(() => globalStore.lang === 'en')
const currentProject = computed(() => projectsStore.currentProject)

const text     = ref('')
const sentText = ref('')   // the message shown as the user's chat bubble
const loading  = ref(false)
const creating = ref(false)
const error    = ref('')
const parsed   = ref([])
const ta       = ref(null)
const bodyRef  = ref(null)

// Inline "new stage" creation state (which event row is creating, and the name).
const newStageFor  = ref(null)
const newStageName = ref('')
const newStageInputs = {}

const canRun    = computed(() => !!text.value.trim() && !!currentProject.value)
const creatable = computed(() => parsed.value.some(e => e.name?.trim() && e.date))

// Active stages of the current project, as { key, name } for the dropdowns.
const stageOptions = computed(() =>
  (currentProject.value?.stages || [])
    .filter(s => s.active !== false)
    .map(s => ({ key: s.key, name: s.name })),
)

const boardName = computed(() => currentProject.value?.name || currentProject.value?.client || '')

const replyText = computed(() => {
  const n = parsed.value.length
  const b = `<strong>${escapeHtml(boardName.value)}</strong>`
  if (isEN.value) {
    return `Got it. I have <strong>${n} event${n === 1 ? '' : 's'}</strong> for the ${b} board. Review them before I add them to the calendar.`
  }
  return `Copiado. Tengo <strong>${n} evento${n === 1 ? '' : 's'}</strong> para el board ${b}. Revisa antes de que los mande al calendario.`
})

const createLabel = computed(() => isEN.value ? 'Add to calendar' : 'Agregar al calendario')

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function close() { globalStore.closeAssistant() }

function goBack() {
  parsed.value = []
  sentText.value = ''
  error.value = ''
  cancelNewStage()
  nextTick(() => ta.value?.focus())
}

function scrollToBottom() {
  nextTick(() => { if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight })
}

// Map whatever the AI returned for a stage onto an existing stage key: match by
// key first, then by name (case-insensitive). No match → '' (no stage).
function matchStageKey(val, stages) {
  if (!val) return ''
  const v = String(val).toLowerCase()
  const byKey  = stages.find(s => String(s.key).toLowerCase()  === v)
  if (byKey)  return byKey.key
  const byName = stages.find(s => String(s.name).toLowerCase() === v)
  return byName ? byName.key : ''
}

function setNewStageInput(el, i) { if (el) newStageInputs[i] = el }

function onStageChange(e, i) {
  const val = e.target.value
  if (val === '__new__') {
    newStageName.value = ''
    newStageFor.value = i
    nextTick(() => newStageInputs[i]?.focus())
  } else {
    parsed.value[i].stage = val
  }
}

function confirmNewStage(i) {
  const name = newStageName.value.trim()
  const proj = currentProject.value
  if (!name || !proj) return
  const created = projectsStore.addStage(proj.id, name)
  if (created?.key) parsed.value[i].stage = created.key
  cancelNewStage()
}

function cancelNewStage() {
  newStageFor.value = null
  newStageName.value = ''
}

function discardEvent(i) {
  parsed.value.splice(i, 1)
  // Rows shift down, so an open "new stage" editor must follow its own row —
  // otherwise ✓ would assign the stage to a different event (or to nothing).
  if (newStageFor.value === i) cancelNewStage()
  else if (newStageFor.value > i) newStageFor.value -= 1
}

function addBlankEvent() {
  parsed.value.push({ name: '', date: '', endDate: '', stage: '', keyDate: false })
  scrollToBottom()
}

// ── Dates: Calendar speaks start/end; duration is derived from the range ──────
// UTC-based math on YYYY-MM-DD strings to avoid timezone off-by-one.
function addDays(iso, n) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}
function daysInclusive(startIso, endIso) {
  if (!startIso || !endIso) return 1
  const [ys, ms, ds] = startIso.split('-').map(Number)
  const [ye, me, de] = endIso.split('-').map(Number)
  const a = Date.UTC(ys, ms - 1, ds), b = Date.UTC(ye, me - 1, de)
  return b > a ? Math.round((b - a) / 86400000) + 1 : 1
}

function onStartChange(i) {
  const ev = parsed.value[i]
  if (!ev.date) { ev.endDate = ''; return }                      // an end alone means nothing
  if (ev.endDate && ev.endDate < ev.date) ev.endDate = ev.date   // keep end ≥ start
}
// `min` on a date input only constrains the picker — a typed earlier date still
// lands in the model, where daysInclusive() would quietly collapse it to 1 day.
function onEndChange(i) {
  const ev = parsed.value[i]
  if (!ev.date) { ev.endDate = ''; return }
  if (ev.endDate && ev.endDate < ev.date) ev.endDate = ev.date
}
function addEnd(i) {
  const ev = parsed.value[i]
  if (!ev.date) return
  ev.endDate = addDays(ev.date, 1)   // start a 2-day range; the user adjusts
}
function clearEnd(i) { parsed.value[i].endDate = '' }

async function run() {
  if (!canRun.value || loading.value) return
  const input = text.value.trim()
  sentText.value = input
  text.value = ''
  parsed.value = []
  cancelNewStage()   // a stale open editor would point at a card that no longer exists
  loading.value = true
  error.value = ''
  scrollToBottom()
  try {
    const stages = (currentProject.value.stages || []).map(s => ({ key: s.key, name: s.name }))
    const data = await useApi().post('/ai/parse-events', {
      text: input,
      lang: globalStore.lang,
      year: globalStore.calYear || new Date().getFullYear(),
      stages,
    })
    const events = (data.events || []).map(e => {
      // Only trust a real YYYY-MM-DD. The model can return anything here, and a bad
      // value used to make addDays() throw, which discarded every other correctly
      // parsed event and surfaced a raw engine error.
      const start = /^\d{4}-\d{2}-\d{2}$/.test(e.date || '') ? e.date : ''
      const dur = Math.max(1, parseInt(e.duration) || 1)
      return {
        name: e.name || '',
        date: start,
        // Express duration as an end date: only multi-day events carry one.
        endDate: (start && dur > 1) ? addDays(start, dur - 1) : '',
        stage: matchStageKey(e.stage, stages),
        keyDate: !!e.keyDate,
      }
    })
    if (!events.length) {
      error.value = isEN.value ? 'I couldn’t find any events in that text. Try adding dates.' : 'No encontré eventos en ese texto. Prueba agregando fechas.'
    } else {
      parsed.value = events
    }
  } catch (e) {
    error.value = e?.message || (isEN.value ? 'Could not reach the assistant.' : 'No se pudo contactar al asistente.')
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

function createEvents() {
  const proj = currentProject.value
  if (!proj || creating.value) return
  const ready   = parsed.value.filter(e => e.name?.trim() && e.date)
  const skipped = parsed.value.length - ready.length
  if (!ready.length) return
  creating.value = true
  try {
    let order = (proj.events || []).reduce((m, e) => Math.max(m, e.order || 0), 0)
    ready.forEach(e => {
      order += 1
      projectsStore.addEvent(proj.id, {
        id: uid(),
        name: e.name, nameEN: e.name,
        stage: e.stage || '',
        date: e.date,
        dateMode: 'manual',
        duration: daysInclusive(e.date, e.endDate),
        durDayType: 'calendar',
        active: true, completed: false, internal: false,
        keyDate: !!e.keyDate, locked: false, nameCustomized: true,
        order, notes: '', groups: [],
        dep: { active: false, eventId: '', relation: 'after', days: 1, broken: false },
      })
    })
    projectsStore.syncProjectNow(proj.id)
    if (skipped) {
      // Keep the drawer open with only the incomplete cards left, and say so. These
      // used to be dropped silently: the toast claimed success and the drawer closed.
      cancelNewStage()
      parsed.value = parsed.value.filter(e => !(e.name?.trim() && e.date))
      $toast(
        isEN.value
          ? `${ready.length} added. ${skipped} still need a name and a start date.`
          : `${ready.length} agregados. A ${skipped} le falta nombre o fecha de inicio.`,
        { type: 'error' },
      )
    } else {
      $toast(isEN.value ? 'Events added.' : 'Eventos agregados.', { type: 'success' })
      close()
    }
  } finally {
    creating.value = false
  }
}

function onKeydown(e) { if (e.key === 'Escape') { e.stopPropagation(); close() } }
onMounted(() => { window.addEventListener('keydown', onKeydown); nextTick(() => ta.value?.focus()) })
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.una-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: var(--overlay);
  display: flex; justify-content: flex-end;
  animation: unaBackdrop .18s ease both;
}
@keyframes unaBackdrop { from { opacity: 0 } to { opacity: 1 } }

.una-drawer {
  width: 440px; max-width: 94vw; height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: -24px 0 60px var(--shadow-ink-2);
  display: flex; flex-direction: column; min-height: 0;
  animation: unaSlide .24s cubic-bezier(.22,.61,.36,1) both;
}
@keyframes unaSlide { from { transform: translateX(24px); opacity: .4 } to { transform: none; opacity: 1 } }

/* ── Header ── */
.una-head {
  flex: 0 0 auto;
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px; border-bottom: 1px solid var(--border);
}
.una-avatar {
  width: 34px; height: 34px; flex: 0 0 34px; border-radius: 50%;
  background: linear-gradient(145deg, var(--accent), var(--accent-dark));
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: .85rem; color: var(--accent-ink);
}
.una-id { flex: 1; min-width: 0; }
.una-name { font-size: .95rem; font-weight: 700; color: var(--text-title); line-height: 1.15; }
.una-role { font-size: .7rem; color: var(--muted); }
.una-board {
  max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: .66rem; font-weight: 600; color: var(--accent);
  padding: 3px 9px; border-radius: 999px;
  background: var(--accent-soft); border: 1px solid var(--accent-line);
}
.una-x {
  flex: 0 0 auto; width: 28px; height: 28px; border: none; border-radius: 7px;
  background: transparent; color: var(--muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.una-x:hover { background: var(--wash-1); color: var(--text); }

/* ── Conversation ── */
.una-body {
  flex: 1; min-height: 0; overflow-y: auto;
  padding: 18px; display: flex; flex-direction: column; gap: 14px;
}
.una-msg {
  font-size: .82rem; line-height: 1.5; border-radius: 14px; padding: 11px 14px; max-width: 90%;
}
.una-msg--bot { align-self: flex-start; background: var(--surface-2); color: var(--text); border-bottom-left-radius: 4px; }
.una-msg--user {
  align-self: flex-end; color: var(--text);
  background: var(--accent-soft); border: 1px solid var(--accent-line);
  border-bottom-right-radius: 4px; white-space: pre-wrap;
}
.una-msg :deep(strong) { color: var(--accent); font-weight: 700; }
.una-warn { color: var(--warning); background: var(--amber-soft); }
.una-err { color: var(--danger); background: var(--red-soft); }
.una-fade { animation: unaFade .28s ease both; }
@keyframes unaFade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }

/* typing dots */
.una-typing { display: inline-flex; gap: 5px; align-items: center; }
.una-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); opacity: .5; animation: unaBlink 1s infinite; }
.una-dot:nth-child(2) { animation-delay: .15s; }
.una-dot:nth-child(3) { animation-delay: .3s; }
@keyframes unaBlink { 0%,100% { opacity: .3; transform: translateY(0) } 50% { opacity: 1; transform: translateY(-3px) } }

/* ── Events — independent cards ── */
.una-events { align-self: stretch; display: flex; flex-direction: column; gap: 10px; }
.una-ev-card {
  border: 1px solid var(--border); border-radius: 12px;
  background: var(--surface-2); padding: 12px 13px;
}
.una-ev-top { display: flex; align-items: flex-start; gap: 8px; }
.una-ev-name {
  flex: 1; min-width: 0;
  border: 1.5px solid var(--border); border-radius: 7px; background: var(--surface);
  color: var(--text-title);
  font-size: .85rem; font-weight: 600; font-family: inherit; padding: 6px 9px; letter-spacing: -.01em;
}
.una-ev-name:focus { outline: none; border-color: var(--accent); }
.una-ev-name::placeholder { color: var(--muted); font-weight: 400; }
.una-ev-x {
  flex: 0 0 auto; width: 26px; height: 26px; border: none; border-radius: 6px;
  background: transparent; color: var(--muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.una-ev-x:hover { background: var(--red-soft); color: var(--danger); }

.una-ev-fields { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px; margin-top: 10px; }
.una-fld { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.una-fld-lbl {
  display: flex; align-items: center; gap: 5px;
  font-size: .6rem; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); font-weight: 700;
}
.una-stage-select, .una-newstage {
  border: 1.5px solid var(--border); border-radius: 7px; background: var(--surface);
  color: var(--text); font-size: .74rem; font-family: inherit; padding: 5px 7px; min-width: 0;
}
.una-in-date-dp { width: 168px; }
.una-in-date-dp :deep(.dp-field) { padding: 6px 9px; font-size: .78rem; }
.una-stage-select:focus, .una-newstage:focus { outline: none; border-color: var(--accent); }
.una-fld--stage { flex: 1; min-width: 130px; }
.una-fld--stage .una-ev-stage { display: flex; align-items: center; gap: 4px; width: 100%; }
.una-stage-select { flex: 1; cursor: pointer; }
.una-stage-select option { background: var(--surface); }
.una-newstage { flex: 1; border-color: var(--accent); }
.una-newstage-ok, .una-newstage-x {
  flex: 0 0 auto; width: 24px; height: 28px; border-radius: 6px; border: 1.5px solid var(--border);
  background: transparent; cursor: pointer; font-size: .72rem; line-height: 1; padding: 0;
}
.una-newstage-ok { color: var(--accent); border-color: var(--accent); }
.una-newstage-ok:disabled { opacity: .4; cursor: not-allowed; }
.una-newstage-x { color: var(--muted); }

.una-add-end {
  align-self: flex-end; display: inline-flex; align-items: center; gap: 5px; height: 30px;
  padding: 0 11px; border: 1.5px dashed var(--border); border-radius: 7px;
  background: transparent; color: var(--muted); font-size: .72rem; font-family: inherit; cursor: pointer;
}
.una-add-end:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.una-add-end:disabled { opacity: .4; cursor: not-allowed; }
.una-end-clear {
  border: none; background: transparent; color: var(--muted); cursor: pointer;
  font-size: .8rem; line-height: 1; padding: 0 1px;
}
.una-end-clear:hover { color: var(--danger); }

/* Add-another-event — standalone, clearly separate from the event cards */
.una-ev-add {
  align-self: stretch; display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 10px 14px; border: 1.5px dashed var(--border); border-radius: 10px;
  background: transparent; color: var(--muted); font-size: .8rem; font-family: inherit; cursor: pointer;
}
.una-ev-add:hover { border-color: var(--accent); color: var(--accent); }

/* ── CTA ── */
.una-cta { align-self: stretch; display: flex; gap: 9px; }
.una-cta-primary {
  flex: 1; padding: 11px 16px; border: none; border-radius: 10px;
  background: var(--accent); color: var(--accent-ink); font-size: .84rem; font-weight: 700;
  font-family: inherit; cursor: pointer; transition: background .13s;
}
.una-cta-primary:hover:not(:disabled) { background: var(--accent-dark); }
.una-cta-primary:disabled { opacity: .45; cursor: not-allowed; }
.una-cta-ghost {
  padding: 11px 18px; border: 1.5px solid var(--border); border-radius: 10px;
  background: transparent; color: var(--muted); font-size: .84rem; font-family: inherit; cursor: pointer;
}
.una-cta-ghost:hover { border-color: var(--text); color: var(--text); }

/* ── Composer ── */
.una-composer { flex: 0 0 auto; padding: 14px 16px 16px; border-top: 1px solid var(--border); }
.una-input-wrap {
  display: flex; align-items: flex-end; gap: 8px;
  background: var(--surface-2); border: 1.5px solid var(--border);
  border-radius: 14px; padding: 8px 8px 8px 14px;
}
.una-input-wrap:focus-within { border-color: var(--accent); }
.una-input-wrap.is-disabled { opacity: .55; }
.una-input {
  flex: 1; border: none; background: transparent; resize: none;
  color: var(--text); font-size: .82rem; font-family: inherit; line-height: 1.45;
  max-height: 120px; padding: 5px 0; min-width: 0;
}
.una-input:focus { outline: none; }
.una-input::placeholder { color: var(--muted); }
.una-wave { display: flex; align-items: center; gap: 3px; height: 30px; padding: 0 2px; }
.una-wave span { width: 3px; height: 8px; border-radius: 2px; background: var(--accent); opacity: .3; }
.una-wave.on span { opacity: .85; animation: unaBar .9s ease-in-out infinite; }
.una-wave.on span:nth-child(2) { animation-delay: .12s; }
.una-wave.on span:nth-child(3) { animation-delay: .24s; }
.una-wave.on span:nth-child(4) { animation-delay: .36s; }
.una-wave.on span:nth-child(5) { animation-delay: .48s; }
@keyframes unaBar { 0%,100% { transform: scaleY(.35) } 50% { transform: scaleY(2.6) } }
.una-send {
  flex: 0 0 36px; width: 36px; height: 36px; border: none; border-radius: 50%;
  background: var(--accent); color: var(--accent-ink); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: background .13s;
}
.una-send:hover:not(:disabled) { background: var(--accent-dark); }
.una-send:disabled { opacity: .4; cursor: not-allowed; }
.una-foot { margin-top: 8px; font-size: .66rem; color: var(--muted); text-align: center; }

@media (max-width: 480px) {
  .una-drawer { width: 100vw; max-width: 100vw; }
}
</style>
