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
  modules: ['@pinia/nuxt', '@nuxtjs/i18n', '@vueuse/nuxt'],
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  css: ['~/public/css/colors.css', '~/public/css/styles.css'],
  runtimeConfig: {
    public: {
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
