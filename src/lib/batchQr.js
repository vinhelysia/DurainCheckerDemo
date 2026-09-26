export function parseBatchQr(text) {
  const raw = text.trim()
  try {
    const url = new URL(raw, 'https://duriantrust.invalid')
    const [route, query] = url.hash.split('?')
    const id = new URLSearchParams(query).get('batchId') || url.searchParams.get('batchId')
    if (id) return { id, cloud: route === '#/cloud' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) }
  } catch { /* A raw batch code is also a valid scan. */ }
  return { id: raw, cloud: false }
}
