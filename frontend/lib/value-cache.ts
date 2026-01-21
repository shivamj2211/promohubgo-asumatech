import { apiFetch } from './api'

type CachedEntry = {
  timestamp: number
  data: Array<{ value?: string; label?: string; meta?: any; sortOrder?: number }>
}

const cache = new Map<string, CachedEntry>()
const inFlight = new Map<string, Promise<CachedEntry['data']>>()
const TTL_MS = 5 * 60 * 1000

export async function fetchValues(scope: 'influencer' | 'brand', key: string) {
  const trimmedKey = key.trim()
  if (!trimmedKey) return []

  const cacheKey = `${scope}:${trimmedKey}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < TTL_MS) {
    return cached.data
  }

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey) || []
  }

  const promise = apiFetch(`/api/values/${scope}?key=${encodeURIComponent(trimmedKey)}`)
    .then((res) => {
      const data = Array.isArray(res?.data) ? res.data : []
      cache.set(cacheKey, { data, timestamp: Date.now() })
      inFlight.delete(cacheKey)
      return data
    })
    .catch((err) => {
      inFlight.delete(cacheKey)
      throw err
    })

  inFlight.set(cacheKey, promise)
  return promise
}
