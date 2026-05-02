import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  theme: 'dark' | 'light'
  fontScale: number
  highContrast: boolean
  grayscale: boolean
  lineSpacing: 'normal' | 'wide' | 'wider'
  letterSpacing: 'normal' | 'wide' | 'wider'
  reducedMotion: boolean
  enhancedFocus: boolean

  toggleTheme: () => void
  setTheme: (theme: 'dark' | 'light') => void
  increaseFont: () => void
  decreaseFont: () => void
  setFontScale: (scale: number) => void
  toggleHighContrast: () => void
  toggleGrayscale: () => void
  setLineSpacing: (spacing: 'normal' | 'wide' | 'wider') => void
  setLetterSpacing: (spacing: 'normal' | 'wide' | 'wider') => void
  toggleReducedMotion: () => void
  toggleEnhancedFocus: () => void
  resetAccessibility: () => void
}

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: getSystemTheme(),
      fontScale: 1,
      highContrast: false,
      grayscale: false,
      lineSpacing: 'normal',
      letterSpacing: 'normal',
      reducedMotion: false,
      enhancedFocus: false,

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.setAttribute('data-theme', next)
      },

      setTheme: (theme) => {
        set({ theme })
        document.documentElement.setAttribute('data-theme', theme)
      },

      increaseFont: () => {
        const next = Math.min(get().fontScale + 0.1, 1.5)
        set({ fontScale: next })
        document.documentElement.style.setProperty('--font-scale', String(next))
      },

      decreaseFont: () => {
        const next = Math.max(get().fontScale - 0.1, 0.7)
        set({ fontScale: next })
        document.documentElement.style.setProperty('--font-scale', String(next))
      },

      setFontScale: (scale) => {
        const clamped = Math.max(0.7, Math.min(1.5, scale))
        set({ fontScale: clamped })
        document.documentElement.style.setProperty('--font-scale', String(clamped))
      },

      toggleHighContrast: () => {
        const next = !get().highContrast
        set({ highContrast: next })
        document.documentElement.toggleAttribute('data-high-contrast', next)
      },

      toggleGrayscale: () => {
        const next = !get().grayscale
        set({ grayscale: next })
        document.documentElement.toggleAttribute('data-grayscale', next)
      },

      setLineSpacing: (spacing) => {
        set({ lineSpacing: spacing })
        document.documentElement.setAttribute('data-line-spacing', spacing)
      },

      setLetterSpacing: (spacing) => {
        set({ letterSpacing: spacing })
        document.documentElement.setAttribute('data-letter-spacing', spacing)
      },

      toggleReducedMotion: () => {
        const next = !get().reducedMotion
        set({ reducedMotion: next })
        document.documentElement.toggleAttribute('data-reduced-motion', next)
      },

      toggleEnhancedFocus: () => {
        const next = !get().enhancedFocus
        set({ enhancedFocus: next })
        document.documentElement.toggleAttribute('data-enhanced-focus', next)
      },

      resetAccessibility: () => {
        set({
          fontScale: 1,
          highContrast: false,
          grayscale: false,
          lineSpacing: 'normal',
          letterSpacing: 'normal',
          reducedMotion: false,
          enhancedFocus: false,
        })
        const html = document.documentElement
        html.style.setProperty('--font-scale', '1')
        html.removeAttribute('data-high-contrast')
        html.removeAttribute('data-grayscale')
        html.setAttribute('data-line-spacing', 'normal')
        html.setAttribute('data-letter-spacing', 'normal')
        html.removeAttribute('data-reduced-motion')
        html.removeAttribute('data-enhanced-focus')
      },
    }),
    {
      name: 'ufpb-wizard-theme',
      partialize: (state) => ({
        theme: state.theme,
        fontScale: state.fontScale,
        highContrast: state.highContrast,
        grayscale: state.grayscale,
        lineSpacing: state.lineSpacing,
        letterSpacing: state.letterSpacing,
        reducedMotion: state.reducedMotion,
        enhancedFocus: state.enhancedFocus,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const html = document.documentElement
        html.setAttribute('data-theme', state.theme)
        html.style.setProperty('--font-scale', String(state.fontScale))
        if (state.highContrast) html.setAttribute('data-high-contrast', '')
        if (state.grayscale) html.setAttribute('data-grayscale', '')
        html.setAttribute('data-line-spacing', state.lineSpacing)
        html.setAttribute('data-letter-spacing', state.letterSpacing)
        if (state.reducedMotion) html.setAttribute('data-reduced-motion', '')
        if (state.enhancedFocus) html.setAttribute('data-enhanced-focus', '')
      },
    },
  ),
)
