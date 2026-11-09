import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ConviteRede } from "./ConviteRede";

export const dynamic = "force-dynamic";

// Função da rede ainda não está nos tipos gerados do banco, por isso o cliente sem tipos. É pública (só devolve nome e slug).
async function buscarRede(slug: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.rpc("rede_por_convite", { p_slug: slug });
  const linha = (Array.isArray(data) ? data[0] : data) as { name: string; slug: string } | undefined;
  return linha ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const rede = await buscarRede(slug);
  const titulo = rede ? `Convite para a rede ${rede.name}` : "Convite para a rede";
  return { title: titulo, description: "Entre na rede pelo seu Orbibox.", robots: { index: false } };
}

export default async function ConvitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rede = await buscarRede(slug);
  if (!rede) notFound();
  return <ConviteRede redeNome={rede.name} redeSlug={rede.slug} />;
}
