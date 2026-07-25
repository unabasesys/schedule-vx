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
          {{ isEN ? 'Open a calendar first so I can add events to it.' : 'Abrí un calendario primero para poder agregarle eventos.' }}
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
            <div v-for="(ev, i) in parsed" :key="i" class="una-ev">
              <div class="una-ev-main">
                <input
                  class="una-ev-name"
                  v-model.trim="ev.name"
                  :placeholder="isEN ? 'Event name' : 'Nombre del evento'"
                />
                <div class="una-ev-meta">
                  <input class="una-ev-date" type="date" v-model="ev.date" />
                  <input
                    class="una-ev-days"
                    type="text"
                    inputmode="numeric"
                    v-model="ev.duration"
                    :title="isEN ? 'Days' : 'Días'"
                  />
                  <!-- Stage: pick existing, clear, or create inline -->
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
              <button class="una-ev-x" @click="discardEvent(i)" :title="isEN ? 'Discard' : 'Descartar'">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>
              </button>
            </div>

            <button class="una-ev-add" @click="addBlankEvent">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
              {{ isEN ? 'Add another event' : 'Agregar otro evento' }}
            </button>
          </div>

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
  return `Copiado. Tengo <strong>${n} evento${n === 1 ? '' : 's'}</strong> para el board ${b}. Revisá antes de que los mande al calendario.`
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
  if (newStageFor.value === i) cancelNewStage()
}

function addBlankEvent() {
  parsed.value.push({ name: '', date: '', duration: 1, stage: '', keyDate: false })
  scrollToBottom()
}

async function run() {
  if (!canRun.value || loading.value) return
  const input = text.value.trim()
  sentText.value = input
  text.value = ''
  parsed.value = []
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
    const events = (data.events || []).map(e => ({
      name: e.name || '',
      date: e.date || '',
      duration: Math.max(1, parseInt(e.duration) || 1),
      stage: matchStageKey(e.stage, stages),
      keyDate: !!e.keyDate,
    }))
    if (!events.length) {
      error.value = isEN.value ? 'I couldn’t find any events in that text. Try adding dates.' : 'No encontré eventos en ese texto. Probá agregando fechas.'
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
  creating.value = true
  try {
    let order = (proj.events || []).reduce((m, e) => Math.max(m, e.order || 0), 0)
    parsed.value.filter(e => e.name?.trim() && e.date).forEach(e => {
      order += 1
      projectsStore.addEvent(proj.id, {
        id: uid(),
        name: e.name, nameEN: e.name,
        stage: e.stage || '',
        date: e.date,
        dateMode: 'manual',
        duration: Math.max(1, parseInt(e.duration) || 1),
        durDayType: 'calendar',
        active: true, completed: false, internal: false,
        keyDate: !!e.keyDate, locked: false, nameCustomized: true,
        order, notes: '', groups: [],
        dep: { active: false, eventId: '', relation: 'after', days: 1, broken: false },
      })
    })
    projectsStore.syncProjectNow(proj.id)
    $toast(isEN.value ? 'Events added.' : 'Eventos agregados.', { type: 'success' })
    close()
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
  background: rgba(0,0,0,.45);
  display: flex; justify-content: flex-end;
  animation: unaBackdrop .18s ease both;
}
@keyframes unaBackdrop { from { opacity: 0 } to { opacity: 1 } }

.una-drawer {
  width: 440px; max-width: 94vw; height: 100%;
  background: var(--surface, #16302e);
  border-left: 1px solid var(--border);
  box-shadow: -24px 0 60px rgba(0,0,0,.4);
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
  background: linear-gradient(145deg, var(--accent), var(--accent-dark, var(--accent)));
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: .85rem; color: #062b24;
}
.una-id { flex: 1; min-width: 0; }
.una-name { font-size: .95rem; font-weight: 700; color: var(--text-title, var(--text)); line-height: 1.15; }
.una-role { font-size: .7rem; color: var(--muted); }
.una-board {
  max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: .66rem; font-weight: 600; color: var(--accent);
  padding: 3px 9px; border-radius: 999px;
  background: rgba(6,204,180,.1); border: 1px solid rgba(6,204,180,.28);
}
.una-x {
  flex: 0 0 auto; width: 28px; height: 28px; border: none; border-radius: 7px;
  background: transparent; color: var(--muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.una-x:hover { background: rgba(255,255,255,.06); color: var(--text); }

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
  background: rgba(6,204,180,.12); border: 1px solid rgba(6,204,180,.28);
  border-bottom-right-radius: 4px; white-space: pre-wrap;
}
.una-msg :deep(strong) { color: var(--accent); font-weight: 700; }
.una-warn { color: var(--warning, #e0a316); background: rgba(224,163,22,.08); }
.una-err { color: #e05252; background: rgba(224,82,82,.08); }
.una-fade { animation: unaFade .28s ease both; }
@keyframes unaFade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }

/* typing dots */
.una-typing { display: inline-flex; gap: 5px; align-items: center; }
.una-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); opacity: .5; animation: unaBlink 1s infinite; }
.una-dot:nth-child(2) { animation-delay: .15s; }
.una-dot:nth-child(3) { animation-delay: .3s; }
@keyframes unaBlink { 0%,100% { opacity: .3; transform: translateY(0) } 50% { opacity: 1; transform: translateY(-3px) } }

/* ── Events list ── */
.una-events {
  align-self: stretch;
  border: 1px solid var(--border); border-radius: 12px;
  background: var(--surface-2); overflow: hidden;
}
.una-ev {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 11px 12px; border-bottom: 1px solid var(--border);
}
.una-ev:hover { background: rgba(255,255,255,.02); }
.una-ev-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.una-ev-name {
  width: 100%;
  border: 1.5px solid var(--border); border-radius: 7px; background: var(--surface);
  color: var(--text-title, var(--text));
  font-size: .85rem; font-weight: 600; font-family: inherit; padding: 6px 9px; letter-spacing: -.01em;
}
.una-ev-name:focus { outline: none; border-color: var(--accent); }
.una-ev-name::placeholder { color: var(--muted); font-weight: 400; }
.una-ev-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.una-ev-date, .una-ev-days, .una-stage-select, .una-newstage {
  border: 1.5px solid var(--border); border-radius: 7px; background: var(--surface);
  color: var(--text); font-size: .72rem; font-family: inherit; padding: 4px 7px; min-width: 0;
}
.una-ev-date:focus, .una-ev-days:focus, .una-stage-select:focus, .una-newstage:focus { outline: none; border-color: var(--accent); }
.una-ev-days { width: 46px; text-align: center; }
.una-ev-stage { display: flex; align-items: center; gap: 4px; flex: 1; min-width: 120px; }
.una-stage-select { flex: 1; cursor: pointer; }
.una-stage-select option { background: var(--surface); }
.una-newstage { flex: 1; border-color: var(--accent); }
.una-newstage-ok, .una-newstage-x {
  flex: 0 0 auto; width: 24px; height: 26px; border-radius: 6px; border: 1.5px solid var(--border);
  background: transparent; cursor: pointer; font-size: .72rem; line-height: 1; padding: 0;
}
.una-newstage-ok { color: var(--accent); border-color: var(--accent); }
.una-newstage-ok:disabled { opacity: .4; cursor: not-allowed; }
.una-newstage-x { color: var(--muted); }
.una-ev-x {
  flex: 0 0 auto; width: 24px; height: 24px; border: none; border-radius: 6px;
  background: transparent; color: var(--muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.una-ev-x:hover { background: rgba(224,82,82,.12); color: var(--danger, #e05252); }
.una-ev-add {
  display: flex; align-items: center; gap: 7px; width: 100%;
  padding: 11px 14px; border: none; background: transparent;
  color: var(--muted); font-size: .78rem; font-family: inherit; cursor: pointer;
}
.una-ev-add:hover { color: var(--accent); }

/* ── CTA ── */
.una-cta { align-self: stretch; display: flex; gap: 9px; }
.una-cta-primary {
  flex: 1; padding: 11px 16px; border: none; border-radius: 10px;
  background: var(--accent); color: #062b24; font-size: .84rem; font-weight: 700;
  font-family: inherit; cursor: pointer; transition: background .13s;
}
.una-cta-primary:hover:not(:disabled) { background: var(--accent-dark, var(--accent)); }
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
  background: var(--accent); color: #062b24; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: background .13s;
}
.una-send:hover:not(:disabled) { background: var(--accent-dark, var(--accent)); }
.una-send:disabled { opacity: .4; cursor: not-allowed; }
.una-foot { margin-top: 8px; font-size: .66rem; color: var(--muted); text-align: center; }

@media (max-width: 480px) {
  .una-drawer { width: 100vw; max-width: 100vw; }
}
</style>
