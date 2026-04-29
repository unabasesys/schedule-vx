// Route middleware — applied to pages that require authentication
// Usage in a page: definePageMeta({ middleware: 'auth' })
export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()
  authStore.init()

  if (!authStore.isLoggedIn) {
    return navigateTo('/login')
  }
})
