/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0c0a09", // Stone 950 (Premium Dark)
        card: "#1c1917",       // Stone 900
        primary: {
          DEFAULT: "#e11d48",  // Rose 600 (Vibrant, Premium)
          hover: "#be123c",    // Rose 700
        },
        tvFocus: "#fb7185",    // Rose 400 for glowing border active states
      },
      scale: {
        '102': '1.02',
      }
    },
  },
  plugins: [],
}
