// Empty keeps the existing Vercel APIs working until Render is deployed.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export function apiFetch(path, options = {}) {
  const timeout = AbortSignal.timeout(90_000) // Allow Render Free to wake up.
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  return fetch(`${API_BASE_URL}${path}`, { ...options, signal })
}
