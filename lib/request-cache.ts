type CacheEntry<T> = { at: number; data: T }

const memory = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

export function cachedRequest<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = memory.get(key) as CacheEntry<T> | undefined
  if (hit && Date.now() - hit.at < ttlMs) {
    return Promise.resolve(hit.data)
  }

  const pending = inflight.get(key) as Promise<T> | undefined
  if (pending) return pending

  const request = fn()
    .then((data) => {
      memory.set(key, { at: Date.now(), data })
      return data
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, request)
  return request
}

export function clearCachedRequest(key: string) {
  memory.delete(key)
  inflight.delete(key)
}
