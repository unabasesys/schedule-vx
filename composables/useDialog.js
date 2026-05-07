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

  function prompt({ title, body = '', defaultValue = '', confirmLabel = 'OK', cancelLabel = 'Cancelar' } = {}) {
    return new Promise(resolve => {
      _state.value = { type: 'prompt', title, body, defaultValue, confirmLabel, cancelLabel, resolve }
    })
  }

  function _resolve(value) {
    _state.value?.resolve(value)
    _state.value = null
  }

  return { state: _state, confirm, alert, prompt, _resolve }
}
