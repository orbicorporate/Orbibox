import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const alt = "Orbibox";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Capa padrão do link — só entra em ação quando o negócio não tem capa da
 * Vitrine nem logotipo nem uma capa própria escolhida em Configurações (o
 * Next só usa esse arquivo quando generateMetadata não define uma imagem
 * explícita). Sem isso, o preview no WhatsApp ficava sem nenhuma imagem.
 */
export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  const name = business?.name ?? "Orbibox";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "linear-gradient(135deg, #B7F34A 0%, #6EE7D8 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 180,
            height: 180,
            borderRadius: 999,
            background: "rgba(17,19,24,0.9)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 64,
              height: 64,
              borderRadius: 999,
              background: "linear-gradient(135deg, #B7F34A 0%, #6EE7D8 100%)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            color: "#111318",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {name}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 34,
            color: "rgba(17,19,24,0.7)",
          }}
        >
          Visite meu Orbibox
        </div>
      </div>
    ),
    { ...size }
  );
}
