import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#0d7d50",
        night: "#07120f",
        panel: "#101b18",
        line: "rgba(255,255,255,0.12)"
      },
      boxShadow: {
        glow: "0 18px 80px rgba(24, 185, 129, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
