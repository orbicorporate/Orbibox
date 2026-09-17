"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VITRINE_THEMES, type ThemeBox, type ThemePhoto, type VitrineTheme } from "@/lib/vitrineThemes";
import type { InspireThemeData } from "@/lib/inspirePhotos";

// Mesmos aspect ratios da vitrine real: destaque=paisagem(16/9),
// largo=banner(bem largo), médio=quadrado, alto=retrato(4/5).
const SPAN: Record<ThemeBox["size"], string> = {
  destaque: "col-span-2 aspect-[16/9]",
  largo: "col-span-2 aspect-[1920/830]",
  medio: "col-span-1 aspect-square",
  alto: "col-span-1 row-span-2 aspect-[4/5]",
};

function MockBox({ box, theme, photos, titleStyle }: { box: ThemeBox; theme: VitrineTheme; photos: ThemePhoto[]; titleStyle: "faixa" | "sobre" }) {
  const photo = box.img != null ? photos[box.img] : undefined;
  if (!photo) return null;

  const title = photo.title?.trim();
  const price = photo.price?.trim();
  // Posição do recorte, fotos com texto (ex: investimentos) usam "top" pra
  // não cortar o lettering, que costuma estar no topo. Padrão: center.
  const objPos = theme.objectPosition ?? "center";

  // "faixa": foto no aspect ratio do formato + faixa BRANCA embaixo (igual à
  // vitrine real, o card é branco e cresce pra caber o rodapé).
  if (titleStyle === "faixa") {
    const spanCols = box.size === "destaque" || box.size === "largo" ? "col-span-2" : "col-span-1";
    const ratioClass = { destaque: "aspect-[16/9]", largo: "aspect-[1920/830]", medio: "aspect-square", alto: "aspect-[4/5]" }[box.size];
    // Mesmos valores da vitrine real: cantos 24px, sombra suave, rodapé p-4,
    // título Manrope 17px. Fontes reduzidas proporcionalmente no card médio
    // (que é metade da largura) pra caber sem estourar.
    const isMed = box.size === "medio";
    return (
      <div className={`overflow-hidden rounded-[24px] bg-surface-white shadow-[0_2px_14px_rgba(17,19,24,0.06)] ${spanCols}`}>
        <div className={`relative w-full ${ratioClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={title || "Exemplo"} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: objPos }} loading="lazy" />
        </div>
        {title && (
          <div className={isMed ? "p-3" : "p-4"}>
            <p className={`truncate font-[family-name:var(--font-manrope)] font-medium leading-tight text-on-background ${isMed ? "text-[14px]" : "text-[17px]"}`}>{title}</p>
            {price && <p className={`mt-0.5 font-[family-name:var(--font-manrope)] font-medium text-text-secondary ${isMed ? "text-[13px]" : "text-[15px]"}`}>{price}</p>}
          </div>
        )}
      </div>
    );
  }

  // "sobre": nome sobre a imagem, com degradê.
  return (
    <div className={`relative overflow-hidden rounded-[24px] ${SPAN[box.size]}`} style={{ backgroundColor: theme.colors[3].hex }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={title || "Exemplo"} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: objPos }} loading="lazy" />
      {title && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2.5">
          <p className="text-[12px] font-semibold leading-tight text-white">{title}</p>
          {price && <p className="text-[10px] text-white/85">{price}</p>}
        </div>
      )}
    </div>
  );
}

// Ritmo de tamanhos numa grade de 2 colunas que fecha todas as linhas, sem
// buraco: todo "alto" (2 linhas) vem sempre acompanhado de dois "medio" na
// coluna vizinha antes de qualquer box de 2 colunas. O padrão termina numa
// linha completa, então repetir é seguro.
const SIZE_RHYTHM: ThemeBox["size"][] = [
  "destaque",
  "alto", "medio", "medio",
  "largo",
  "medio", "alto", "medio",
  "medio", "medio",
  "largo",
];

/** Gera o tamanho de cada foto seguindo o ritmo e conserta a cauda pra não
 * sobrar espaço vago no fim: (1) um "alto" final sem os dois "medio" que
 * fecham a coluna ao lado vira "medio"; (2) se a última linha ficar pela
 * metade, o último box vira "largo" e fecha a linha. Simula a colocação
 * automática da grade de 2 colunas (mesma regra do CSS) pra decidir. */
function tamanhosSemBuraco(n: number): ThemeBox["size"][] {
  const sizes = Array.from({ length: n }, (_, i) => SIZE_RHYTHM[i % SIZE_RHYTHM.length]);
  const ultimoAlto = sizes.lastIndexOf("alto");
  if (ultimoAlto !== -1) {
    let ini = ultimoAlto;
    while (ini > 0 && sizes[ini - 1] === "medio") ini--;
    let fim = ultimoAlto;
    while (fim + 1 < n && sizes[fim + 1] === "medio") fim++;
    if (fim - ini < 2) sizes[ultimoAlto] = "medio";
  }
  // Simula a grade: se ficar célula vazia, o último box de 1 coluna vira largo.
  const ocupado = new Set<string>();
  let r = 0, c = 0;
  for (const s of sizes) {
    const w = s === "destaque" || s === "largo" ? 2 : 1;
    const h = s === "alto" ? 2 : 1;
    let rr = r, cc = c;
    for (;;) {
      let livre = cc + w <= 2;
      if (livre) for (let dy = 0; dy < h && livre; dy++) for (let dx = 0; dx < w; dx++) if (ocupado.has(`${rr + dy},${cc + dx}`)) { livre = false; break; }
      if (livre) break;
      cc++;
      if (cc >= 2) { cc = 0; rr++; }
    }
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) ocupado.add(`${rr + dy},${cc + dx}`);
    r = rr; c = cc + w;
    if (c >= 2) { c = 0; r++; }
  }
  let linhas = 0;
  for (const k of ocupado) linhas = Math.max(linhas, Number(k.split(",")[0]) + 1);
  let temBuraco = false;
  for (let y = 0; y < linhas && !temBuraco; y++) for (let x = 0; x < 2; x++) if (!ocupado.has(`${y},${x}`)) { temBuraco = true; break; }
  if (temBuraco && n > 0 && sizes[n - 1] === "medio") sizes[n - 1] = "largo";
  return sizes;
}

function ThemePreview({ theme, photos, titleStyle }: { theme: VitrineTheme; photos: ThemePhoto[]; titleStyle: "faixa" | "sobre" }) {
  // Um box por foto enviada, usa o nome/preço da própria foto.
  const sizes = tamanhosSemBuraco(photos.length);
  const boxes: ThemeBox[] = photos.map((_, i) => ({
    title: "",
    size: sizes[i],
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
      <div className="grid grid-cols-2 gap-2.5 [grid-auto-flow:dense]">
        {boxes.map((box, i) => (
          <MockBox key={i} box={box} theme={theme} photos={photos} titleStyle={titleStyle} />
        ))}
      </div>
    </div>
  );
}

export function InspireModal({ businessId, inspirePhotos, onClose }: { businessId: string; inspirePhotos: Record<string, InspireThemeData>; onClose: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [applying, setApplying] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Só mostra temas que já têm fotos cadastradas, os que ainda não foram
  // preenchidos pelo painel de upload ficam ocultos até terem imagem.
  // Ordem de vitrine: moda, doceria e arquitetura primeiro (os três que
  // melhor mostram o alcance do produto), depois os demais na ordem original.
  const INSPIRE_PRIMEIRO = ["moda", "doceria", "arquitetura"];
  const temasComFoto = VITRINE_THEMES
    .filter((t) => (inspirePhotos[t.id]?.photos.length ?? 0) > 0)
    .sort((a, b) => {
      const ia = INSPIRE_PRIMEIRO.indexOf(a.id);
      const ib = INSPIRE_PRIMEIRO.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

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
          cores na sua conta, as fotos aqui são só pra você se inspirar.
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
                    <ThemePreview theme={tema} photos={inspirePhotos[tema.id]?.photos ?? []} titleStyle={inspirePhotos[tema.id]?.titleStyle ?? "sobre"} />
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
