import { shallowRef } from 'vue'

// Module-level singleton — one modal instance shared across the entire app
const _state = shallowRef(null)

export function useDialog() {
  // `enterConfirms: true` pone el foco en el botón de confirmar, así Enter lo
  // activa. NO es el defecto: en un confirm destructivo el foco vive en Cancelar
  // justamente para que la tecla de "guardar" no borre nada. Se enciende diálogo
  // por diálogo, donde confirmar con el teclado vale más que ese seguro — y donde
  // la advertencia ya se leyó completa.
  function confirm({ title, body = '', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', enterConfirms = false } = {}) {
    return new Promise(resolve => {
      _state.value = { type: 'confirm', title, body, confirmLabel, cancelLabel, enterConfirms, resolve }
    })
  }

  function alert({ title, body = '', confirmLabel = 'OK' } = {}) {
    return new Promise(resolve => {
      _state.value = { type: 'alert', title, body, confirmLabel, resolve }
    })
  }

  // `options` (opcional): valores sugeridos que se ofrecen como botones sobre el
  // campo — al elegir uno, el campo queda con ese texto y se puede seguir editando.
  // Es para cuando la respuesta casi siempre es "uno de estos", pero no siempre:
  // escribir a mano el nombre que ya está en la lista es la forma más fácil de
  // teclearlo distinto y crear el duplicado que se venía a arreglar.
  //
  // `required: true` deja el botón apagado mientras el campo esté vacío, para las
  // preguntas donde una respuesta en blanco no significa nada.
  function prompt({ title, body = '', label = '', placeholder = '', defaultValue = '', options = [], required = false, confirmLabel = 'OK', cancelLabel = 'Cancelar' } = {}) {
    return new Promise(resolve => {
      _state.value = { type: 'prompt', title, body, label, placeholder, defaultValue, options, required, confirmLabel, cancelLabel, resolve }
    })
  }

  // Multi-choice dialog — resolves with the chosen `value`, or null on cancel.
  // choices: [{ label, value, primary? }]
  //
  // dismissible: false removes the cancel button and ignores Esc / backdrop clicks,
  // for questions where every outcome matters and there is no safe default. Note that
  // a one-button notice does NOT need it: use alert(), where every exit leads to the
  // same place anyway.
  // `checkbox` (opcional): rótulo de una casilla al pie ("Entendido, no volver a
  // mostrar"). CAMBIA lo que resuelve: con casilla devuelve `{ value, checked }` en vez
  // del valor pelado, porque quien la ofrece necesita las dos respuestas — qué eligió y
  // si quiere volver a ver la explicación. Sin `checkbox`, el contrato es el de siempre.
  function choice({ title, body = '', choices = [], cancelLabel = 'Cancelar', dismissible = true, checkbox = '' } = {}) {
    return new Promise(resolve => {
      _state.value = { type: 'choice', title, body, choices, cancelLabel, dismissible, checkbox, resolve }
    })
  }

  function _resolve(value) {
    _state.value?.resolve(value)
    _state.value = null
  }

  return { state: _state, confirm, alert, prompt, choice, _resolve }
}
