export default function manifest() {
  return {
    name: "Manage Monthly Money",
    short_name: "MonthlyMoney",
    description: "AI-Powered Smart E-Passbook for tracking month-wise salary, lending, loans, and spending with streaming Gemini intelligence.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#02040a",
    theme_color: "#8b5cf6",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}
