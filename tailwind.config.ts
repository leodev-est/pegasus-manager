import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        pegasus: {
          navy: "#18181B",
          primary: "#18181B",
          medium: "#3F3F46",
          sky: "#22C55E",
          ice: "#F0FDF4",
          surface: "#FAFAF9",
          gold: "#A16207",
        },
        // Neutral (no blue undertone) graphite scale — replaces Tailwind's default
        // blue-tinted slate everywhere `slate-*` is used, in both themes.
        slate: {
          50: "#FAFAFA",
          100: "#F4F4F5",
          200: "#E4E4E7",
          300: "#D4D4D8",
          400: "#A1A1AA",
          500: "#71717A",
          600: "#52525B",
          700: "#3F3F46",
          800: "#1F1F23",
          900: "#18181B",
          950: "#0A0A0B",
        },
      },
      boxShadow: {
        soft: "0 12px 32px rgba(24, 24, 27, 0.06)",
        glow: "0 0 0 3px rgba(34, 197, 94, 0.25)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Kanban: card being picked up (lifts and tilts) and card landing in a column.
        "kanban-lift": {
          from: { transform: "rotate(0deg) scale(1)", boxShadow: "0 1px 2px rgba(24, 24, 27, 0.06)" },
        },
        "kanban-settle": {
          "0%": { transform: "scale(1.03)", boxShadow: "0 12px 28px rgba(24, 24, 27, 0.16)" },
          "100%": { transform: "scale(1)", boxShadow: "0 0 0 rgba(24, 24, 27, 0)" },
        },
        "kanban-pop": {
          "0%": { transform: "scale(0.6)" },
          "60%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite linear",
        "fade-slide-up": "fade-slide-up 0.22s ease-out both",
        "kanban-lift": "kanban-lift 0.16s ease-out backwards",
        "kanban-settle": "kanban-settle 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "kanban-pop": "kanban-pop 0.24s ease-out both",
      },
    },
  },
  plugins: [animate],
};

export default config;
