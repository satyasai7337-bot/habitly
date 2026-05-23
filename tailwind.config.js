/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Plain, calm palette (no neon). Used app-wide.
        ink: "#1c1b1a",        // near-black text
        cream: "#faf8f3",      // warm off-white background
        sand: "#f1ede4",       // soft card / panel
        line: "#e4ddcf",       // subtle borders
        good: {
          DEFAULT: "#3f8f5c",  // muted green = healthy habits
          soft: "#e7f1ea",
        },
        bad: {
          DEFAULT: "#c2554d",  // muted clay red = harmful habits
          soft: "#f6e7e5",
        },
        accent: {
          DEFAULT: "#4a6fa5",  // calm slate blue
          soft: "#e8eef6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1.1rem",
        "3xl": "1.6rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(28,27,26,0.04), 0 8px 24px rgba(28,27,26,0.06)",
      },
    },
  },
  plugins: [],
};
