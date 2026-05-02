import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#002452',
        'primary-container': '#1b3a6b',
        'on-primary': '#ffffff',
        'on-primary-container': '#89a5dd',
        secondary: '#9d4300',
        'secondary-container': '#fd761a',
        'on-secondary': '#ffffff',
        background: '#f8f9ff',
        surface: '#f8f9ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#eff4ff',
        'surface-container': '#e5eeff',
        'surface-container-high': '#dce9ff',
        'on-surface': '#0b1c30',
        'on-surface-variant': '#44474f',
        'outline-variant': '#c4c6d0',
        outline: '#747780',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        '2xl': '0.75rem',
        full: '9999px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },
    },
  },
  plugins: [],
} satisfies Config
