/**
 * Thin wrapper around fetch that automatically adds auth headers
 * and handles 401 → logout.
 *
 * Usage:
 *   const api = useApi()
 *   const user = await api.get('/users/me')
 *   await api.put('/users/me', { firstName: 'Juan' })
 *   await api.upload('/users/me/photo', formData)
 */
export const useApi = () => {
  const config = useRuntimeConfig()
  const BASE = config.public.apiUrl

  const authStore = useAuthStore()
  // Se toma ACÁ y no dentro de handleResponse: `useState` necesita el contexto de Nuxt, que
  // existe cuando se llama a useApi() (desde un setup o una acción del store) pero no siempre
  // dentro del callback de una promesa.
  const appBlock  = useAppBlock()

  const headers = (extra = {}) => ({
    'Content-Type': 'application/json',
    ...(authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}),
    ...(authStore.organization?._id ? { Organization: authStore.organization._id } : {}),
    ...extra,
  })

  const handleResponse = async (res) => {
    if (res.status === 401) {
      authStore.logout()
      throw new Error('Sesión expirada. Por favor iniciá sesión nuevamente.')
    }
    const data = await res.json().catch(() => ({}))

    // La puerta por app (§8.7) responde 403 con un código: no la contrató la organización,
    // se venció el trial, o esta persona no la tiene asignada. Los tres necesitan una
    // pantalla y no un toast — cada uno se resuelve por un camino distinto y el mensaje del
    // back es el que dice a quién pedírsela. Se registra acá, en el único lugar por donde
    // pasan todas las llamadas gateadas, y el layout lo muestra.
    if (res.status === 403 && data.code) {
      appBlock.value = {
        code:       data.code,
        app:        data.app || '',
        ownerEmail: data.ownerEmail || '',
        message:    data.error || '',
      }
    }

    if (!res.ok) {
      const err = new Error(data.error || `Error ${res.status}`)
      err.status = res.status
      err.data   = data
      throw err
    }
    return data
  }

  return {
    get: (path, extra = {}) =>
      fetch(`${BASE}${path}`, { headers: headers(extra) }).then(handleResponse),

    post: (path, body) =>
      fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
      }).then(handleResponse),

    // `extra` agrega cabeceras a esta llamada. Se usa para mandar `Organization` con
    // la organización a la que pertenece EL DOCUMENTO y no la que la sesión tenga
    // activa en ese momento: son cosas distintas y pueden separarse solas —
    // /auth/renew adopta la organización actual de la cuenta, que cambia cada vez
    // que la persona cambia de organización en cualquier otra app de unabase. Cuando
    // eso pasaba, todo guardado salía con la organización equivocada, el back
    // respondía 404 y el trabajo se quedaba encerrado en la pestaña.
    put: (path, body, extra = {}) =>
      fetch(`${BASE}${path}`, {
        method: 'PUT',
        headers: headers(extra),
        body: JSON.stringify(body),
      }).then(handleResponse),

    patch: (path, body, extra = {}) =>
      fetch(`${BASE}${path}`, {
        method: 'PATCH',
        headers: headers(extra),
        body: JSON.stringify(body),
      }).then(handleResponse),

    delete: (path) =>
      fetch(`${BASE}${path}`, {
        method: 'DELETE',
        headers: headers(),
      }).then(handleResponse),

    // For multipart/form-data (file uploads) — do NOT set Content-Type
    upload: (path, formData, method = 'PUT') =>
      fetch(`${BASE}${path}`, {
        method,
        headers: {
          ...(authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}),
          ...(authStore.organization?._id ? { Organization: authStore.organization._id } : {}),
        },
        body: formData,
      }).then(handleResponse),
  }
}
