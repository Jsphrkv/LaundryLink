/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#0F52BA',
          700: '#0A3A82',
          800: '#1e3a5f',
          900: '#1e3a5f',
          DEFAULT: '#0F52BA',
          light: '#3A7BD5',
          dark:  '#0A3A82',
        },
        secondary: '#00B4D8',
        accent:    '#F4A261',
        success:   '#2DC653',
        warning:   '#FFC107',
        danger:    '#E63946',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)',
        elevated: '0 4px 16px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
};
