import { useEffect, type ReactNode } from 'react'
import { useThemeStore } from './store'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const {
    theme,
    fontScale,
    highContrast,
    grayscale,
    lineSpacing,
    letterSpacing,
    reducedMotion,
    enhancedFocus,
  } = useThemeStore()

  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('data-theme', theme)
    html.style.setProperty('--font-scale', String(fontScale))
    html.toggleAttribute('data-high-contrast', highContrast)
    html.toggleAttribute('data-grayscale', grayscale)
    html.setAttribute('data-line-spacing', lineSpacing)
    html.setAttribute('data-letter-spacing', letterSpacing)
    html.toggleAttribute('data-reduced-motion', reducedMotion)
    html.toggleAttribute('data-enhanced-focus', enhancedFocus)
  }, [
    theme,
    fontScale,
    highContrast,
    grayscale,
    lineSpacing,
    letterSpacing,
    reducedMotion,
    enhancedFocus,
  ])

  return <>{children}</>
}
