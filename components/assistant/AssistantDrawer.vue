<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal aa-modal">
      <div class="aa-head">
        <div class="aa-title"><span class="aa-spark">✨</span><h2>{{ isEN ? 'Assistant' : 'Asistente' }}</h2></div>
        <button class="aa-close" @click="close" :title="isEN ? 'Close' : 'Cerrar'">✕</button>
      </div>

      <!-- Step 1: write -->
      <template v-if="!parsed.length">
        <p class="aa-sub">
          {{ isEN
            ? 'Describe your schedule in plain words — I’ll turn it into calendar events.'
            : 'Descríbeme tu agenda en palabras y la convierto en eventos del calendario.' }}
        </p>
        <textarea
          ref="ta"
          v-model="text"
          class="aa-textarea"
          :disabled="loading"
          :placeholder="isEN
            ? 'e.g. We shoot on Aug 9, on the 10th send the transcode to Atómica, edit from the 11th to the 14th, first review on the 17th…'
            : 'Ej: Filmamos el 9 de agosto, el 10 enviar transcode a Atómica, del 11 al 14 edición, primera revisión el 17…'"
        ></textarea>

        <div class="aa-target">
          <template v-if="currentProject">
            {{ isEN ? 'Events will be added to:' : 'Los eventos se agregarán a:' }}
            <strong>{{ currentProject.name || currentProject.client }}</strong>
          </template>
          <template v-else>
            <span class="aa-warn">{{ isEN ? 'Open a calendar first to add events.' : 'Abre un calendario primero para agregar eventos.' }}</span>
          </template>
        </div>

        <div v-if="error" class="aa-error">{{ error }}</div>

        <div class="aa-actions">
          <button class="btn-ghost" @click="close">{{ isEN ? 'Cancel' : 'Cancelar' }}</button>
          <button class="btn-primary" :disabled="!canRun || loading" @click="run">
            {{ loading ? (isEN ? 'Reading…' : 'Interpretando…') : (isEN ? 'Interpret' : 'Interpretar') }}
          </button>
        </div>
      </template>

      <!-- Step 2: review -->
      <template v-else>
        <p class="aa-sub">
          {{ isEN ? 'Review what I understood, uncheck anything wrong, then create:' : 'Revisa lo que entendí, desmarca lo que esté mal y crea:' }}
        </p>
        <div class="aa-list">
          <div class="aa-row aa-row-head">
            <span></span><span>{{ isEN ? 'Event' : 'Evento' }}</span><span>{{ isEN ? 'Date' : 'Fecha' }}</span><span>{{ isEN ? 'Days' : 'Días' }}</span><span>{{ isEN ? 'Stage' : 'Etapa' }}</span>
          </div>
          <div v-for="(ev, i) in parsed" :key="i" class="aa-row" :class="{ off: !ev._include }">
            <input type="checkbox" v-model="ev._include" />
            <input class="aa-name" v-model.trim="ev.name" />
            <input class="aa-date" type="date" v-model="ev.date" />
            <input class="aa-dur" type="text" inputmode="numeric" v-model="ev.duration" />
            <span class="aa-stage">{{ stageName(ev.stage) }}</span>
          </div>
        </div>
        <div class="aa-actions">
          <button class="btn-ghost" @click="parsed = []">{{ isEN ? 'Back' : 'Volver' }}</button>
          <button class="btn-primary" :disabled="!selectedCount || creating" @click="createEvents">
            {{ isEN ? `Create ${selectedCount} event${selectedCount === 1 ? '' : 's'}` : `Crear ${selectedCount} evento${selectedCount === 1 ? '' : 's'}` }}
          </button>
        </div>
      </template>
    </div>
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
const loading  = ref(false)
const creating = ref(false)
const error    = ref('')
const parsed   = ref([])
const ta       = ref(null)

const canRun = computed(() => !!text.value.trim() && !!currentProject.value)
const selectedCount = computed(() => parsed.value.filter(e => e._include).length)

function close() { globalStore.closeAssistant() }

function stageName(key) {
  const s = (currentProject.value?.stages || []).find(x => x.key === key)
  return s ? s.name : (isEN.value ? '—' : '—')
}

async function run() {
  if (!canRun.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const stages = (currentProject.value.stages || []).map(s => ({ key: s.key, name: s.name }))
    const data = await useApi().post('/ai/parse-events', {
      text: text.value,
      lang: globalStore.lang,
      year: globalStore.calYear || new Date().getFullYear(),
      stages,
    })
    const events = (data.events || []).map(e => ({
      name: e.name || '',
      date: e.date || '',
      duration: Math.max(1, parseInt(e.duration) || 1),
      stage: e.stage || (stages[0]?.key || 'pre'),
      keyDate: !!e.keyDate,
      _include: true,
    }))
    if (!events.length) {
      error.value = isEN.value ? 'I couldn’t find any events in that text. Try adding dates.' : 'No encontré eventos en ese texto. Prueba agregando fechas.'
    } else {
      parsed.value = events
    }
  } catch (e) {
    error.value = e?.message || (isEN.value ? 'Could not reach the assistant.' : 'No se pudo contactar al asistente.')
  } finally {
    loading.value = false
  }
}

function createEvents() {
  const proj = currentProject.value
  if (!proj || creating.value) return
  creating.value = true
  try {
    let order = (proj.events || []).reduce((m, e) => Math.max(m, e.order || 0), 0)
    parsed.value.filter(e => e._include && e.date).forEach(e => {
      order += 1
      projectsStore.addEvent(proj.id, {
        id: uid(),
        name: e.name, nameEN: e.name,
        stage: e.stage || 'pre',
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
.aa-modal { width: min(680px, 94vw); display: flex; flex-direction: column; max-height: 88vh; }
.aa-head { display: flex; align-items: center; justify-content: space-between; }
.aa-title { display: flex; align-items: center; gap: 8px; }
.aa-title h2 { margin: 0; }
.aa-spark { color: var(--accent); font-size: 1.1rem; }
.aa-close { background: none; border: none; color: var(--muted); font-size: 1rem; cursor: pointer; padding: 4px 6px; line-height: 1; }
.aa-close:hover { color: var(--text); }
.aa-sub { font-size: .78rem; color: var(--muted); margin: 6px 0 12px; }

.aa-textarea {
  width: 100%; min-height: 140px; resize: vertical; padding: 12px 14px;
  border-radius: 9px; border: 1.5px solid var(--border); background: var(--surface);
  color: var(--text); font-size: .85rem; font-family: inherit; line-height: 1.5;
}
.aa-textarea:focus { outline: none; border-color: var(--accent); }

.aa-target { font-size: .74rem; color: var(--muted); margin-top: 10px; }
.aa-target strong { color: var(--text); }
.aa-warn { color: #e0a316; }

.aa-error { font-size: .76rem; color: #e05252; margin-top: 10px; }

.aa-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }

.aa-list { overflow-y: auto; border-top: 1px solid var(--border); margin-top: 4px; }
.aa-row {
  display: grid; grid-template-columns: 22px 1.6fr 130px 52px 1fr; gap: 8px;
  align-items: center; padding: 6px 2px; border-bottom: 1px solid var(--border); font-size: .78rem;
}
.aa-row.off { opacity: .4; }
.aa-row-head { font-size: .62rem; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); font-weight: 700; }
.aa-row input[type="text"], .aa-row input[type="date"] {
  border: 1.5px solid var(--border); border-radius: 6px; background: var(--surface);
  color: var(--text); font-size: .76rem; font-family: inherit; padding: 4px 7px; min-width: 0;
}
.aa-row input:focus { outline: none; border-color: var(--accent); }
.aa-dur { text-align: center; }
.aa-stage { color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
