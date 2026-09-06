import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Toda vez que um logotipo é enviado — em Configurações ou dentro de
 * qualquer box — ele entra nessa galeria compartilhada. É o que faz o logo
 * aparecer como sugestão de ícone em TODOS os boxes, inclusive os novos
 * criados depois. Um logo nunca se perde, mesmo que só tenha sido usado uma
 * vez num box específico.
 */
export async function addToLogoGallery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  businessId: string,
  currentGallery: string[],
  url: string
): Promise<string[]> {
  if (!url || currentGallery.includes(url)) return currentGallery;
  const next = [...currentGallery, url];
  await supabase.from("businesses").update({ logo_gallery: next }).eq("id", businessId);
  return next;
}

export function parseLogoGallery(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((u): u is string => typeof u === "string" && u.length > 0) : [];
}
