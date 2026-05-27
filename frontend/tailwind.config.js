/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        bg:       '#0a0c10',
        surface:  '#111318',
        surface2: '#181c24',
        border:   '#1e2430',
        border2:  '#252d3d',
        accent:   '#3b82f6',
        'accent-dim': '#1d4ed8',
        green:    '#22c55e',
        amber:    '#f59e0b',
        red:      '#ef4444',
        text1:    '#e2e8f0',
        text2:    '#94a3b8',
        text3:    '#475569',
      },
    },
  },
  plugins: [],
}
