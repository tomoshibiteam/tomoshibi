/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans JP"', 'sans-serif'],
        serif: ['"Zen Old Mincho"', 'serif'],
      },
      colors: {
        brand: {
          base: '#f7f0e5', // Warm beige
          dark: '#484132', // Requested dark olive/brown
          text: '#44403c', // Stone 700
          textLight: '#78716c', // Stone 500
          gold: '#d97706', // Amber 600
          goldLight: '#fbbf24', // Amber 400
        }
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.15) 0%, rgba(247, 240, 229, 0) 60%)',
      }
    },
  },
  plugins: [],
}