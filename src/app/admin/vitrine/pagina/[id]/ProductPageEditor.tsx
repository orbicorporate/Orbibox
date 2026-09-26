"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { galleryRatioOf, formatPrice, isVideoUrl, youtubeId, instagramReelId, type GalleryRatio } from "@/lib/showcase";
import { ImageCropModal, RATIOS, RATIO_PIXELS } from "@/components/ui/ImageCropModal";
import { PromptParaIA } from "@/components/ui/LinhaExpansivel";
import { OrbiWorking } from "@/components/orbi/OrbiWorking";

type Business = {
  id: string;
  name: string;
  slug: string;
  contact_whatsapp: string | null;
  contact_phone: string | null;
  contact_email: string | null;
};

type Item = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  price_max: number | null;
  image_url: string | null;
  gallery_urls: string[];
  gallery_ratio?: string | null;
  brand_label: string | null;
  target_url: string | null;
  layout_size: string;
  type: string;
  highlights: string[] | null;
  orbi_hook: string | null;
};

const EYEBROW_LABEL: Record<string, string> = { product: "Produtos", service: "Serviços" };
const MAX_MIDIAS = 6;

// Contorno tracejado discreto: deixa claro que dá pra tocar e editar, sem
// deixar a página com cara de formulário.
const EDITAVEL =
  "rounded-xl border border-dashed border-on-background/15 bg-transparent outline-none transition-colors hover:border-on-background/30 focus:border-on-background/40 focus:bg-white";

const noop = () => () => {};

type Campos = Partial<{
  title: string;
  description: string | null;
  brand_label: string | null;
  highlights: string[] | null;
  orbi_hook: string | null;
  gallery_urls: string[];
  gallery_ratio: string | null;
}>;

function novoCaminho(businessId: string, ext: string) {
  return `${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

function crescer(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function promptFoto(titulo: string, descricao: string, ratio: GalleryRatio) {
  const nome = titulo.trim() || "meu produto";
  const desc = descricao.trim() ? ` Sobre ele: ${descricao.trim().slice(0, 220)}` : "";
  return `Criar uma foto no formato ${ratio} (${RATIO_PIXELS[ratio]}) para a página de "${nome}".${desc}

Estilo fotográfico realista, luz natural suave, composição limpa e sofisticada. Mostre um ângulo, detalhe ou uso diferente do produto. Sem textos, logotipos ou marcas d'água na imagem.

Use como referência de estilo e de produto as fotos que vou anexar.`;
}

export function ProductPageEditor({ business, item }: { business: Business; item: Item }) {
  const router = useRouter();
  const supabase = createClient();
  const montado = useSyncExternalStore(noop, () => true, () => false);

  const [titulo, setTitulo] = useState(item.title);
  const [descricao, setDescricao] = useState(item.description ?? "");
  const [rotulo, setRotulo] = useState(item.brand_label ?? "");
  const [diferenciais, setDiferenciais] = useState<string[]>(item.highlights ?? []);
  const [pergunta, setPergunta] = useState(item.orbi_hook ?? "");
  const [midias, setMidias] = useState<string[]>(item.gallery_urls ?? []);
  const [formato, setFormato] = useState<GalleryRatio>(galleryRatioOf(item.gallery_ratio, item.layout_size));
  const [estado, setEstado] = useState<"salvo" | "salvando" | "erro">("salvo");

  const [ativo, setAtivo] = useState(0);
  const [painel, setPainel] = useState<"video" | "ia" | null>(null);
  const [linkVideo, setLinkVideo] = useState("");
  const [erroVideo, setErroVideo] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [sugerindo, setSugerindo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const trilhoRef = useRef<HTMLDivElement>(null);

  async function salvar(campos: Campos) {
    setEstado("salvando");
    const { error } = await supabase.from("content_items").update(campos).eq("id", item.id);
    setEstado(error ? "erro" : "salvo");
  }

  function salvarDiferenciais(lista: string[]) {
    const limpa = lista.map((d) => d.trim()).filter(Boolean);
    salvar({ highlights: limpa.length ? limpa : null });
  }

  function salvarMidias(lista: string[]) {
    setMidias(lista);
    salvar({ gallery_urls: lista });
  }

  function escolherFoto(f: File) {
    setErroFoto(null);
    if (!f.type.startsWith("image/")) return setErroFoto("Escolha um arquivo de imagem.");
    if (f.size > 20 * 1024 * 1024) return setErroFoto("Imagem muito grande, o limite é 20 MB.");
    setArquivo(f);
  }

  async function enviarFoto(blob: Blob) {
    setArquivo(null);
    setEnviando(true);
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const path = novoCaminho(business.id, ext);
    const { error } = await supabase.storage.from("box-images").upload(path, blob, { cacheControl: "31536000", upsert: false, contentType: blob.type || "image/jpeg" });
    setEnviando(false);
    if (error) return setErroFoto("Não consegui enviar a foto. Tente de novo.");
    const url = supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl;
    const nova = [...midias, url];
    salvarMidias(nova);
    irPara(nova.length - 1);
  }

  function adicionarVideo() {
    const limpo = linkVideo.trim();
    if (!limpo) return;
    if (!isVideoUrl(limpo)) return setErroVideo(true);
    if (!midias.includes(limpo)) salvarMidias([...midias, limpo]);
    setLinkVideo("");
    setPainel(null);
  }

  function mover(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= midias.length) return;
    const nova = [...midias];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    salvarMidias(nova);
    irPara(j);
  }

  function irPara(i: number) {
    requestAnimationFrame(() => {
      const el = trilhoRef.current;
      if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    });
  }

  async function sugerir() {
    setSugerindo(true);
    try {
      const res = await fetch("/api/suggest-item-extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentItemId: item.id }),
      });
      if (res.ok) {
        const { highlights, orbiHook } = await res.json();
        const lista: string[] = Array.isArray(highlights) ? highlights : [];
        setDiferenciais(lista);
        setPergunta(orbiHook ?? "");
        await salvar({ highlights: lista.length ? lista : null, orbi_hook: orbiHook || null });
      }
    } finally {
      setSugerindo(false);
    }
  }

  function fechar() {
    router.push("/admin/vitrine");
    router.refresh();
  }

  const temFoto = midias.some((u) => !isVideoUrl(u));
  const aspect = RATIOS[formato].value;
  // Sem carrossel próprio, a página mostra a capa do card, então o editor também.
  const slides = midias.length > 0 ? midias : item.image_url ? [item.image_url] : [];
  const soCapa = midias.length === 0 && !!item.image_url;
  const preco = formatPrice(item);

  if (!montado) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-background-main">
      {/* Barra do editor */}
      <div className="sticky top-0 z-10 border-b border-divider bg-background-main/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[440px] items-center gap-2 px-4 py-3">
          <button onClick={fechar} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface-soft px-3.5 text-[13px] font-medium">
            <span aria-hidden>✕</span> Fechar
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-[12.5px] text-text-tertiary">
            {estado === "salvando" ? "Salvando…" : estado === "erro" ? "Não salvou, tente de novo" : "✓ Tudo salvo"}
          </p>
          <Link href={`/${business.slug}/p/${item.id}`} target="_blank" className="flex h-9 shrink-0 items-center rounded-full bg-on-background px-3.5 text-[13px] font-medium text-white">
            Ver ↗
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-[440px] pb-16">
        <p className="px-6 pt-4 text-center text-[12.5px] text-text-tertiary">Toque em qualquer parte tracejada pra editar.</p>

        {/* Fotos e vídeos */}
        <div className="px-4 pt-3">
          <div
            ref={trilhoRef}
            className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto no-scrollbar"
            onScroll={(e) => setAtivo(Math.round(e.currentTarget.scrollLeft / (e.currentTarget.clientWidth || 1)))}
          >
            {slides.map((src, i) => {
              const yt = youtubeId(src);
              const ig = instagramReelId(src);
              return (
                <div
                  key={`${src}-${i}`}
                  className="relative w-full shrink-0 snap-center overflow-hidden rounded-[22px] bg-surface-soft"
                  style={{ aspectRatio: yt ? 16 / 9 : ig ? 9 / 16 : aspect }}
                >
                  {yt ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`https://img.youtube.com/vi/${yt}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" />
                  ) : ig ? (
                    <span className="flex h-full w-full items-center justify-center bg-on-background text-[13px] text-white/70">Reels</span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  )}
                  {(yt || ig) && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[16px]">▶</span>
                    </span>
                  )}
                  {soCapa ? (
                    <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1.5 text-[11.5px] font-medium text-white backdrop-blur">
                      Capa do card · some quando você adicionar fotos
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => salvarMidias(midias.filter((_, k) => k !== i))}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-[15px] text-white backdrop-blur"
                        aria-label="Remover"
                      >
                        ✕
                      </button>
                      {midias.length > 1 && (
                        <span className="absolute inset-x-3 bottom-3 flex justify-between">
                          <button onClick={() => mover(i, -1)} className={`flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur ${i === 0 ? "invisible" : ""}`} aria-label="Mover pra esquerda">‹</button>
                          <button onClick={() => mover(i, 1)} className={`flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur ${i === midias.length - 1 ? "invisible" : ""}`} aria-label="Mover pra direita">›</button>
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* Último slide: adicionar */}
            {midias.length < MAX_MIDIAS && (
              <div
                className={`flex shrink-0 snap-center flex-col items-center justify-center gap-2.5 rounded-[22px] border-2 border-dashed border-on-background/15 bg-surface-soft/60 p-5 ${slides.length ? "w-[70%]" : "w-full"}`}
                style={{ aspectRatio: slides.length ? undefined : aspect, alignSelf: "stretch", minHeight: slides.length ? undefined : 0 }}
              >
                {enviando ? (
                  <span className="text-[13px] text-text-tertiary">Enviando…</span>
                ) : (
                  <>
                    <button onClick={() => inputRef.current?.click()} className="flex w-full max-w-[220px] items-center justify-center gap-2 rounded-full bg-on-background py-3 text-[14px] font-medium text-white">
                      + Foto
                    </button>
                    <button onClick={() => setPainel(painel === "video" ? null : "video")} className="flex w-full max-w-[220px] items-center justify-center gap-2 rounded-full border border-divider bg-surface-white py-3 text-[14px] font-medium">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5.5v13l11-6.5z" /></svg>
                      Vídeo
                    </button>
                    <button onClick={() => setPainel(painel === "ia" ? null : "ia")} className="flex w-full max-w-[220px] items-center justify-center gap-2 rounded-full orbi-gradient py-3 text-[14px] font-medium text-on-background">
                      ✦ Criar com IA
                    </button>
                    <span className="text-[11.5px] text-text-tertiary">{RATIO_PIXELS[formato]}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {slides.length > 1 &&
                slides.map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === ativo ? "bg-on-background" : "bg-on-background/25"}`} />)}
            </div>
            {/* Formato das fotos: só dá pra trocar antes de ter foto, pra não misturar recortes. */}
            <div className="inline-flex rounded-full bg-surface-soft p-1">
              {(["quadrado", "paisagem"] as const).map((r) => (
                <button
                  key={r}
                  disabled={temFoto && formato !== r}
                  onClick={() => {
                    if (formato === r) return;
                    setFormato(r);
                    salvar({ gallery_ratio: r });
                  }}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium ${formato === r ? "bg-surface-white text-on-background shadow-[0_1px_4px_rgba(17,19,24,0.1)]" : "text-text-tertiary disabled:opacity-40"}`}
                >
                  {r === "quadrado" ? "Quadrado" : "Paisagem"}
                </button>
              ))}
            </div>
          </div>

          {erroFoto && <p className="mt-2 text-[12.5px] text-red-600">{erroFoto}</p>}

          {painel === "video" && (
            <div className="mt-3 rounded-2xl border border-divider bg-surface-white p-3.5">
              <p className="text-[13px] font-medium">Link do YouTube ou Reels</p>
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  value={linkVideo}
                  onChange={(e) => { setLinkVideo(e.target.value); setErroVideo(false); }}
                  onKeyDown={(e) => e.key === "Enter" && adicionarVideo()}
                  placeholder="Cole o link aqui"
                  className="min-w-0 flex-1 rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
                />
                <button onClick={adicionarVideo} className="shrink-0 rounded-full bg-button-primary px-4 text-[13px] font-medium text-white">Adicionar</button>
              </div>
              {erroVideo && <p className="mt-1.5 text-[12.5px] text-red-600">Esse link não parece ser do YouTube nem do Instagram.</p>}
            </div>
          )}

          {painel === "ia" && (
            <div className="mt-3 rounded-2xl border border-divider bg-surface-white p-3.5">
              <PromptParaIA destino="no + Foto" texto={promptFoto(titulo, descricao, formato)} />
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) escolherFoto(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className="px-5 pt-6">
          <input
            value={rotulo}
            onChange={(e) => setRotulo(e.target.value)}
            onBlur={() => salvar({ brand_label: rotulo.trim() || null })}
            placeholder={EYEBROW_LABEL[item.type] ?? "Categoria (opcional)"}
            maxLength={80}
            className={`${EDITAVEL} -mx-1 w-[calc(100%+8px)] px-2 py-1 text-[13px] font-medium uppercase tracking-wide text-text-tertiary placeholder:text-text-tertiary/60`}
          />
          <textarea
            value={titulo}
            ref={crescer}
            rows={1}
            onChange={(e) => { setTitulo(e.target.value); crescer(e.target); }}
            onBlur={() => titulo.trim() && salvar({ title: titulo.trim() })}
            maxLength={200}
            className={`${EDITAVEL} -mx-1 mt-1.5 w-[calc(100%+8px)] resize-none px-2 py-1 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight`}
          />
          {preco && (
            <p className="mt-2 px-1 font-[family-name:var(--font-manrope)] text-[20px] font-medium">
              {preco}
              <span className="ml-2 align-middle text-[11.5px] font-normal text-text-tertiary">preço se edita no card</span>
            </p>
          )}

          <textarea
            value={descricao}
            ref={crescer}
            rows={3}
            onChange={(e) => { setDescricao(e.target.value); crescer(e.target); }}
            onBlur={() => salvar({ description: descricao.trim() || null })}
            placeholder="Conte o que é, pra quem é e o que inclui."
            maxLength={1500}
            className={`${EDITAVEL} -mx-1 mt-4 w-[calc(100%+8px)] resize-none px-2 py-1.5 text-[15px] leading-relaxed text-text-secondary`}
          />

          {/* Diferenciais */}
          <div className="mt-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Diferenciais</p>
              <button
                onClick={sugerir}
                disabled={sugerindo}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${sugerindo ? "bg-surface-soft text-text-secondary" : "orbi-gradient text-on-background"}`}
              >
                {sugerindo ? <OrbiWorking label="Pensando…" variant="inline" /> : "✦ Orbi sugere"}
              </button>
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {diferenciais.map((d, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="orbi-gradient mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]">✓</span>
                  <textarea
                    value={d}
                    ref={crescer}
                    rows={1}
                    autoFocus={!d}
                    onChange={(e) => {
                      crescer(e.target);
                      setDiferenciais((l) => l.map((x, k) => (k === i ? e.target.value : x)));
                    }}
                    onBlur={() => salvarDiferenciais(diferenciais)}
                    placeholder="ex: 18 anos de experiência"
                    maxLength={90}
                    className={`${EDITAVEL} min-w-0 flex-1 resize-none px-2 py-1.5 text-[14.5px] leading-snug`}
                  />
                  <button
                    onClick={() => {
                      const nova = diferenciais.filter((_, k) => k !== i);
                      setDiferenciais(nova);
                      salvarDiferenciais(nova);
                    }}
                    className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] text-text-tertiary hover:bg-surface-soft"
                    aria-label="Remover diferencial"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {diferenciais.length < 6 && (
                <button
                  onClick={() => setDiferenciais((l) => [...l, ""])}
                  className="mt-1 flex items-center gap-2.5 rounded-xl border border-dashed border-on-background/15 px-2 py-2.5 text-left text-[14px] text-text-tertiary hover:border-on-background/30"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-on-background text-[12px] leading-none text-white">+</span>
                  Adicionar diferencial
                </button>
              )}
            </div>
          </div>

          {/* Pergunta pronta pra Orbi */}
          <div className="mt-5 rounded-2xl border border-dashed border-on-background/15 bg-surface-soft px-4 py-3.5">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-text-tertiary">
              <span className="h-1.5 w-1.5 rounded-full bg-orbi-gradient-start" />
              Pergunte à Orbi, IA da {business.name}
            </span>
            <textarea
              value={pergunta}
              ref={crescer}
              rows={1}
              onChange={(e) => { setPergunta(e.target.value); crescer(e.target); }}
              onBlur={() => salvar({ orbi_hook: pergunta.trim() || null })}
              placeholder="Uma pergunta que puxa conversa (opcional)"
              maxLength={100}
              className="mt-0.5 w-full resize-none rounded-lg bg-transparent px-0 py-0.5 text-[14px] font-medium outline-none placeholder:font-normal placeholder:text-text-tertiary"
            />
          </div>

          {/* Botões da página: automáticos, só pra ver como fica */}
          <div className="pointer-events-none mt-7 flex flex-col gap-2.5 opacity-50" aria-hidden>
            <span className="rounded-full orbi-gradient py-3.5 text-center text-[14px] font-medium text-on-background">✦ Falar com a Orbi</span>
            {(business.contact_whatsapp || business.contact_phone) && (
              <div className="flex gap-2.5">
                {business.contact_whatsapp && <span className="flex-1 rounded-full border border-divider py-3 text-center text-[13.5px] font-medium">WhatsApp</span>}
                {business.contact_phone && <span className="flex-1 rounded-full border border-divider py-3 text-center text-[13.5px] font-medium">Ligar</span>}
              </div>
            )}
          </div>
          <p className="mt-2 text-center text-[11.5px] text-text-tertiary">Esses botões aparecem sozinhos, com os contatos do negócio.</p>
        </div>
      </main>

      {arquivo && (
        <ImageCropModal
          file={arquivo}
          lockedRatio={formato}
          lockedReason="Todas as fotos da página seguem o mesmo formato."
          onCancel={() => setArquivo(null)}
          onConfirm={(blob) => enviarFoto(blob)}
        />
      )}
    </div>,
    document.body,
  );
}
