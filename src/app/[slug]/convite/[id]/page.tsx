import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { UUID } from "@/lib/convitesServidor";
import { ConviteFlow } from "./ConviteFlow";

/**
 * Página de quem recebe o convite de um voucher privado. A capinha do link (WhatsApp, Instagram)
 * é sempre a do negócio, nunca a do voucher: o que o voucher oferece só aparece depois do código.
 * Fica fora das buscas.
 */
async function carregar(slug: string, id: string) {
  if (!UUID.test(id)) return null;
  const service = createServiceClient();
  const { data: b } = await service.from("businesses").select("id, name, slug, logo_url").eq("slug", slug).maybeSingle();
  if (!b) return null;
  const { data: v } = await service.from("vouchers").select("id, privado, is_active").eq("id", id).eq("business_id", b.id).maybeSingle();
  if (!v || !v.privado) return null;
  return { negocio: b, ativo: v.is_active };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const d = await carregar(slug, id);
  if (!d) return { title: "Orbibox", robots: { index: false, follow: false } };
  const titulo = `Seu convite chegou · ${d.negocio.name}`;
  const desc = "Voucher exclusivo e pessoal. Toque para liberar o seu.";
  const imagem = `/${slug}/opengraph-image`;
  return {
    title: titulo,
    description: desc,
    robots: { index: false, follow: false },
    openGraph: { title: titulo, description: desc, type: "website", images: [{ url: imagem }] },
    twitter: { card: "summary_large_image", title: titulo, description: desc, images: [imagem] },
  };
}

export default async function ConvitePage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ c?: string }> }) {
  const { slug, id } = await params;
  const { c } = await searchParams;
  const d = await carregar(slug, id);
  if (!d) notFound();
  return <ConviteFlow voucherId={id} slug={slug} nomeNegocio={d.negocio.name} logoUrl={d.negocio.logo_url} codigoInicial={typeof c === "string" ? c : ""} />;
}
