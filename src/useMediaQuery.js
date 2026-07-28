import { useEffect, useState } from 'react'

// Tailwind `lg`. The desktop dashboard's header grid needs >=768px and its quest grid only
// reaches its intended shape at `xl`, so switching at `lg` gives tablets the mobile screen
// rather than a squeezed desktop one.
export const DESKTOP_QUERY = '(min-width: 1024px)'

// Client-only SPA (main.jsx renders straight into the DOM), so reading matchMedia during the
// initial state callback is safe — there is no server render to mismatch against.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia(query)
    const onChange = (event) => setMatches(event.matches)
    setMatches(mql.matches) // re-sync in case the query changed between render and effect
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export function useIsDesktop() {
  return useMediaQuery(DESKTOP_QUERY)
}
