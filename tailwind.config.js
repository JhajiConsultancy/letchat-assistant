/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{html}'
  ],
  theme: {
    extend: {
      colors: {
        gemini: {
          50: '#f7f8ff',
          100: '#ebeeff',
          500: '#6a85f1',
          600: '#4f69db',
        }
      },
      boxShadow: {
        gemini: '0 8px 24px rgba(106, 133, 241, 0.22)'
      },
      borderRadius: {
        xl2: '1.25rem'
      }
    },
  },
  plugins: [],
}

