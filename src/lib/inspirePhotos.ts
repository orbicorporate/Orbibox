import { createClient } from "@/lib/supabase/server";
import type { ThemePhoto } from "@/lib/vitrineThemes";

export type InspireThemeData = { photos: ThemePhoto[]; titleStyle: "faixa" | "sobre" };

// Aceita os dois formatos salvos: lista de strings (URLs, antigo) ou lista de
// objetos { url, title, price } (novo). Normaliza sempre pra ThemePhoto.
function normalize(raw: unknown): ThemePhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): ThemePhoto | null => {
      if (typeof item === "string") return { url: item };
      if (item && typeof item === "object" && typeof (item as ThemePhoto).url === "string") {
        const o = item as ThemePhoto;
        return { url: o.url, title: o.title, price: o.price };
      }
      return null;
    })
    .filter((p): p is ThemePhoto => p !== null);
}

export async function getInspirePhotos(): Promise<Record<string, InspireThemeData>> {
  const supabase = await createClient();
  const { data } = await supabase.from("inspire_theme_photos").select("theme_id, photos, title_style");
  const map: Record<string, InspireThemeData> = {};
  for (const row of data ?? []) {
    map[row.theme_id] = {
      photos: normalize(row.photos),
      titleStyle: row.title_style === "faixa" ? "faixa" : "sobre",
    };
  }
  return map;
}
