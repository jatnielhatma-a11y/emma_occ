import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        occ: {
          ink: "#03070d",
          panel: "#09111d",
          panel2: "#101b2a",
          line: "#24364b",
          cyan: "#35d9ff",
          gold: "#f4c76b",
          platinum: "#eef7ff",
          green: "#70e2b4",
          amber: "#f4c76b",
          red: "#ff6b78",
          violet: "#9db7ff"
        }
      },
      boxShadow: {
        occ: "0 22px 70px rgba(0, 0, 0, 0.36)",
        nova: "0 0 34px rgba(53, 217, 255, 0.18), 0 0 54px rgba(244, 199, 107, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
