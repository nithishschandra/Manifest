import axios from 'axios'

export const TOKEN_KEY = 'shoply_token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// The auth context registers a callback here so an expired session signs the user out everywhere.
let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY) && onUnauthorized) {
      onUnauthorized()
    }
    return Promise.reject(error)
  }
)

/** Turns an API error into a message suitable for showing to the user. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.response) return 'Cannot reach the server. Check your connection and try again.'
  const detail = error.response.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => (d.msg || '').replace(/^Value error, /, '')).filter(Boolean).join('. ')
  }
  return fallback
}

export default api
