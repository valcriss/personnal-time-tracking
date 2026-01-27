/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"] ,
  theme: {
    extend: {
      colors: {
        ink: "#0b0b10",
        paper: "#f5f1ea",
        accent: "#ff7a45",
        muted: "#8c7a64",
        "slate-150": "#e3e7ee"
      },
      fontFamily: {
        display: ["'Roboto'", "sans-serif"],
        body: ["'Roboto'", "sans-serif"]
      }
    }
  },
  plugins: []
};
