/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontSize: {
        "f-xs": "calc(var(--scale-factor, 1) * 0.75rem)",
        "f-sm": "calc(var(--scale-factor, 1) * 0.875rem)",
        "f-base": "calc(var(--scale-factor, 1) * 1rem)",
        "f-lg": "calc(var(--scale-factor, 1) * 1.125rem)",
        "f-xl": "calc(var(--scale-factor, 1) * 1.25rem)"
        // ... other sizes
      },
      spacing: {
        "f-0": "0",
        "f-1": "calc(var(--scale-factor, 1) * 0.25rem)",
        "f-2": "calc(var(--scale-factor, 1) * 0.5rem)",
        "f-3": "calc(var(--scale-factor, 1) * 0.75rem)",
        "f-4": "calc(var(--scale-factor, 1) * 1rem)"
        // ... other spacing values
      }
    }
  },
  plugins: []
};
