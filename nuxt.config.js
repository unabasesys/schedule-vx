export default defineNuxtConfig({
  devServer: { port: 3000 },
  app: {
    head: {
      title: 'Calendar by unabase',
      // Hay DOS versiones del isotipo y el interruptor de tema cambia la del
      // <link>: el de tinta oscura se pierde en una pestaña oscura, y el tile
      // oscuro se ve como un parche en una clara. Mismo par que Relations.
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        // El de iOS se queda en el tile oscuro: un PNG transparente en la
        // pantalla de inicio del iPhone se rellena de negro.
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      // El tema se pinta ANTES de que se vea la app. Si esperáramos a que Vue
      // monte, quien eligió modo claro vería un parpadeo negro en cada carga.
      // Lee la MISMA cookie que utils/theme.js (compartida con Relations por el
      // dominio) y cae a localStorage para quien eligió antes de la cookie.
      script: [{
        innerHTML: "try{var m=document.cookie.match(/(?:^|;\\s*)ub_theme=(light|dark)/);var t=m?m[1]:localStorage.getItem('ub_theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');document.addEventListener('DOMContentLoaded',function(){var l=document.querySelector('link[rel=icon]');if(l)l.href='/favicon-light.png'})}}catch(e){}",
        tagPosition: 'head',
      }],
    }
  },
  ssr: false,
  modules: ['@pinia/nuxt'],
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  css: ['~/public/css/colors.css', '~/public/css/styles.css'],
  runtimeConfig: {
    public: {
      apiUrl:         process.env.NUXT_PUBLIC_API_URL   || 'http://localhost:4000/api',
      googleClientId:  process.env.GOOGLE_CLIENT_ID       || '',
      // Relations y Leads viven en el otro front, en su propio subdominio (§8.1: cada
      // app enlaza a las otras; el subdominio muestra su propia pantalla de "aún no
      // contratado"). Leads no tiene host propio: es una sección de ese mismo front.
      // Va en runtimeConfig y no incrustado para que un entorno de prueba no mande a
      // la gente a producción.
      relationsUrl:   process.env.NUXT_PUBLIC_RELATIONS_URL || 'https://relations.unabase.com',
    }
  },
  // Sin @nuxtjs/i18n a propósito: el idioma de esta app lo maneja globalStore.lang y
  // cada componente elige su texto con `lang === 'en' ? ... : ...`. El módulo estaba
  // cargado, se le seteaba el locale desde globalStore y NADIE lo leía — no hay un solo
  // $t en el código. Mismo caso con @vueuse/nuxt: cero composables usados.
  imports: {
    dirs: ['stores', 'composables', 'utils'],
  }
})
