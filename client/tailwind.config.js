/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: [
    // Primary colors background counterpart for text & background colors
    "bg-white",
    "bg-gray-600",
    "bg-gray-700",
    "bg-gray-800",
    "dark:bg-white",
    "dark:bg-gray-200",
    "dark:bg-gray-300",
    "dark:bg-gray-400",
    "dark:bg-gray-500",
    "dark:bg-gray-800",
  ],
  theme: {
    extend: {
      fontSize: {
        "2xs": ".65rem",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        ".draggable": {
          "-webkit-app-region": "drag",
        },
        ".non-draggable": {
          "-webkit-app-region": "no-drag",
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
