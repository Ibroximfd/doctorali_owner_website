import type { MetadataRoute } from "next";

/** PWA: telefon bosh ekraniga o'rnatiladi, brauzer panelisiz ochiladi. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Doctor Ali Nazorat",
    short_name: "Nazorat",
    description: "Doctor Ali — boshliq uchun nazorat paneli",
    start_url: "/",
    display: "standalone",
    background_color: "#050d09",
    theme_color: "#050d09",
    icons: [
      { src: "/brand/doctor-ali-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/doctor-ali-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/doctor-ali-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
