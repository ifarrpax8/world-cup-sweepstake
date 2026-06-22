/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Pax8 brand palette (2025 refresh)
      colors: {
        pax8: {
          navy:   '#1B2B4B',  // primary dark navy
          blue:   '#2B5CE6',  // primary bright blue
          mint:   '#00C9B1',  // secondary mint/teal
          dark:   '#0D1B2A',  // near-black for dark mode bg
          light:  '#F0F4FF',  // light blue-tinted background
          muted:  '#64748B',  // muted text
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        flash: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '40%': { backgroundColor: 'rgba(0, 201, 177, 0.2)' }, // mint flash
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        flash:        'flash 1.2s ease-in-out',
        'live-pulse': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer:      'shimmer 2.5s linear infinite',
        'fade-in':    'fade-in 0.3s ease-out',
      },
      backgroundImage: {
        'pax8-gradient': 'linear-gradient(135deg, #1B2B4B 0%, #2B5CE6 60%, #00C9B1 100%)',
        'pax8-subtle':   'linear-gradient(135deg, #1B2B4B 0%, #2B5CE6 100%)',
      },
    },
  },
  plugins: [],
};
