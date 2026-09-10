"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { OrbiWorking } from "@/components/orbi/OrbiWorking";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { OrbiInsightCard, OrbiInsightHeader, OrbiInsightMessage } from "@/components/orbi/OrbiInsightCard";

type Config = { id: string; agent_name: string; tone_formal_informal: number; tone_reserved_energetic: number; tone_concise_detailed: number; objectives: string[]; orbi_colors: string[] | null; suggested_questions: string[]; curation_question: string | null; curation_options: string[]; };
type Knowledge = { catalogo: boolean; historia: boolean; politicas: boolean; diferenciais: boolean };

const SLIDERS = [
  { key: "tone_formal_informal", from: "Formal", to: "Descontraído" },
  { key: "tone_reserved_energetic", from: "Reativa", to: "Proativa" },
  { key: "tone_concise_detailed", from: "Direto", to: "Inspiracional" },
] as const;

// Cada item aponta pra onde a pessoa preenche (manualmente ou "Importar do site").
const KNOWLEDGE: { key: keyof Knowledge; label: string; href: string }[] = [
  { key: "catalogo", label: "Catálogo de Produtos", href: "/admin/vitrine" },
  { key: "historia", label: "História da Marca", href: "/admin/config" },
  { key: "politicas", label: "Políticas de Envio", href: "/admin/config" },
  { key: "diferenciais", label: "Estilo e Curadoria", href: "/admin/config" },
];

export function AgentConfigForm({ config, businessId, businessName, slug, knowledge }: { config: Config; businessId: string; businessName: string; slug: string; knowledge: Knowledge }) {
  const supabase = createClient();
  const [state, setState] = useState(config);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [buildingAbout, setBuildingAbout] = useState(false);
  const [aboutBuilt, setAboutBuilt] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  const knowledgeComplete = Object.values(knowledge).every(Boolean);

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

  function set(key: (typeof SLIDERS)[number]["key"], v: number) { setState((s) => ({ ...s, [key]: v })); setSaved(false); }

  // Cores da esfera da Orbi — a edição agora fica em Configurações, junto do
  // logotipo. Aqui só lemos o valor (pra usar na esfera de "IA trabalhando").
  const orbiColors: string[] = state.orbi_colors && state.orbi_colors.length >= 2
    ? state.orbi_colors
    : ["#7FE84A", "#8B2BFF"];

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("agent_configs").update({
      agent_name: state.agent_name,
      tone_formal_informal: state.tone_formal_informal,
      tone_reserved_energetic: state.tone_reserved_energetic,
      tone_concise_detailed: state.tone_concise_detailed,
      objectives: state.objectives,
      suggested_questions: state.suggested_questions.map((q) => q.trim()).filter(Boolean),
      curation_question: state.curation_question?.trim() || null,
      curation_options: (state.curation_options ?? []).map((o) => o.trim()).filter(Boolean),
    }).eq("id", state.id);
    setSaving(false);
    if (!error) setSaved(true);
  }

  const casual = state.tone_formal_informal > 50;
  const preview = casual
    ? `Olá! Notei que você gosta de tons neutros. Que tal conhecer nossa nova coleção? É perfeita para manter a elegância fresca nos dias quentes ✦`
    : `Boa tarde. Com base no seu interesse, recomendo conhecer nossa nova coleção — ideal para a estação.`;

  return (
    <div className="mt-6 flex flex-col gap-7 pb-8">
      {/* Perfil da agente */}
      <div className="flex items-center gap-4 rounded-[28px] bg-surface-white p-6 shadow-[0_2px_16px_rgba(17,19,24,0.05)]">
        <OrbiOrb size={64} />
        <div className="flex-1">
          <input
            value={state.agent_name}
            onChange={(e) => { setState((s) => ({ ...s, agent_name: e.target.value })); setSaved(false); }}
            placeholder="Orbi"
            className="w-full bg-transparent font-[family-name:var(--font-manrope)] text-[18px] font-medium outline-none"
          />
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-text-tertiary">
            <span className="h-1.5 w-1.5 rounded-full bg-orbi-gradient-start" /> Ativa
          </p>
          <p className="mt-1 text-[12px] text-text-secondary">Agente Especialista de Conversão e Curadoria</p>
        </div>
      </div>
      <p className="-mt-3 px-1 text-[12px] leading-relaxed text-text-tertiary">
        ✦ Toque no nome acima para personalizar — dê à IA o nome da sua marca (ex.: “{businessName}”, “Nina”, “Léo”) ou deixe como <span className="font-medium text-text-secondary">Orbi</span>. É assim que ela vai se apresentar aos visitantes.
      </p>

      <Link href="/admin/config#cores-orbi" className="-mt-3 flex items-center gap-3 self-start rounded-full border border-divider bg-surface-white py-1.5 pl-1.5 pr-4">
        <OrbiParticleSphere key={orbiColors.join("-")} size={32} colors={orbiColors} className="rounded-full" />
        <span className="text-[13px] font-medium">✦ Configurar cores da Orbi</span>
      </Link>

      {/* Ajuste de comportamento */}
      <div>
        <p className="px-1 text-[15px] font-semibold">Ajuste de Comportamento</p>
        <div className="mt-4 flex flex-col gap-5 rounded-[28px] bg-surface-white p-6 shadow-[0_2px_16px_rgba(17,19,24,0.05)]">
          {SLIDERS.map((s) => (
            <div key={s.key}>
              <div className="flex justify-between text-[11px] uppercase tracking-wide text-text-tertiary">
                <span>{s.from}</span><span>{s.to}</span>
              </div>
              <input type="range" min={0} max={100} value={state[s.key]} onChange={(e) => set(s.key, Number(e.target.value))} className="mt-2 w-full accent-[#111318]" />
            </div>
          ))}
        </div>
      </div>

      {/* Preview de interação */}
      <div>
        <p className="px-1 text-[15px] font-semibold">Preview de Interação</p>
        <div className="mt-4 flex flex-col gap-3 rounded-[28px] bg-surface-white p-6 shadow-[0_2px_16px_rgba(17,19,24,0.05)]">
          <div className="self-end rounded-2xl bg-surface-soft px-4 py-2 text-[13px]">Oi, procuro algo pro verão.</div>
          <div className="max-w-[85%] rounded-2xl bg-on-background px-4 py-3 text-[13px] leading-relaxed text-white">{preview}</div>
        </div>
      </div>

      {/* Base de conhecimento */}
      <div>
        <p className="text-[14px] font-medium">Base de Conhecimento Ativa</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {KNOWLEDGE.map((k) => {
            const cheio = knowledge[k.key];
            return cheio ? (
              <span key={k.key} className="inline-flex items-center gap-1.5 rounded-full bg-orbi-gradient-start/25 px-3 py-1.5 text-[12px] font-medium text-on-background">
                <span className="h-1.5 w-1.5 rounded-full bg-orbi-gradient-start" /> {k.label}
              </span>
            ) : (
              <Link
                key={k.key}
                href={k.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-divider px-3 py-1.5 text-[12px] text-text-tertiary"
              >
                {k.label} · preencher
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quando tudo estiver preenchido, a Orbi já pode costurar a página
          Sobre inteira com esse material — sem precisar escrever do zero. */}
      {knowledgeComplete && (
        <div className="rounded-[28px] orbi-gradient p-[1.5px]">
          <div className="rounded-[27px] bg-surface-white p-5">
            <p className="text-[14px] font-medium"><span className="orbi-gradient-text">✦</span> Base de conhecimento completa</p>
            <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
              {aboutBuilt
                ? `Pronto — a página Sobre de ${businessName} já está montada com essas informações.`
                : `A Orbi já pode montar a página Sobre completa de ${businessName} juntando tudo isso — história, diferenciais e o que o catálogo mostra.`}
            </p>
            {buildError && <p className="mt-2 text-[13px] text-red-600">{buildError}</p>}
            {buildingAbout ? (
              <div className="mt-4"><OrbiWorking label="Montando sua página Sobre…" colors={orbiColors} /></div>
            ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {!aboutBuilt ? (
                <button
                  onClick={buildAboutPage}
                  className="rounded-full bg-button-primary px-5 py-2.5 text-[13px] font-medium text-white"
                >
                  ✦ Montar página Sobre
                </button>
              ) : (
                <button
                  onClick={buildAboutPage}
                  className="rounded-full border border-divider bg-surface-white px-5 py-2.5 text-[13px] text-text-secondary"
                >
                  Montar de novo
                </button>
              )}
              <Link
                href={`/${slug}?tab=conhecer`}
                target="_blank"
                className="rounded-full border border-divider bg-surface-white px-5 py-2.5 text-[13px] font-medium"
              >
                Ver página Sobre ↗
              </Link>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Perguntas sugeridas no chat */}
      <div className="rounded-[28px] bg-surface-white p-6 shadow-[0_2px_16px_rgba(17,19,24,0.05)]">
        <p className="text-[14px] font-medium">Perguntas sugeridas no chat</p>
        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
          Os 4 botões que aparecem no início da conversa. Deixe em branco pra a {state.agent_name} sugerir sozinha, com base no seu catálogo.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              value={state.suggested_questions[i] ?? ""}
              onChange={(e) => {
                setSaved(false);
                setState((s) => {
                  const next = [...s.suggested_questions];
                  next[i] = e.target.value;
                  return { ...s, suggested_questions: next };
                });
              }}
              placeholder={`Sugestão ${i + 1} (ex: ${["Quais os valores?", "Como funciona?", "Vocês entregam?", "Quero falar com alguém"][i]})`}
              className="w-full rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
            />
          ))}
        </div>
      </div>

      {/* Pergunta da curadoria (Orbi recomenda) */}
      <div className="rounded-[28px] bg-surface-white p-6 shadow-[0_2px_16px_rgba(17,19,24,0.05)]">
        <p className="text-[14px] font-medium">✦ Pergunta da curadoria</p>
        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
          Na sua página, a {state.agent_name} pergunta algo e recomenda produtos que combinam com a resposta. Deixe em
          branco pra ela criar a pergunta sozinha (analisando seu catálogo), ou defina a sua.
        </p>
        <input
          value={state.curation_question ?? ""}
          onChange={(e) => { setSaved(false); setState((s) => ({ ...s, curation_question: e.target.value })); }}
          placeholder="Ex: O que você procura hoje?"
          className="mt-3 w-full rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
        />
        <p className="mt-3 text-[12px] font-medium text-text-tertiary">Respostas (2 a 4)</p>
        <div className="mt-1.5 flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              value={state.curation_options?.[i] ?? ""}
              onChange={(e) => {
                setSaved(false);
                setState((s) => {
                  const next = [...(s.curation_options ?? [])];
                  next[i] = e.target.value;
                  return { ...s, curation_options: next };
                });
              }}
              placeholder={`Resposta ${i + 1}${i < 2 ? "" : " (opcional)"}`}
              className="w-full rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
            />
          ))}
        </div>
      </div>

      {/* Orbi Insight */}
      <OrbiInsightCard>
        <OrbiInsightHeader />
        <OrbiInsightMessage>
          {state.agent_name} está pronta para performar com abordagens {casual ? "próximas e inspiradoras" : "precisas e consultivas"} para os visitantes de {businessName}.
        </OrbiInsightMessage>
      </OrbiInsightCard>

      <button onClick={save} disabled={saving} className="rounded-full bg-button-primary py-4 text-[13px] font-medium uppercase tracking-wide text-white disabled:opacity-50">
        {saving ? "Salvando…" : saved ? "✓ Personalidade salva" : "Salvar personalidade"}
      </button>
    </div>
  );
}
