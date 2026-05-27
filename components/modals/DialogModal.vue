<template>
  <Teleport to="body">
    <div v-if="state" class="dlg-backdrop" @click.self="dismiss">
      <div class="dlg-box" ref="boxRef">
        <div class="dlg-title">{{ state.title }}</div>
        <div v-if="state.body" class="dlg-body">{{ state.body }}</div>
        <div v-if="state.type === 'prompt'" class="dlg-input-wrap">
          <label v-if="state.label" class="dlg-label">{{ state.label }}</label>
          <input
            ref="inputRef"
            v-model="inputVal"
            class="dlg-input"
            :placeholder="state.placeholder || ''"
            @keydown.enter.prevent="onConfirm"
            @keydown.esc.stop="dismiss"
          />
        </div>
        <!-- Multi-choice layout -->
        <div v-if="state.type === 'choice'" class="dlg-choices">
          <button
            v-for="c in state.choices"
            :key="c.value"
            class="dlg-choice-btn"
            :class="{ 'dlg-choice-primary': c.primary }"
            @click="_resolve(c.value)"
          >
            {{ c.label }}
          </button>
          <div class="dlg-actions" style="margin-top:4px;">
            <button class="dlg-cancel" @click="dismiss">{{ state.cancelLabel }}</button>
          </div>
        </div>
        <!-- Standard confirm / alert / prompt layout -->
        <div v-else class="dlg-actions">
          <button v-if="state.type !== 'alert'" class="dlg-cancel" @click="dismiss">
            {{ state.cancelLabel }}
          </button>
          <button ref="confirmRef" class="dlg-confirm" :class="{ 'dlg-danger': state.type === 'confirm' }" @click="onConfirm">
            {{ state.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const { state, _resolve } = useDialog()

const inputVal   = ref('')
const inputRef   = ref(null)
const confirmRef = ref(null)
const boxRef     = ref(null)

// When a new dialog opens: reset input and focus the right element
watch(state, (val) => {
  if (!val) return
  inputVal.value = val.defaultValue || ''
  nextTick(() => {
    if (val.type === 'prompt') inputRef.value?.focus()
    else confirmRef.value?.focus()
  })
})

function onConfirm() {
  if (!state.value) return
  _resolve(state.value.type === 'prompt' ? inputVal.value : true)
}

function dismiss() {
  if (!state.value) return
  _resolve(state.value.type === 'prompt' ? null : false)
}

// Global keyboard handler — Esc dismisses, Enter confirms (except in textarea)
function onKeydown(e) {
  if (!state.value) return
  if (e.key === 'Escape') { e.stopPropagation(); dismiss() }
  if (e.key === 'Enter' && state.value.type !== 'prompt') {
    const tag = document.activeElement?.tagName
    if (tag !== 'TEXTAREA') { e.preventDefault(); e.stopPropagation(); onConfirm() }
  }
}

onMounted(()  => document.addEventListener('keydown', onKeydown, true))
onUnmounted(() => document.removeEventListener('keydown', onKeydown, true))
</script>

<style>
.dlg-backdrop {
  position: fixed; inset: 0; z-index: 650;
  background: rgba(0,0,0,.32);
  display: flex; align-items: center; justify-content: center;
}

.dlg-box {
  background: var(--surface); border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0,0,0,.22);
  padding: 24px 28px; width: 360px; max-width: 90vw;
  outline: none;
}

.dlg-title {
  font-size: .95rem; font-weight: 700; color: var(--text);
  margin-bottom: 10px;
}

.dlg-body {
  font-size: .78rem; color: var(--muted); line-height: 1.55;
  margin-bottom: 20px; white-space: pre-wrap;
}

.dlg-title + .dlg-actions,
.dlg-title + .dlg-input-wrap { margin-top: 6px; }

.dlg-input-wrap { margin-bottom: 20px; }
.dlg-label { display: block; font-size: .75rem; font-weight: 600; color: var(--muted); margin-bottom: 6px; }

.dlg-input {
  width: 100%; padding: 7px 10px; box-sizing: border-box;
  background: var(--surface-2, rgba(255,255,255,.06));
  border: 1.5px solid var(--border); border-radius: 7px;
  color: var(--text); font-size: .82rem; font-family: inherit;
  outline: none;
}
.dlg-input:focus { border-color: var(--accent); }

.dlg-actions {
  display: flex; justify-content: flex-end; gap: 8px;
  margin-top: 22px;
}

.dlg-cancel {
  padding: 7px 16px; border: 1.5px solid var(--border); border-radius: 7px;
  background: var(--surface); color: var(--muted); font-size: .76rem; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .13s;
}
.dlg-cancel:hover { border-color: var(--muted); color: var(--text); }

.dlg-confirm {
  padding: 7px 16px; border: none; border-radius: 7px;
  background: var(--surface-2, rgba(255,255,255,.1)); color: var(--text);
  font-size: .76rem; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: background .13s;
}
.dlg-confirm:hover { background: rgba(255,255,255,.15); }

.dlg-confirm.dlg-danger {
  background: var(--danger, #ef4444); color: #fff;
}
.dlg-confirm.dlg-danger:hover { background: #dc2020; }
.dlg-confirm.dlg-danger:focus { outline: 2px solid var(--danger, #ef4444); outline-offset: 2px; }

.dlg-choices {
  display: flex; flex-direction: column; gap: 8px;
  margin-top: 20px;
}
.dlg-choice-btn {
  width: 100%; padding: 9px 16px; border-radius: 7px;
  border: 1.5px solid var(--border);
  background: var(--surface-2, rgba(255,255,255,.06));
  color: var(--text); font-size: .78rem; font-weight: 600;
  cursor: pointer; font-family: inherit; text-align: left;
  transition: all .13s;
}
.dlg-choice-btn:hover { border-color: var(--muted); background: rgba(255,255,255,.1); }
.dlg-choice-btn.dlg-choice-primary {
  background: var(--accent, #20a789); color: #fff; border-color: transparent;
}
.dlg-choice-btn.dlg-choice-primary:hover { filter: brightness(1.1); }
</style>
