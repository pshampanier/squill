/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
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
