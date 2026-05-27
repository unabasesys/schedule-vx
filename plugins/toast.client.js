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
      toast: (msg, opts = {}) => {
        const type = opts.type || 'default'
        if (type === 'success') return toast.success(msg)
        if (type === 'error')   return toast.error(msg)
        return toast(msg)
      },
    },
  }
})
