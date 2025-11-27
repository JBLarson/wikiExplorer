/** @type {import('tailwindcss').Config}VX */
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
        // The "Void Navy" Palette
        abyss: {
          DEFAULT: '#02020B', // The deepest navy, almost black
          surface: '#090914', // Secondary panels
          border: '#151528',  // Subtle borders
          hover: '#1C1C33',   // Interactive states
        },
        // Accent gradients (Purple/Indigo)
        brand: {
          primary: '#6366f1',  // Indigo 500
          glow: '#818cf8',     // Indigo 400
          dim: '#3730a3',      // Indigo 800
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
      }
    },
  },
  plugins: [],
}