/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Custom Dark Palette
        abyss: {
          DEFAULT: '#050511', // Main background (Near black navy)
          surface: '#0f111a', // Panel background
          border: '#1f2235',  // Border color
          highlight: '#2d314d',
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
          accent: '#6366f1', // Indigo/Purple accent
          glow: '#818cf8',
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow-strong': '0 0 30px rgba(99, 102, 241, 0.3)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInUp: {
          '0%': { opacity: '0',QX: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
            '0%': { opacity: '0', transform: 'translateX(20px)' },
            '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulse_slow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        slideInUp: 'slideInUp 0.4s ease-out',
        slideInLeft: 'slideInLeft 0.4s ease-out',
        pulse_slow: 'pulse_slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}