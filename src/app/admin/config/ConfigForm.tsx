"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { HelperText } from "@/components/ui/HelperText";
import { ChipGroup, CLASSES, FAIXAS_ETARIAS, PAGAMENTOS, ATENDIMENTOS } from "./ChipGroup";
import { StatusTag } from "@/components/ui/SecaoRecolhivel";
import { addToLogoGallery, parseLogoGallery } from "@/lib/logoGallery";

type Business = {
  id: string;
  name: string;
  slug: string;
  site_type: string | null;
  contact_whatsapp: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_site: string | null;
  address: string | null;
  about_business: string | null;
  differentials: string | null;
  policies: string | null;
  customer_classes: string[] | null;
  customer_ages: string[] | null;
  payment_methods: string[] | null;
  service_modes: string[] | null;
  logo_url: string | null;
  logo_gallery: unknown;
  share_image_url: string | null;
  share_description: string | null;
  vitrine_cover_url: string | null;
  vitrine_cover_urls: unknown;
};

const TIPO_LABEL: Record<string, string> = {
  ecommerce: "Loja virtual",
  institucional: "Site institucional",
  links: "Página de links",
};

export function ConfigForm({ business, section }: { business: Business; section: "marca" | "contatos" | "orbi" }) {
  const supabase = createClient();
  const [b, setB] = useState(business);
  const [logoGallery, setLogoGallery] = useState<string[]>(parseLogoGallery(business.logo_gallery));
  const [saved, setSaved] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  // A capa e a descrição do compartilhamento ficam recolhidas: são dois
  // cards longos e, uma vez configurados, quase nunca mudam.
  // Quem chega pelo link "#compartilhamento" (vindo do modal de compartilhar)
  // quer editar agora, então a seção já abre expandida nesse caso.
  const [shareAberto, setShareAberto] = useState(
    () => typeof window !== "undefined" && window.location.hash === "#compartilhamento",
  );
  // Vale a mesma cascata que o OpenGraph usa em /[slug]: uma capa própria,
  // a da vitrine ou o logo já rendem um preview decente, e a descrição cai
  // no "sobre" quando não há uma específica. Só fica pendente quando não há
  // nenhuma imagem nem nenhum texto pra mostrar.
  const temCapaCompartilhamento = !!(
    b.share_image_url ||
    b.vitrine_cover_url ||
    (Array.isArray(b.vitrine_cover_urls) && (b.vitrine_cover_urls as string[])[0]) ||
    b.logo_url
  );
  const temDescricaoCompartilhamento = !!(b.share_description?.trim() || b.about_business?.trim());
  const compartilhamentoPronto = temCapaCompartilhamento && temDescricaoCompartilhamento;
  // Logotipo começa recolhido (já tem logo) ou aberto (ainda não tem, pra
  // incentivar a subir). Recolhível pra economizar espaço.
  const [logoOpen, setLogoOpen] = useState(!business.logo_url);

  async function saveLogo(url: string | null) {
    setB((p) => ({ ...p, logo_url: url }));
    await supabase.from("businesses").update({ logo_url: url }).eq("id", b.id);
    if (url) {
      const next = await addToLogoGallery(supabase, b.id, logoGallery, url);
      setLogoGallery(next);
    }
  }

  async function saveShareImage(url: string | null) {
    setB((p) => ({ ...p, share_image_url: url }));
    await supabase.from("businesses").update({ share_image_url: url }).eq("id", b.id);
  }

  async function generateShareDescription() {
    setGeneratingDesc(true);
    try {
      const res = await fetch("/api/generate-share-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: b.id }),
      });
      if (res.ok) {
        const { description } = await res.json();
        setB((p) => ({ ...p, share_description: description }));
      }
    } finally {
      setGeneratingDesc(false);
    }
  }

  function set<K extends keyof Business>(key: K, value: Business[K]) {
    setB((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  type CampoEditavel =
    | "contact_whatsapp" | "contact_phone" | "contact_email" | "contact_site"
    | "address" | "about_business" | "differentials" | "policies" | "share_description";

  async function save(key: CampoEditavel, value: string) {
    const patch: Partial<Record<CampoEditavel, string | null>> = { [key]: value.trim() || null };
    await supabase.from("businesses").update(patch).eq("id", b.id);
    setSaved(true);
  }

  // Diferenciais viram até 4 linhas separadas. No banco continua sendo um
  // texto só (uma linha por diferencial), pra não quebrar quem já lê esse
  // campo: a Orbi, a página Sobre e a análise do site.
  const [listaDiferenciais, setListaDiferenciais] = useState<string[]>(() => {
    const bruto = (b.differentials ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    return [0, 1, 2, 3].map((i) => bruto[i] ?? "");
  });

  function setDiferencial(i: number, valor: string) {
    setListaDiferenciais((atual) => {
      const next = [...atual];
      next[i] = valor;
      return next;
    });
  }

  async function salvarDiferenciais() {
    const texto = listaDiferenciais.map((d) => d.trim()).filter(Boolean).join("\n");
    setB((p) => ({ ...p, differentials: texto || null }));
    await supabase.from("businesses").update({ differentials: texto || null }).eq("id", b.id);
    setSaved(true);
  }

  // Marca/desmarca uma opção de um dos grupos de chips.
  async function toggleLista(
    campoLista: "customer_classes" | "customer_ages" | "payment_methods" | "service_modes",
    id: string,
  ) {
    const atual = b[campoLista] ?? [];
    const next = atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id];
    setB((p) => ({ ...p, [campoLista]: next }));
    const patch: Partial<Record<typeof campoLista, string[]>> = { [campoLista]: next };
    await supabase.from("businesses").update(patch).eq("id", b.id);
    setSaved(true);
  }

  const campo = "mt-2 w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background";
  const rotulo = "mt-7 text-[13px] uppercase tracking-wide text-text-tertiary";

  return (
    <div className="mt-6 flex flex-col pb-4">
      {section === "marca" && (<>
      {/* Logotipo, super indicado: usado como avatar da tela inicial e vira
          sugestão de ícone em qualquer box. Recolhível pra economizar espaço. */}
      <div className="rounded-[24px] orbi-gradient p-[1.5px]">
        <div className="rounded-[23px] bg-surface-white">
          <button type="button" onClick={() => setLogoOpen((v) => !v)} className="flex w-full cursor-pointer items-center gap-3 p-5 text-left">
            {b.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logo_url} alt="Logotipo" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-[18px]">🏷️</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-[family-name:var(--font-manrope)] text-[16px] font-medium">
                Logotipo <span className="orbi-gradient-text">★ recomendado</span>
              </span>
              <span className="mt-0.5 block text-[12.5px] text-text-tertiary">
                {b.logo_url ? "Toque pra trocar" : "Toque pra subir seu logotipo"}
              </span>
            </span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text-secondary transition-transform ${logoOpen ? "rotate-180" : ""}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </button>
          {logoOpen && (
            <div className="px-5 pb-5">
              <HelperText>
                Fica disponível como avatar da tela inicial e, a partir de agora, também vira sugestão pronta na biblioteca de ícones de qualquer box, inclusive os que você criar depois.
              </HelperText>
              <div className="mt-4">
                <ImageUpload
                  value={b.logo_url}
                  businessId={b.id}
                  lockedRatio="quadrado"
                  promptKind="avatar"
                  onChange={saveLogo}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Capa e descrição do link: um card só, que abre por dentro. A pessoa
          clica no cabeçalho e a configuração inteira aparece dentro da mesma
          moldura, em vez de surgir solta embaixo. */}
      <div id="compartilhamento" className="mt-6 scroll-mt-20 rounded-[24px] orbi-gradient p-[1.5px]">
        <div className="rounded-[23px] bg-surface-white">
          <button
            type="button"
            aria-expanded={shareAberto}
            onClick={() => setShareAberto((v) => !v)}
            className="flex w-full cursor-pointer items-start gap-3.5 p-5 text-left"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#DEF3E3] text-[20px]">🔗</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-[family-name:var(--font-manrope)] text-[16.5px] font-semibold leading-tight">
                  Capa e descrição do link
                </span>
                <StatusTag preenchido={compartilhamentoPronto} />
              </span>
              <span className="mt-1 block text-[13px] leading-snug text-text-secondary">
                {compartilhamentoPronto
                  ? "Toque pra revisar como seu link aparece."
                  : "É a primeira impressão de quem recebe seu link no WhatsApp."}
              </span>
            </span>
            <span className={`mt-1 shrink-0 text-text-tertiary transition-transform ${shareAberto ? "rotate-90" : ""}`}>→</span>
          </button>

          {shareAberto && (
            <div className="border-t border-divider px-5 pb-5 pt-1">
        {/* Preview estilo card de link do WhatsApp */}
        <div className="mt-4 overflow-hidden rounded-[18px] border border-divider bg-surface-white">
          <div className="aspect-[1200/630] w-full bg-surface-soft">
            {(() => {
              const capa = b.share_image_url || b.vitrine_cover_url || (Array.isArray(b.vitrine_cover_urls) && (b.vitrine_cover_urls as string[])[0]) || b.logo_url;
              return capa ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capa as string} alt="Prévia da capa" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[13px] text-text-tertiary">Sem capa ainda</div>
              );
            })()}
          </div>
          <div className="p-3.5">
            <p className="text-[14px] font-semibold leading-tight">{b.name}</p>
            <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-text-secondary">
              {b.share_description?.trim() || "Adicione uma descrição pra aparecer aqui."}
            </p>
            <p className="mt-1 text-[11px] text-text-tertiary">orbibox-one.vercel.app</p>
          </div>
        </div>

      {/* Card da CAPA */}
      <div className="mt-5">
        <p className="text-[15px] font-semibold">Capa do link</p>
        <HelperText>
          A imagem que aparece quando alguém cola seu link no WhatsApp, Instagram ou qualquer outro app. Sem escolher uma aqui, usa automaticamente a capa da Vitrine ou o logotipo.
        </HelperText>
        <div className="mt-4">
          <ImageUpload
            value={b.share_image_url}
            businessId={b.id}
            lockedRatio="paisagem"
            promptKind="capa"
            onChange={saveShareImage}
          />
        </div>
        {!b.share_image_url && (
          <p className={`mt-3 rounded-xl px-3 py-2 text-[12.5px] ${temCapaCompartilhamento ? "bg-surface-soft text-text-tertiary" : "bg-[#FDE7E7] text-[#C0392B]"}`}>
            {(b.vitrine_cover_url || (Array.isArray(b.vitrine_cover_urls) && (b.vitrine_cover_urls as string[])[0]))
              ? "Está usando a capa da Vitrine, que já funciona bem. Envie uma própria se quiser caprichar."
              : b.logo_url
              ? "Está usando o logotipo, que já funciona. Envie uma capa se quiser caprichar."
              : "Ainda não tem nenhuma imagem, o link fica sem capa."}
          </p>
        )}
      </div>

      {/* Card da DESCRIÇÃO */}
      <div className="mt-6 border-t border-divider pt-5">
        <p className="text-[15px] font-semibold">Descrição do link</p>
        <HelperText>
          O texto que aparece embaixo do nome, que já mostra o nome do negócio, então não precisa repetir aqui. Curto é melhor: até 3 linhas cabem no preview do WhatsApp.
        </HelperText>
        <textarea
          value={b.share_description ?? ""}
          onChange={(e) => set("share_description", e.target.value)}
          onBlur={(e) => save("share_description", e.target.value)}
          placeholder="Ex.: Agência full-service que une dados, estratégia e criatividade."
          maxLength={90}
          rows={3}
          className="mt-3 w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
        />
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={generateShareDescription}
            disabled={generatingDesc}
            className="rounded-full orbi-gradient px-4 py-1.5 text-[13px] font-medium text-on-background disabled:opacity-60"
          >
            {generatingDesc ? "Gerando…" : "✦ Gerar com IA"}
          </button>
          <p className="text-[12px] text-text-tertiary">{(b.share_description ?? "").length}/90</p>
        </div>
      </div>
            </div>
          )}
        </div>
      </div>


      {b.site_type && (
        <div className="mt-4 rounded-[22px] bg-surface-soft p-5">
          <p className="text-[14px] text-text-secondary">
            A Orbi classificou seu site como{" "}
            <span className="font-medium text-on-background">{TIPO_LABEL[b.site_type] ?? b.site_type}</span>.
          </p>
        </div>
      )}

      {/* Próxima etapa: configurar a IA (personalidade + entrevista) */}
      <Link href="/admin/agent" className="mt-6 flex items-center gap-3.5 rounded-[24px] orbi-gradient p-[1.5px]">
        <span className="flex w-full items-center gap-3.5 rounded-[23px] bg-surface-white p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-soft text-[20px]">✦</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Próxima etapa</span>
            <span className="mt-0.5 block text-[15px] font-semibold">Já configurou sua IA?</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-text-tertiary">Deixe a Orbi conhecer seu negócio pra atender e criar melhor.</span>
          </span>
          <span className="text-text-tertiary">→</span>
        </span>
      </Link>
      </>)}

      {section === "contatos" && (<>
      <p className="font-[family-name:var(--font-manrope)] text-[20px] font-medium">Contatos do box</p>
      <HelperText>Aparecem como botões para o visitante. Deixe vazio o que não quiser mostrar.</HelperText>

      <p className={rotulo}>WhatsApp</p>
      <input
        value={b.contact_whatsapp ?? ""}
        onChange={(e) => set("contact_whatsapp", e.target.value)}
        onBlur={(e) => save("contact_whatsapp", e.target.value)}
        placeholder="(11) 99999-9999"
        inputMode="tel"
        className={campo}
      />

      <p className={rotulo}>Telefone para ligar</p>
      <input
        value={b.contact_phone ?? ""}
        onChange={(e) => set("contact_phone", e.target.value)}
        onBlur={(e) => save("contact_phone", e.target.value)}
        placeholder="(11) 3333-3333"
        inputMode="tel"
        className={campo}
      />

      <p className={rotulo}>E-mail</p>
      <input
        value={b.contact_email ?? ""}
        onChange={(e) => set("contact_email", e.target.value)}
        onBlur={(e) => save("contact_email", e.target.value)}
        placeholder="contato@seunegocio.com.br"
        inputMode="email"
        className={campo}
      />

      <p className={rotulo}>Site</p>
      <input
        value={b.contact_site ?? ""}
        onChange={(e) => set("contact_site", e.target.value)}
        onBlur={(e) => save("contact_site", e.target.value)}
        placeholder="https://seusite.com.br"
        className={campo}
      />

      <p className={rotulo}>Endereço</p>
      <input
        value={b.address ?? ""}
        onChange={(e) => set("address", e.target.value)}
        onBlur={(e) => save("address", e.target.value)}
        placeholder="Rua, número, bairro, cidade, aparece na página Sobre e abre no mapa"
        className={campo}
      />

      </>)}

      {section === "orbi" && (<>
      <p className="font-[family-name:var(--font-manrope)] text-[20px] font-medium">O que a Orbi sabe</p>
      <HelperText>O texto que ela usa pra responder seus visitantes. Escreva do seu jeito ou corrija o que ela já escreveu.</HelperText>

      {/* Ensinar a Orbi acontece na página Sua IA, que tem o fluxo
          guiado (ler o site, entrevista de 5 perguntas). Aqui é só o texto
          final, pra revisar e ajustar. Este atalho liga as duas pontas. */}
      <Link
        href="/admin/agent"
        className="mt-5 flex items-center gap-3.5 rounded-[22px] border border-divider bg-surface-white p-4"
      >
        <span className="orbi-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[16px] text-on-background">✦</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold leading-tight">Deixa a Orbi preencher sozinha</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-text-tertiary">
            Ela lê seu site ou faz 5 perguntas e escreve tudo isso pra você.
          </span>
        </span>
        <span className="shrink-0 text-text-tertiary">→</span>
      </Link>

      <p className={rotulo}>Sobre o negócio</p>
      <AutoTextarea
        value={b.about_business ?? ""}
        onChange={(v) => set("about_business", v)}
        onBlur={(v) => save("about_business", v)}
        minRows={6}
        placeholder="O que vocês fazem e para quem."
        className={`${campo} resize-none overflow-hidden leading-relaxed`}
      />

      {/* Diferenciais numerados: um campo por diferencial, em vez de um
          bloco de texto único. Fica claro quantos faltam e é bem mais
          fácil de escrever (e de a Orbi usar depois, separadamente). */}
      <p className={rotulo}>Diferenciais</p>
      <p className="mt-1 text-[12.5px] leading-snug text-text-tertiary">
        Até 4 motivos pra alguém escolher você. Um por linha.
      </p>
      <div className="mt-2.5 flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
              listaDiferenciais[i]?.trim() ? "orbi-green-gradient text-white" : "bg-surface-soft text-text-tertiary"
            }`}>
              {i + 1}
            </span>
            <input
              value={listaDiferenciais[i] ?? ""}
              onChange={(e) => setDiferencial(i, e.target.value)}
              onBlur={() => salvarDiferenciais()}
              placeholder={
                i === 0 ? "Ex: Time 100% sênior"
                : i === 1 ? "Ex: Entrega no mesmo dia"
                : i === 2 ? "Ex: Garantia de 1 ano"
                : "Ex: Orçamento sem compromisso"
              }
              className="min-w-0 flex-1 rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
            />
          </div>
        ))}
      </div>

      {/* Daqui pra baixo é tudo de marcar: a pessoa não escreve nada, só
          toca. A Orbi usa isso pra falar de preço, forma de pagamento e
          como o cliente recebe. */}
      <ChipGroup
        titulo="Cliente típico"
        ajuda="Marque as classes que mais combinam com quem compra de você."
        opcoes={CLASSES}
        selecionadas={b.customer_classes ?? []}
        onToggle={(id) => toggleLista("customer_classes", id)}
      />

      <ChipGroup
        titulo="Faixa de idade"
        opcoes={FAIXAS_ETARIAS}
        selecionadas={b.customer_ages ?? []}
        onToggle={(id) => toggleLista("customer_ages", id)}
      />

      <ChipGroup
        titulo="Formas de pagamento"
        opcoes={PAGAMENTOS}
        selecionadas={b.payment_methods ?? []}
        onToggle={(id) => toggleLista("payment_methods", id)}
      />

      <ChipGroup
        titulo="Como você atende"
        opcoes={ATENDIMENTOS}
        selecionadas={b.service_modes ?? []}
        onToggle={(id) => toggleLista("service_modes", id)}
      />

      <p className={rotulo}>Políticas</p>
      <AutoTextarea
        value={b.policies ?? ""}
        onChange={(v) => set("policies", v)}
        onBlur={(v) => save("policies", v)}
        minRows={5}
        placeholder="Prazos de entrega, frete, trocas, horários, formas de pagamento."
        className={`${campo} resize-none overflow-hidden leading-relaxed`}
      />

      <Link
        href="/admin/agent"
        className="mt-8 rounded-full border border-divider bg-surface-white px-5 py-3 text-center text-[14px] font-medium"
      >
        Personalidade da Orbi →
      </Link>
      </>)}

      {saved && <p className="mt-3 text-[12px] text-text-tertiary">Salvo ✓</p>}
    </div>
  );
}

/** Campo de texto que cresce junto com o conteúdo, até um limite. Evita
 * o texto longo ficar espremido em três linhas com barra de rolagem. */
function AutoTextarea({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  minRows = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: (v: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function ajustar(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 460)}px`;
  }

  useEffect(() => { ajustar(ref.current); }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => { onChange(e.target.value); ajustar(e.target); }}
      onBlur={(e) => onBlur(e.target.value)}
      rows={minRows}
      placeholder={placeholder}
      className={className}
    />
  );
}
