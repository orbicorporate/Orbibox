"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OrbiWorking } from "@/components/orbi/OrbiWorking";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { ComoOrbiAprende } from "./ComoOrbiAprende";
import { StatusTag } from "@/components/ui/SecaoRecolhivel";
import { GuiaPassos, Secao, rolarAte } from "@/components/ui/GuiaPassos";
import { gravarFlag, useFlag } from "@/lib/useFlag";
import { ConfigForm } from "@/app/admin/config/ConfigForm";
import { useEffect, useRef } from "react";

type Config = { id: string; agent_name: string; tone_formal_informal: number; tone_reserved_energetic: number; tone_concise_detailed: number; objectives: string[]; orbi_colors: string[] | null; suggested_questions: string[]; curation_question: string | null; curation_options: string[]; };
type Knowledge = { catalogo: boolean; historia: boolean; politicas: boolean; diferenciais: boolean };

const SLIDERS = [
  { key: "tone_formal_informal", from: "Formal", to: "Descontraído" },
  { key: "tone_reserved_energetic", from: "Reativa", to: "Proativa" },
  { key: "tone_concise_detailed", from: "Direto", to: "Inspiracional" },
] as const;

type SecaoIA = "sabe" | "jeito" | "mais";
type BusinessConhecimento = Parameters<typeof ConfigForm>[0]["business"];

export function AgentConfigForm({ config, businessId, businessName, slug, knowledge, gapsPendentes = 0, business }: { config: Config; businessId: string; businessName: string; slug: string; knowledge: Knowledge; gapsPendentes?: number; business: BusinessConhecimento }) {
  const supabase = createClient();
  const router = useRouter();
  const [state, setState] = useState(config);
  const [saved, setSaved] = useState(false);
  const [buildingAbout, setBuildingAbout] = useState(false);
  const [aboutBuilt, setAboutBuilt] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jeitoVisto = useFlag(`ia_jeito_${businessId}`);

  // Quem chega por #o-que-sabe (vindo de outro lugar do app) já cai com a
  // seção aberta.
  const [abertos, setAbertos] = useState<Record<SecaoIA, boolean>>(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    return { sabe: hash === "o-que-sabe", jeito: hash === "jeito", mais: false };
  });
  function alternar(sec: SecaoIA) {
    setAbertos((a) => ({ ...a, [sec]: !a[sec] }));
    if (sec === "jeito") gravarFlag(`ia_jeito_${businessId}`);
  }
  function abrirERolar(sec: SecaoIA, id: string) {
    setAbertos((a) => ({ ...a, [sec]: true }));
    if (sec === "jeito") gravarFlag(`ia_jeito_${businessId}`);
    rolarAte(id);
  }

  // O aviso de salvo some sozinho.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(t);
  }, [saved]);

  const sabeTudo = knowledge.historia && knowledge.diferenciais && knowledge.politicas;

  async function buildAboutPage() {
    setBuildingAbout(true);
    setBuildError(null);
    try {
      const res = await fetch("/api/build-about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBuildError(data.error ?? "Não consegui montar a página agora.");
      } else {
        setAboutBuilt(true);
      }
    } catch {
      setBuildError("Erro de conexão. Tenta de novo.");
    } finally {
      setBuildingAbout(false);
    }
  }

  // Salva sozinho: cada mudança espera um instante (pra não gravar a cada
  // movimento do slider) e grava só o que mudou.
  function salvarDepois(next: Config) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { error } = await supabase.from("agent_configs").update({
        agent_name: next.agent_name?.trim() || "Orbi",
        tone_formal_informal: next.tone_formal_informal,
        tone_reserved_energetic: next.tone_reserved_energetic,
        tone_concise_detailed: next.tone_concise_detailed,
        suggested_questions: next.suggested_questions.map((q) => q.trim()).filter(Boolean),
        curation_question: next.curation_question?.trim() || null,
        curation_options: (next.curation_options ?? []).map((o) => o.trim()).filter(Boolean),
      }).eq("id", next.id);
      if (!error) setSaved(true);
    }, 700);
  }

  function mudar(patch: Partial<Config>) {
    const next = { ...state, ...patch };
    setState(next);
    salvarDepois(next);
  }

  const orbiColors: string[] = state.orbi_colors && state.orbi_colors.length >= 2
    ? state.orbi_colors
    : ["#7FE84A", "#8B2BFF"];
  const nome = state.agent_name?.trim() || "Orbi";

  const casual = state.tone_formal_informal > 50;
  const proativa = state.tone_reserved_energetic > 50;
  const inspira = state.tone_concise_detailed > 50;
  // Prévia que muda com os três ajustes, pra pessoa sentir o efeito.
  const preview = [
    casual ? "Oi! Que bom te ver por aqui ✦" : "Olá, tudo bem?",
    inspira
      ? `Pra esse momento, eu iria direto nos queridinhos da ${businessName}: combinam com o que você procura e têm aquele toque especial.`
      : `Recomendo os mais pedidos da ${businessName}, atendem bem o que você procura.`,
    proativa ? "Quer que eu separe as opções pra você?" : "",
  ].filter(Boolean).join(" ");
  const tomResumo = [casual ? "descontraída" : "formal", proativa ? "proativa" : "reativa", inspira ? "inspiradora" : "direta"].join(", ");

  const campo = "w-full rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background";

  return (
    <div className="mt-5 flex flex-col gap-3 pb-8">
      <GuiaPassos
        titulo="Sua IA em 3 passos"
        chave={`ia_${businessId}`}
        passos={[
          { titulo: "Ensine a Orbi", detalhe: "Ela lê seu site ou faz 5 perguntas", feito: knowledge.historia, onClick: () => rolarAte("ia-ensine") },
          { titulo: "Revise o que ela sabe", detalhe: "Sobre o negócio, diferenciais e políticas", feito: sabeTudo, onClick: () => abrirERolar("sabe", "o-que-sabe") },
          { titulo: "Jeito de falar", detalhe: "Nome e tom da conversa", feito: jeitoVisto, onClick: () => abrirERolar("jeito", "ia-jeito") },
        ]}
      />

      <div id="ia-ensine" className="scroll-mt-24">
        <ComoOrbiAprende businessId={businessId} businessName={businessName} orbiColors={orbiColors} gapsPendentes={gapsPendentes} baseFeita={knowledge.historia} siteSalvo={(business as { contact_site?: string | null; website_url?: string | null }).contact_site || (business as { website_url?: string | null }).website_url || null} onDone={() => router.refresh()} />
      </div>

      <Secao
        id="o-que-sabe"
        aberto={abertos.sabe}
        onToggle={() => alternar("sabe")}
        icone={<span className="text-[18px]">📖</span>}
        titulo="O que ela sabe"
        descricao="O texto que ela usa pra responder. Corrija ou complete."
        status={<StatusTag preenchido={sabeTudo} />}
      >
        <ConfigForm business={business} section="orbi" embutido />
      </Secao>

      <Secao
        id="ia-jeito"
        aberto={abertos.jeito}
        onToggle={() => alternar("jeito")}
        icone={<OrbiParticleSphere size={44} colors={orbiColors} className="rounded-full" />}
        titulo="Jeito de falar"
        descricao={`${nome}, ${tomResumo}`}
      >
        <p className="text-[13px] font-medium text-text-secondary">Nome</p>
        <input
          value={state.agent_name}
          onChange={(e) => mudar({ agent_name: e.target.value })}
          placeholder="Orbi"
          className={`mt-1.5 ${campo}`}
        />
        <p className="mt-1.5 text-[11.5px] leading-snug text-text-tertiary">É como ela se apresenta. Pode ser o nome da marca ou um nome próprio.</p>

        <p className="mt-5 text-[13px] font-medium text-text-secondary">Tom</p>
        <div className="mt-2 flex flex-col gap-4">
          {SLIDERS.map((sl) => (
            <div key={sl.key}>
              <div className="flex justify-between text-[11px] uppercase tracking-wide text-text-tertiary">
                <span>{sl.from}</span><span>{sl.to}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={state[sl.key]}
                onChange={(e) => mudar({ [sl.key]: Number(e.target.value) } as Partial<Config>)}
                className="mt-1.5 w-full accent-[#111318]"
              />
            </div>
          ))}
        </div>

        <p className="mt-5 text-[13px] font-medium text-text-secondary">Assim ela responde</p>
        <div className="mt-2 flex flex-col gap-2 rounded-2xl bg-surface-soft p-3.5">
          <div className="self-end rounded-2xl bg-surface-white px-3.5 py-2 text-[13px]">Oi, estou procurando uma indicação.</div>
          <div className="max-w-[88%] rounded-2xl bg-on-background px-3.5 py-2.5 text-[13px] leading-relaxed text-white">{preview}</div>
        </div>
      </Secao>

      <Secao
        id="ia-mais"
        aberto={abertos.mais}
        onToggle={() => alternar("mais")}
        icone={<span className="text-[18px]">⚙️</span>}
        titulo="Mais ajustes"
        descricao="Perguntas do chat, pergunta de curadoria e página Sobre"
      >
        <p className="text-[14px] font-semibold">Perguntas sugeridas no chat</p>
        <p className="mt-0.5 text-[12px] leading-snug text-text-tertiary">Os botões do início da conversa. Em branco, a {nome} sugere sozinha.</p>
        <div className="mt-2.5 flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              value={state.suggested_questions[i] ?? ""}
              onChange={(e) => {
                const next = [...state.suggested_questions];
                next[i] = e.target.value;
                mudar({ suggested_questions: next });
              }}
              placeholder={`ex: ${["Quais os valores?", "Como funciona?", "Vocês entregam?", "Quero falar com alguém"][i]}`}
              className={campo}
            />
          ))}
        </div>

        <p className="mt-6 text-[14px] font-semibold">✦ Pergunta da curadoria</p>
        <p className="mt-0.5 text-[12px] leading-snug text-text-tertiary">Ela pergunta algo e recomenda o que combina com a resposta. Em branco, cria sozinha.</p>
        <input
          value={state.curation_question ?? ""}
          onChange={(e) => mudar({ curation_question: e.target.value })}
          placeholder="ex: O que você procura hoje?"
          className={`mt-2.5 ${campo}`}
        />
        <div className="mt-2 flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              value={state.curation_options?.[i] ?? ""}
              onChange={(e) => {
                const next = [...(state.curation_options ?? [])];
                next[i] = e.target.value;
                mudar({ curation_options: next });
              }}
              placeholder={`Resposta ${i + 1}${i < 2 ? "" : " (opcional)"}`}
              className={campo}
            />
          ))}
        </div>

        <p className="mt-6 text-[14px] font-semibold">Página Sobre</p>
        <p className="mt-0.5 text-[12px] leading-snug text-text-tertiary">
          {aboutBuilt
            ? `Pronto, a página Sobre de ${businessName} foi montada.`
            : sabeTudo
            ? "A Orbi junta o que ela sabe numa página Sobre completa."
            : "Complete \"O que ela sabe\" pra Orbi montar a página Sobre."}
        </p>
        {buildError && <p className="mt-2 text-[13px] text-red-600">{buildError}</p>}
        {buildingAbout ? (
          <div className="mt-3"><OrbiWorking label="Montando sua página Sobre…" colors={orbiColors} /></div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={buildAboutPage}
              disabled={!sabeTudo}
              className="rounded-full bg-button-primary px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40"
            >
              {aboutBuilt ? "Montar de novo" : "✦ Montar página Sobre"}
            </button>
            <Link href={`/${slug}?tab=conhecer`} target="_blank" className="rounded-full border border-divider bg-surface-white px-4 py-2 text-[13px] font-medium">
              Ver página Sobre ↗
            </Link>
          </div>
        )}
      </Secao>

      {saved && (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center">
          <span className="orbi-green-gradient flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-white shadow-lg">✓ Salvo</span>
        </div>
      )}
    </div>
  );
}
