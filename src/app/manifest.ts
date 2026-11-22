import type { MetadataRoute } from "next";

/** Web App Manifest — makes TRACKY installable (home screen / dock). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TRACKY",
    short_name: "TRACKY",
    description: "Tu sistema operativo personal: hábitos, objetivos, trackers y salud.",
    lang: "es",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0B0F14",
    theme_color: "#0B0F14",
    categories: ["productivity", "lifestyle", "health"],
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/brand/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
