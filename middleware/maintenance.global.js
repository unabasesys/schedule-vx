// Candado de emergencia: corre en CADA navegación, antes que cualquier
// middleware de página (incluido `auth`, que no es global). No mira sesión ni
// organización — bloquea a todo el mundo por igual, que es el punto.
export default defineNuxtRouteMiddleware((to) => {
  const { public: { maintenanceMode } } = useRuntimeConfig()
  if (!maintenanceMode) return
  if (to.path === '/mantenimiento') return
  return navigateTo('/mantenimiento', { replace: true })
})
