import { reactive } from 'vue'

const STORAGE_KEY = 'ub_snap_notice_dismissed'

const state = reactive({
  open:     false,
  fromDate: '',
  toDate:   '',
  lang:     'es',
  resolve:  null,
})

function isDismissed() {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

function handleClose(neverAgain = false) {
  if (neverAgain) {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
  }
  state.open = false
  state.resolve?.()
  state.resolve = null
}

/**
 * Show a one-time informational notice explaining that a Business Days event
 * was auto-snapped to the nearest valid business day.
 *
 * Returns a Promise that resolves when the user dismisses the notice.
 * If the user has previously checked "don't show again", resolves immediately.
 *
 * @param {string} fromDate  - original date (YYYY-MM-DD)
 * @param {string} toDate    - adjusted date (YYYY-MM-DD)
 * @param {'es'|'en'} lang
 */
export function useSnapNotice() {
  return function snapNotice(fromDate, toDate, lang = 'es') {
    if (isDismissed() || fromDate === toDate) return Promise.resolve()
    state.fromDate = fromDate
    state.toDate   = toDate
    state.lang     = lang
    state.open     = true
    return new Promise(resolve => { state.resolve = resolve })
  }
}

// Used internally by SnapNoticeModal.vue
export function useSnapNoticeState() {
  return { state, handleClose }
}
