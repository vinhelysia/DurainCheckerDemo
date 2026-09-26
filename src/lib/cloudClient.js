import { createClient } from '@supabase/supabase-js'
import { apiFetch } from './api'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key, {
  auth: { detectSessionInUrl: false }, // Email OTP avoids conflicts with hash routes.
}) : null

export async function cloudRequest(path, options = {}, publicRead = false) {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (!publicRead) {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    if (!data.session) throw new Error('Please sign in. / Vui lòng đăng nhập.')
    headers.set('Authorization', `Bearer ${data.session.access_token}`)
  }
  const response = await apiFetch(`/api/cloud${path}`, { ...options, headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
  return data
}
