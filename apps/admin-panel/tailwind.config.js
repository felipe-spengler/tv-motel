/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0f19", // Very dark navy/slate
        card: "#111827",       // Gray 900
        primary: {
          DEFAULT: "#6366f1",  // Indigo 500
          hover: "#4f46e5",    // Indigo 600
        }
      },
    },
  },
  plugins: [],
}
