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
        <!-- Diálogo de opciones -->
        <div v-if="state.type === 'choice'" class="dlg-choices">
          <button
            v-for="c in state.choices"
            :key="c.value"
            :ref="el => setPrimaryRef(el, c)"
            class="dlg-choice-btn"
            :class="{ 'dlg-choice-primary': c.primary, 'dlg-choice-danger': c.danger }"
            @click="_resolve(c.value)"
          >
            {{ c.label }}
          </button>
          <div v-if="state.dismissible !== false" class="dlg-actions" style="margin-top:4px;">
            <button class="dlg-cancel" @click="dismiss">{{ state.cancelLabel }}</button>
          </div>
        </div>
        <!-- Confirmar / avisar / preguntar -->
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
// Diálogo COMPARTIDO por toda la suite: es la confirmación de las tres apps.
//
// ESTE ARCHIVO ESTÁ DUPLICADO A PROPÓSITO en los dos fronts y debe quedar
// IDÉNTICO. Los repos son distintos (relations y schedule-vx), así que no hay
// import posible todavía. Si tocas uno, copia el otro en el mismo cambio: es la
// pieza que más se ve de las dos apps, y separarla se nota en cada confirmación.
const { state, _resolve } = useDialog()

const inputVal   = ref('')
const inputRef   = ref(null)
const confirmRef = ref(null)
const boxRef     = ref(null)
const primaryChoiceRef = ref(null)

// En un diálogo de opciones el foco va a la recomendada, para que Enter elija el
// camino seguro en vez de resolver un valor que ninguna opción declaró.
function setPrimaryRef(el, c) {
  if (c.primary) primaryChoiceRef.value = el
}

// Al abrirse uno nuevo: limpiar el campo y poner el foco donde corresponde.
watch(state, (val) => {
  if (!val) return
  inputVal.value = val.defaultValue || ''
  if (val.type !== 'choice') primaryChoiceRef.value = null
  nextTick(() => {
    if (val.type === 'prompt')      inputRef.value?.focus()
    else if (val.type === 'choice') primaryChoiceRef.value?.focus()
    else                            confirmRef.value?.focus()
  })
})

function onConfirm() {
  if (!state.value) return
  _resolve(state.value.type === 'prompt' ? inputVal.value : true)
}

function dismiss() {
  if (!state.value) return
  if (state.value.dismissible === false) return
  // Un 'choice' cancelado resuelve null: es el contrato que documenta useDialog.
  // Resolvía `false` como un confirm, y quien lo llamaba lo leía como "no es
  // ninguno de mis valores" y en silencio lo trataba como una de las ramas.
  if (state.value.type === 'choice') return _resolve(null)
  _resolve(state.value.type === 'prompt' ? null : false)
}

// Teclado global — ESC cierra, Enter confirma (salvo en un textarea).
function onKeydown(e) {
  if (!state.value) return
  if (e.key === 'Escape') { e.stopPropagation(); dismiss() }
  if (e.key === 'Enter') {
    // En un diálogo de opciones no hay un único "confirmar": Enter tiene que
    // activar el botón con foco (la recomendada lo recibe al abrir). Atajarlo acá
    // hacía que Enter resolviera `true`, que no es el valor de nadie.
    if (state.value.type === 'choice') return
    if (state.value.type === 'prompt') return
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
  background: var(--overlay-soft);
  display: flex; align-items: center; justify-content: center;
}

.dlg-box {
  background: var(--surface); border-radius: 10px;
  box-shadow: 0 12px 40px var(--shadow-ink-1);
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
  background: var(--surface-2);
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
  background: var(--surface-2); color: var(--text);
  font-size: .76rem; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: background .13s;
}
.dlg-confirm:hover { background: var(--wash-3); }

/* Tinta sobre un relleno de color = --accent-ink (§3.2.1): en oscuro el rojo
   pide tinta oscura, y en claro el rojo se vuelve profundo y pide tinta blanca. */
.dlg-confirm.dlg-danger {
  background: var(--danger); color: var(--accent-ink);
}
.dlg-confirm.dlg-danger:hover { background: var(--red); filter: brightness(.92); }
.dlg-confirm.dlg-danger:focus { outline: 2px solid var(--danger); outline-offset: 2px; }

.dlg-choices {
  display: flex; flex-direction: column; gap: 8px;
  margin-top: 20px;
}
.dlg-choice-btn {
  width: 100%; padding: 11px 16px; border-radius: var(--r-sm);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text); font-size: .8rem; font-weight: 600;
  cursor: pointer; font-family: inherit; text-align: left;
  transition: background .14s var(--ease), border-color .14s var(--ease), color .14s var(--ease);
}
.dlg-choice-btn:hover { border-color: var(--border-strong); background: var(--surface-3); }
.dlg-choice-btn.dlg-choice-primary {
  background: var(--accent); color: var(--accent-ink); border-color: transparent; font-weight: 700;
  box-shadow: var(--accent-shadow);
}
.dlg-choice-btn.dlg-choice-primary:hover { background: var(--accent-bright); }
/* Opción destructiva: se ve como lo que es, sin robarle el ojo a la recomendada. */
.dlg-choice-btn.dlg-choice-danger {
  background: transparent; border-color: var(--red-line); color: var(--red);
}
.dlg-choice-btn.dlg-choice-danger:hover { background: var(--red-panel); border-color: var(--red); }
</style>
