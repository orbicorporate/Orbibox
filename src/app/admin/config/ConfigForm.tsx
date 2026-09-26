"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { HelperText } from "@/components/ui/HelperText";
import { ChipGroup, CLASSES, FAIXAS_ETARIAS, PAGAMENTOS, ATENDIMENTOS } from "./ChipGroup";
import { StatusTag } from "@/components/ui/SecaoRecolhivel";
import { addToLogoGallery, parseLogoGallery } from "@/lib/logoGallery";
import { GuiaPassos, Secao, rolarAte } from "@/components/ui/GuiaPassos";
import { OrbiColorsPanel } from "@/app/admin/agent/OrbiColorsPanel";
import { HeroBackgroundPanel } from "@/app/admin/agent/HeroBackgroundPanel";
import { gravarFlag, useFlag } from "@/lib/useFlag";

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

type SecaoMarca = "logo" | "cores" | "compartilhamento" | "contatos";

export function ConfigForm({
  business,
  section,
  orbiColors = null,
  heroGradient = null,
  heroStyle = null,
  embutido = false,
}: {
  business: Business;
  section: "marca" | "contatos" | "orbi";
  orbiColors?: string[] | null;
  heroGradient?: string[] | null;
  heroStyle?: string | null;
  /** Dentro de outra tela (ex.: Sua IA): sem os atalhos que levam pra ela. */
  embutido?: boolean;
}) {
  const supabase = createClient();
  const [b, setB] = useState(business);
  const [logoGallery, setLogoGallery] = useState<string[]>(parseLogoGallery(business.logo_gallery));
  const [saved, setSaved] = useState(false);

  // O aviso de salvo some sozinho, senão fica pendurado na tela pra sempre.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  // A capa e a descrição do compartilhamento ficam recolhidas: são dois
  // cards longos e, uma vez configurados, quase nunca mudam.
  // Quem chega pelo link "#compartilhamento" (vindo do modal de compartilhar)
  // quer editar agora, então a seção já abre expandida nesse caso.
  // Seções da Marca: começam fechadas, menos a do logotipo quando ainda não
  // tem logo, e a que vier no link (#compartilhamento, #contatos, #cores).
  const [abertos, setAbertos] = useState<Record<SecaoMarca, boolean>>(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    return {
      logo: !business.logo_url || hash === "logo",
      cores: hash === "cores" || hash === "cores-orbi" || hash === "fundo-pagina",
      compartilhamento: hash === "compartilhamento",
      contatos: hash === "contatos",
    };
  });
  const coresVistas = useFlag(`marca_cores_${business.id}`);
  function alternar(sec: SecaoMarca) {
    setAbertos((a) => ({ ...a, [sec]: !a[sec] }));
    if (sec === "cores") gravarFlag(`marca_cores_${business.id}`);
  }
  function abrirERolar(sec: SecaoMarca) {
    setAbertos((a) => ({ ...a, [sec]: true }));
    if (sec === "cores") gravarFlag(`marca_cores_${business.id}`);
    rolarAte(`marca-${sec}`);
  }
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

  const camposContato = (
    <div className="flex flex-col">
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

    </div>
  );

  return (
    <div className={`${embutido ? "" : "mt-6"} flex flex-col pb-4`}>
      {section === "marca" && (
      <div className="flex flex-col gap-3">
        <GuiaPassos
          titulo="Sua marca em 3 passos"
          chave={`marca_${b.id}`}
          passos={[
            { titulo: "Logotipo", detalhe: "Aparece na sua página e vira ícone dos boxes", feito: !!b.logo_url, onClick: () => abrirERolar("logo") },
            { titulo: "Cores e fundo da página", detalhe: "A esfera da Orbi e a primeira tela do seu link", feito: coresVistas || !!heroGradient, onClick: () => abrirERolar("cores") },
            { titulo: "Como seu link aparece no WhatsApp", detalhe: "A capa e o texto de quando alguém compartilha", feito: compartilhamentoPronto, onClick: () => abrirERolar("compartilhamento") },
          ]}
        />

        <Secao
          id="marca-logo"
          aberto={abertos.logo}
          onToggle={() => alternar("logo")}
          icone={b.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logo_url} alt="" className="h-full w-full object-cover" />
          ) : <span className="text-[18px]">🏷️</span>}
          titulo="Logotipo"
          descricao={b.logo_url ? "Toque pra trocar" : "Aparece na sua página e vira ícone dos boxes"}
          status={<StatusTag preenchido={!!b.logo_url} />}
        >
          <ImageUpload value={b.logo_url} businessId={b.id} lockedRatio="quadrado" promptKind="avatar" onChange={saveLogo} />
        </Secao>

        <Secao
          id="marca-cores"
          aberto={abertos.cores}
          onToggle={() => alternar("cores")}
          icone={<span className="h-full w-full" style={{ background: `linear-gradient(135deg, ${(orbiColors ?? ["#7FE84A", "#8B2BFF"])[0]}, ${(orbiColors ?? ["#7FE84A", "#8B2BFF"])[1]})` }} />}
          titulo="Cores e fundo da página"
          descricao="A esfera da Orbi e a primeira tela do seu link"
        >
          <OrbiColorsPanel businessId={b.id} initialOrbiColors={orbiColors} embutido />
          <div className="my-5 border-t border-divider" />
          <HeroBackgroundPanel businessId={b.id} orbiColors={orbiColors} initialHeroGradient={heroGradient} initialHeroStyle={heroStyle} embutido />
        </Secao>

        <Secao
          id="marca-compartilhamento"
          aberto={abertos.compartilhamento}
          onToggle={() => alternar("compartilhamento")}
          icone={<span className="text-[18px]">🔗</span>}
          titulo="Como seu link aparece no WhatsApp"
          descricao="A capa e o texto de quando alguém compartilha"
          status={<StatusTag preenchido={compartilhamentoPronto} />}
        >
          <span id="compartilhamento" />
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
        </Secao>

        <Secao
          id="marca-contatos"
          aberto={abertos.contatos}
          onToggle={() => alternar("contatos")}
          icone={<span className="text-[18px]">📞</span>}
          titulo="Contatos"
          descricao="WhatsApp, telefone, e-mail, site e endereço"
          status={<StatusTag preenchido={!!(b.contact_whatsapp || b.contact_phone || b.contact_email)} />}
        >
          <span id="contatos" />
          {camposContato}
        </Secao>

        <Link href="/admin/agent" className="mt-3 flex items-center gap-3 rounded-[18px] px-1 py-2 text-[13.5px] text-text-secondary">
          <span className="orbi-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] text-on-background">✦</span>
          <span className="min-w-0 flex-1">Próximo: configurar sua IA</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
      )}

      {section === "contatos" && camposContato}

      {section === "orbi" && (<>
      {!embutido && <HelperText>O texto que ela usa pra responder seus visitantes. Escreva do seu jeito ou corrija o que ela já escreveu.</HelperText>}

      {/* Ensinar a Orbi acontece na página Sua IA, que tem o fluxo
          guiado (ler o site, entrevista de 5 perguntas). Aqui é só o texto
          final, pra revisar e ajustar. Este atalho liga as duas pontas. */}
      {!embutido && <Link
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
      </Link>}

      <p className={embutido ? "text-[13px] uppercase tracking-wide text-text-tertiary" : rotulo}>Sobre o negócio</p>
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

      {/* Fecha o ciclo: a pessoa acabou de preencher na mão, e aqui lembra
          que a Orbi faz isso sozinha lendo o site, deixando mais afiado. */}
      {!embutido && <Link
        href="/admin/agent"
        className="mt-8 flex items-center gap-3.5 rounded-[22px] orbi-gradient p-[1.5px]"
      >
        <span className="flex w-full items-center gap-3.5 rounded-[21px] bg-surface-white p-4">
          <span className="orbi-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[17px] text-on-background">✦</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-semibold leading-tight">Quer calibrar ainda mais?</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">
              Cole o link do seu site e a Orbi aprende sozinha, completando o que faltou aqui.
            </span>
          </span>
          <span className="shrink-0 text-text-tertiary">→</span>
        </span>
      </Link>}
      </>)}

      {/* Aviso flutuante: o "Salvo" antigo ficava no fim da página e quem
          mexia nos chips lá em cima nunca via, parecendo que não salvou. */}
      {saved && (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center">
          <span className="orbi-green-gradient flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-white shadow-lg">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Salvo
          </span>
        </div>
      )}
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
