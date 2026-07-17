<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="globalStore.closeWhatsNew()">
      <div class="modal wn-modal">
        <div class="wn-head">
          <span class="wn-icon">✨</span>
          <h2 class="wn-title">{{ lang === 'en' ? "What's new" : 'Novedades' }}</h2>
        </div>
        <p class="wn-sub">
          {{ lang === 'en'
            ? 'Calendar improves constantly. Everything we’ve shipped, newest first.'
            : 'Calendar mejora constantemente. Todo lo que fuimos publicando, de lo más nuevo a lo más viejo.' }}
        </p>

        <div class="wn-list">
          <div v-for="entry in CHANGELOG" :key="entry.version" class="wn-entry">
            <div class="wn-entry-head">
              <span class="wn-version">v{{ entry.version.split('.').slice(0, 2).join('.') }}</span>
              <span class="wn-date">{{ formatDate(entry.date) }}</span>
            </div>
            <ul class="wn-bullets">
              <li v-for="(item, i) in (lang === 'en' ? entry.en : entry.es)" :key="i">{{ item }}</li>
            </ul>
          </div>
        </div>

        <div class="modal-actions wn-actions">
          <button class="btn-primary" @click="globalStore.closeWhatsNew()">
            {{ lang === 'en' ? 'Close' : 'Cerrar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { CHANGELOG } from '~/utils/changelog'

const globalStore = useGlobalStore()
const lang = computed(() => globalStore.lang)

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const months = lang.value === 'en'
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return lang.value === 'en' ? `${months[m - 1]} ${d}, ${y}` : `${d} ${months[m - 1]} ${y}`
}
</script>

<style scoped>
.wn-modal { width: min(560px, 94vw); max-height: 84vh; display: flex; flex-direction: column; }
.wn-head { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; }
.wn-icon { font-size: 1.15rem; }
.wn-title { margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--text); }
.wn-sub { margin: 0 0 14px; font-size: .82rem; line-height: 1.6; color: var(--muted); }
.wn-list { overflow-y: auto; display: flex; flex-direction: column; gap: 18px; padding-right: 4px; }
.wn-entry-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
.wn-version {
  font-size: .74rem; font-weight: 800; color: var(--accent);
  border: 1.5px solid var(--accent); border-radius: 20px; padding: 1px 9px;
}
.wn-date { font-size: .72rem; color: var(--muted); font-weight: 600; }
.wn-bullets { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 5px; }
.wn-bullets li { font-size: .8rem; line-height: 1.55; color: var(--text); }
.wn-actions { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
