<template>
  <Teleport to="body">
    <Transition name="snap-fade">
      <div v-if="state.open" class="confirm-backdrop" @click.self="close">
        <div class="confirm-modal snap-notice-modal">

          <!-- Header -->
          <div class="snap-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="snap-icon">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{{ isEN ? 'Business Days event adjusted' : 'Evento de Días Hábiles ajustado' }}</span>
          </div>

          <!-- Body -->
          <p class="confirm-msg">
            {{ isEN
              ? 'This event is set as Business Days and was scheduled on a weekend or holiday. It was automatically moved to the nearest valid business day.'
              : 'Este evento está configurado como Días Hábiles y fue agendado en un fin de semana o feriado. Fue movido automáticamente al día hábil válido más cercano.' }}
          </p>

          <!-- Date change -->
          <div class="snap-dates">
            <div class="snap-date snap-date-from">
              <span class="snap-date-label">{{ isEN ? 'Original' : 'Original' }}</span>
              <span class="snap-date-value">{{ formatDate(state.fromDate) }}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--muted)">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
            <div class="snap-date snap-date-to">
              <span class="snap-date-label">{{ isEN ? 'Adjusted' : 'Ajustado' }}</span>
              <span class="snap-date-value">{{ formatDate(state.toDate) }}</span>
            </div>
          </div>

          <!-- Never again checkbox -->
          <label class="snap-never-again">
            <input type="checkbox" v-model="neverAgain" />
            <span>{{ isEN ? "Don't show this again" : "No volver a mostrar" }}</span>
          </label>

          <!-- Action -->
          <div class="confirm-actions">
            <button class="btn-primary" ref="okBtn" @click="close">
              {{ isEN ? 'Got it' : 'Entendido' }}
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useSnapNoticeState } from '~/composables/useSnapNotice'

const { state, handleClose } = useSnapNoticeState()
const globalStore = useGlobalStore()
const neverAgain  = ref(false)
const okBtn       = ref(null)

const isEN = computed(() => state.lang === 'en')

watch(() => state.open, (open) => {
  if (open) {
    neverAgain.value = false
    nextTick(() => okBtn.value?.focus())
  }
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const yy  = y.slice(-2)
  const fmt = globalStore.dateFormat || 'DD/MM/AA'
  return fmt === 'MM/DD/AA' ? `${m}/${d}/${yy}` : `${d}/${m}/${yy}`
}

function close() { handleClose(neverAgain.value) }
</script>

<style scoped>
/* Header row */
.snap-header {
  display: flex; align-items: center; gap: 8px;
  font-size: .86rem; font-weight: 700; color: var(--text);
  margin-bottom: 14px;
}
.snap-icon { color: var(--accent); flex-shrink: 0; }

/* Date comparison block */
.snap-dates {
  display: flex; align-items: center; gap: 12px;
  background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
  padding: 10px 14px; margin-bottom: 18px;
}
.snap-date {
  display: flex; flex-direction: column; gap: 3px; flex: 1;
}
.snap-date-label {
  font-size: .58rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .4px; color: var(--muted);
}
.snap-date-from .snap-date-value {
  font-size: .82rem; font-weight: 600; color: var(--muted);
  text-decoration: line-through;
}
.snap-date-to .snap-date-value {
  font-size: .82rem; font-weight: 700; color: var(--accent);
}

/* Never again */
.snap-never-again {
  display: flex; align-items: center; gap: 8px;
  font-size: .74rem; color: var(--muted);
  margin-bottom: 18px; cursor: pointer; user-select: none;
}
.snap-never-again input { accent-color: var(--accent); cursor: pointer; }

/* Transition */
.snap-fade-enter-active, .snap-fade-leave-active { transition: opacity .15s, transform .15s; }
.snap-fade-enter-from,   .snap-fade-leave-to     { opacity: 0; transform: scale(.97); }
</style>
