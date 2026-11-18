/** @type {import('tailwindcss').Config} */
export default {
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#F7F3EA',
        charcoal: '#262724',
        terracotta: '#C76F50',
        sage: '#A8B7A0',
        parchment: '#EEE7DA',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 12px 40px rgba(73, 62, 45, 0.08)',
      },
    },
  },
  plugins: [],
}

