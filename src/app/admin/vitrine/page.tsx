import { PreviewAoVivo } from "@/components/mobile/PreviewAoVivo";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { getInspirePhotos } from "@/lib/inspirePhotos";
import { ShowcaseBuilder } from "./ShowcaseBuilder";
import { capaDoItem } from "@/lib/showcase";
import { GuiaBotao } from "@/components/guia/GuiaOrbi";
import Link from "next/link";

type BrandColor = { hex: string; role?: string };

export default async function VitrinePage({ searchParams }: { searchParams: Promise<{ novo?: string; abrir?: string; embed?: string; cat?: string; inspire?: string }> }) {
  const { novo, abrir, cat, inspire } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const { data: business } = await supabase
    .from("businesses")
    .select("id, slug, name, brand_colors, vitrine_categories, vitrine_cover_urls, contact_whatsapp, catalog_title, catalog_subtitle, vitrine_intro_seen, vitrine_lead_top, contact_site, website_url, home_destaques")
    .eq("id", businessId!)
    .single();
  // "Novo item" (?novo=1): abre o cadastro em passos da própria vitrine (nome, foto, descrição, preço e categoria,
  // com Pular), o mesmo de quem toca em "Novo item" aqui dentro. Vale também para quem vem da Home.
  const { data: items } = await supabase
    .from("content_items")
    .select("*")
    .eq("business_id", business!.id)
    .order("position", { ascending: true });

  // As cores que a Orbi definiu no DNA da marca, mesma paleta do onboarding.
  const raw = business?.brand_colors;
  const brandColors: BrandColor[] = Array.isArray(raw)
    ? raw.filter((c): c is BrandColor => !!c && typeof c === "object" && typeof (c as BrandColor).hex === "string")
    : [];

  const { data: caixas } = await supabase.from("smart_boxes").select("config").eq("business_id", business!.id).eq("box_type", "custom");
  const temCardapio = (caixas ?? []).some((b) => (b.config as { action?: string } | null)?.action === "cardapio");

  // Mesma regra da Home: a vitrine ativa guarda a escolha dos itens; sem ela, vale o box de entrada (hero).
  const { data: boxesHome } = await supabase.from("smart_boxes").select("id, box_type, is_active, position, config").eq("business_id", business!.id).in("box_type", ["product", "hero", "custom"]).order("position", { ascending: true });
  const boxDaHome = (boxesHome ?? []).find((b) => b.is_active && (b.box_type === "product" || (b.box_type === "custom" && ["vitrine", "comprar"].includes(String((b.config as { action?: string } | null)?.action ?? ""))))) ?? (boxesHome ?? []).find((b) => b.box_type === "hero") ?? null;
  const homeBoxConfig = (boxDaHome?.config && typeof boxDaHome.config === "object" && !Array.isArray(boxDaHome.config) ? boxDaHome.config : {}) as Record<string, unknown>;
  const destaquesHome = (Array.isArray(business!.home_destaques) ? (business!.home_destaques as unknown[]) : [])
    .filter((d): d is { t: "voucher" | "item" | "botao" | "item_bolinha"; id: string; p?: number } => !!d && typeof d === "object" && typeof (d as { id?: unknown }).id === "string" && ["voucher", "item", "botao", "item_bolinha"].includes((d as { t?: string }).t ?? ""));

  const semFoto = (items ?? []).filter((i) => !i.image_url && !(Array.isArray(i.gallery_urls) && i.gallery_urls.length > 0)).length;

  const inspirePhotos = await getInspirePhotos();

  return (
    <div className="flex flex-col">
      <h1 data-tour="vitrine" className="mt-2 font-[family-name:var(--font-manrope)] text-[34px] font-medium tracking-[-0.02em]">
        Catálogo
      </h1>
      <p className="mt-1 text-[14px] text-text-secondary">
        O que o cliente vê no seu link.
      </p>
      <GuiaBotao className="mt-3 self-start" />
      {semFoto >= 3 && (
        <Link href="/admin/vitrine/fotos" className="mt-3 flex min-h-[52px] items-center justify-between gap-3 rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[14px] active:scale-[0.99]">
          <span><span className="font-medium">{semFoto} itens estão sem foto.</span> <span className="text-text-secondary">Escolher da sua galeria</span></span>
          <span aria-hidden className="text-text-tertiary">›</span>
        </Link>
      )}
      <ShowcaseBuilder
        abrirNovo={novo === "1"}
        abrirInspire={inspire === "1"}
        categoriaNovo={cat?.slice(0, 30) ?? null}
        abrirCapa={abrir === "capa" || abrir === "ajustes" || abrir === "novidades"}
        items={(items ?? []).map((i) => ({ ...i, image_url: capaDoItem(i.image_url, i.gallery_urls) }))}
        slug={business!.slug}
        businessId={business!.id}
        businessName={business!.name}
        brandColors={brandColors}
        initialCategories={business!.vitrine_categories ?? []}
        initialCoverUrl={business!.vitrine_cover_urls}
        whatsapp={business!.contact_whatsapp}
        initialCatalogTitle={business!.catalog_title}
        initialCatalogSubtitle={business!.catalog_subtitle}
        introSeen={business!.vitrine_intro_seen}
        initialLeadTop={!!business!.vitrine_lead_top}
        siteSalvo={business!.contact_site || business!.website_url || null}
        inspirePhotos={inspirePhotos}
        temCardapio={temCardapio}
        destaquesHomeIniciais={destaquesHome}
        homeBoxId={boxDaHome?.id ?? null}
        homeBoxConfig={homeBoxConfig}
      />
      <PreviewAoVivo slug={business!.slug} tab="vitrine" />
    </div>
  );
}
