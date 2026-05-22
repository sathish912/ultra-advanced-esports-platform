/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0f0d",
        surface: "#121c17",
        primary: "#00ff3f",
        secondary: "#00cc32",
        accent: "#00ffcc",
        textMain: "#ffffff",
        textMuted: "#8da396",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
