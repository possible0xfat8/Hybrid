import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Official Hemi Red-Orange Palette
        hemi: {
          DEFAULT: "#FF4600",
          50: "#fff5f0",
          100: "#ffe8de",
          200: "#ffd1bd",
          300: "#ffb191",
          400: "#ff8459",
          500: "#FF4600",
          600: "#e83a00",
          700: "#c22c00",
          800: "#9c2505",
          900: "#7e220a",
          950: "#440d02",
        },
        // Hemi Uno Obsidian Theme Palette
        obsidian: {
          950: "#08090C",
          900: "#0C0F14",
          850: "#111419",
          800: "#181C24",
          700: "#222933",
        },
        // Hemi Chess Semantic Tokens
        canvas: "var(--bg-base)",
        elevated: "var(--bg-elevated)",
        surface: "var(--surface-glass)",
        "surface-strong": "var(--surface-strong)",
        line: "var(--surface-border)",
        "line-strong": "var(--surface-border-strong)",
        orange: {
          DEFAULT: "#FF4600",
          soft: "rgba(255, 70, 0, 0.16)",
        },
        teal: {
          DEFAULT: "#14b8a6",
          soft: "rgba(20, 184, 166, 0.16)",
          strong: "#0d9488",
        },
        blue: {
          DEFAULT: "#3b82f6",
          soft: "rgba(59, 130, 246, 0.16)",
        },
        "amber-accent": "#fbbf24",
        "danger-accent": "#f43f5e",
        ink: {
          DEFAULT: "var(--text-primary)",
          muted: "var(--text-muted)",
          faint: "var(--text-faint)",
        },
        "board-light": "var(--board-light)",
        "board-dark": "var(--board-dark)",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        hemiGlow: "0 0 24px rgba(255, 70, 0, 0.35)",
        hemiGlowSm: "0 0 12px rgba(255, 70, 0, 0.2)",
        hemiOrangeGlow: "0 0 28px -8px #FF4600",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "20%": { transform: "translate(-4px, 4px) rotate(-1deg)" },
          "40%": { transform: "translate(4px, -3px) rotate(1.5deg)" },
          "60%": { transform: "translate(-3px, 2px) rotate(-1deg)" },
          "80%": { transform: "translate(3px, -2px) rotate(0.5deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        shake: "shake 0.4s ease-in-out",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
