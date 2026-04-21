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
        <div class="share-section-title">PDF</div>

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
              ? 'Open print preview without advancing the version.'
              : 'Abre la vista de impresión sin avanzar la versión.' }}
          </div>
        </button>

        <!-- Version button — always visible -->
        <button class="share-action-btn share-action-btn--version" @click="downloadNewVersion">
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
      </div>

      <!-- ── Live link ── -->
      <div class="share-section">
        <div class="share-section-title">{{ lang === 'en' ? 'Live link' : 'Link en vivo' }}</div>

        <div class="share-toggle-row">
          <span class="share-toggle-label">{{ lang === 'en' ? 'Link active' : 'Link activo' }}</span>
          <label class="ev-toggle" style="margin-left:auto;">
            <input
              type="checkbox"
              :checked="project.shareActive"
              @change="toggleShare"
            />
            <span class="ev-toggle-slider"></span>
          </label>
        </div>

        <div v-if="project.shareToken" class="share-link-block">
          <div class="share-link-wrap">
            <input
              type="text"
              class="share-link-input"
              :value="shareUrl"
              readonly
            />
            <button class="share-copy-btn" @click="copyLink">
              {{ copied ? (lang === 'en' ? '✓ Copied' : '✓ Copiado') : (lang === 'en' ? 'Copy' : 'Copiar') }}
            </button>
          </div>
          <div v-if="project.shareViews" class="share-views">
            {{ project.shareViews }} {{ lang === 'en' ? 'live views' : 'vistas en vivo' }}
          </div>
        </div>
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

const lang      = computed(() => globalStore.lang)
const open      = ref(false)
const hasEvents = computed(() => (props.project?.events || []).some(e => e.active && e.date))
const wrapEl = ref(null)
const copied = ref(false)

const shareUrl = computed(() => {
  if (!props.project?.shareToken) return ''
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/share?token=${props.project.shareToken}`
})

function toggleOpen() {
  open.value = !open.value
}

async function toggleShare() {
  await projectsStore.toggleShare(props.project.id)
}

function copyLink() {
  if (!shareUrl.value) return
  navigator.clipboard?.writeText(shareUrl.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function downloadDraft() {
  window.open(`/print/${props.project.id}?draft=1`, '_blank')
  open.value = false
}

function downloadNewVersion() {
  if (props.project.hasChanges) {
    projectsStore.bumpVersion(props.project.id)
  }
  window.open(`/print/${props.project.id}?draft=0`, '_blank')
  open.value = false
}

// Close on outside click
onMounted(() => {
  document.addEventListener('click', onOutsideClick)
})
onUnmounted(() => {
  document.removeEventListener('click', onOutsideClick)
})
function onOutsideClick(e) {
  if (wrapEl.value && !wrapEl.value.contains(e.target)) open.value = false
}
</script>

<style scoped>
.share-dropdown-wrap { position: relative; }

.hdr-share-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 12px; border: 1.5px solid var(--border); border-radius: 7px;
  font-size: .72rem; font-weight: 600; cursor: pointer; background: #fff;
  color: var(--muted); font-family: inherit; transition: all .15s;
}
.hdr-share-btn:hover, .hdr-share-btn.active {
  border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.06);
}
.hdr-share-btn:disabled {
  opacity: .4; cursor: not-allowed; pointer-events: auto;
}
.hdr-share-btn:disabled:hover {
  border-color: var(--border); color: var(--muted); background: #fff;
}

.share-panel {
  position: absolute; right: 0; top: calc(100% + 6px); z-index: 200;
  background: #fff; border: 1.5px solid var(--border); border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,30,45,.12); padding: 6px 0; width: 300px;
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
  background: #fafcfd; font-family: inherit; transition: border-color .13s, background .13s;
  display: flex; flex-direction: column; gap: 3px;
}
.share-action-btn:last-child { margin-bottom: 0; }
.share-action-btn:hover:not(:disabled) { border-color: var(--accent); background: rgba(6,204,180,.04); }
.share-action-btn:disabled { opacity: .55; cursor: default; }

.share-action-btn--version {
  border-color: rgba(6,204,180,.35);
}
.share-action-btn--version:hover:not(:disabled) {
  border-color: var(--accent);
}

.share-action-main {
  display: flex; align-items: center; gap: 6px;
}
.share-action-label {
  font-size: .78rem; font-weight: 700; color: var(--navy);
}
.share-action-badge {
  font-size: .62rem; font-weight: 700; padding: 1px 5px; border-radius: 4px;
  background: rgba(6,204,180,.15); color: var(--accent);
}
.share-action-badge--draft {
  background: rgba(107,107,107,.1); color: var(--muted);
}
.share-action-spinner {
  font-size: .72rem; color: var(--muted); margin-left: auto;
}
.share-action-desc {
  font-size: .68rem; color: var(--muted); line-height: 1.4;
}

/* ── Live link ── */
.share-toggle-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; background: var(--bg); border-radius: 7px;
}
.share-toggle-label { flex: 1; font-size: .78rem; color: var(--text); }

.share-link-block { margin-top: 10px; }
.share-link-wrap { display: flex; gap: 6px; }
.share-link-input {
  flex: 1; padding: 7px 10px; border: 1.5px solid var(--border); border-radius: 7px;
  font-size: .72rem; font-family: inherit; color: var(--text); background: #f8fbfc; outline: none;
}
.share-copy-btn {
  padding: 7px 12px; background: var(--accent); color: var(--navy); border: none;
  border-radius: 7px; font-size: .72rem; font-weight: 700; cursor: pointer;
  font-family: inherit; white-space: nowrap; transition: background .15s, opacity .15s;
}
.share-copy-btn:hover { background: var(--accent-dark); }

.share-views { font-size: .7rem; color: var(--muted); margin-top: 6px; }
</style>
