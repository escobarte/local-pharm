import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Local Pharm",
    short_name: "Local Pharm",
    description: "Домашняя аптечка: что есть, где лежит и когда истекает срок.",
    lang: "ru",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAFD",
    theme_color: "#122056",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
