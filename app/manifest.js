export default function manifest() {
  return {
    id: "?homescreen=1",
    name: "Manage Monthly Money",
    short_name: "MonthlyMoney",
    description: "Know exactly where your salary goes. AI groups every rupee by merchant, compares salary cycles and reads your receipts.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B0D14",
    theme_color: "#4F46E5",
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
