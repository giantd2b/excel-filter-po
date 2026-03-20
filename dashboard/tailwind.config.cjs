/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf6f1',
          100: '#f9e8dd',
          200: '#f0cdb5',
          300: '#e4a988',
          400: '#c47a52',
          500: '#884929',
          600: '#6b3920',
          700: '#552d19',
          800: '#3d2013',
          900: '#2a160d',
        },
      },
    },
  },
  plugins: [],
};
