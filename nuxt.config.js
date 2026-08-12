export default defineNuxtConfig({
  devServer: { port: 3000 },
  app: {
    head: {
      title: 'Calendar by unabase',
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/favicon.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
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
