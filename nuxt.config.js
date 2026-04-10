export default defineNuxtConfig({
  ssr: false,
  modules: ['@pinia/nuxt', '@nuxtjs/i18n', '@vueuse/nuxt'],
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  css: ['~/public/css/colors.css', '~/public/css/styles.css'],
  runtimeConfig: {
    public: {
      sbUrl: process.env.NUXT_PUBLIC_SB_URL || '',
      sbKey: process.env.NUXT_PUBLIC_SB_KEY || '',
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
