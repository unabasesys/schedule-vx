import { shallowRef } from 'vue'

// Module-level singleton — one modal instance shared across the entire app
const _state = shallowRef(null)

export function useDialog() {
  function confirm({ title, body = '', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar' } = {}) {
    return new Promise(resolve => {
      _state.value = { type: 'confirm', title, body, confirmLabel, cancelLabel, resolve }
    })
  }

  function alert({ title, body = '', confirmLabel = 'OK' } = {}) {
    return new Promise(resolve => {
      _state.value = { type: 'alert', title, body, confirmLabel, resolve }
    })
  }

  function prompt({ title, body = '', label = '', placeholder = '', defaultValue = '', confirmLabel = 'OK', cancelLabel = 'Cancelar' } = {}) {
    return new Promise(resolve => {
      _state.value = { type: 'prompt', title, body, label, placeholder, defaultValue, confirmLabel, cancelLabel, resolve }
    })
  }

  // Multi-choice dialog — resolves with the chosen `value`, or null on cancel.
  // choices: [{ label, value, primary? }]
  //
  // dismissible: false removes the cancel button and ignores Esc / backdrop clicks,
  // for questions where every outcome matters and there is no safe default. Note that
  // a one-button notice does NOT need it: use alert(), where every exit leads to the
  // same place anyway.
  function choice({ title, body = '', choices = [], cancelLabel = 'Cancelar', dismissible = true } = {}) {
    return new Promise(resolve => {
      _state.value = { type: 'choice', title, body, choices, cancelLabel, dismissible, resolve }
    })
  }

  function _resolve(value) {
    _state.value?.resolve(value)
    _state.value = null
  }

  return { state: _state, confirm, alert, prompt, choice, _resolve }
}
