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
        void:    "#0A0413",
        ink1:    "#130823",
        ink2:    "#1C0F35",
        violet:  "#7C3AED",
        violet2: "#9D5CFF",
        amber:   "#F5A623",
        amber2:  "#FFC15E",
        cream:   "#F3EEF8",
        lilac:   "#AE96D6",
      },
      fontFamily: {
        title: ["Anton", "sans-serif"],
        data:  ["Space Grotesk", "sans-serif"],
        body:  ["Sora", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
