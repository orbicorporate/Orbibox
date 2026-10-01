"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageCropModal, RATIOS, RATIO_PIXELS, type Ratio } from "./ImageCropModal";
import { FotoProntaPicker } from "./FotoProntaPicker";
import { OrbiSimbolo } from "@/components/orbi/OrbiSimbolo";
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
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFotos, setShowFotos] = useState(false);
  // Dados da marca pro prompt da capa ficar com a cara dela (cores, tom).
  const [marca, setMarca] = useState<Marca | null>(null);

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
                {uploading ? "Enviando…" : "Trocar"}
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
            <span className="text-[13px] font-medium text-on-background">{uploading ? "Enviando…" : "Enviar foto de capa"}</span>
            <span className="text-[11.5px] text-text-tertiary">{medida}</span>
          </button>
        )}

        {value && <p className="text-[11.5px] text-text-tertiary">Medida ideal: {medida}</p>}

        {fileInput}
        {error && <p className="text-[12px] text-red-600">{error}</p>}

        {/* Sem foto própria: a Orbi busca uma pronta ou monta o prompt pra
            criar uma capa com a cara da marca no ChatGPT. */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowFotos(true)}
            className="orbi-gradient group w-full rounded-[20px] p-[1.5px] text-left shadow-[0_6px_22px_rgba(120,220,160,0.22)] transition-transform active:scale-[0.99]"
          >
            <span className="flex w-full items-center gap-3.5 rounded-[18.5px] bg-surface-white px-3.5 py-3.5">
              {/* Mini colagem de fotos, pra já dizer do que se trata. */}
              <span className="relative h-12 w-14 shrink-0" aria-hidden>
                <span className="absolute left-0 top-1.5 h-9 w-9 -rotate-12 rounded-lg bg-gradient-to-br from-[#C7F284] to-[#6FD8C4] shadow-sm" />
                <span className="absolute right-0 top-0.5 h-9 w-9 rotate-12 rounded-lg bg-gradient-to-br from-[#9EC5FF] to-[#B69CFF] shadow-sm" />
                <span className="absolute left-1/2 top-1 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-lg bg-on-background text-white shadow-md transition-transform group-hover:-translate-y-0.5">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="16" rx="3" />
                    <circle cx="9" cy="10" r="2" />
                    <path d="M21 16l-5-5-8 9" />
                  </svg>
                </span>
                <OrbiSimbolo size={20} className="absolute -bottom-1 -right-1" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-on-background">Buscar foto pronta</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">A Orbi entende o tema e escolhe fotos profissionais</span>
              </span>
              <span className="shrink-0 rounded-full bg-on-background px-3.5 py-2 text-[12.5px] font-semibold text-white">Buscar</span>
            </span>
          </button>

          <div className={`rounded-2xl border bg-surface-white ${showPrompt ? "border-on-background/15" : "border-divider"}`}>
            <button type="button" onClick={abrirPrompt} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
              <OrbiSimbolo size={36} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-on-background">Criar com a cara da marca</span>
                <span className="block text-[12px] text-text-tertiary">Prompt pronto pro ChatGPT, com suas cores</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-text-tertiary transition-transform ${showPrompt ? "rotate-180" : ""}`} aria-hidden>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {showPrompt && (
              <div className="px-3.5 pb-3.5">
                <div className="rounded-xl bg-surface-soft p-3">
                  <p className="select-text whitespace-pre-wrap text-[13px] leading-relaxed text-on-background">{promptTexto}</p>
                </div>
                <PassosPrompt />
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={copyPrompt} className="flex-1 rounded-full bg-button-primary py-2.5 text-[13px] font-medium text-white">
                    {copied ? "✓ Copiado" : "Copiar prompt"}
                  </button>
                  <AbrirChatGPT />
                </div>
              </div>
            )}
          </div>
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

        {pendingFile && (
          <ImageCropModal file={pendingFile} lockedRatio={lockedRatio} lockedReason={lockedReason} onCancel={() => setPendingFile(null)} onConfirm={uploadBlob} />
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
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-full bg-button-primary px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
          >
            {uploading ? "Enviando…" : value ? "Trocar foto" : "Enviar foto"}
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
        {showPrompt ? "Esconder prompt" : <>✦ {isAvatar ? "Gerar prompt pra criar o avatar com IA" : "Gerar prompt pra criar a capa com IA"}</>}
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

      {pendingFile && (
        <ImageCropModal file={pendingFile} lockedRatio={lockedRatio} lockedReason={lockedReason} onCancel={() => setPendingFile(null)} onConfirm={uploadBlob} />
      )}
    </div>
  );
}
