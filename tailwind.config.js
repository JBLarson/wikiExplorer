/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Set 'Inter' as the default sans-serif font
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      // Define a new, modern color palette
      colors: {
        // Example: A more muted, professional blue
      primary: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7',
        600: '#9333ea',
        700: '#7e22ce',
        800: '#6b21a8',
        900: '#581c87',
        950: '#3b0764',
      },
      // Base colors for text
      text: {
        DEFAULT: '#36006B', // dark purple
          light: '#4b5563',   // gray-600
          subtle: '#9ca3af', // gray-400
        },
        // Base colors for backgrounds
        bg: {
          DEFAULT: '#ffffff',    // white
          subtle: '#f9fafb',   // gray-50
          muted: '#f3f4f6',    // gray-100
        },
        // Base colors for borders
        border: {
          DEFAULT: '#e5e7eb', // gray-200
          dark: '#d1d5db',    // gray-300
        },
      },
      // Add subtle animations
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideInUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        slideInUp: 'slideInUp 0.4s ease-out',
      },
    },
  },
  plugins: [],
}