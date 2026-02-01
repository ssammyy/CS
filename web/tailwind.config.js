/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        brand: {
          mint: '#cbebd0',
          sky: '#a1c7f8',
          coral: '#f99e98',
        },
      },
      gradientColorStops: {
        mint: '#cbebd0',
        sky: '#a1c7f8',
        coral: '#f99e98',
      }
    },
  },
  plugins: [],
}

