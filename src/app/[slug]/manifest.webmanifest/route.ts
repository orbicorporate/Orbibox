import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Manifesto próprio da página pública: quem adiciona o link do negócio à
// tela inicial do celular abre a página do negócio, não o painel do Orbibox.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: b } = await supabase.from("businesses").select("name").eq("slug", slug).maybeSingle();
  const nome = b?.name ?? "Orbibox";
  return NextResponse.json(
    {
      name: nome,
      short_name: nome.length > 12 ? nome.slice(0, 12) : nome,
      start_url: `/${slug}`,
      scope: `/${slug}`,
      display: "standalone",
      orientation: "portrait",
      background_color: "#F7F7F4",
      theme_color: "#F7F7F4",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
