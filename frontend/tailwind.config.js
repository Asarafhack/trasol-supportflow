/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd2fe',
          300: '#8eb6fc',
          400: '#5890f8',
          500: '#326cf3',
          600: '#1f4fe7',
          700: '#193bc8',
          800: '#1a32a1',
          900: '#1a2c7e',
          950: '#0d1744',
        },
        navy: {
          800: '#0f172a',
          900: '#0a0f1d',
          950: '#060a14',
        }
      },
    },
  },
  plugins: [],
}
