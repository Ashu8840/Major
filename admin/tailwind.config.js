/**
 * Tailwind CSS configuration for the admin panel.
 * Tailwind v4 uses this file for extending defaults and registering plugins.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#b7d7ff",
          300: "#8bbdff",
          400: "#5f9eff",
          500: "#3c7dff",
          600: "#285bdb",
          700: "#1b3fab",
          800: "#132a7a",
          900: "#0c1c4f",
        },
        accent: {
          500: "#10b981",
        },
      },
      maxWidth: {
        content: "1400px",
      },
    },
  },
  plugins: [],
};
