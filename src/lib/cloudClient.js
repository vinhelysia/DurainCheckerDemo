import { createClient } from '@supabase/supabase-js'
import { apiFetch } from './api'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key, {
  auth: { flowType: 'pkce', detectSessionInUrl: false },
}) : null

let signInCompletion
export function completeCloudSignIn() {
  // Share the exchange across React StrictMode mounts: a code is single-use.
  if (signInCompletion) return signInCompletion
  const callback = new URL(window.location.href)
  if (callback.searchParams.get('auth') !== 'callback') return Promise.resolve()
  window.history.replaceState(window.history.state, '', `${callback.pathname}#/manage/cloud`)
  signInCompletion = (async () => {
    const code = callback.searchParams.get('code')
    if (!code || callback.searchParams.has('error') || new URLSearchParams(callback.hash.slice(1)).has('error')) {
      throw new Error('Sign-in link expired or invalid. Request a new link. / Link hết hạn hoặc không hợp lệ. Hãy yêu cầu link mới.')
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw new Error('Could not sign in. Request a new link and open it in the same browser. / Hãy gửi lại link và mở bằng trình duyệt đã yêu cầu đăng nhập.')
  })()
  return signInCompletion
}

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
