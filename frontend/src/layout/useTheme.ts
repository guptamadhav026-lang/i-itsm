import { useCallback, useState } from 'react'

export type Theme = 'light' | 'dark'

/** Light/dark mode. The choice is saved in the browser (index.html applies it before the first paint). */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light')

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      try { localStorage.setItem('itsm-theme', next) } catch { /* ignore */ }
      return next
    })
  }, [])

  return [theme, toggle]
}
