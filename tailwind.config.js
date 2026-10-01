/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "background": "var(--background)",
        "surface": "var(--surface)",
        "surface-bright": "var(--surface-bright)",
        "surface-dim": "var(--surface-dim)",
        "surface-container-lowest": "var(--surface-container-lowest)",
        "surface-container-low": "var(--surface-container-low)",
        "surface-container": "var(--surface-container)",
        "surface-container-high": "var(--surface-container-high)",
        "surface-container-highest": "var(--surface-container-highest)",
        "on-surface": "var(--on-surface)",
        "on-surface-variant": "var(--on-surface-variant)",
        "on-background": "var(--on-background)",
        "primary": "var(--primary)",
        "primary-container": "var(--primary-container)",
        "primary-fixed": "var(--primary-fixed)",
        "primary-fixed-dim": "var(--primary-fixed-dim)",
        "on-primary": "var(--on-primary)",
        "on-primary-container": "var(--on-primary-container)",
        "secondary": "var(--secondary)",
        "secondary-container": "var(--secondary-container)",
        "tertiary": "var(--tertiary)",
        "tertiary-container": "var(--tertiary-container)",
        "tertiary-fixed": "var(--tertiary-fixed)",
        "error": "var(--error)",
        "error-container": "var(--error-container)",
        "outline": "var(--outline)",
        "outline-variant": "var(--outline-variant)",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "space-xs": "0.25rem",
        "margin-window": "0.75rem",
        "gutter-compact": "0.5rem",
        "space-xl": "2rem",
        "margin": "1.5rem",
        "gutter": "1rem",
        "space-lg": "1.5rem",
        "space-md": "1rem",
        "space-sm": "0.5rem"
      },
      fontFamily: {
        "body-md": ["Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        "body-sm": ["Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        "headline-md": ["Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        "label-code": ["JetBrains Mono", "monospace"],
        "label-telemetry": ["JetBrains Mono", "monospace"],
        "label-keycap": ["JetBrains Mono", "monospace"],
        "headline-xl": ["Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        "body-lg": ["Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        "headline-lg": ["Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"]
      },
      fontSize: {
        "body-md": ["13px", { lineHeight: "20px", letterSpacing: "-0.005em", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "18px", letterSpacing: "0em", fontWeight: "400" }],
        "headline-md": ["18px", { lineHeight: "26px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "label-code": ["12px", { lineHeight: "18px", letterSpacing: "-0.01em", fontWeight: "400" }],
        "label-telemetry": ["11px", { lineHeight: "14px", letterSpacing: "0.02em", fontWeight: "500" }],
        "label-keycap": ["10px", { lineHeight: "12px", letterSpacing: "0.04em", fontWeight: "600" }],
        "headline-xl": ["32px", { lineHeight: "40px", letterSpacing: "-0.03em", fontWeight: "600" }],
        "body-lg": ["15px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "400" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.025em", fontWeight: "600" }]
      }
    }
  },
  plugins: []
};
