<template>
  <div class="share-dropdown-wrap" ref="wrapEl">
    <button
      class="hdr-share-btn"
      :class="{ active: open }"
      :disabled="!hasEvents"
      :title="!hasEvents ? (lang === 'en' ? 'Add events to the calendar before sharing' : 'Agrega eventos al calendario antes de compartir') : ''"
      @click="toggleOpen"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      <span>{{ lang === 'en' ? 'Share' : 'Compartir' }}</span>
    </button>

    <div v-if="open" class="share-panel">

      <!-- ── PDF ── -->
      <div class="share-section">
        <div class="share-section-title">{{ lang === 'en' ? 'Calendar' : 'Calendario' }}</div>

        <!-- Audience — same wording and same position as in Daily Schedule below.
             Sits ABOVE the actions because it applies to BOTH of them. -->
        <div class="field-row">
          <label class="field-label">{{ L.audience }}</label>
          <div class="seg">
            <button
              :class="['seg-btn', calType === 'client' && 'active']"
              :title="L.audienceClientHint"
              @click="calType = 'client'"
            >{{ L.client }}</button>
            <button
              :class="['seg-btn', calType === 'internal' && 'active']"
              :title="L.audienceInternalHint"
              @click="calType = 'internal'"
            >{{ L.internal }}</button>
          </div>
        </div>

        <!-- Borrador — always visible, no version bump -->
        <button class="share-action-btn" @click="downloadDraft">
          <div class="share-action-main">
            <span class="share-action-label">{{ lang === 'en' ? 'Draft' : 'Borrador' }}</span>
            <span class="share-action-badge share-action-badge--draft">
              {{ lang === 'en' ? 'Draft' : 'Borrador' }} v{{ project.version ?? 0 }}{{ project.hasChanges ? '*' : '' }}
            </span>
          </div>
          <div class="share-action-desc">
            {{ lang === 'en'
              ? 'Open the PDF preview without advancing the version.'
              : 'Abre la vista previa del PDF sin avanzar la versión.' }}
          </div>
        </button>

        <!-- Version button. Hidden on an archived calendar: publishing a new version
             WRITES (bumpVersion + a save), and an archived calendar is read-only
             everywhere else. Draft above still opens the PDF, which is all that's
             actually needed to look at an old job. -->
        <button v-if="!isArchived" class="share-action-btn share-action-btn--version" @click="downloadNewVersion">
          <div class="share-action-main">
            <span class="share-action-label">
              {{ project.hasChanges
                ? (lang === 'en' ? 'New Version' : 'Nueva Versión')
                : (lang === 'en' ? 'Version' : 'Versión') }}
            </span>
            <span class="share-action-badge">
              v{{ project.hasChanges ? (project.version ?? 0) + 1 : (project.version ?? 0) }}
            </span>
          </div>
          <div class="share-action-desc">
            {{ project.hasChanges
              ? (lang === 'en' ? 'Consolidate changes and publish new version.' : 'Consolida los cambios y publica la nueva versión.')
              : (lang === 'en' ? 'Open the current official version.' : 'Abre la versión oficial actual.') }}
          </div>
        </button>

        <div class="share-section-note">
          {{ lang === 'en'
            ? "The PDF is generated in the calendar's language, not the language of this view."
            : 'El PDF se genera en el idioma del calendario, no en el idioma de esta vista.' }}
        </div>
      </div>

      <!-- ── Daily Schedule PDF ── -->
      <div class="share-section">
        <div class="share-section-title">Daily Schedule</div>

        <div v-if="!hasDailyEvents" class="daily-empty">
          {{ lang === 'en' ? 'No daily events yet.' : 'No hay Daily Events aún.' }}
        </div>

        <template v-else>
          <div class="field-row">
            <label class="field-label">{{ lang === 'en' ? 'From' : 'Desde' }}</label>
            <DatePicker v-model="dailyFrom" :lang="lang" class="field-input-dp" />
          </div>
          <div class="field-row">
            <label class="field-label">{{ lang === 'en' ? 'To' : 'Hasta' }}</label>
            <DatePicker v-model="dailyTo" :lang="lang" :min="dailyFrom" class="field-input-dp" />
          </div>
          <div class="field-row">
            <label class="field-label">{{ L.audience }}</label>
            <div class="seg">
              <button
                :class="['seg-btn', dailyType === 'client' && 'active']"
                :title="L.audienceClientHint"
                @click="dailyType = 'client'"
              >{{ L.client }}</button>
              <button
                :class="['seg-btn', dailyType === 'internal' && 'active']"
                :title="L.audienceInternalHint"
                @click="dailyType = 'internal'"
              >{{ L.internal }}</button>
            </div>
          </div>
          <div class="daily-footer">
            <button class="daily-export-btn" @click="openDailyPreview">
              {{ lang === 'en' ? 'Preview PDF' : 'Vista previa PDF' }}
            </button>
          </div>
        </template>
      </div>

    </div>
  </div>
</template>

<script setup>
const projectsStore = useProjectsStore()
const globalStore   = useGlobalStore()

const props = defineProps({
  project: { type: Object, required: true },
})

const isArchived = computed(() => props.project?.status === 'archived')

// Who the document is for. One single pair of words for both PDFs (and for the
// print pages), because it is one single concept: whether the internal (locked)
// items are included. Never reword these per section.
const LABELS = {
  es: {
    audience:             'Para',
    client:               'Cliente',
    internal:             'Interno',
    audienceClientHint:   'Oculta los eventos internos (con candado)',
    audienceInternalHint: 'Incluye los eventos internos (con candado)',
  },
  en: {
    audience:             'For',
    client:               'Client',
    internal:             'Internal',
    audienceClientHint:   'Hides internal (locked) events',
    audienceInternalHint: 'Includes internal (locked) events',
  },
}

const lang         = computed(() => globalStore.lang)
const L            = computed(() => LABELS[globalStore.lang] ?? LABELS.es)
const open         = ref(false)
const hasEvents    = computed(() => (props.project?.events || []).some(e => e.active && e.date))
const wrapEl       = ref(null)
const dailyFrom    = ref('')
const dailyTo      = ref('')
const dailyType    = ref('client')
const calType      = ref('client')   // 'client' | 'internal' — controls the calendar PDF

const hasDailyEvents = computed(() =>
  (props.project?.dailySchedule || []).some(i => i.date)
)

watch(open, (val) => {
  if (val) calType.value = 'client'
  if (val && hasDailyEvents.value) {
    const dates = (props.project?.dailySchedule || []).map(i => i.date).filter(Boolean).sort()
    dailyFrom.value = dates[0]
    dailyTo.value   = dates[dates.length - 1]
    dailyType.value = 'client'
  }
})

function toggleOpen() {
  open.value = !open.value
}

// The print pages re-fetch the project from the API, so the current state
// must reach the server BEFORE the tab loads (a debounced sync still in
// flight makes the PDF render stale data — e.g. one version behind).
// The tab opens blank synchronously (inside the user gesture, so Safari
// doesn't block the popup) and gets pointed to the URL after the sync.
async function openPrintTab(url) {
  const w = window.open('about:blank', '_blank')
  await projectsStore.syncProjectNow(props.project.id)
  if (w) w.location = url
  else   window.open(url, '_blank')
  open.value = false
}

function downloadDraft() {
  openPrintTab(`/print/${props.project.id}?draft=1&type=${calType.value}`)
}


function downloadNewVersion() {
  if (props.project.hasChanges) {
    projectsStore.bumpVersion(props.project.id)
  }
  openPrintTab(`/print/${props.project.id}?draft=0&type=${calType.value}`)
}


function openDailyPreview() {
  const params = new URLSearchParams({
    from: dailyFrom.value,
    to:   dailyTo.value,
    type: dailyType.value,
    lang: globalStore.lang,
  })
  openPrintTab(`/print-daily/${props.project.id}?${params}`)
}

// Close on outside click or ESC
onMounted(() => {
  document.addEventListener('click', onOutsideClick)
  document.addEventListener('keydown', onKeyDown)
})
onUnmounted(() => {
  document.removeEventListener('click', onOutsideClick)
  document.removeEventListener('keydown', onKeyDown)
})
function onOutsideClick(e) {
  if (wrapEl.value && !wrapEl.value.contains(e.target)) open.value = false
}
function onKeyDown(e) {
  if (e.key === 'Escape') open.value = false
}
</script>

<style scoped>
.share-dropdown-wrap { position: relative; }

.hdr-share-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 12px; border: 1.5px solid var(--border); border-radius: 7px;
  font-size: .72rem; font-weight: 600; cursor: pointer; background: var(--surface);
  color: var(--muted); font-family: inherit; transition: all .15s;
}
.hdr-share-btn:hover, .hdr-share-btn.active {
  border-color: var(--accent); color: var(--accent); background: var(--accent-soft);
}
.hdr-share-btn:disabled {
  opacity: .4; cursor: not-allowed; pointer-events: auto;
}
.hdr-share-btn:disabled:hover {
  border-color: var(--border); color: var(--muted); background: var(--surface);
}

.share-panel {
  position: absolute; right: 0; top: calc(100% + 6px); z-index: 200;
  background: var(--surface); border: 1.5px solid var(--border); border-radius: 10px;
  box-shadow: 0 8px 30px var(--shadow-ink-1); padding: 6px 0; width: 300px;
}

/* ── Sections ── */
.share-section {
  padding: 10px 14px;
}
.share-section + .share-section {
  border-top: 1px solid var(--border);
}
.share-section-title {
  font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .6px;
  color: var(--muted); margin-bottom: 8px;
}

/* ── PDF action buttons ── */
.share-action-btn {
  width: 100%; text-align: left; padding: 9px 11px; margin-bottom: 6px;
  border: 1.5px solid var(--border); border-radius: 8px; cursor: pointer;
  background: var(--surface); font-family: inherit; transition: border-color .13s, background .13s;
  display: flex; flex-direction: column; gap: 3px;
}
.share-action-btn:last-child { margin-bottom: 0; }
.share-action-btn:hover:not(:disabled) { border-color: var(--accent); background: var(--accent-soft); }
.share-action-btn:disabled { opacity: .55; cursor: default; }

.share-action-btn--version {
  border-color: var(--accent-line);
}
.share-action-btn--version:hover:not(:disabled) {
  border-color: var(--accent);
}

.share-action-main {
  display: flex; align-items: center; gap: 6px;
}
.share-action-label {
  font-size: .78rem; font-weight: 700; color: var(--text);
}
.share-action-badge {
  font-size: .62rem; font-weight: 700; padding: 1px 5px; border-radius: 4px;
  background: var(--green-soft); color: var(--accent);
}
.share-action-badge--draft {
  background: var(--slate-soft); color: var(--muted);
}
.share-action-spinner {
  font-size: .72rem; color: var(--muted); margin-left: auto;
}
.share-action-desc {
  font-size: .68rem; color: var(--muted); line-height: 1.4;
}
.share-section-note {
  font-size: .66rem; color: var(--muted); line-height: 1.4;
  font-style: italic; margin-top: 6px; padding: 0 2px;
}

/* ── Form fields — shared by both sections, hence the neutral names ── */
.field-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
}
.field-label {
  font-size: .72rem; font-weight: 600; color: var(--muted); width: 50px; flex-shrink: 0;
}
.field-input {
  flex: 1; background: var(--surface-2); border: 1.5px solid var(--border);
  border-radius: 6px; padding: 5px 9px; font-size: .78rem; color: var(--text); font-family: inherit;
}
.field-input:focus { outline: none; border-color: var(--accent); }
/* Los rangos de fecha usan el calendario propio: ocupa el resto de la fila. */
.field-input-dp { flex: 1; min-width: 0; }
.field-input-dp :deep(.dp-field) { padding: 5px 9px; font-size: .78rem; border-width: 1.5px; border-radius: 6px; }
.seg { display: flex; gap: 4px; }
.seg-btn {
  padding: 4px 10px; border: 1.5px solid var(--border); border-radius: 6px;
  background: transparent; color: var(--muted); font-size: .7rem; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .13s;
}
.seg-btn:hover { border-color: var(--text); color: var(--text); }
.seg-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }

/* ── Daily Schedule only ── */
.daily-empty {
  font-size: .72rem; color: var(--muted); text-align: center; padding: 6px 0;
}
.daily-footer {
  display: flex; justify-content: flex-end;
  padding-top: 8px; margin-top: 2px;
}
.daily-export-btn {
  padding: 6px 16px; border: none; border-radius: 7px;
  background: var(--accent); color: var(--accent-ink); font-size: .75rem; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: background .13s;
}
.daily-export-btn:hover:not(:disabled) { background: var(--accent-dark); }
.daily-export-btn:disabled { opacity: .6; cursor: default; }
</style>
