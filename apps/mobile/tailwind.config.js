/** @type {import('tailwindcss').Config} */

function cssVar(name) {
  return `rgb(var(${name}) / <alpha-value>)`;
}

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "../../packages/shared-ui/src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          0:   cssVar("--color-primary-0"),
          50:  cssVar("--color-primary-50"),
          100: cssVar("--color-primary-100"),
          200: cssVar("--color-primary-200"),
          300: cssVar("--color-primary-300"),
          400: cssVar("--color-primary-400"),
          500: cssVar("--color-primary-500"),
          600: cssVar("--color-primary-600"),
          700: cssVar("--color-primary-700"),
          800: cssVar("--color-primary-800"),
          900: cssVar("--color-primary-900"),
          950: cssVar("--color-primary-950"),
        },
        secondary: {
          0:   cssVar("--color-secondary-0"),
          50:  cssVar("--color-secondary-50"),
          100: cssVar("--color-secondary-100"),
          200: cssVar("--color-secondary-200"),
          300: cssVar("--color-secondary-300"),
          400: cssVar("--color-secondary-400"),
          500: cssVar("--color-secondary-500"),
          600: cssVar("--color-secondary-600"),
          700: cssVar("--color-secondary-700"),
          800: cssVar("--color-secondary-800"),
          900: cssVar("--color-secondary-900"),
          950: cssVar("--color-secondary-950"),
        },
        typography: {
          0:   cssVar("--color-typography-0"),
          50:  cssVar("--color-typography-50"),
          100: cssVar("--color-typography-100"),
          200: cssVar("--color-typography-200"),
          300: cssVar("--color-typography-300"),
          400: cssVar("--color-typography-400"),
          500: cssVar("--color-typography-500"),
          600: cssVar("--color-typography-600"),
          700: cssVar("--color-typography-700"),
          800: cssVar("--color-typography-800"),
          900: cssVar("--color-typography-900"),
          950: cssVar("--color-typography-950"),
        },
        background: {
          0:   cssVar("--color-background-0"),
          50:  cssVar("--color-background-50"),
          100: cssVar("--color-background-100"),
          200: cssVar("--color-background-200"),
          300: cssVar("--color-background-300"),
          400: cssVar("--color-background-400"),
          500: cssVar("--color-background-500"),
          600: cssVar("--color-background-600"),
          700: cssVar("--color-background-700"),
          800: cssVar("--color-background-800"),
          900: cssVar("--color-background-900"),
          950: cssVar("--color-background-950"),
        },
        success: {
          0:   cssVar("--color-success-0"),
          500: cssVar("--color-success-500"),
          700: cssVar("--color-success-700"),
        },
        error: {
          0:   cssVar("--color-error-0"),
          500: cssVar("--color-error-500"),
          700: cssVar("--color-error-700"),
        },
        warning: {
          500: cssVar("--color-warning-500"),
        },
        indicator: {
          info:    cssVar("--color-indicator-info"),
          error:   cssVar("--color-indicator-error"),
          success: cssVar("--color-indicator-success"),
          warning: cssVar("--color-indicator-warning"),
        },
      },
    },
  },
  plugins: [],
};
