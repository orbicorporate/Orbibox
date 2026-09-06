import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VisitorExperience } from "./VisitorExperience";

/**
 * Preview do link (Open Graph) — o que aparece quando alguém cola o link do
 * Orbibox no WhatsApp, Instagram, etc. WhatsApp só mostra imagem estática
 * (nada de animação), então usamos, nesta ordem: a capa da Vitrine, depois o
 * logotipo do negócio. A esfera animada da Orbi fica só dentro do app.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("businesses")
    .select("name, about_business, logo_url, vitrine_cover_url, vitrine_cover_urls")
    .eq("slug", slug)
    .maybeSingle();

  if (!b) return { title: "Orbibox" };

  const capa = b.vitrine_cover_url || (Array.isArray(b.vitrine_cover_urls) && b.vitrine_cover_urls[0]) || b.logo_url || null;
  const descricao = b.about_business?.slice(0, 160) || `Conheça ${b.name} — produtos, serviços e contato num só link.`;

  return {
    title: b.name,
    description: descricao,
    openGraph: {
      title: b.name,
      description: descricao,
      type: "website",
      ...(capa ? { images: [{ url: capa }] } : {}),
    },
    twitter: {
      card: capa ? "summary_large_image" : "summary",
      title: b.name,
      description: descricao,
      ...(capa ? { images: [capa] } : {}),
    },
  };
}

export default async function VisitorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) notFound();

  // O dono pode estar logado navegando o próprio link — se for, mostramos
  // um atalho de volta pro painel em vez de forçar sair e digitar /admin.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === business.owner_id;

  // As três dependem só do business — vão juntas em vez de em fila.
  const [contentRes, boxesRes, agentRes] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, title, description, price, price_type, price_max, image_url, brand_label, type, position, layout_size, box_color, box_style, target_url, link_kind")
      .eq("business_id", business.id)
      .eq("status", "published")
      .order("position", { ascending: true }),
    supabase
      .from("smart_boxes")
      .select("id, box_type, title, is_active, position, config")
      .eq("business_id", business.id)
      .order("position", { ascending: true }),
    supabase.from("agent_configs").select("agent_name, orbi_colors").eq("business_id", business.id).maybeSingle(),
  ]);
  const content = contentRes.data;
  const boxes = boxesRes.data;
  const agentConfig = agentRes.data;
  const orbiColors = Array.isArray(agentConfig?.orbi_colors) && agentConfig.orbi_colors.length === 2
    ? (agentConfig.orbi_colors as [string, string])
    : null;

  return (
    <VisitorExperience
      business={business}
      content={content ?? []}
      boxes={boxes ?? []}
      agentName={agentConfig?.agent_name ?? "Orbi"}
      orbiColors={orbiColors}
      isOwner={isOwner}
    />
  );
}
