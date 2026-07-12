import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "subscribe-lists",
    short_name: "サブスク管理",
    description: "サブスク契約管理アプリ",
    start_url: "/subscriptions",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4c5eb3",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
