/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Soft, friendly health-tracker palette: violet accent on a warm
        // peach→lilac gradient (background set in globals.css).
        ink: "#2b2733",        // deep slate text
        cream: "#fbf6f9",      // light base
        sand: "#f3edfa",       // soft lilac panel / chips
        line: "#ece6f4",       // subtle lilac borders
        good: {
          DEFAULT: "#3f9e6b",  // green = on track / clean
          soft: "#e7f4ec",
        },
        bad: {
          DEFAULT: "#e0697a",  // coral = over / prevent
          soft: "#fce8ec",
        },
        accent: {
          DEFAULT: "#8b5cf6",  // brand violet
          soft: "#efe9fd",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1.1rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 4px 24px rgba(123,86,175,0.10), 0 1px 3px rgba(123,86,175,0.05)",
      },
    },
  },
  plugins: [],
};
