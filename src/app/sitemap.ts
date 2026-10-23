import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { APP_URL } from "@/lib/appUrl";

export const revalidate = 3600;

// Só as marcas prontas entram. Não há listagem pública das marcas no site, o mapa serve apenas aos buscadores.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [{ url: APP_URL, changeFrequency: "weekly", priority: 1 }];
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data } = await supabase.from("businesses").select("slug, updated_at").eq("onboarding_status", "ready").not("slug", "is", null).limit(5000);
    for (const b of data ?? []) {
      if (!b.slug) continue;
      base.push({ url: `${APP_URL}/${b.slug}`, lastModified: b.updated_at ?? undefined, changeFrequency: "weekly", priority: 0.7 });
    }
  } catch {}
  return base;
}
