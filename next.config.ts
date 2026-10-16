import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Modelo de recorte de fundo hospedado em public/imgly: arquivos com nome por conteúdo, podem ficar em cache para sempre.
  async headers() {
    return [{ source: "/imgly/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
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
      // Fotos lidas do site/Instagram na prévia ao vivo do onboarding.
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
