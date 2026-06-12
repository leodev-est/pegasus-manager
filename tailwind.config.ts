import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        pegasus: {
          navy: "#0B2E59",
          primary: "#0D47A1",
          medium: "#1565C0",
          sky: "#42A5F5",
          ice: "#E3F2FD",
          surface: "#F5F7FA",
        },
      },
      boxShadow: {
        soft: "0 18px 45px rgba(11, 46, 89, 0.10)",
        glow: "0 0 0 3px rgba(66, 165, 245, 0.25)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite linear",
      },
    },
  },
  plugins: [animate],
};

export default config;
