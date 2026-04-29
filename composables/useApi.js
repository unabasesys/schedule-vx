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
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
    return data
  }

  return {
    get: (path) =>
      fetch(`${BASE}${path}`, { headers: headers() }).then(handleResponse),

    post: (path, body) =>
      fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
      }).then(handleResponse),

    put: (path, body) =>
      fetch(`${BASE}${path}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(body),
      }).then(handleResponse),

    patch: (path, body) =>
      fetch(`${BASE}${path}`, {
        method: 'PATCH',
        headers: headers(),
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
