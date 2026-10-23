"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import type { Json } from "@/lib/supabase/types";
import { lerLista, type Lista } from "@/lib/lista";
import { ListaItensEditor } from "./ListaItensEditor";
import { AnexoEditor } from "./AnexoEditor";
import { lerAnexo, type Anexo } from "@/lib/anexo";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { galleryRatioOf, formatPrice, isVideoUrl, youtubeId, instagramReelId, type GalleryRatio } from "@/lib/showcase";
import { ImageCropModal, RATIOS, RATIO_PIXELS } from "@/components/ui/ImageCropModal";
import { PromptParaIA } from "@/components/ui/LinhaExpansivel";
import { FotoProntaPicker } from "@/components/ui/FotoProntaPicker";
import { MinhaGaleriaPicker } from "@/components/ui/MinhaGaleriaPicker";
import { GeradorImagemSheet } from "@/components/ui/GeradorImagemSheet";
import { AjusteFoto } from "@/components/ui/AjusteFoto";
import { PALETTE_GROUPS } from "@/lib/showcase";
import { OrbiWorking } from "@/components/orbi/OrbiWorking";
import { useArrastarOrdem } from "@/hooks/useArrastarOrdem";

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
  lista?: unknown;
  images?: unknown;
  status?: string;
  footer_color?: string | null;
  title_placement?: string | null;
};

const EYEBROW_LABEL: Record<string, string> = { product: "Produtos", service: "Serviços" };
const MAX_MIDIAS = 6;

const noop = () => () => {};

type Campos = Partial<{
  footer_color: string | null;
  title: string;
  description: string | null;
  brand_label: string | null;
  highlights: string[] | null;
  orbi_hook: string | null;
  gallery_urls: string[];
  gallery_ratio: string | null;
  lista: Json | null;
  images: Json;
}>;

function novoCaminho(businessId: string, ext: string) {
  return `${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

function crescer(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

type MarcaPrompt = { cores: string; tom: string };

function promptFoto(titulo: string, descricao: string, ratio: GalleryRatio, negocio: string, marca: MarcaPrompt | null) {
  const nome = titulo.trim() || "meu produto";
  const linhas = [
    `Crie uma foto no formato ${ratio} (${RATIO_PIXELS[ratio]}) para a página de "${nome}", da marca ${negocio}.`,
    descricao.trim() ? `Sobre o item: ${descricao.trim().slice(0, 220)}` : "",
    "",
    "Use a foto que estou anexando como base (o produto real) e deixe a imagem com a cara da marca:",
    marca?.cores ? `- Cores da marca: ${marca.cores}` : "",
    marca?.tom ? `- Tom da marca: ${marca.tom.slice(0, 160)}` : "",
    "",
    "Estilo fotográfico realista, luz natural suave, composição limpa. Mostre um ângulo, detalhe ou uso diferente do produto. Sem textos, logotipos ou marcas d'água.",
  ];
  return linhas.filter((l, i, arr) => l !== "" || (i > 0 && arr[i - 1] !== "")).join("\n").trim();
}

export function ProductPageEditor({ business, item }: { business: Business; item: Item }) {
  const router = useRouter();
  const supabase = createClient();
  const montado = useSyncExternalStore(noop, () => true, () => false);

  const [titulo, setTitulo] = useState(item.title);
  const [faixa, setFaixa] = useState<string | null>(item.footer_color ?? null);
  const [descricao, setDescricao] = useState(item.description ?? "");
  const [rotulo, setRotulo] = useState(item.brand_label ?? "");
  const [lista, setLista] = useState<Lista | null>(() => lerLista(item.lista));
  const [anexo, setAnexo] = useState<Anexo | null>(() => lerAnexo(item.images));
  const [pergunta, setPergunta] = useState(item.orbi_hook ?? "");
  const [midias, setMidias] = useState<string[]>(item.gallery_urls ?? []);
  const arrastoFotos = useArrastarOrdem(midias, true, (nova) => {
    const eraAtiva = midias[ativo];
    salvarMidias(nova);
    if (eraAtiva) irPara(nova.indexOf(eraAtiva));
  });
  const [formato, setFormato] = useState<GalleryRatio>(galleryRatioOf(item.gallery_ratio, item.layout_size));
  const [estado, setEstado] = useState<"salvo" | "salvando" | "erro">("salvo");
  // Página nova nasce como rascunho: ninguém vê, nem na Home. Aqui o dono publica com um toque.
  const [publicada, setPublicada] = useState(item.status === "published");
  const [publicando, setPublicando] = useState(false);
  async function publicar(valor: boolean) {
    setPublicando(true);
    const { error } = await supabase.from("content_items").update({ status: valor ? "published" : "draft" }).eq("id", item.id);
    if (!error) setPublicada(valor);
    setPublicando(false);
    if (!error) router.refresh();
  }
  // Capa do card (a foto que aparece na Home e no catálogo). Sem capa própria, vale a primeira foto da galeria.
  const [capa, setCapa] = useState<string | null>(item.image_url);
  async function definirCapa(src: string | null) {
    const anterior = capa;
    setCapa(src);
    setEstado("salvando");
    const { error } = await supabase.from("content_items").update({ image_url: src }).eq("id", item.id);
    if (error) setCapa(anterior);
    setEstado(error ? "erro" : "salvo");
  }

  const [ativo, setAtivo] = useState(0);
  const [painel, setPainel] = useState<"video" | "ia" | null>(null);
  const [linkVideo, setLinkVideo] = useState("");
  const [erroVideo, setErroVideo] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [daGaleria, setDaGaleria] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  const [fotosProntas, setFotosProntas] = useState(false);
  const [marca, setMarca] = useState<MarcaPrompt | null>(null);
  // Orbi cria ou edita foto dentro do app. "substituir" guarda qual foto a edição troca.
  const [gerador, setGerador] = useState<{ edicao: boolean; url?: string } | null>(null);
  const [ajuste, setAjuste] = useState<string | null>(null);
  const [substituir, setSubstituir] = useState<string | null>(null);

  // Cores e tom da marca pro prompt, buscados só quando a pessoa abre ele.
  async function abrirIA() {
    const abrir = painel !== "ia";
    setPainel(abrir ? "ia" : null);
    if (abrir && !marca) {
      const { data } = await supabase.from("businesses").select("brand_colors, brand_voice_summary").eq("id", business.id).maybeSingle();
      const cores = Array.isArray(data?.brand_colors)
        ? (data!.brand_colors as { hex?: string }[]).map((c) => c?.hex).filter(Boolean).slice(0, 5).join(", ")
        : "";
      setMarca({ cores, tom: (data?.brand_voice_summary as string | null) ?? "" });
    }
  }
  const inputRef = useRef<HTMLInputElement>(null);
  const trilhoRef = useRef<HTMLDivElement>(null);

  async function salvar(campos: Campos) {
    setEstado("salvando");
    const { error } = await supabase.from("content_items").update(campos).eq("id", item.id);
    setEstado(error ? "erro" : "salvo");
  }

  function salvarLista(l: Lista | null) {
    setLista(l);
    salvar({ lista: l as unknown as Json });
  }

  function salvarAnexo(a: Anexo | null) {
    setAnexo(a);
    salvar({ images: (a ? { anexo: a } : []) as unknown as Json });
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
    // Edição de uma foto que já existe: a nova entra no lugar da antiga.
    if (substituir) {
      const antiga = substituir;
      setSubstituir(null);
      if (midias.includes(antiga)) {
        salvarMidias(midias.map((u) => (u === antiga ? url : u)));
        if (capa === antiga) void definirCapa(url);
      } else if (capa === antiga) {
        void definirCapa(url);
      } else {
        const nova = [...midias, url];
        salvarMidias(nova);
        irPara(nova.length - 1);
      }
      return;
    }
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

  function paraPrimeira(i: number) {
    if (i <= 0) return;
    const nova = [midias[i], ...midias.filter((_, k) => k !== i)];
    salvarMidias(nova);
    irPara(0);
  }

  function irPara(i: number) {
    requestAnimationFrame(() => {
      const el = trilhoRef.current;
      if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    });
  }

  // Texto "Fale mais" escrito pela Orbi (até 6 linhas). Guarda o anterior para desfazer.
  const [gerandoTexto, setGerandoTexto] = useState(false);
  const [erroTexto, setErroTexto] = useState<string | null>(null);
  const [descAnterior, setDescAnterior] = useState<string | null>(null);
  async function gerarTexto() {
    setGerandoTexto(true);
    setErroTexto(null);
    try {
      const res = await fetch("/api/gerar-descricao-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentItemId: item.id, atual: descricao }),
      });
      const json = (await res.json()) as { texto?: string; error?: string };
      if (!res.ok || !json.texto) return setErroTexto(json.error ?? "A Orbi não conseguiu escrever agora. Tente de novo.");
      setDescAnterior(descricao);
      setDescricao(json.texto);
      await salvar({ description: json.texto });
    } catch {
      setErroTexto("A Orbi não conseguiu escrever agora. Tente de novo.");
    } finally {
      setGerandoTexto(false);
    }
  }
  function desfazerTexto() {
    if (descAnterior === null) return;
    setDescricao(descAnterior);
    void salvar({ description: descAnterior.trim() || null });
    setDescAnterior(null);
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
        const { orbiHook } = await res.json();
        setPergunta(orbiHook ?? "");
        await salvar({ orbi_hook: orbiHook || null });
      }
    } finally {
      setSugerindo(false);
    }
  }

  function fechar() {
    router.push("/admin/vitrine");
    router.refresh();
  }

  const aspect = RATIOS[formato].value;
  // Sem carrossel próprio, a página mostra a capa do card, então o editor também.
  const slides = midias.length > 0 ? midias : capa ? [capa] : [];
  const soCapa = midias.length === 0 && !!capa;
  const capaAtual = capa || midias.find((u) => !isVideoUrl(u) && !youtubeId(u) && !instagramReelId(u)) || null;
  const alvoBruto = midias.length > 0 ? midias[Math.min(ativo, midias.length - 1)] : capaAtual;
  const alvoEdicao = alvoBruto && !isVideoUrl(alvoBruto) && !youtubeId(alvoBruto) && !instagramReelId(alvoBruto) ? alvoBruto : null;
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
        <div className={`mx-4 mt-4 flex items-center gap-3 rounded-[22px] border p-3.5 ${publicada ? "border-divider bg-surface-white" : "border-[#F2C078] bg-[#FFF6E8]"}`}>
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${publicada ? "bg-[#1DB8A4]" : "bg-[#E8890C]"}`} aria-hidden />
          <p className="min-w-0 flex-1 text-[13px] leading-snug">
            {publicada ? <><span className="font-medium">Publicada.</span> <span className="text-text-secondary">Já aparece na sua página.</span></> : <><span className="font-medium">Rascunho.</span> <span className="text-text-secondary">Ninguém vê esta página, nem na Home, até você publicar.</span></>}
          </p>
          <button type="button" onClick={() => void publicar(!publicada)} disabled={publicando} className={`min-h-[40px] shrink-0 rounded-full px-4 text-[13px] font-semibold disabled:opacity-50 ${publicada ? "bg-surface-soft text-text-secondary" : "bg-on-background text-white"}`}>
            {publicando ? "…" : publicada ? "Tirar do ar" : "Publicar"}
          </button>
        </div>
        <p className="px-6 pt-3 text-center text-[12.5px] text-text-tertiary">Toque em qualquer parte tracejada pra editar.</p>

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
                      Capa do card · adicione fotos abaixo
                    </span>
                  ) : (
                    <>
                      {!yt && !ig && (
                        src === capaAtual ? (
                          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1.5 text-[11.5px] font-medium text-white backdrop-blur">
                            {capa ? "Foto do card" : "Foto do card (1ª foto)"}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => definirCapa(src)}
                            className="absolute left-3 top-3 min-h-[44px] rounded-full bg-white/90 px-3.5 text-[12px] font-medium text-on-background shadow-sm backdrop-blur active:scale-95"
                          >
                            Usar como foto do card
                          </button>
                        )
                      )}
                      <button
                        onClick={() => salvarMidias(midias.filter((_, k) => k !== i))}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-[15px] text-white backdrop-blur"
                        aria-label="Remover"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              );
            })}

            {/* Sem nenhuma foto: um espaço vazio no formato certo. */}
            {slides.length === 0 && (
              <div
                className="flex w-full shrink-0 flex-col items-center justify-center gap-1 rounded-[22px] border-2 border-dashed border-on-background/15 bg-surface-soft/60 p-5 text-center"
                style={{ aspectRatio: aspect }}
              >
                <span className="text-[14px] font-medium text-text-secondary">{enviando ? "Enviando…" : "Suas fotos aparecem aqui"}</span>
                <span className="text-[11.5px] text-text-tertiary">{RATIO_PIXELS[formato]}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {slides.length > 1 &&
                slides.map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === ativo ? "bg-on-background" : "bg-on-background/25"}`} />)}
            </div>
            {/* Formato das fotos: troca a qualquer momento. As fotos já enviadas
                se ajustam ao novo formato (centralizadas) e as próximas já
                saem recortadas nele. */}
            <div className="inline-flex rounded-full bg-surface-soft p-1">
              {(["quadrado", "paisagem"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    if (formato === r) return;
                    setFormato(r);
                    salvar({ gallery_ratio: r });
                  }}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium ${formato === r ? "bg-surface-white text-on-background shadow-[0_1px_4px_rgba(17,19,24,0.1)]" : "text-text-tertiary"}`}
                >
                  {r === "quadrado" ? "Quadrado" : "Paisagem"}
                </button>
              ))}
            </div>
          </div>

          {/* Ordem das fotos: miniaturas numeradas; toque numa pra escolher e
              use os botões pra mudar a posição. A 1ª é a que abre a página. */}
          {midias.length > 1 && (
            <div className="mt-5">
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
                {arrastoFotos.ordem.map((src) => {
                  const i = midias.indexOf(src);
                  const yt = youtubeId(src);
                  return (
                    <button
                      key={src}
                      ref={arrastoFotos.ref(src)}
                      {...arrastoFotos.props(src)}
                      onClick={() => irPara(i)}
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-transform ${arrastoFotos.pegado === src ? "scale-110 shadow-lg" : ""} ${i === ativo ? "border-on-background" : "border-transparent"}`}
                    >
                      {instagramReelId(src) && !yt ? (
                        <span className="flex h-full w-full items-center justify-center bg-on-background text-[10px] text-white/70">Reels</span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={yt ? `https://img.youtube.com/vi/${yt}/mqdefault.jpg` : src} alt="" className="h-full w-full object-cover" />
                      )}
                      <span className="absolute left-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-black/65 px-1 text-[10px] font-semibold text-white">{i + 1}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[12px] text-text-tertiary">Segure e arraste para ordenar. A 1ª aparece primeiro.</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-1 text-[13px] text-text-secondary">
                <button onClick={() => mover(ativo, -1)} disabled={ativo <= 0} className="min-h-[40px] px-2 disabled:opacity-35">‹ Antes</button>
                <button onClick={() => mover(ativo, 1)} disabled={ativo >= midias.length - 1} className="min-h-[40px] px-2 disabled:opacity-35">Depois ›</button>
                <button onClick={() => paraPrimeira(ativo)} disabled={ativo <= 0} className="min-h-[40px] px-2 text-on-background underline underline-offset-4 disabled:opacity-35">Tornar 1ª</button>
                {alvoEdicao && (
                  <>
                    <span aria-hidden className="mx-1 h-4 w-px bg-divider" />
                    <button type="button" onClick={() => setGerador({ edicao: true, url: alvoEdicao })} className="min-h-[40px] px-2">✦ Editar com a Orbi</button>
                    <button type="button" onClick={() => setAjuste(alvoEdicao)} className="min-h-[40px] px-2">Ajustar luz</button>
                  </>
                )}
              </div>
            </div>
          )}

          {alvoEdicao && midias.length <= 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-1 text-[13px] text-text-secondary">
              <button type="button" onClick={() => setGerador({ edicao: true, url: alvoEdicao })} className="min-h-[40px] px-2">✦ Editar com a Orbi</button>
              <button type="button" onClick={() => setAjuste(alvoEdicao)} className="min-h-[40px] px-2">Ajustar luz</button>
            </div>
          )}

          {/* Adicionar fotos: sempre à vista, logo abaixo do carrossel. */}
          {midias.length < MAX_MIDIAS && (
            <div className="mt-4">
              <p className="mb-2 text-[12px] uppercase tracking-[0.14em] text-text-tertiary">Adicionar</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setFotosProntas(true)} className="orbi-gradient rounded-full p-[1.5px] transition-transform active:scale-[0.98]">
                  <span className="flex min-h-[37px] items-center gap-1.5 rounded-full bg-surface-white px-4 text-[13px] text-on-background">✦ Foto pronta</span>
                </button>
                <button type="button" onClick={() => setDaGaleria(true)} className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-surface-soft px-4 text-[13px] text-on-background disabled:opacity-50">Da galeria</button>
                <button type="button" onClick={() => inputRef.current?.click()} disabled={enviando} className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-surface-soft px-4 text-[13px] text-on-background disabled:opacity-50">{enviando ? "Enviando…" : "Enviar foto"}</button>
                <button type="button" onClick={() => setPainel(painel === "video" ? null : "video")} className={`flex min-h-[40px] items-center gap-1.5 rounded-full bg-surface-soft px-4 text-[13px] text-on-background disabled:opacity-50${painel === "video" ? " ring-1 ring-on-background" : ""}`}>Vídeo</button>
                <button type="button" onClick={() => setGerador({ edicao: false })} className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-surface-soft px-4 text-[13px] text-on-background disabled:opacity-50">Criar com IA</button>
              </div>
            </div>
          )}

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
              <PromptParaIA destino="em Enviar foto" texto={promptFoto(titulo, descricao, formato, business.name, marca)} />
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
          <p className="text-[13px] font-semibold text-text-secondary">Título</p>
          <textarea
            value={titulo}
            ref={crescer}
            rows={1}
            onChange={(e) => { setTitulo(e.target.value); crescer(e.target); }}
            onBlur={() => titulo.trim() && salvar({ title: titulo.trim() })}
            maxLength={200}
            className="mt-1.5 w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 font-[family-name:var(--font-manrope)] text-[20px] font-medium leading-tight outline-none focus:border-on-background"
          />
          {preco && (
            <p className="mt-2 px-1 font-[family-name:var(--font-manrope)] text-[18px] font-medium">
              {preco}
              <span className="ml-2 align-middle text-[11.5px] font-normal text-text-tertiary">o preço se edita no card</span>
            </p>
          )}

          {item.image_url && (
            <div className="mt-5 rounded-3xl bg-surface-soft p-4">
              <p className="text-[13px] font-semibold text-text-secondary">Cor da faixa do card</p>
              <p className="mt-0.5 text-[12px] leading-snug text-text-tertiary">
                {item.title_placement === "sobre" ? "Hoje o nome fica sobre a foto, então não há faixa. A cor vale quando o nome fica embaixo da foto." : "É a faixa embaixo da foto, onde ficam o nome e o preço."}
              </p>
              <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
                <button type="button" onClick={() => { setFaixa(null); salvar({ footer_color: null }); }} aria-label="Branco" title="Branco" className={`h-10 w-10 shrink-0 rounded-full bg-white ${!faixa ? "ring-2 ring-on-background ring-offset-2" : "border border-divider"}`} />
                {PALETTE_GROUPS.flatMap((g) => Object.entries(g.colors)).map(([chave, cc]) => (
                  <button key={chave} type="button" onClick={() => { setFaixa(chave); salvar({ footer_color: chave }); }} aria-label={cc.label} title={cc.label} className={`h-10 w-10 shrink-0 rounded-full ${faixa === chave ? "ring-2 ring-on-background ring-offset-2" : "border border-divider"}`} style={{ backgroundColor: cc.bg }} />
                ))}
                <label className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-text-tertiary text-[18px] text-text-secondary" title="Outra cor">
                  +
                  <input type="color" value={/^#[0-9a-f]{6}$/i.test(faixa ?? "") ? faixa! : "#888888"} onChange={(e) => setFaixa(e.target.value)} onBlur={(e) => salvar({ footer_color: e.target.value })} aria-label="Outra cor" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                </label>
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-text-secondary">Fale mais</p>
            <button
              type="button"
              onClick={gerarTexto}
              disabled={gerandoTexto}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium active:scale-[0.97] ${gerandoTexto ? "bg-surface-soft text-text-secondary" : "orbi-gradient text-on-background"}`}
            >
              {gerandoTexto ? <OrbiWorking label="Escrevendo…" variant="inline" /> : descricao.trim() ? "✦ Melhorar com a Orbi" : "✦ Gerar com a Orbi"}
            </button>
          </div>
          <textarea
            value={descricao}
            ref={crescer}
            rows={3}
            onChange={(e) => { setDescricao(e.target.value); crescer(e.target); }}
            onBlur={() => salvar({ description: descricao.trim() || null })}
            placeholder="Conte o que é, pra quem é e o que inclui."
            maxLength={1500}
            className="mt-1.5 w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-on-background"
          />
          {erroTexto && <p role="alert" className="mt-1.5 px-1 text-[13px] text-red-600">{erroTexto}</p>}
          {descAnterior !== null && !gerandoTexto && (
            <button type="button" onClick={desfazerTexto} className="mt-1.5 min-h-[36px] rounded-full bg-surface-soft px-4 text-[13px] font-medium text-text-secondary">Voltar ao texto anterior</button>
          )}

          <AnexoEditor businessId={business.id} anexo={anexo} onChange={salvarAnexo} />

          <ListaItensEditor businessId={business.id} lista={lista} temWhatsapp={!!business.contact_whatsapp} onChange={salvarLista} />

          <details className="mt-6">
            <summary className="inline-flex min-h-[40px] cursor-pointer list-none items-center rounded-full bg-surface-soft px-4 text-[13.5px] font-medium text-text-secondary">Mais opções</summary>
          <p className="mt-3 text-[13px] font-semibold text-text-secondary">Categoria <span className="font-normal text-text-tertiary">(opcional)</span></p>
          <input
            value={rotulo}
            onChange={(e) => setRotulo(e.target.value)}
            onBlur={() => salvar({ brand_label: rotulo.trim() || null })}
            placeholder={EYEBROW_LABEL[item.type] ?? "Ex: Sorvetes"}
            maxLength={80}
            className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
          />

          </details>

          {/* Pergunta pronta pra Orbi */}
          <div className="mt-5 rounded-2xl border border-dashed border-on-background/15 bg-surface-soft px-4 py-3.5">
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-text-tertiary">
                <span className="h-1.5 w-1.5 rounded-full bg-orbi-gradient-start" />
                Pergunte à Orbi, IA da {business.name}
              </span>
              <button
                onClick={sugerir}
                disabled={sugerindo}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${sugerindo ? "bg-surface-soft text-text-secondary" : "orbi-gradient text-on-background"}`}
              >
                {sugerindo ? <OrbiWorking label="Pensando…" variant="inline" /> : "✦ Orbi sugere"}
              </button>
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
            <span className="rounded-full btn-orbi-preto py-3.5 text-center text-[14px] font-medium">✦ Falar com a Orbi</span>
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

      {daGaleria && (
        <MinhaGaleriaPicker
          businessId={business.id}
          onFechar={() => setDaGaleria(false)}
          onEscolher={(url) => {
            setDaGaleria(false);
            if (midias.includes(url)) return irPara(midias.indexOf(url));
            const nova = [...midias, url];
            salvarMidias(nova);
            irPara(nova.length - 1);
          }}
        />
      )}
      {fotosProntas && (
        <FotoProntaPicker
          businessId={business.id}
          assunto={titulo}
          formato={formato}
          onFechar={() => setFotosProntas(false)}
          onEscolher={(file) => {
            setFotosProntas(false);
            setArquivo(file);
          }}
        />
      )}

      {gerador && (
        <GeradorImagemSheet
          businessId={business.id}
          assunto={titulo.trim() || "meu produto"}
          formato={formato}
          aspect={RATIOS[formato].value}
          edicao={gerador.edicao}
          refInicialUrl={gerador.url}
          sugestoes={gerador.edicao ? ["Clarear a foto e deixar mais nítida. Mantenha o produto exatamente igual.", "Fundo mais limpo e iluminação de estúdio. Mantenha o produto igual.", "Cores mais vivas e apetitosas. Mantenha o produto igual."] : undefined}
          onIndisponivel={() => { setGerador(null); void abrirIA(); }}
          onFechar={() => setGerador(null)}
          onUsar={(f) => { if (gerador.edicao && gerador.url) setSubstituir(gerador.url); setGerador(null); escolherFoto(f); }}
        />
      )}

      {ajuste && (
        <AjusteFoto
          url={ajuste}
          onFechar={() => setAjuste(null)}
          onAplicar={(f) => { setSubstituir(ajuste); setAjuste(null); escolherFoto(f); }}
        />
      )}

      {arquivo && (
        <ImageCropModal
          file={arquivo}
          lockedRatio={formato}
          lockedReason="Todas as fotos da página seguem o mesmo formato."
          onCancel={() => { setArquivo(null); setSubstituir(null); }}
          onConfirm={(blob) => enviarFoto(blob)}
        />
      )}
    </div>,
    document.body,
  );
}
