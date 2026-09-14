"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OrbiEntrevista } from "./OrbiEntrevista";

export function ComoOrbiAprende({ businessId, businessName, orbiColors, gapsPendentes = 0, baseFeita = false, onDone }: { businessId: string; businessName: string; orbiColors?: string[] | null; gapsPendentes?: number; baseFeita?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [site, setSite] = useState<"idle" | "form">("idle");
  const [feito, setFeito] = useState(baseFeita);

  async function importar() {
    if (!url.trim() || importando) return;
    setImportando(true);
    setErro(null);
    try {
      const res = await fetch("/api/import-about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Não consegui ler esse site."); return; }
      setFeito(true);
      setSite("idle");
      onDone?.();
      router.refresh();
    } catch {
      setErro("Erro ao ler o site. Tente de novo.");
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-divider bg-surface-white p-5">
      <div>
        <p className="font-[family-name:var(--font-manrope)] text-[19px] font-semibold leading-tight">Ensine a Orbi</p>
        <p className="text-[12.5px] text-text-tertiary">{feito ? "Ela já conhece seu negócio. Você pode reforçar abaixo." : "Faça o passo 1 ou 2 pra ela conhecer seu negócio."}</p>
      </div>

      <div className="mt-4 flex flex-col">
        {/* PASSO 1 — site */}
        <Passo
          n={1}
          feito={feito}
          titulo="Importe seu site"
          desc={feito ? "Base do negócio já registrada. Toque pra reforçar." : "O jeito mais rápido: ela lê em segundos."}
          onClick={() => setSite((s) => (s === "form" ? "idle" : "form"))}
        >
          {site === "form" && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") importar(); }}
                  placeholder="www.seusite.com.br"
                  autoFocus
                  className="min-w-0 flex-1 rounded-full border border-divider bg-surface-white px-4 py-2 text-[13.5px] outline-none focus:border-on-background"
                />
                <button onClick={importar} disabled={importando || !url.trim()} className="shrink-0 rounded-full bg-button-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40">
                  {importando ? "Lendo…" : "Ler"}
                </button>
              </div>
              {erro && <p className="mt-1.5 text-[12px] text-red-600">{erro}</p>}
            </div>
          )}
        </Passo>

        <Divisor />

        {/* PASSO 2 — entrevista */}
        <Passo n={2} feito={feito} titulo="Ou responda 5 perguntas" desc={feito ? "Se quiser, refaça pra atualizar." : "Um papo rápido; ela preenche tudo sozinha."}>
          <div className="mt-2">
            <OrbiEntrevista businessId={businessId} orbiColors={orbiColors} onDone={() => { onDone?.(); router.refresh(); }} compact />
          </div>
        </Passo>

        <Divisor />

        {/* PASSO 3 — aprende com conversas (contínuo) */}
        <Passo
          n={3}
          feito={false}
          continuo
          titulo="Ela aprende com as conversas"
          desc={gapsPendentes > 0 ? `${gapsPendentes} ${gapsPendentes === 1 ? "dúvida" : "dúvidas"} que ela não soube. Ensine ela.` : "Automático, conforme os visitantes conversam."}
          href="/admin/agent/aprendizado"
          badge={gapsPendentes > 0 ? gapsPendentes : undefined}
        />
      </div>

      {!feito && (
        <p className="mt-4 rounded-2xl bg-surface-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-text-secondary">
          💡 Faça pelo menos um dos dois primeiros pra a Orbi começar bem.
        </p>
      )}
    </div>
  );
}

function Divisor() {
  return <div className="ml-[11px] h-3 w-px bg-divider" />;
}

function Passo({ n, feito, continuo, titulo, desc, children, href, badge, onClick }: {
  n: number; feito: boolean; continuo?: boolean; titulo: string; desc: string; children?: React.ReactNode; href?: string; badge?: number; onClick?: () => void;
}) {
  const bolinha = (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-150 ${
      feito ? "bg-[#1F9E4C] text-white" : continuo ? "bg-[#FDEEDF] text-[#C2650A]" : "bg-surface-soft text-text-secondary"
    }`}>
      <span className={feito ? "orbi-check-pop" : ""} key={feito ? "check" : "pending"}>
        {feito ? "✓" : continuo ? "∞" : n}
      </span>
    </span>
  );

  const conteudo = (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      {bolinha}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-[15px] font-semibold ${feito ? "text-text-tertiary line-through" : ""}`}>{titulo}</p>
          {badge && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1F9E4C] px-1.5 text-[11px] font-bold text-white">{badge}</span>}
          {(href || onClick) && <span className="ml-auto text-text-tertiary">→</span>}
        </div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-text-tertiary">{desc}</p>
        {children}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="py-1">{conteudo}</Link>;
  }
  if (onClick) {
    return <button type="button" onClick={onClick} className="w-full py-1 text-left">{conteudo}</button>;
  }
  return <div className="py-1">{conteudo}</div>;
}
