import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces (dark-first, Telegram-native feel)
        bg: {
          DEFAULT: "#0a0b0f",
          soft: "#101219",
          card: "rgba(255,255,255,0.04)",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.08)",
          strong: "rgba(255,255,255,0.14)",
        },
        // Brand accent — electric indigo/violet
        brand: {
          50: "#eef0ff",
          400: "#8b8bf5",
          500: "#6d6df0",
          600: "#5a5ae8",
          700: "#4a45d6",
        },
        // Plan status semantic colors
        status: {
          danger: "#ff5c7a",   // <40%
          warn: "#ffb84d",     // 40-80%
          success: "#3ddc84",  // 80-100%
          premium: "#4dc9ff",  // >100% (overachieved)
          idle: "#5b6172",     // no activity
        },
        text: {
          DEFAULT: "#f2f3f7",
          soft: "#a9aec0",
          faint: "#6b7085",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
        glow: "0 0 24px rgba(109,109,240,0.35)",
        card: "0 4px 24px rgba(0,0,0,0.25)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "count-bump": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "pop-in": "pop-in 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        "count-bump": "count-bump 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
