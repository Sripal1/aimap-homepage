/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          teal: 'hsl(176, 47%, 26%)',
          'teal-light': 'hsl(176, 47%, 92%)',
          'teal-dark': 'hsl(176, 47%, 20%)',
        },
      },
    },
  },
  plugins: [],
}
