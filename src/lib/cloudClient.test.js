import { afterEach, expect, it, vi } from 'vitest'

const { exchangeCodeForSession, upload, getSession, signInWithOAuth } = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), upload: vi.fn(), getSession: vi.fn(), signInWithOAuth: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { exchangeCodeForSession, getSession, signInWithOAuth }, storage: { from: () => ({ upload }) } }),
}))

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks() })

it('reads buyer records anonymously even while the owner is signed in, and does not cache visibility', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-test-key')
  getSession.mockResolvedValue({ data: { session: { access_token: 'owner-token' } } })
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}', { status: 200 })))
  vi.stubGlobal('fetch', fetch)
  const { cloudRequest } = await import('./cloudClient')
  for (const suffix of ['', '/events', '/evidence']) await cloudRequest(`/batches/test${suffix}`, {}, true)
  expect(getSession).not.toHaveBeenCalled()
  for (const [, options] of fetch.mock.calls) {
    expect(options.headers.has('Authorization')).toBe(false)
    expect(options.cache).toBe('no-store')
  }
  await cloudRequest('/batches/test', { method: 'PATCH', body: JSON.stringify({ is_public: false }) })
  expect(fetch.mock.calls[3][1].headers.get('Authorization')).toBe('Bearer owner-token')
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Batch not found or private.' }), { status: 404 }))
  await expect(cloudRequest('/batches/test', {}, true)).rejects.toThrow('Batch not found or private.')
})

it('gates Google login and uses the same-origin PKCE callback without additional scopes', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-test-key')
  vi.stubEnv('VITE_GOOGLE_AUTH_ENABLED', 'false')
  vi.stubEnv('BASE_URL', '/DurainCheckerDemo/')
  vi.stubGlobal('window', {location: {origin: 'https://durian.test'}})
  let client = await import('./cloudClient')
  await expect(client.signInWithGoogle()).rejects.toThrow(/not enabled/)
  expect(signInWithOAuth).not.toHaveBeenCalled()
  vi.resetModules()
  vi.stubEnv('VITE_GOOGLE_AUTH_ENABLED', 'true')
  client = await import('./cloudClient')
  signInWithOAuth.mockResolvedValueOnce({error: null})
  await client.signInWithGoogle()
  expect(signInWithOAuth).toHaveBeenCalledWith({provider: 'google', options: {redirectTo: 'https://durian.test/DurainCheckerDemo/?auth=callback'}})
  signInWithOAuth.mockResolvedValueOnce({error: new Error('Provider unavailable')})
  await expect(client.signInWithGoogle()).rejects.toThrow('Provider unavailable')
})

it('exchanges a callback once, removes its code, and rejects invalid links without accepting a session', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-test-key')
  const replaceState = vi.fn()
  vi.stubGlobal('window', {
    location: { href: 'https://durian.test/?auth=callback&code=single-use#/unexpected' },
    history: { state: null, replaceState },
    dispatchEvent: vi.fn(),
  })
  exchangeCodeForSession.mockResolvedValue({ error: null })
  let { completeCloudSignIn } = await import('./cloudClient')
  await Promise.all([completeCloudSignIn(), completeCloudSignIn()])
  expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)
  expect(exchangeCodeForSession).toHaveBeenCalledWith('single-use')
  expect(replaceState).toHaveBeenCalledWith(null, '', '/#/manage/cloud')
  expect(window.dispatchEvent).toHaveBeenCalledTimes(1)

  for (const suffix of ['?auth=callback#error=access_denied', '?auth=callback', '?auth=callback&code=bad']) {
    vi.resetModules()
    window.location.href = `https://durian.test/${suffix}`
    exchangeCodeForSession.mockResolvedValue({ error: new Error('invalid verifier') })
    ;({ completeCloudSignIn } = await import('./cloudClient'))
    await expect(completeCloudSignIn()).rejects.toThrow(/link/i)
  }
  expect(exchangeCodeForSession).toHaveBeenCalledTimes(2)
})

it('rejects empty, oversized and active content uploads, and explains email quota errors', async () => {
  const { validateEvidenceFile, cloudError } = await import('./cloudClient')
  for (const file of [null, {type: 'image/svg+xml', size: 120}, {type: 'text/html', size: 100}, {type: 'image/png', size: 0}, {type: 'application/pdf', size: 5242881}]) {
    expect(() => validateEvidenceFile(file)).toThrow()
  }
  expect(() => validateEvidenceFile({type: 'application/pdf', size: 5242880})).not.toThrow()
  expect(cloudError({code: 'over_email_send_rate_limit', message: 'email rate limit exceeded'})).toContain('quota')
})

it('never attaches metadata after a failed file upload and never overwrites existing evidence', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-test-key')
  const fetch = vi.fn().mockResolvedValue(new Response('{}', {status: 201}))
  vi.stubGlobal('fetch', fetch)
  getSession.mockResolvedValue({data: {session: {access_token: 'owner-token'}}})
  const { uploadEvidence } = await import('./cloudClient')
  const file = {type: 'image/png', size: 10, name: 'batch.png'}
  upload.mockResolvedValueOnce({error: new Error('Upload failed')})
  await expect(uploadEvidence('batch', file, {})).rejects.toThrow('Upload failed')
  expect(fetch).not.toHaveBeenCalled()
  upload.mockResolvedValueOnce({error: null})
  await uploadEvidence('batch', file, {kind: 'photo', source: 'Grower', document_date: '2026-09-27'})
  const [path, , options] = upload.mock.calls[1]
  expect(options.upsert).toBe(false)
  const body = JSON.parse(fetch.mock.calls[0][1].body)
  expect(path).toBe(`batch/${body.id}`)
  expect(body.filename).toBe('batch.png')
  expect(fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer owner-token')
})
