"use client";

import { createPortal } from "react-dom";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageCropModal, RATIOS, RATIO_PIXELS, type Ratio } from "./ImageCropModal";
import { FotoProntaPicker } from "./FotoProntaPicker";
import { MinhaGaleriaPicker } from "./MinhaGaleriaPicker";
import { AVISO_FORA_DA_MEDIDA, arquivoDaUrl, estaNaMedida } from "@/lib/medidaImagem";
import { GeradorImagemSheet } from "./GeradorImagemSheet";
import { AjusteFoto } from "./AjusteFoto";
import { OrbiMiniVerde } from "@/components/orbi/OrbiConcluido";
import { AbrirChatGPT } from "@/components/ui/AbrirChatGPT";
import { PassosPrompt } from "@/components/ui/PassosPrompt";

type Marca = { name: string; brand_colors: unknown; about_business: string | null; brand_voice_summary: string | null };

/**
 * Envia a foto para o armazenamento do Supabase e devolve a URL pública.
 * Antes de subir, abre um passo de recorte (arrastar, dar zoom, escolher
 * formato), a foto que sobe já sai enquadrada do jeito certo.
 * Aceita também colar um link, para quem já tem a imagem hospedada.
 *
 * `lockedRatio`, quando vem preenchido, trava o formato do recorte no que a
 * primeira foto do item já definiu, capa e galeria nunca ficam misturando
 * proporção. `onFormatChosen` avisa o formato escolhido na primeira vez.
 * `promptSubject`, quando vem preenchido, habilita o botão de gerar um
 * prompt pronto pra criar a imagem num gerador (GPT, etc.).
 * `promptKind` diz se o que se cria é uma "capa" (padrão) ou um "avatar"
 * (logotipo), pra o texto do prompt e os rótulos combinarem com o contexto.
 * `emptyPreview` troca o quadradinho vazio por um elemento próprio (ex.: a
 * esfera da Orbi, quando ainda não há logotipo enviado).
 */
export function ImageUpload({
  value,
  onChange,
  businessId,
  lockedRatio,
  lockedReason,
  onFormatChosen,
  promptSubject,
  promptKind = "capa",
  emptyPreview,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  businessId: string;
  lockedRatio?: Ratio | null;
  lockedReason?: string;
  onFormatChosen?: (ratio: Ratio) => void;
  promptSubject?: string;
  promptKind?: "capa" | "avatar";
  emptyPreview?: React.ReactNode;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [foraDaMedida, setForaDaMedida] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFotos, setShowFotos] = useState(false);
  const [showGaleria, setShowGaleria] = useState(false);
  const [escolhendoOrigem, setEscolhendoOrigem] = useState(false);
  // Dados da marca pro prompt da capa ficar com a cara dela (cores, tom).
  const [marca, setMarca] = useState<Marca | null>(null);

  // Gerador de imagem em formato de conversa (texto + referências).
  const [showGerador, setShowGerador] = useState(false);
  const [iaIndisponivel, setIaIndisponivel] = useState(false);
  // Edição da foto que já está na capa: pela Orbi (IA) ou ajuste rápido de luz.
  const [editandoComIA, setEditandoComIA] = useState(false);
  const [ajustando, setAjustando] = useState(false);

  async function abrirPrompt() {
    const abrir = !showPrompt;
    setShowPrompt(abrir);
    if (abrir && !marca) {
      const { data } = await supabase.from("businesses").select("name, brand_colors, about_business, brand_voice_summary").eq("id", businessId).maybeSingle();
      if (data) setMarca(data as Marca);
    }
  }

  const ratio = lockedRatio ?? "quadrado";
  const medida = RATIO_PIXELS[ratio];
  const isAvatar = promptKind === "avatar";
  const promptTexto = isAvatar
    ? `Criar um avatar/logotipo redondo em ${medida}, sofisticado e minimalista, para representar "${promptSubject || "minha marca"}". Fundo limpo, boa leitura em tamanho pequeno. Use como referência de estilo as imagens que vou anexar.`
    : promptCapa();

  function promptCapa() {
    const cores = Array.isArray(marca?.brand_colors)
      ? (marca!.brand_colors as { hex?: string }[]).map((c) => c?.hex).filter(Boolean).slice(0, 5).join(", ")
      : "";
    const linhas = [
      `Crie uma imagem de capa em ${medida} para "${promptSubject || "meu negócio"}"${marca?.name ? `, da marca ${marca.name}` : ""}.`,
      "",
      "Use a foto que estou anexando como base (produto, ambiente ou logotipo) e deixe a imagem com a cara da marca:",
      cores ? `- Cores da marca: ${cores}` : "",
      marca?.brand_voice_summary ? `- Tom da marca: ${marca.brand_voice_summary.slice(0, 160)}` : "",
      marca?.about_business ? `- Sobre a marca: ${marca.about_business.replace(/\s+/g, " ").slice(0, 220)}` : "",
      "",
      "Estilo fotográfico, moderno e limpo, luz natural, composição com respiro. Sem textos, letras ou marcas d'água.",
    ];
    return linhas.filter((l, i, arr) => l !== "" || (arr[i - 1] !== "" && i > 0)).join("\n").trim();
  }

  function handlePick(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Imagem muito grande, o limite é 20 MB.");
      return;
    }
    // Abre o passo de recorte em vez de subir direto.
    setPendingFile(file);
  }

  async function uploadBlob(blob: Blob, ratio: Ratio) {
    setPendingFile(null);
    setUploading(true);
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const path = `${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("box-images")
      .upload(path, blob, { cacheControl: "31536000", upsert: false, contentType: blob.type || "image/jpeg" });
    setUploading(false);
    if (upErr) {
      setError("Não consegui enviar a foto. Tente de novo.");
      return;
    }
    const { data } = supabase.storage.from("box-images").getPublicUrl(path);
    onChange(data.publicUrl);
    if (!lockedRatio) onFormatChosen?.(ratio);
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) handlePick(f);
        e.target.value = "";
      }}
    />
  );

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(promptTexto);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Capa: prévia grande no formato real, ações em cima da própria foto e o
  // atalho de IA discreto embaixo. O avatar (logo) segue no layout compacto.
  if (!isAvatar) {
    const aspect = lockedRatio ? RATIOS[lockedRatio].value : 1;
    // Formatos largos ocupam a linha toda; quadrado/retrato ficam menores
    // pra prévia não virar uma foto gigante na tela.
    const sizeClass = aspect >= 1.5 ? "w-full" : "w-2/3 max-w-[240px]";
    return (
      <div className="flex flex-col gap-2.5">
        {value ? (
          <div className={`relative overflow-hidden rounded-2xl bg-surface-soft ${sizeClass}`} style={{ aspectRatio: aspect }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-medium text-on-background shadow backdrop-blur disabled:opacity-60"
              >
                {uploading ? <span className="inline-flex items-center gap-1.5"><OrbiMiniVerde size={14} />Enviando…</span> : "Trocar"}
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                aria-label="Remover foto"
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-black/60 text-[13px] text-white backdrop-blur"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-divider bg-surface-soft px-4 disabled:opacity-60 ${sizeClass}`}
            style={{ aspectRatio: aspect, minHeight: 120 }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-white text-[18px] leading-none text-on-background shadow-sm">+</span>
            <span className="text-[13px] font-medium text-on-background">{uploading ? <span className="inline-flex items-center gap-1.5"><OrbiMiniVerde size={16} />Enviando…</span> : "Enviar foto de capa"}</span>
            <span className="text-[11.5px] text-text-tertiary">{medida}</span>
          </button>
        )}

        {value && <p className="text-[11.5px] text-text-tertiary">Medida ideal: {medida}</p>}

        {value && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={async () => { setError(null); try { setPendingFile(await arquivoDaUrl(value)); } catch { setError("Não consegui abrir essa foto. Tente enviar de novo."); } }}
              className="flex min-h-[46px] items-center justify-center rounded-2xl border border-divider bg-surface-white px-3 text-center text-[13px] font-medium leading-tight"
            >
              Editar foto atual
            </button>
            <button type="button" onClick={() => setAjustando(true)} className="flex min-h-[46px] items-center justify-center rounded-2xl border border-divider bg-surface-white px-3 text-center text-[13px] font-medium leading-tight">
              Painel de edição completo
            </button>
          </div>
        )}

        {fileInput}
        {error && <p className="text-[12px] text-red-600">{error}</p>}

        {/* Sem foto própria: a Orbi busca uma pronta ou monta o prompt pra
            criar uma capa com a cara da marca no ChatGPT. */}
        <div className="flex flex-col gap-2">
          <div className="mt-1 border-t border-black/[0.08] pt-4">
          <p className="px-1 text-center text-[12px] font-medium text-text-tertiary">Ou escolha uma imagem</p>
          {/* Três bolinhas, minimalistas: cor, ícone e uma palavra. */}
          <div className="mt-3 grid grid-cols-3">
            {[
              { t: "Busca Web", bg: "linear-gradient(135deg,#C7F284,#6FD8C4)", ic: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3" />, f: () => setShowFotos(true), on: false },
              { t: "Galeria", bg: "linear-gradient(135deg,#9EC5FF,#B69CFF)", ic: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />, f: () => setShowGaleria(true), on: false },
              { t: "Criar com IA", bg: "linear-gradient(135deg,#FFD9A8,#FF9FB8)", ic: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />, f: abrirPrompt, on: showPrompt },
            ].map((o) => (
              <button
                key={o.t}
                type="button"
                onClick={o.f}
                aria-expanded={o.t === "Criar com IA" ? showPrompt : undefined}
                className="flex flex-col items-center gap-2 py-1 active:scale-[0.95]"
              >
                <span className={`flex h-14 w-14 items-center justify-center rounded-full text-on-background shadow-[0_6px_16px_-8px_rgba(17,19,24,0.35)] ${o.on ? "ring-2 ring-on-background ring-offset-2" : ""}`} style={{ background: o.bg }} aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{o.ic}</svg>
                </span>
                <span className="text-[12.5px] font-medium text-on-background">{o.t}</span>
              </button>
            ))}
          </div>
          </div>

          {showPrompt && (
            <div className="flex flex-col gap-3">
              {/* Opção 1: criar aqui, com a Orbi. */}
              {!iaIndisponivel && (
                <div className="rounded-[20px] p-4" style={{ background: "linear-gradient(135deg,#FFF1E3,#FFE6EE)" }}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-on-background text-[12px] font-semibold text-white">1</span>
                    <p className="text-[14px] font-semibold">Criar aqui com a Orbi</p>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-text-secondary">Descreva o que quer e anexe referências.</p>
                  <button type="button" onClick={() => setShowGerador(true)} className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-on-background text-[14px] font-semibold text-white active:scale-[0.99]">
                    Abrir o criador de imagem
                  </button>
                </div>
              )}
              {/* Opção 2: levar o prompt pronto para o ChatGPT. */}
              <div className="rounded-[20px] bg-white p-4 ring-1 ring-black/[0.08]">
                <div className="flex items-center gap-2">
                  {!iaIndisponivel && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F2F2EE] text-[12px] font-semibold">2</span>}
                  <p className="text-[14px] font-semibold">Usar no ChatGPT</p>
                </div>
                <div className="mt-3 max-h-[160px] overflow-y-auto rounded-xl bg-[#F2F2EE] p-3">
                  <p className="select-text whitespace-pre-wrap text-[12.5px] leading-relaxed text-on-background">{promptTexto}</p>
                </div>
                <PassosPrompt />
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={copyPrompt} className="flex-1 rounded-full bg-button-primary py-2.5 text-[13px] font-medium text-white">
                    {copied ? "✓ Copiado" : "Copiar prompt"}
                  </button>
                  <AbrirChatGPT />
                </div>
              </div>
            </div>
          )}
        </div>

        {showFotos && (
          <FotoProntaPicker
            businessId={businessId}
            assunto={promptSubject || ""}
            formato={ratio}
            onFechar={() => setShowFotos(false)}
            onEscolher={(file) => {
              setShowFotos(false);
              setPendingFile(file);
            }}
          />
        )}

        {showGaleria && (
          <MinhaGaleriaPicker
            businessId={businessId}
            atual={value}
            onFechar={() => setShowGaleria(false)}
            onEscolher={async (url) => {
              setShowGaleria(false);
              // Nunca entra imagem fora da medida: se não bate com o formato, abre o recorte.
              if (await estaNaMedida(url, RATIOS[ratio].value)) { onChange(url); return; }
              try { setForaDaMedida(true); setPendingFile(await arquivoDaUrl(url)); } catch { setError("Não consegui abrir essa imagem. Tente outra."); }
            }}
          />
        )}

        {showGerador && (
          <GeradorImagemSheet
            businessId={businessId}
            assunto={promptSubject || ""}
            formato={lockedRatio ?? "quadrado"}
            aspect={aspect}
            onIndisponivel={() => { setIaIndisponivel(true); setEditandoComIA(false); }}
            onFechar={() => { setShowGerador(false); setEditandoComIA(false); }}
            edicao={editandoComIA}
            refInicialUrl={editandoComIA && value ? value : undefined}
            sugestoes={editandoComIA ? ["Clarear a foto e deixar mais nítida. Mantenha o produto exatamente igual.", "Fundo mais limpo e iluminação de estúdio. Mantenha o produto igual.", "Cores mais vivas e apetitosas. Mantenha o produto igual."] : undefined}
            onUsar={(file) => {
              setShowGerador(false);
              setEditandoComIA(false);
              setPendingFile(file);
            }}
          />
        )}

        {ajustando && value && (
          <AjusteFoto
            url={value}
            onFechar={() => setAjustando(false)}
            onAplicar={(file) => { setAjustando(false); setPendingFile(file); }}
          />
        )}

        {pendingFile && (
          <ImageCropModal file={pendingFile} lockedRatio={lockedRatio ?? (foraDaMedida ? ratio : null)} lockedReason={foraDaMedida ? AVISO_FORA_DA_MEDIDA : lockedReason} onCancel={() => { setPendingFile(null); setForaDaMedida(false); }} onConfirm={(b, r) => { setForaDaMedida(false); return uploadBlob(b, r); }} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] text-text-tertiary">Medida recomendada: <span className="font-medium text-text-secondary">{medida}</span></p>
      <div className="flex items-center gap-3">
        {/* Miniatura do que já está escolhido, na mesma proporção do formato do box,
            pra já mostrar como a foto vai ficar recortada. */}
        <div
          className="w-24 shrink-0 overflow-hidden rounded-2xl border border-divider bg-surface-soft"
          style={{ aspectRatio: lockedRatio ? RATIOS[lockedRatio].value : 1 }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : emptyPreview ? (
            <div className="flex h-full w-full items-center justify-center">{emptyPreview}</div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[18px] text-text-tertiary">▣</div>
          )}
        </div>

        <div className="flex flex-1 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEscolhendoOrigem(true)}
            disabled={uploading}
            className={`rounded-full px-4 py-2.5 text-[13px] font-medium ${uploading ? "bg-surface-white text-on-background ring-1 ring-black/10" : "bg-button-primary text-white disabled:opacity-50"}`}
          >
            {uploading ? <span className="inline-flex items-center gap-1.5"><OrbiMiniVerde size={16} />Enviando…</span> : value ? "Trocar foto" : "Enviar foto"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-full bg-surface-soft px-4 py-2.5 text-[13px] text-text-secondary"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handlePick(f);
          e.target.value = "";
        }}
      />

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      {!isAvatar && !value && (
        <div className="rounded-2xl border border-divider bg-surface-soft p-3">
          <p className="text-[13px] leading-relaxed text-on-background">
            <span className="font-medium">Uma capa bonita faz toda a diferença</span> na primeira impressão de quem visita. Se você não tem uma imagem pronta, use o prompt abaixo pra gerar uma no ChatGPT (ou outro gerador) e traga aqui.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowPrompt((s) => !s)}
        className={`inline-flex items-center gap-1.5 self-start rounded-full px-4 py-2.5 text-[13px] font-medium ${showPrompt ? "border border-divider bg-surface-white text-text-secondary" : "orbi-gradient text-on-background"}`}
      >
        {showPrompt ? "Esconder prompt" : <>✦ {isAvatar ? "Gerar prompt pra criar o avatar com IA" : "Gerar prompt pra criar a imagem com IA"}</>}
      </button>

      {showPrompt && (
        <div className="rounded-2xl border border-divider bg-surface-soft p-3">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-on-background">{promptTexto}</p>
          <p className="mt-2 text-[11px] text-text-tertiary">
            Copie, cole no ChatGPT (ou outro gerador de imagem) já anexando fotos suas de referência, depois baixe a imagem gerada e envie aqui.
          </p>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(promptTexto);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="mt-3 rounded-full bg-button-primary px-4 py-2 text-[12px] font-medium text-white"
          >
            {copied ? "✓ Copiado" : "Copiar prompt"}
          </button>
        </div>
      )}

      {escolhendoOrigem && createPortal(
        <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/40" onClick={() => setEscolhendoOrigem(false)}>
          <div className="folha-sobe w-full max-w-[440px] rounded-t-[28px] bg-background-main p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <p className="text-center font-[family-name:var(--font-manrope)] text-[17px] font-medium">De onde vem a foto?</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <button type="button" onClick={() => { setEscolhendoOrigem(false); setShowGaleria(true); }} className="flex min-h-[56px] items-center justify-between rounded-2xl bg-on-background px-5 text-left text-[15px] font-medium text-white active:scale-[0.99]">
                <span>Minha galeria<span className="block text-[12.5px] font-normal text-white/70">Fotos que você já enviou</span></span>
                <span aria-hidden>→</span>
              </button>
              <button type="button" onClick={() => { setEscolhendoOrigem(false); inputRef.current?.click(); }} className="flex min-h-[56px] items-center justify-between rounded-2xl bg-surface-white px-5 text-left text-[15px] font-medium ring-1 ring-black/[0.08] active:scale-[0.99]">
                <span>Enviar do celular<span className="block text-[12.5px] font-normal text-text-tertiary">Câmera ou rolo de fotos</span></span>
                <span aria-hidden>↑</span>
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {showGaleria && (
        <MinhaGaleriaPicker
          businessId={businessId}
          atual={value}
          camada="z-[90]"
          onFechar={() => setShowGaleria(false)}
          onEscolher={(url) => {
            setShowGaleria(false);
            onChange(url);
          }}
        />
      )}

      {pendingFile && (
        <ImageCropModal file={pendingFile} lockedRatio={lockedRatio ?? (foraDaMedida ? ratio : null)} lockedReason={foraDaMedida ? AVISO_FORA_DA_MEDIDA : lockedReason} onCancel={() => { setPendingFile(null); setForaDaMedida(false); }} onConfirm={(b, r) => { setForaDaMedida(false); return uploadBlob(b, r); }} />
      )}
    </div>
  );
}
