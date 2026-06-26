/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        // Extra-small breakpoint used across the dashboard (below Tailwind's
        // default `sm` of 640px) for tighter phone layouts.
        xs: "480px",
      },
    },
  },
  plugins: [],
};
