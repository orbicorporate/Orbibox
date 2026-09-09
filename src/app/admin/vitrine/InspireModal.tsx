"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VITRINE_THEMES, type ThemeBox, type ThemePhoto, type VitrineTheme } from "@/lib/vitrineThemes";

const SPAN: Record<ThemeBox["size"], string> = {
  destaque: "col-span-2 aspect-[16/9]",
  largo: "col-span-2 aspect-[21/9]",
  medio: "col-span-1 aspect-square",
  alto: "col-span-1 row-span-2 aspect-[3/5]",
};

function MockBox({ box, theme, photos }: { box: ThemeBox; theme: VitrineTheme; photos: ThemePhoto[] }) {
  const photo = box.img != null ? photos[box.img] : undefined;
  if (!photo) return null;

  // Nome/preço vêm da própria foto (definidos no upload). Sem nome, a foto
  // aparece limpa, sem faixa de texto embaixo.
  const title = photo.title?.trim();
  const price = photo.price?.trim();
  return (
    <div className={`relative overflow-hidden rounded-[16px] ${SPAN[box.size]}`} style={{ backgroundColor: theme.colors[3].hex }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={title || "Exemplo"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      {title && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2.5">
          <p className="text-[12px] font-semibold leading-tight text-white">{title}</p>
          {price && <p className="text-[10px] text-white/85">{price}</p>}
        </div>
      )}
    </div>
  );
}

// Ritmo de tamanhos que se repete conforme entram mais fotos — dá variação
// visual (uma foto grande, uma alta, duas médias, uma larga…) sem depender de
// um número fixo de boxes. Assim a grade cresce junto com as fotos.
const SIZE_RHYTHM: ThemeBox["size"][] = ["destaque", "alto", "medio", "medio", "largo", "medio", "alto", "medio", "medio", "largo", "medio", "medio"];

function ThemePreview({ theme, photos }: { theme: VitrineTheme; photos: ThemePhoto[] }) {
  // Um box por foto enviada — usa o nome/preço da própria foto.
  const boxes: ThemeBox[] = photos.map((_, i) => ({
    title: "",
    size: SIZE_RHYTHM[i % SIZE_RHYTHM.length],
    img: i,
  }));

  return (
    <div className="rounded-[20px] p-3" style={{ backgroundColor: theme.bg }}>
      <div className="mb-3 flex items-center gap-2 px-1">
        <div className="h-7 w-7 rounded-full" style={{ backgroundColor: theme.colors[1].hex }} />
        <div>
          <p className="text-[13px] font-semibold" style={{ color: theme.colors[1].hex }}>{theme.exampleBusiness}</p>
          <p className="text-[9px] uppercase tracking-wide" style={{ color: theme.colors[1].hex, opacity: 0.5 }}>Vitrine de exemplo</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 [grid-auto-flow:dense]">
        {boxes.map((box, i) => (
          <MockBox key={i} box={box} theme={theme} photos={photos} />
        ))}
      </div>
    </div>
  );
}

export function InspireModal({ businessId, inspirePhotos, onClose }: { businessId: string; inspirePhotos: Record<string, ThemePhoto[]>; onClose: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [applying, setApplying] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Só mostra temas que já têm fotos cadastradas — os que ainda não foram
  // preenchidos pelo painel de upload ficam ocultos até terem imagem.
  const temasComFoto = VITRINE_THEMES.filter((t) => (inspirePhotos[t.id]?.length ?? 0) > 0);

  async function usarTema(themeId: string) {
    const tema = VITRINE_THEMES.find((t) => t.id === themeId);
    if (!tema || applying) return;
    setApplying(themeId);
    await supabase.from("businesses").update({ brand_colors: tema.colors }).eq("id", businessId);
    router.refresh();
    setApplying(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-background-main p-6 sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-[family-name:var(--font-manrope)] text-[20px] font-medium tracking-[-0.01em]">✦ Inspire-se</p>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-[14px]">✕</button>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
          Veja vitrines completas de exemplo por tipo de negócio. Ao escolher um estilo, a Orbi aplica a paleta de
          cores na sua conta — as fotos aqui são só pra você se inspirar.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          {temasComFoto.map((tema) => {
            const open = openId === tema.id;
            return (
              <div key={tema.id} className="overflow-hidden rounded-[24px] border border-divider bg-surface-white">
                <button onClick={() => setOpenId(open ? null : tema.id)} className="flex w-full items-center gap-3 p-4 text-left">
                  <div className="flex shrink-0 gap-1">
                    {tema.colors.slice(0, 3).map((c, i) => (
                      <span key={i} className="h-6 w-6 rounded-full border border-divider" style={{ backgroundColor: c.hex }} />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{tema.name}</p>
                    <p className="text-[12px] text-text-tertiary">{tema.vibe}</p>
                  </div>
                  <span className="text-text-tertiary">{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <div className="border-t border-divider p-4">
                    <p className="mb-3 text-[12.5px] leading-relaxed text-text-secondary">{tema.description}</p>
                    <ThemePreview theme={tema} photos={inspirePhotos[tema.id] ?? []} />
                    <button
                      onClick={() => usarTema(tema.id)}
                      disabled={applying !== null}
                      className="mt-4 w-full rounded-full bg-button-primary py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
                    >
                      {applying === tema.id ? "Aplicando…" : "Usar esse estilo"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
