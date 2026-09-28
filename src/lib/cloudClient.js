import { createClient } from '@supabase/supabase-js'
import { apiFetch } from './api'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const googleLoginEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'
export const supabase = url && key ? createClient(url, key, {
  auth: { flowType: 'pkce', detectSessionInUrl: false },
}) : null
// Public QR reads must stay anonymous even if this browser belongs to the owner.
const publicStorage = url && key ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'durian-public-read' },
}) : null

export function cloudError(error) {
  if (error.code === 'over_email_send_rate_limit') return 'Đã hết lượt gửi email của hệ thống. Hãy chờ khoảng một giờ hoặc liên hệ người quản lý. / Email quota reached; wait about an hour or contact the operator.'
  if (error.status === 429) return 'Bạn đang gửi quá nhanh. Hãy chờ trước khi thử lại. / Too many requests. Please wait before retrying.'
  if (error.name === 'TimeoutError') return 'Máy chủ đang khởi động hoặc chưa phản hồi. Thử lại sau. / Server is starting or unavailable. Try again shortly.'
  return error.message || 'Không thể hoàn thành thao tác. / Could not complete this action.'
}

export function validateEvidenceFile(file) {
  if (!file || !['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
    throw new Error('Chọn ảnh JPG, PNG hoặc tài liệu PDF. / Choose a JPG, PNG or PDF file.')
  }
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('Tệp phải từ 1 byte đến 5 MB. / File must be between 1 byte and 5 MB.')
}

export async function uploadEvidence(batchId, file, metadata) {
  validateEvidenceFile(file)
  const id = crypto.randomUUID()
  const { error } = await supabase.storage.from('batch-evidence').upload(`${batchId}/${id}`, file, {
    contentType: file.type, cacheControl: '0', upsert: false,
  })
  if (error) throw error
  // An interrupted attachment may leave a private unlinked file; never claim it was attached.
  return cloudRequest(`/batches/${batchId}/evidence`, {
    method: 'POST', body: JSON.stringify({ ...metadata, id, filename: file.name.slice(0, 180) }),
  })
}

export async function downloadEvidence(record, publicRead) {
  const client = publicRead ? publicStorage : supabase
  const { data, error } = await client.storage.from('batch-evidence').download(record.file_path, {}, { cache: 'no-store' })
  if (error) throw error
  // Download as bytes, never execute/render uploaded HTML or active PDF content in our page.
  const objectUrl = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = record.filename.replace(/[\\/]/g, '_')
  link.click()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
}

export async function signInWithGoogle() {
  if (!googleLoginEnabled || !supabase) throw new Error('Google login chưa được bật. / Google login is not enabled.')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}?auth=callback` },
  })
  if (error) throw error
}

let signInCompletion
export function completeCloudSignIn() {
  // Share the exchange across React StrictMode mounts: a code is single-use.
  if (signInCompletion) return signInCompletion
  const callback = new URL(window.location.href)
  if (callback.searchParams.get('auth') !== 'callback') return Promise.resolve()
  window.history.replaceState(window.history.state, '', `${callback.pathname}#/manage/cloud`)
  window.dispatchEvent(new Event('hashchange'))
  signInCompletion = (async () => {
    const code = callback.searchParams.get('code')
    if (!code || callback.searchParams.has('error') || new URLSearchParams(callback.hash.slice(1)).has('error')) {
      throw new Error('Đăng nhập đã bị hủy hoặc phiên xác thực hết hạn. Hãy bắt đầu đăng nhập lại. / Sign-in was cancelled or expired. Start sign-in again; email links must be opened in the same browser.')
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw new Error('Không thể hoàn tất đăng nhập. Hãy thử lại trong cùng trình duyệt. / Could not complete sign-in. Try again in the same browser; request a new email link if needed.')
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
  const response = await apiFetch(`/api/cloud${path}`, { ...options, headers, cache: 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
  return data
}
