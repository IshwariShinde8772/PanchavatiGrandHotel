/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0A4D34", // Deep Forest Green (Trustworthy)
        primaryDark: "#063A27", // Darker Forest
        primaryLight: "#F0F5F2", // Very Light Mint
        secondary: "#2D5A27", // Olive Green
        secondaryDark: "#1F3D1B",
        secondaryLight: "#EDF2EE",
        accent: "#FBBF24", // Warm Gold (stays for minor accents)
        white: "#ffffff",
        cardBg: "#ffffff",
        cream: "#F9FAF9", // Soft Grey-Green white
        darkText: "#0D1B15", // Deepest Green (almost black)
        mutedText: "#526359", // Muted Sage
        divider: "#E5EBE7", // Soft Green-Grey divider
        success: "#059669",
        warning: "#D97706",
        error: "#DC2626",
        vineyard: "#0A4D34",
        saffron: "#EF6C00",
        godavari: "#2D5A27",
        goldLight: "#FEF3C7",
        goldDark: "#D97706",
        maroon: "#991B1B",
      },
      fontFamily: {
        heading: ["Playfair Display", "serif"],
        subheading: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        accent: ["Inter", "sans-serif"],
      },
      boxShadow: {
        elegant: "0 4px 20px rgba(10, 77, 52, 0.04)",
        card: "0 10px 40px rgba(0, 0, 0, 0.03)",
        float: "0 20px 60px rgba(10, 77, 52, 0.08)",
      },
      backgroundImage: {
        "hero-overlay": "linear-gradient(rgba(10, 77, 52, 0.4), rgba(10, 77, 52, 0.2))",
      },


    },
  },
  plugins: [],
};

