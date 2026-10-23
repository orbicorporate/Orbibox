import { voucherTheme } from "@/lib/voucherThemes";
import { ehDonoOuAdmin } from "@/lib/business";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOwnerHasAiChat, getOwnerHasVouchers, getOwnerIsFree } from "@/lib/plans";
import { caixaBloqueadaNoGratis } from "@/lib/planoGratis";
import { filterLive } from "@/lib/scheduling";
import { capaDoItem } from "@/lib/showcase";
import { VisitorExperience } from "./VisitorExperience";

/**
 * Preview do link (Open Graph), o que aparece quando alguém cola o link do
 * Orbibox no WhatsApp, Instagram, etc. WhatsApp só mostra imagem estática
 * (nada de animação), então usamos, nesta ordem: a capa da Vitrine, depois o
 * logotipo do negócio. A esfera animada da Orbi fica só dentro do app.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string; cardapio?: string; clube?: string; de?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { v: voucherId, cardapio, clube, de } = await searchParams;
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("businesses")
    .select("name, about_business, logo_url, vitrine_cover_url, vitrine_cover_urls, share_image_url, share_description")
    .eq("slug", slug)
    .maybeSingle();

  if (!b) return { title: "Orbibox" };

  // Link de um voucher específico (?v=ID): a capinha é o próprio voucher.
  // Voucher inexistente, pausado ou de outro negócio cai no preview normal.
  if (voucherId && /^[0-9a-f-]{36}$/i.test(voucherId)) {
    const { data: bid } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle();
    const { data: v } = bid
      ? await supabase
          .from("vouchers")
          .select("title, discount_type, discount_value")
          .eq("id", voucherId)
          .eq("business_id", bid.id)
          .eq("is_active", true)
          .maybeSingle()
      : { data: null };
    if (v) {
      const imagem = `/${slug}/voucher-og/${voucherId}`;
      const titulo = `${v.title} · ${b.name}`;
      const desc = "Toque para pegar seu voucher.";
      return {
        title: titulo,
        description: desc,
        manifest: `/${slug}/manifest.webmanifest`,
        openGraph: { title: titulo, description: desc, type: "website", images: [{ url: imagem, width: 1200, height: 630 }] },
        twitter: { card: "summary_large_image", title: titulo, description: desc, images: [imagem] },
      };
    }
  }

  const capa = b.share_image_url || b.vitrine_cover_url || (Array.isArray(b.vitrine_cover_urls) && b.vitrine_cover_urls[0]) || b.logo_url || `/${slug}/opengraph-image`;
  // Curto de propósito: o preview do WhatsApp mostra a descrição em uma linha.
  const fonteDescricao = b.share_description?.trim() || b.about_business?.trim() || `Conheça ${b.name}, produtos, serviços e contato num só link.`;
  // Uma linha só no WhatsApp: cabe uns 38 caracteres, então corta na última palavra inteira.
  const descricao = fonteDescricao.length > 38
    ? `${fonteDescricao.slice(0, 36).replace(/[\s,.;:]+\S*$/, "").replace(/[\s,.;:]+$/, "")}…`
    : fonteDescricao;
  // Título do preview do link, o convite vem antes do nome, não só o nome cru.
  // Quando quem compartilha é o público (link com ?de=publico), o convite vem de um cliente, não da marca.
  const tituloPreview = de === "publico" ? `Confere isso no Orbibox da ${b.name}` : `Visite nosso Orbibox - ${b.name}`;

  // Link de pedido de avaliação (?clube=avaliar): direto ao ponto, sem "visite".
  if (clube === "avaliar") {
    const titulo = "Queremos sua avaliação no nosso Orbibox";
    const desc = b.name.length > 38 ? `${b.name.slice(0, 36).trim()}…` : b.name;
    return {
      title: titulo,
      description: desc,
      manifest: `/${slug}/manifest.webmanifest`,
      openGraph: { title: titulo, description: desc, type: "website", images: [{ url: capa }] },
      twitter: { card: "summary_large_image", title: titulo, description: desc, images: [capa] },
    };
  }

  // Link do cardápio (?cardapio=1): mesma capa, título e frase do cardápio.
  if (cardapio === "1") {
    const titulo = `Cardápio · ${b.name}`;
    const desc = "Veja os pratos e preços.";
    return {
      title: titulo,
      description: desc,
      manifest: `/${slug}/manifest.webmanifest`,
      openGraph: { title: titulo, description: desc, type: "website", images: [{ url: capa }] },
      twitter: { card: "summary_large_image", title: titulo, description: desc, images: [capa] },
    };
  }

  return {
    title: b.name,
    description: descricao,
    manifest: `/${slug}/manifest.webmanifest`,
    openGraph: {
      title: tituloPreview,
      description: descricao,
      type: "website",
      images: [{ url: capa }],
    },
    twitter: {
      card: "summary_large_image",
      title: tituloPreview,
      description: descricao,
      images: [capa],
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

  // O dono pode estar logado navegando o próprio link, se for, mostramos
  // um atalho de volta pro painel em vez de forçar sair e digitar /admin.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = await ehDonoOuAdmin(user?.id, business.id);

  // As quatro dependem só do business, vão juntas em vez de em fila.
  const [contentRes, boxesRes, agentRes, hasAiChat, hasVouchers, giftRes, donoGratis] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, title, description, price, price_type, price_max, image_url, gallery_urls, brand_label, type, position, layout_size, box_color, footer_color, box_style, title_placement, target_url, link_kind, starts_at, ends_at")
      .eq("business_id", business.id)
      .eq("status", "published")
      .order("position", { ascending: true }),
    supabase
      .from("smart_boxes")
      .select("id, box_type, title, is_active, position, config, starts_at, ends_at")
      .eq("business_id", business.id)
      .order("position", { ascending: true }),
    supabase.from("agent_configs").select("agent_name, orbi_colors, suggested_questions").eq("business_id", business.id).maybeSingle(),
    getOwnerHasAiChat(business.owner_id),
    getOwnerHasVouchers(business.owner_id),
    supabase.from("gift_settings").select("enabled").eq("business_id", business.id).maybeSingle(),
    getOwnerIsFree(business.owner_id),
  ]);
  // Fora da janela de data agendada = como se não existisse pro visitante,
  // mesmo estando "publicado"/"ativo", assim não precisa lembrar de
  // desligar manualmente uma promoção que já venceu.
  const giftEnabled = !!giftRes.data?.enabled && !donoGratis;
  // O botão de Vouchers da tela inicial usa a cor do voucher mais novo no ar,
  // então trocar a cor do voucher já troca o botão.
  const { data: primeiroVoucher } = hasVouchers
    ? await supabase.from("vouchers").select("color").eq("business_id", business.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const corVoucher = primeiroVoucher?.color ? voucherTheme(primeiroVoucher.color).via : null;
  // Sem foto de capa, vale a primeira foto da página do item (o dono costuma colocar só lá).
  const content = filterLive(contentRes.data ?? []).map(({ gallery_urls, ...i }) => ({ ...i, image_url: capaDoItem(i.image_url, gallery_urls) }));
  // Plano grátis: vouchers, gift, IA e PDFs não aparecem para o visitante.
  const boxes = filterLive(boxesRes.data ?? []).filter((b) => !donoGratis || !caixaBloqueadaNoGratis(b));
  const agentConfig = agentRes.data;
  const orbiColors = Array.isArray(agentConfig?.orbi_colors) && agentConfig.orbi_colors.length >= 2
    ? (agentConfig.orbi_colors as string[])
    : null;

  return (
    <>
    <VisitorExperience
      business={business}
      content={content}
      boxes={boxes}
      agentName={agentConfig?.agent_name ?? "Orbi"}
      suggestedQuestions={Array.isArray(agentConfig?.suggested_questions) ? (agentConfig.suggested_questions as string[]) : []}
      orbiColors={orbiColors}
      isOwner={isOwner}
      hasAiChat={hasAiChat}
      hasVouchers={hasVouchers}
      corVoucher={corVoucher}
      giftEnabled={giftEnabled}
      gratis={donoGratis}
    />
    {donoGratis && (
      <a href={`/?de=${encodeURIComponent(business.slug)}`} className="mx-auto mb-6 mt-2 flex w-fit items-center gap-2 rounded-full border border-divider bg-white px-4 py-2 text-[13px] text-text-secondary">
        Feito com <span className="text-on-background">Orbibox</span>
      </a>
    )}
    </>
  );
}
