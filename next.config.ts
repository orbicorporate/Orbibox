import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fotos do Supabase Storage passam pelo otimizador de imagens: chegam
  // redimensionadas pro tamanho da tela e em WebP/AVIF, em vez do original
  // de 1 a 2 MB (ex.: galeria do Inspire-se).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bzuajbbwueptvkngtsoy.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
