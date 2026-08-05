/**
 * Shared helpers for smooth admin data loading:
 * - Initial load may blank/skeleton the page (`loading`)
 * - Post-mutation / manual refresh should stay silent (`refreshing`)
 */

export type SilentLoadOptions = {
  silent?: boolean
}

export function startDataLoad(
  opts: SilentLoadOptions | undefined | boolean,
  setLoading: (value: boolean) => void,
  setRefreshing?: (value: boolean) => void,
) {
  const silent =
    typeof opts === "boolean" ? opts : Boolean(opts?.silent)
  if (silent) {
    setRefreshing?.(true)
  } else {
    setLoading(true)
  }
  return silent
}

export function finishDataLoad(
  silent: boolean,
  setLoading: (value: boolean) => void,
  setRefreshing?: (value: boolean) => void,
) {
  if (silent) {
    setRefreshing?.(false)
  } else {
    setLoading(false)
  }
}

/** Run an async loader with optional silent mode (no full-page loading gate). */
export async function runDataLoad<T>(
  setLoading: (value: boolean) => void,
  loader: () => Promise<T>,
  opts?: SilentLoadOptions | boolean,
  setRefreshing?: (value: boolean) => void,
): Promise<T> {
  const silent = startDataLoad(opts, setLoading, setRefreshing)
  try {
    return await loader()
  } finally {
    finishDataLoad(silent, setLoading, setRefreshing)
  }
}
