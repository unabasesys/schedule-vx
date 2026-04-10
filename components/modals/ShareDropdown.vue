<template>
  <div class="share-dropdown-wrap" ref="wrapEl">
    <button
      class="hdr-share-btn"
      :class="{ active: open }"
      @click="toggleOpen"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      <span>{{ t('share') }}</span>
    </button>

    <div v-if="open" class="share-panel">
      <div class="share-toggle-row">
        <span class="share-toggle-label">{{ t('shareActiveLabel') }}</span>
        <label class="ev-toggle" style="margin-left:auto;">
          <input
            type="checkbox"
            :checked="project.shareActive"
            @change="toggleShare"
          />
          <span class="ev-toggle-slider"></span>
        </label>
      </div>

      <div v-if="project.shareToken" style="margin-top:14px;">
        <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px;">{{ t('shareLinkLabel') }}</div>
        <div class="share-link-wrap">
          <input
            type="text"
            class="share-link-input"
            :value="shareUrl"
            readonly
          />
          <button class="share-copy-btn" @click="copyLink">{{ t('shareCopy') }}</button>
        </div>
        <div v-if="project.shareViews" class="share-views">
          {{ project.shareViews }} {{ t('shareViewsLabel') }}
        </div>
      </div>

      <div class="share-panel-actions">
        <button class="btn-ghost" style="font-size:.72rem;padding:5px 10px;" @click="open = false">
          {{ lang === 'en' ? 'Close' : 'Cerrar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n()
const projectsStore = useProjectsStore()
const globalStore   = useGlobalStore()
const { $toast } = useNuxtApp()

const props = defineProps({
  project: { type: Object, required: true },
})

const lang = computed(() => globalStore.lang)
const open = ref(false)
const wrapEl = ref(null)

const shareUrl = computed(() => {
  if (!props.project.shareToken) return ''
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
  $toast?.(lang.value === 'en' ? '✓ Link copied' : '✓ Link copiado', { type: 'success' })
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
.hdr-share-btn:hover, .hdr-share-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(6,204,180,.06); }

.share-panel {
  position: absolute; right: 0; top: calc(100% + 6px); z-index: 200;
  background: #fff; border: 1.5px solid var(--border); border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,30,45,.12); padding: 14px 16px; width: 300px;
}

.share-toggle-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; background: var(--bg); border-radius: 7px;
}
.share-toggle-label { flex: 1; font-size: .78rem; color: var(--text); }

.share-link-wrap { display: flex; gap: 6px; margin-top: 4px; }
.share-link-input {
  flex: 1; padding: 7px 10px; border: 1.5px solid var(--border); border-radius: 7px;
  font-size: .72rem; font-family: inherit; color: var(--text); background: #f8fbfc; outline: none;
}
.share-copy-btn {
  padding: 7px 12px; background: var(--accent); color: var(--navy); border: none;
  border-radius: 7px; font-size: .72rem; font-weight: 700; cursor: pointer;
  font-family: inherit; white-space: nowrap;
}
.share-copy-btn:hover { background: var(--accent-dark); }

.share-views { font-size: .7rem; color: var(--muted); margin-top: 6px; }

.share-panel-actions { margin-top: 10px; display: flex; justify-content: flex-end; }
</style>
