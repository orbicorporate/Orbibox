import { createClient } from "@/lib/supabase/server";

// Busca as fotos de todos os temas do Inspire-se (theme_id -> lista de URLs).
// A grade e a paleta ficam no código (vitrineThemes); só as fotos vêm daqui.
export async function getInspirePhotos(): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data } = await supabase.from("inspire_theme_photos").select("theme_id, photos");
  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    map[row.theme_id] = Array.isArray(row.photos) ? (row.photos as string[]) : [];
  }
  return map;
}
