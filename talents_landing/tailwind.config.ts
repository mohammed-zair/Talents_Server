import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          charcoal: "#070A0F",
          cyan: "#00A8E8",
          teal: "#12B5A6",
        },
      },
      boxShadow: {
        glow: "0 0 24px rgba(0, 168, 232, 0.45)",
      },
      backdropBlur: {
        22: "22px",
      },
    },
  },
  plugins: [],
} satisfies Config;
