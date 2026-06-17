import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Escronet — Stop Scam Calls Before They Happen",
    short_name: "Escronet",
    description:
      "On-device scam call detection. Transcribes with Whisper, classifies with ONNX, alerts you instantly. Privacy first. Open source. Free.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0D1B2A",
    theme_color: "#0D1B2A",
    categories: ["utilities", "security"],
    icons: [
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
