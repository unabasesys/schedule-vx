<template>
  <Teleport to="body">
    <div v-if="state" class="dlg-backdrop" @click.self="dismiss">
      <div class="dlg-box" ref="boxRef">
        <div class="dlg-title">{{ state.title }}</div>
        <div v-if="state.body" class="dlg-body">{{ state.body }}</div>
        <div v-if="state.type === 'prompt'" class="dlg-input-wrap">
          <label v-if="state.label" class="dlg-label">{{ state.label }}</label>
          <!-- Respuestas sugeridas. Elegir una la escribe en el campo, que sigue
               siendo editable: la pregunta admite algo nuevo, pero lo habitual es
               quedarse con uno de estos y tecleárselo a mano es como nacen los
               duplicados. -->
          <div v-if="state.options?.length" class="dlg-opts">
            <button
              v-for="o in state.options"
              :key="o"
              type="button"
              class="dlg-opt"
              :class="{ active: inputVal === o }"
              @click="inputVal = o"
            >{{ o }}</button>
          </div>
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
            @click="resolveChoice(c.value)"
          >
            {{ c.label }}
          </button>
          <!-- "Entendido, no volver a mostrar": para las explicaciones que enseñan algo
               una vez. Va DEBAJO de las opciones y no arriba, para que se lea después
               de la explicación y no antes. -->
          <label v-if="state.checkbox" class="dlg-check">
            <input v-model="checkVal" type="checkbox" />
            <span>{{ state.checkbox }}</span>
          </label>
          <div v-if="state.dismissible !== false" class="dlg-actions" style="margin-top:4px;">
            <button class="dlg-cancel" @click="dismiss">{{ state.cancelLabel }}</button>
          </div>
        </div>
        <!-- Confirmar / avisar / preguntar -->
        <div v-else class="dlg-actions">
          <button v-if="state.type !== 'alert'" ref="cancelRef" class="dlg-cancel" @click="dismiss">
            {{ state.cancelLabel }}
          </button>
          <button
            ref="confirmRef"
            class="dlg-confirm"
            :class="{ 'dlg-danger': state.type === 'confirm' }"
            :disabled="blocked"
            @click="onConfirm"
          >
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
const checkVal   = ref(false)
const inputRef   = ref(null)
const confirmRef = ref(null)
const cancelRef  = ref(null)
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
  checkVal.value = false
  if (val.type !== 'choice') primaryChoiceRef.value = null
  nextTick(() => {
    if (val.type === 'prompt')      inputRef.value?.focus()
    else if (val.type === 'choice') primaryChoiceRef.value?.focus()
    // Un `confirm` SIEMPRE es destructivo acá (se pinta rojo: `dlg-danger` cuelga del
    // tipo). Por defecto el foco va a Cancelar, no a Eliminar: la app enseña que
    // "Enter guarda", y con el foco en el botón rojo esa misma tecla borraba una
    // edición a medio escribir o una interacción del historial, que no se puede
    // deshacer. Con `enterConfirms` quien abre el diálogo pide lo contrario: el foco
    // parte en confirmar y Enter lo activa (activación nativa del botón enfocado).
    else if (val.type === 'confirm') {
      if (val.enterConfirms) confirmRef.value?.focus()
      else                   cancelRef.value?.focus()
    }
    else                            confirmRef.value?.focus()   // alert: no destruye nada
  })
})

// Una respuesta obligatoria en blanco no es una respuesta: el botón espera.
const blocked = computed(() =>
  state.value?.type === 'prompt' && state.value.required === true && !inputVal.value.trim(),
)

function onConfirm() {
  if (!state.value || blocked.value) return
  _resolve(state.value.type === 'prompt' ? inputVal.value : true)
}

// Con casilla, un `choice` devuelve las DOS respuestas. Sin ella, el valor pelado de
// siempre: los que ya existían no tienen por qué cambiar de contrato.
function resolveChoice(value) {
  _resolve(state.value?.checkbox ? { value, checked: checkVal.value } : value)
}

function dismiss() {
  if (!state.value) return
  if (state.value.dismissible === false) return
  // Un 'choice' cancelado resuelve null: es el contrato que documenta useDialog.
  // Resolvía `false` como un confirm, y quien lo llamaba lo leía como "no es
  // ninguno de mis valores" y en silencio lo trataba como una de las ramas.
  if (state.value.type === 'choice') return resolveChoice(null)
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
    // Misma razón que en 'choice': con un confirm destructivo, Enter tiene que activar
    // el botón que tiene el foco — sea Cancelar o, con `enterConfirms`, el rojo —, no
    // resolver que sí por su cuenta.
    if (state.value.type === 'confirm') return
    const tag = document.activeElement?.tagName
    if (tag !== 'TEXTAREA') { e.preventDefault(); e.stopPropagation(); onConfirm() }
  }
}

onMounted(()  => document.addEventListener('keydown', onKeydown, true))
onUnmounted(() => document.removeEventListener('keydown', onKeydown, true))
</script>

<style>
.dlg-check {
  display: flex; align-items: center; gap: 8px; margin: 8px 2px 2px;
  font-size: .76rem; color: var(--text-2); cursor: pointer;
}
.dlg-check input { accent-color: var(--accent); cursor: pointer; }

.dlg-opts { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 9px; }
.dlg-opt {
  padding: 5px 10px; border-radius: 8px; border: 1px solid var(--border-strong);
  background: var(--surface-2); color: var(--text-2); font-family: inherit;
  font-size: .76rem; font-weight: 600; cursor: pointer; transition: all .12s;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dlg-opt:hover { border-color: var(--muted); color: var(--text); }
.dlg-opt.active { background: var(--accent-panel); border-color: var(--accent-deep); color: var(--accent); }

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
.dlg-confirm:disabled { opacity: .45; cursor: default; }
.dlg-confirm:disabled:hover { background: var(--surface-2); }

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
