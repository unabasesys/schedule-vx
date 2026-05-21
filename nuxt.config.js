export default defineNuxtConfig({
  devServer: { port: 3000 },
  app: {
    head: { title: 'Calendar by unabase' }
  },
  ssr: false,
  modules: ['@pinia/nuxt', '@nuxtjs/i18n', '@vueuse/nuxt'],
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  css: ['~/public/css/colors.css', '~/public/css/styles.css'],
  runtimeConfig: {
    public: {
      sbUrl:          process.env.NUXT_PUBLIC_SB_URL    || '',
      sbKey:          process.env.NUXT_PUBLIC_SB_KEY    || '',
      apiUrl:         process.env.NUXT_PUBLIC_API_URL   || 'http://localhost:4000/api',
      googleClientId:  process.env.GOOGLE_CLIENT_ID       || '',
    }
  },
  i18n: {
    locales: [
      { code: 'es', file: 'es.json' },
      { code: 'en', file: 'en.json' },
    ],
    langDir: '../locales/',
    defaultLocale: 'es',
    strategy: 'no_prefix',
  },
  imports: {
    dirs: ['stores', 'composables', 'utils'],
  }
})
