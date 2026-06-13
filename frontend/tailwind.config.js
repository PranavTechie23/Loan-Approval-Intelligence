/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        '3xs': '0.55rem',
        '2xs': '0.65rem',
        '2.5xl': '1.625rem',
      },
      colors: {
        slate: {
          105: '#f1f5f9',
          250: '#cbd5e1',
          650: '#475569',
          655: '#334155',
          805: '#1e293b',
          850: '#0f172a',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

