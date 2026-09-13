"use client";

import { useState } from "react";
import Link from "next/link";
import { OrbiEntrevista } from "./OrbiEntrevista";

export function ComoOrbiAprende({ businessId, businessName, orbiColors, gapsPendentes = 0, jaImportou = false, onDone }: { businessId: string; businessName: string; orbiColors?: string[] | null; gapsPendentes?: number; jaImportou?: boolean; onDone?: () => void }) {
  const [url, setUrl] = useState("");
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(jaImportou ? { ok: true, msg: "A Orbi já leu seu site e aprendeu com ele." } : null);
  const [semSite, setSemSite] = useState(false);

  async function importar() {
    if (!url.trim() || importando) return;
    setImportando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/import-about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResultado({ ok: false, msg: data.error || "Não consegui ler esse site. Confira o endereço ou pule esta etapa." });
        return;
      }
      setResultado({ ok: true, msg: "Pronto! A Orbi leu seu site e já preencheu o que aprendeu. Você pode revisar mais abaixo." });
      onDone?.();
    } catch {
      setResultado({ ok: false, msg: "Erro ao ler o site. Tente de novo ou pule esta etapa." });
    } finally {
      setImportando(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E7EAFC] text-[15px]">🧠</span>
        <p className="font-[family-name:var(--font-manrope)] text-[18px] font-medium">Como a Orbi aprende sobre seu negócio</p>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
        Quanto mais ela sabe, melhor atende e cria. Comece pelo seu site (o jeito mais rápido), depois complete o que quiser.
      </p>

      {/* Passo 1: importar do site */}
      <div className="mt-4 rounded-[24px] orbi-gradient p-[1.5px]">
        <div className="rounded-[23px] bg-surface-white p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#DEF3E3] text-[17px]">🌐</span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">Comece pelo seu site</p>
              <p className="text-[12.5px] text-text-tertiary">A Orbi lê e aprende sozinha em segundos.</p>
            </div>
          </div>

          {resultado?.ok ? (
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-[#DEF3E3] px-3.5 py-2.5">
              <span className="mt-0.5 text-[13px]">✓</span>
              <span className="text-[13px] leading-relaxed text-[#1F9E4C]">{resultado.msg}</span>
            </div>
          ) : !semSite ? (
            <>
              <div className="mt-3 flex gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") importar(); }}
                  placeholder="www.seusite.com.br ou seu Instagram"
                  className="min-w-0 flex-1 rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
                />
                <button
                  onClick={importar}
                  disabled={importando || !url.trim()}
                  className="shrink-0 rounded-full bg-button-primary px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-40"
                >
                  {importando ? "Lendo…" : "Importar"}
                </button>
              </div>
              {resultado && !resultado.ok && <p className="mt-2 text-[12.5px] text-red-600">{resultado.msg}</p>}
              <button onClick={() => setSemSite(true)} className="mt-2.5 text-[12.5px] font-medium text-text-tertiary underline">
                Não tenho site, pular pra outra forma
              </button>
            </>
          ) : (
            <p className="mt-3 text-[13px] text-text-secondary">
              Sem problema. Use os caminhos abaixo pra ensinar a Orbi.{" "}
              <button onClick={() => setSemSite(false)} className="font-medium underline">Tenho um site</button>
            </p>
          )}
        </div>
      </div>

      {/* Passo 2: você ensina (a entrevista) */}
      <div className="mt-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Ou responda um papo rápido</p>
        <OrbiEntrevista businessId={businessId} orbiColors={orbiColors} onDone={onDone} />
      </div>

      {/* Passo 3: aprende com as conversas */}
      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">E aprende com as conversas reais</p>
        <Link href="/admin/agent/aprendizado" className="flex w-full items-center gap-3.5 rounded-[24px] border border-divider bg-surface-white p-5 text-left">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FDEEDF] text-[20px]">💬</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">O que a Orbi aprendeu com visitantes</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-text-tertiary">
              {gapsPendentes > 0
                ? `Ela notou ${gapsPendentes} ${gapsPendentes === 1 ? "coisa que não soube" : "coisas que não soube"} responder. Ensine ela.`
                : "Conforme conversam, ela percebe o que não soube responder e sugere o que ensinar."}
            </span>
          </span>
          {gapsPendentes > 0 ? (
            <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#1F9E4C] px-1.5 text-[12px] font-bold text-white">{gapsPendentes}</span>
          ) : (
            <span className="text-text-tertiary">→</span>
          )}
        </Link>
      </div>
    </div>
  );
}
