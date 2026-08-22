// Modo claro / oscuro — sincronización al arrancar.
//
// El color ya está puesto antes de este punto: un script diminuto en el <head>
// (nuxt.config.js) marca <html data-theme="light"> leyendo la cookie compartida,
// para que nadie vea un parpadeo negro mientras carga la app. Acá solo dejamos el
// store en el mismo estado, así el interruptor del sidebar y el de Configuración
// muestran lo que de verdad se está viendo.
export default defineNuxtPlugin(() => {
  useGlobalStore().initTheme()
})
