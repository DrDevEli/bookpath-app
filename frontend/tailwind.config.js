/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        primary: '#7C3AED', // Vivid Violet
        secondary: '#FBBF24', // Golden Amber
        background: '#F5F3FF', // Soft Lavender
        surface: '#FFFFFF', // White
        muted: '#E0E7FF', // Pale Periwinkle
        text: {
          primary: '#1E293B', // Slate
          secondary: '#64748B', // Grayish Blue
        },
        success: '#10B981', // Emerald
        error: '#EF4444', // Red
        info: '#38BDF8', // Sky Blue
        border: '#E5E7EB', // Light gray for borders
        foreground: '#1E293B', // Slate for foreground text
      },
      fontFamily: {
        sans: ['Montserrat', 'Open Sans', 'Lato', 'ui-sans-serif', 'system-ui'],
        heading: ['Montserrat', 'ui-sans-serif', 'system-ui'],
        body: ['Open Sans', 'ui-sans-serif', 'system-ui'],
        accent: ['Lato', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 