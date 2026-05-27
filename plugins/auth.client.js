export default defineNuxtPlugin(async () => {
  const authStore     = useAuthStore()
  const settingsStore = useSettingsStore()

  authStore.init()

  if (authStore.isLoggedIn) {
    // Refresh user + org + orgs list from API in background (non-blocking)
    authStore.renew().then(() => {
      if (authStore.organization) {
        settingsStore._applyOrgToStore(authStore.organization)
      }
      authStore.fetchMyOrgs()
    })
  }
})
