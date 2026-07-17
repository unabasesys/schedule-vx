<template>
  <Transition name="wnt">
    <div v-if="visible" class="wnt-card">
      <div class="wnt-head">
        <span class="wnt-badge">✨ {{ lang === 'en' ? "What's new" : 'Novedades' }} · {{ APP_VERSION_SHORT }}</span>
        <button class="wnt-close" :title="lang === 'en' ? 'Dismiss' : 'Cerrar'" @click="dismiss">×</button>
      </div>
      <ul class="wnt-bullets">
        <li v-for="(item, i) in bullets" :key="i">{{ item }}</li>
      </ul>
      <button class="wnt-more" @click="openFull">
        {{ lang === 'en' ? 'See full history →' : 'Ver historial completo →' }}
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { CHANGELOG, APP_VERSION, APP_VERSION_SHORT } from '~/utils/changelog'

// Shows the latest changelog entry once per app version. Dismissing (or opening
// the full history) records the version in localStorage so it never reappears.
const SEEN_KEY = 'ub_seen_version'
const MAX_BULLETS = 4

const globalStore = useGlobalStore()
const lang = computed(() => globalStore.lang)

const visible = ref(false)

const bullets = computed(() => {
  const entry = CHANGELOG[0]
  const list  = lang.value === 'en' ? entry.en : entry.es
  return list.slice(0, MAX_BULLETS)
})

onMounted(() => {
  try {
    if (localStorage.getItem(SEEN_KEY) !== APP_VERSION) visible.value = true
  } catch { /* storage unavailable */ }
})

function markSeen() {
  try { localStorage.setItem(SEEN_KEY, APP_VERSION) } catch { /* ignore */ }
  visible.value = false
}

function dismiss()  { markSeen() }
function openFull() { markSeen(); globalStore.openWhatsNew() }
</script>

<style scoped>
.wnt-card {
  position: fixed; right: 18px; bottom: 18px; z-index: 900;
  width: min(360px, calc(100vw - 36px));
  background: var(--surface); border: 1.5px solid var(--accent); border-radius: 14px;
  padding: 14px 16px; box-shadow: 0 12px 32px rgba(0,0,0,.4);
}
.wnt-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.wnt-badge { font-size: .74rem; font-weight: 800; color: var(--accent); }
.wnt-close {
  background: none; border: none; color: var(--muted); cursor: pointer;
  font-size: 1rem; line-height: 1; padding: 0 2px;
}
.wnt-close:hover { color: var(--text); }
.wnt-bullets { margin: 0 0 10px; padding-left: 16px; display: flex; flex-direction: column; gap: 4px; }
.wnt-bullets li { font-size: .74rem; line-height: 1.5; color: var(--text); }
.wnt-more {
  background: none; border: none; padding: 0; cursor: pointer; font-family: inherit;
  font-size: .72rem; font-weight: 700; color: var(--accent);
}
.wnt-more:hover { text-decoration: underline; }

.wnt-enter-active, .wnt-leave-active { transition: opacity .25s, transform .25s; }
.wnt-enter-from, .wnt-leave-to { opacity: 0; transform: translateY(10px); }
</style>
