import Vue3Toastify, { toast } from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Vue3Toastify, {
    autoClose: 2500,
    position: 'bottom-right',
    theme: 'light',
  })

  return {
    provide: {
      // `onClick` y `autoClose` pasan de largo a vue3-toastify: sirven para el aviso que
      // ES el botón de deshacer, que necesita ser clickeable y durar más que 2,5 s.
      toast: (msg, opts = {}) => {
        const type = opts.type || 'default'
        const cfg  = {}
        if (typeof opts.onClick   === 'function') cfg.onClick   = opts.onClick
        if (typeof opts.autoClose === 'number')   cfg.autoClose = opts.autoClose
        if (opts.closeOnClick === false)          cfg.closeOnClick = false
        if (type === 'success') return toast.success(msg, cfg)
        if (type === 'error')   return toast.error(msg, cfg)
        if (type === 'warning') return toast.warning(msg, cfg)
        return toast(msg, cfg)
      },
    },
  }
})
