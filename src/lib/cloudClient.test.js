import { afterEach, expect, it, vi } from 'vitest'

const { exchangeCodeForSession } = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { exchangeCodeForSession } }),
}))

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks() })

it('exchanges a callback once, removes its code, and rejects invalid links without accepting a session', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-test-key')
  const replaceState = vi.fn()
  vi.stubGlobal('window', {
    location: { href: 'https://durian.test/?auth=callback&code=single-use#/unexpected' },
    history: { state: null, replaceState },
  })
  exchangeCodeForSession.mockResolvedValue({ error: null })
  let { completeCloudSignIn } = await import('./cloudClient')
  await Promise.all([completeCloudSignIn(), completeCloudSignIn()])
  expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)
  expect(exchangeCodeForSession).toHaveBeenCalledWith('single-use')
  expect(replaceState).toHaveBeenCalledWith(null, '', '/#/manage/cloud')

  for (const suffix of ['?auth=callback#error=access_denied', '?auth=callback', '?auth=callback&code=bad']) {
    vi.resetModules()
    window.location.href = `https://durian.test/${suffix}`
    exchangeCodeForSession.mockResolvedValue({ error: new Error('invalid verifier') })
    ;({ completeCloudSignIn } = await import('./cloudClient'))
    await expect(completeCloudSignIn()).rejects.toThrow(/link/i)
  }
  expect(exchangeCodeForSession).toHaveBeenCalledTimes(2)
})
