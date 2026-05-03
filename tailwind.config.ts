import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
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
      },
    },
  },
  plugins: [],
};

export default config;
