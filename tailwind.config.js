/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4A90E2',
          light: '#EBF3FC',
          dark:  '#2F6FBB',
        },
        warm: {
          DEFAULT: '#F9F5F0',
          dark:    '#EDE8E2',
        },
      },
    },
  },
  plugins: [],
}
