import type { NextConfig } from "next";

// Cabeçalhos de segurança em todas as páginas: impedem embutir o Orbibox em outro site (clonagem
// por iframe), forçam HTTPS e limitam o que o navegador revela e permite.
const segurancaHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self), usb=()" },
];

const nextConfig: NextConfig = {
  // Não entrega o código-fonte original ao navegador nem avisa que é Next.js.
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  // Modelo de recorte de fundo hospedado em public/imgly: arquivos com nome por conteúdo, podem ficar em cache para sempre.
  async headers() {
    return [
      { source: "/:path*", headers: segurancaHeaders },
      { source: "/imgly/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
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
