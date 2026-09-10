/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        oat: "#EFE9DC",       // background — undyed linen
        thread: "#B85C38",    // primary accent — rust/clay dyed thread
        moss: "#4A5D43",      // secondary accent — dried herb green
        ink: "#2B2723",       // near-black text — walnut ink, not pure black
        clay: "#8A6F5C",      // muted supporting tone
        cream: "#F8F5EE",     // card surfaces, lighter than background
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
