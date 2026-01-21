/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1",
        secondary: "#8b5cf6",
        accent: "#f43f5e",
        muted: "#f1f5f9",
        "muted-foreground": "#64748b",
        border: "#e2e8f0",
        background: "#ffffff",
        foreground: "#0f172a",
        "primary-foreground": "#ffffff",
        "secondary-foreground": "#ffffff",
        "accent-foreground": "#ffffff",
        "popover": "#ffffff",
        "popover-foreground": "#0f172a",
        input: "#e2e8f0",
        ring: "#6366f1",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}
