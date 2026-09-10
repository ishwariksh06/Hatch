import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HATCH — campus kitchen",
    short_name: "HATCH",
    description: "Order from the campus kitchen, pay in a tap, track it to your hands.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFDF6",
    theme_color: "#FFFDF6",
    categories: ["food", "shopping"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
