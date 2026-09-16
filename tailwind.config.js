/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.html",
    "./src/ts/**/*.ts",
    "./assets/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        trilha: {
          blue: "#0b4dcc",
          blueDark: "#07348c",
          sky: "#3b82f6",
          green: "#22c55e",
          yellow: "#facc15",
          red: "#ef4444",
          ink: "#172033",
          muted: "#64748b",
          line: "#dbeafe"
        }
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"]
      },
      boxShadow: {
        trilha: "0 18px 45px rgba(37, 99, 235, 0.13)"
      }
    }
  }
};
