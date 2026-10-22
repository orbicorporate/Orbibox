"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BUCKET, TIPOS_IMAGEM, enviarImagem, usosDaImagem, type Categoria, type ClienteBanco, type TipoImagem } from "@/lib/bancoImagens";

export type ItemGaleria = { id: string; nome: string; url: string; category_id: string | null; auto_tipo: TipoImagem | null; tamanho: number | null };

type Modo = "ver" | "editar" | "categoria" | "excluir";
type Aba = "cortar" | "ajustar" | "filtros";
type Ajustes = { brilho: number; contraste: number; saturacao: number; calor: number };

const ZERO: Ajustes = { brilho: 0, contraste: 0, saturacao: 0, calor: 0 };
const PROPORCOES: { id: string; nome: string; r: number | null }[] = [
  { id: "orig", nome: "Original", r: null },
  { id: "1:1", nome: "1:1", r: 1 },
  { id: "4:3", nome: "4:3", r: 4 / 3 },
  { id: "3:4", nome: "3:4", r: 3 / 4 },
  { id: "16:9", nome: "16:9", r: 16 / 9 },
  { id: "9:16", nome: "9:16", r: 9 / 16 },
];
const FILTROS: { id: string; nome: string; a: Ajustes }[] = [
  { id: "orig", nome: "Original", a: ZERO },
  { id: "vivido", nome: "Vívido", a: { brilho: 4, contraste: 14, saturacao: 32, calor: 0 } },
  { id: "quente", nome: "Quente", a: { brilho: 4, contraste: 6, saturacao: 8, calor: 32 } },
  { id: "frio", nome: "Frio", a: { brilho: 0, contraste: 6, saturacao: 0, calor: -32 } },
  { id: "suave", nome: "Suave", a: { brilho: 8, contraste: -14, saturacao: -10, calor: 6 } },
  { id: "pb", nome: "Preto e branco", a: { brilho: 0, contraste: 12, saturacao: -100, calor: 0 } },
];
const SLIDERS: { chave: keyof Ajustes; nome: string }[] = [
  { chave: "brilho", nome: "Brilho" },
  { chave: "contraste", nome: "Contraste" },
  { chave: "saturacao", nome: "Cores" },
  { chave: "calor", nome: "Calor" },
];

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

function ajustarPixels(ctx: CanvasRenderingContext2D, w: number, h: number, a: Ajustes) {
  if (a.brilho === 0 && a.contraste === 0 && a.saturacao === 0 && a.calor === 0) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const soma = a.brilho * 1.6;
  const c = a.contraste * 2.2;
  const fc = (259 * (c + 255)) / (255 * (259 - c));
  const fs = 1 + a.saturacao / 100;
  const calor = a.calor * 0.45;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] + soma + calor;
    let g = d[i + 1] + soma;
    let b = d[i + 2] + soma - calor;
    r = fc * (r - 128) + 128;
    g = fc * (g - 128) + 128;
    b = fc * (b - 128) + 128;
    const cinza = 0.299 * r + 0.587 * g + 0.114 * b;
    d[i] = clamp(cinza + (r - cinza) * fs);
    d[i + 1] = clamp(cinza + (g - cinza) * fs);
    d[i + 2] = clamp(cinza + (b - cinza) * fs);
  }
  ctx.putImageData(img, 0, 0);
}

const kbTexto = (n: number | null) => (!n ? "" : n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

function Icone({ d, tam = 20 }: { d: string; tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
const IC = {
  editar: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4",
  pasta: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z",
  lixo: "M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3",
  esq: "M15 5l-7 7 7 7",
  dir: "M9 5l7 7-7 7",
  girarE: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  girarD: "M21 12a9 9 0 1 1-3-6.7M21 4v5h-5",
  espelhar: "M12 3v18M8 7L3 12l5 5V7zM16 7l5 5-5 5V7z",
};

/**
 * Visualizador da galeria: foto grande, passar para a próxima, editar de
 * verdade (cortar, girar, brilho, contraste, cores, calor, filtros), mudar de
 * categoria e excluir. A edição sempre salva uma cópia, a original fica.
 */
export function FotoVisualizador({
  supabase,
  businessId,
  itens,
  idInicial,
  categorias,
  atual,
  onUsar,
  onFechar,
  onNova,
  onExcluida,
  onCategoria,
}: {
  supabase: ClienteBanco;
  businessId: string;
  itens: ItemGaleria[];
  idInicial: string;
  categorias: Categoria[];
  atual?: string | null;
  onUsar: (url: string) => void;
  onFechar: () => void;
  onNova: (item: ItemGaleria) => void;
  onExcluida: (id: string) => void;
  onCategoria: (id: string, categoria: string | null) => void;
}) {
  const [id, setId] = useState(idInicial);
  const [modo, setModo] = useState<Modo>("ver");
  const [aba, setAba] = useState<Aba>("cortar");
  const [rot, setRot] = useState(0);
  const [espelho, setEspelho] = useState(false);
  const [prop, setProp] = useState("orig");
  const [ajustes, setAjustes] = useState<Ajustes>(ZERO);
  const [filtro, setFiltro] = useState("orig");
  const [carregada, setCarregada] = useState<{ url: string; el: HTMLImageElement } | null>(null);
  const [erroUrl, setErroUrl] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [usos, setUsos] = useState<string[] | null>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const toque = useRef<number | null>(null);

  const achado = itens.findIndex((i) => i.id === id);
  // Se a foto atual saiu da lista (excluída ou trocada de categoria com filtro), mostra a primeira; sem fotos, fecha.
  const indice = achado >= 0 ? achado : 0;
  const item = itens[indice] ?? null;
  useEffect(() => {
    if (!item) onFechar();
  }, [item, onFechar]);

  const zerar = useCallback(() => {
    setRot(0);
    setEspelho(false);
    setProp("orig");
    setAjustes(ZERO);
    setFiltro("orig");
  }, []);

  function ir(delta: number) {
    if (itens.length < 2 || ocupado) return;
    const prox = itens[(indice + delta + itens.length) % itens.length];
    setId(prox.id);
    setModo("ver");
    setMsg(null);
    setUsos(null);
    zerar();
  }

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
      else if (modo === "ver" && e.key === "ArrowLeft") ir(-1);
      else if (modo === "ver" && e.key === "ArrowRight") ir(1);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  // A imagem só é carregada para edição (com CORS) quando a pessoa abre o editor.
  const urlItem = item?.url;
  useEffect(() => {
    if (modo !== "editar" || !urlItem) return;
    let vivo = true;
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => vivo && setCarregada({ url: urlItem, el: i });
    i.onerror = () => vivo && setErroUrl(urlItem);
    i.src = `${urlItem}${urlItem.includes("?") ? "&" : "?"}cors=1`;
    return () => {
      vivo = false;
    };
  }, [modo, urlItem]);

  const img = carregada && carregada.url === urlItem ? carregada.el : null;
  const imgErro = erroUrl === urlItem;
  const proporcao = PROPORCOES.find((p) => p.id === prop)?.r ?? null;

  const desenhar = useCallback(
    (fonte: HTMLImageElement, maxLado: number) => {
      const w = fonte.naturalWidth;
      const h = fonte.naturalHeight;
      const troca = rot % 2 === 1;
      const rw = troca ? h : w;
      const rh = troca ? w : h;
      let cw = rw;
      let ch = rh;
      if (proporcao) {
        if (rw / rh > proporcao) cw = rh * proporcao;
        else ch = rw / proporcao;
      }
      const cx = (rw - cw) / 2;
      const cy = (rh - ch) / 2;
      const s = Math.min(1, maxLado / Math.max(cw, ch));
      const out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(cw * s));
      out.height = Math.max(1, Math.round(ch * s));
      const ctx = out.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.imageSmoothingQuality = "high";
      ctx.scale(out.width / cw, out.height / ch);
      ctx.translate(-cx, -cy);
      ctx.translate(rw / 2, rh / 2);
      ctx.rotate((rot * Math.PI) / 2);
      if (espelho) ctx.scale(-1, 1);
      ctx.drawImage(fonte, -w / 2, -h / 2);
      ajustarPixels(ctx, out.width, out.height, ajustes);
      return out;
    },
    [rot, espelho, proporcao, ajustes],
  );

  // Prévia leve (900 px) redesenhada a cada mudança, no máximo uma vez por quadro.
  useEffect(() => {
    if (modo !== "editar" || !img || !tela.current) return;
    const q = requestAnimationFrame(() => {
      const prev = desenhar(img, 900);
      const alvo = tela.current;
      if (!prev || !alvo) return;
      alvo.width = prev.width;
      alvo.height = prev.height;
      alvo.getContext("2d")?.drawImage(prev, 0, 0);
    });
    return () => cancelAnimationFrame(q);
  }, [modo, img, desenhar]);

  const mudou = rot % 4 !== 0 || espelho || prop !== "orig" || Object.values(ajustes).some((v) => v !== 0);

  async function salvarCopia() {
    if (!img || !item || ocupado) return;
    setOcupado(true);
    setMsg(null);
    try {
      const full = desenhar(img, 1600);
      if (!full) throw new Error("canvas");
      const blob: Blob = await new Promise((res, rej) =>
        full.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/webp", 0.86),
      );
      const nova = await enviarImagem(supabase, businessId, new File([blob], "edicao.webp", { type: blob.type }), item.category_id, blob);
      const novo: ItemGaleria = { id: nova.id, nome: nova.path, url: nova.url, category_id: nova.category_id, auto_tipo: item.auto_tipo, tamanho: blob.size };
      onNova(novo);
      setId(novo.id);
      setModo("ver");
      zerar();
      setMsg("Cópia salva na galeria. A original continua lá.");
    } catch {
      setMsg("Não consegui salvar a edição. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function pedirExclusao() {
    if (!item) return;
    setModo("excluir");
    setUsos(null);
    setMsg(null);
    try {
      setUsos(await usosDaImagem(supabase, businessId, item.nome));
    } catch {
      setUsos([]);
    }
  }

  async function excluir() {
    if (!item || ocupado) return;
    setOcupado(true);
    setMsg(null);
    try {
      const { error: e1 } = await supabase.storage.from(BUCKET).remove([item.nome]);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("image_library").delete().eq("id", item.id);
      if (e2) throw e2;
      const proximo = itens[indice + 1] ?? itens[indice - 1] ?? null;
      onExcluida(item.id);
      setModo("ver");
      setUsos(null);
      if (proximo) setId(proximo.id);
      else onFechar();
    } catch {
      setMsg("Não consegui excluir agora. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function mudarCategoria(cat: string | null) {
    if (!item) return;
    const { error } = await supabase.from("image_library").update({ category_id: cat }).eq("id", item.id);
    if (error) {
      setMsg("Não consegui mudar a categoria.");
      return;
    }
    onCategoria(item.id, cat);
    setModo("ver");
    setMsg(null);
  }

  const tipoNome = useMemo(() => TIPOS_IMAGEM.find((t) => t.id === item?.auto_tipo)?.nome ?? null, [item?.auto_tipo]);
  const catNome = categorias.find((c) => c.id === item?.category_id)?.name ?? "Sem categoria";
  if (!item) return null;

  const botao = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-[14px] font-medium transition-transform active:scale-[0.97] disabled:opacity-50";
  const aba3 = (a: Aba) => `min-h-[36px] flex-1 rounded-full px-3 text-[13px] font-medium ${aba === a ? "bg-white text-black" : "text-white/70"}`;
  const chipE = (ativo: boolean) => `shrink-0 min-h-[36px] rounded-full px-3.5 text-[13px] font-medium ${ativo ? "bg-white text-black" : "bg-white/12 text-white/80"}`;

  return createPortal(
    <div className="gv-entra fixed inset-0 z-[150] flex flex-col bg-neutral-950 text-white" role="dialog" aria-modal="true" aria-label="Foto da galeria">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onFechar} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12" aria-label="Fechar foto">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="min-w-0 text-center">
          <p className="text-[13px] font-medium">{indice + 1} de {itens.length}</p>
          <p className="truncate text-[11.5px] text-white/55">{[catNome, tipoNome, kbTexto(item.tamanho)].filter(Boolean).join(" · ")}</p>
        </div>
        <span className="h-10 w-10" />
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-3"
        onTouchStart={(e) => { toque.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (modo !== "ver" || toque.current == null) return;
          const dx = e.changedTouches[0].clientX - toque.current;
          toque.current = null;
          if (Math.abs(dx) > 60) ir(dx < 0 ? 1 : -1);
        }}
      >
        {modo === "editar" ? (
          imgErro ? (
            <p className="max-w-[260px] text-center text-[13px] text-white/70">Não consegui abrir esta foto para editar. Você ainda pode usar, mudar a categoria ou excluir.</p>
          ) : !img ? (
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-white" aria-label="Carregando" />
          ) : (
            <canvas ref={tela} className="max-h-full max-w-full rounded-xl object-contain" />
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.id} src={item.url} alt="" className="gv-foto max-h-full max-w-full rounded-xl object-contain" />
        )}
        {modo === "ver" && itens.length > 1 && (
          <>
            <button type="button" onClick={() => ir(-1)} className="absolute left-2 hidden h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur sm:flex" aria-label="Foto anterior"><Icone d={IC.esq} /></button>
            <button type="button" onClick={() => ir(1)} className="absolute right-2 hidden h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur sm:flex" aria-label="Próxima foto"><Icone d={IC.dir} /></button>
          </>
        )}
      </div>

      <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {msg && <p role="status" className="mb-2 text-center text-[12.5px] text-white/70">{msg}</p>}

        {modo === "ver" && (
          <div className="mx-auto flex max-w-lg flex-col gap-3">
            <button type="button" onClick={() => onUsar(item.url)} className={`${botao} w-full bg-white text-black`}>
              {atual === item.url ? "Esta foto já está em uso" : "Usar esta foto"}
            </button>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => { setMsg(null); setModo("editar"); }} className={`${botao} bg-white/12`}><Icone d={IC.editar} tam={18} />Editar</button>
              <button type="button" onClick={() => { setMsg(null); setModo("categoria"); }} className={`${botao} bg-white/12 px-3`}><Icone d={IC.pasta} tam={18} />Categoria</button>
              <button type="button" onClick={pedirExclusao} className={`${botao} bg-white/12 text-red-300`}><Icone d={IC.lixo} tam={18} />Excluir</button>
            </div>
          </div>
        )}

        {modo === "editar" && (
          <div className="mx-auto flex max-w-lg flex-col gap-3">
            <div className="flex gap-1 rounded-full bg-white/10 p-1" role="tablist">
              <button type="button" role="tab" aria-selected={aba === "cortar"} onClick={() => setAba("cortar")} className={aba3("cortar")}>Cortar</button>
              <button type="button" role="tab" aria-selected={aba === "ajustar"} onClick={() => setAba("ajustar")} className={aba3("ajustar")}>Ajustar</button>
              <button type="button" role="tab" aria-selected={aba === "filtros"} onClick={() => setAba("filtros")} className={aba3("filtros")}>Filtros</button>
            </div>

            <div className="min-h-[104px]">
              {aba === "cortar" && (
                <div className="flex flex-col gap-3">
                  <div className="no-scrollbar flex gap-2 overflow-x-auto py-0.5">
                    {PROPORCOES.map((p) => (
                      <button key={p.id} type="button" onClick={() => setProp(p.id)} className={chipE(prop === p.id)}>{p.nome}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setRot((r) => (r + 3) % 4)} className={`${botao} bg-white/12 px-3`}><Icone d={IC.girarE} tam={18} />Girar</button>
                    <button type="button" onClick={() => setRot((r) => (r + 1) % 4)} className={`${botao} bg-white/12 px-3`}><Icone d={IC.girarD} tam={18} />Girar</button>
                    <button type="button" onClick={() => setEspelho((v) => !v)} aria-pressed={espelho} className={`${botao} px-3 ${espelho ? "bg-white text-black" : "bg-white/12"}`}><Icone d={IC.espelhar} tam={18} />Espelhar</button>
                  </div>
                </div>
              )}
              {aba === "ajustar" && (
                <div className="grid grid-cols-1 gap-2.5">
                  {SLIDERS.map((s) => (
                    <label key={s.chave} className="flex items-center gap-3 text-[13px]">
                      <span className="w-20 shrink-0 text-white/80">{s.nome}</span>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        value={ajustes[s.chave]}
                        onChange={(e) => { setFiltro("orig"); setAjustes((a) => ({ ...a, [s.chave]: Number(e.target.value) })); }}
                        className="h-6 min-w-0 flex-1 accent-white"
                      />
                      <span className="w-8 shrink-0 text-right tabular-nums text-white/55">{ajustes[s.chave]}</span>
                    </label>
                  ))}
                </div>
              )}
              {aba === "filtros" && (
                <div className="no-scrollbar flex gap-2 overflow-x-auto py-1">
                  {FILTROS.map((f) => (
                    <button key={f.id} type="button" onClick={() => { setFiltro(f.id); setAjustes(f.a); }} className={chipE(filtro === f.id)}>{f.nome}</button>
                  ))}
                </div>
              )}
            </div>

            <p className="text-center text-[12px] text-white/50">Ao salvar, vira uma cópia nova. A original continua na galeria.</p>
            <div className="grid grid-cols-[1fr_1.4fr] gap-2">
              <button type="button" onClick={() => { zerar(); setModo("ver"); }} disabled={ocupado} className={`${botao} bg-white/12`}>Cancelar</button>
              <button type="button" onClick={salvarCopia} disabled={ocupado || !mudou || !img} className={`${botao} bg-white text-black`}>{ocupado ? "Salvando…" : "Salvar cópia"}</button>
            </div>
            {mudou && !ocupado && (
              <button type="button" onClick={zerar} className="mx-auto min-h-[36px] rounded-full px-4 text-[12.5px] text-white/60 underline-offset-2 hover:underline">Desfazer tudo</button>
            )}
          </div>
        )}

        {modo === "categoria" && (
          <div className="mx-auto flex max-w-lg flex-col gap-3">
            <p className="text-center text-[13px] text-white/70">Em qual categoria fica esta foto?</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => mudarCategoria(null)} className={chipE(item.category_id === null)}>Sem categoria</button>
              {categorias.map((c) => (
                <button key={c.id} type="button" onClick={() => mudarCategoria(c.id)} className={chipE(item.category_id === c.id)}>{c.name}</button>
              ))}
            </div>
            {categorias.length === 0 && <p className="text-center text-[12px] text-white/50">Você ainda não criou categorias. Crie em Banco de imagens.</p>}
            <button type="button" onClick={() => setModo("ver")} className={`${botao} bg-white/12`}>Voltar</button>
          </div>
        )}

        {modo === "excluir" && (
          <div className="mx-auto flex max-w-lg flex-col gap-3">
            <p className="text-center text-[14px] font-medium">Excluir esta foto?</p>
            <p className="text-center text-[12.5px] text-white/65">
              {usos === null
                ? "Verificando onde ela está em uso…"
                : usos.length > 0
                  ? `Ela está em uso em: ${usos.slice(0, 4).join(", ")}${usos.length > 4 ? ` e mais ${usos.length - 4}` : ""}. Se excluir, esses lugares ficam sem foto.`
                  : "Ela não está em uso em nenhum lugar. Não dá para desfazer."}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setModo("ver")} disabled={ocupado} className={`${botao} bg-white/12`}>Cancelar</button>
              <button type="button" onClick={excluir} disabled={ocupado || usos === null} className={`${botao} bg-red-500 text-white`}>{ocupado ? "Excluindo…" : "Excluir"}</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
