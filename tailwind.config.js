/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        antonio: ['var(--font-antonio)'],
        poppins: ['var(--font-poppins)'],
      },
      colors: {
        primary: "#FF7A1A",
        bgDark: "#0D0D0D",
        cardDark: "#131313",
      },
    },
  },
  plugins: [],
};