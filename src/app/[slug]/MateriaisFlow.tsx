"use client";

import { useEffect, useState } from "react";
import { type Material, tipoDoArquivo } from "@/lib/materiais";
import { pesoLegivel, textoSobre } from "@/lib/cardapio";
import { ContatoForm } from "@/components/mobile/ContatoForm";
import { AbrirEditor } from "@/components/mobile/EditarNoLugar";
import { trackClick } from "@/lib/track";

/**
 * Página de materiais: guias, cursos, planilhas e documentos para baixar,
 * como uma vitrine. Cada material é livre (baixa direto) ou pede nome e
 * WhatsApp antes, e esse contato vira lead do negócio.
 */
export function MateriaisFlow({
  business,
  materiais,
  sessionId,
  titulo,
  subtitulo,
  corBotoes = null,
  donoVendo = false,
  onBack,
}: {
  business: { id: string; name: string };
  materiais: Material[];
  sessionId: string | null;
  titulo: string;
  subtitulo: string;
  corBotoes?: string | null;
  donoVendo?: boolean;
  onBack: () => void;
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [liberados, setLiberados] = useState<string[]>([]);
  const cor = corBotoes ?? "#14161B";
  const estilo = { backgroundColor: cor, color: textoSobre(cor) };

  useEffect(() => {
    trackClick({ businessId: business.id, kind: "cta", sessionId });
    // Conta uma abertura por visita à tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function baixou(m: Material) {
    trackClick({ businessId: business.id, kind: "link", sessionId, targetUrl: m.url });
  }

  return (
    <div className="w-full pb-8">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onBack} className="text-[14px] text-text-tertiary hover:underline">← voltar</button>
        {donoVendo && (
          <AbrirEditor href="/admin/materiais" rotulo="Editar materiais" className="flex items-center gap-1.5 rounded-full bg-on-background px-3.5 py-2 text-[13px] font-medium text-white shadow-lg">
            <span aria-hidden>✎</span> Editar
          </AbrirEditor>
        )}
      </div>
      <h2 className="font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.01em]">{titulo}</h2>
      <p className="mt-1 text-[14px] text-text-secondary">{subtitulo}</p>

      {materiais.length === 0 ? (
        <p className="mt-8 rounded-[22px] border border-dashed border-divider p-6 text-center text-[14px] text-text-tertiary">
          {donoVendo ? "Você ainda não enviou nenhum material. Toque em Editar para começar." : "Em breve os materiais estarão por aqui."}
        </p>
      ) : (
        <div className="relative isolate mt-6">
          <span aria-hidden className="pointer-events-none absolute -left-10 top-6 -z-10 h-44 w-44 rounded-full opacity-25 blur-3xl" style={{ backgroundColor: cor }} />
          <span aria-hidden className="pointer-events-none absolute -right-12 bottom-10 -z-10 h-48 w-48 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: cor }} />
          <ul className="flex flex-col gap-3.5">
            {materiais.map((m, n) => {
              const pedeContato = m.acesso === "contato" && !liberados.includes(m.id);
              const meta = `${tipoDoArquivo(m.url)}${m.bytes ? ` · ${pesoLegivel(m.bytes)}` : ""}`;
              return (
                <li
                  key={m.id}
                  style={{ animationDelay: `${Math.min(n, 8) * 45}ms` }}
                  className="cardapio-item-in overflow-hidden rounded-[26px] bg-white/55 ring-1 ring-white/80 backdrop-blur-xl shadow-[0_6px_24px_rgba(17,19,24,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]"
                >
                  {m.capa && (
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-soft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.capa} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {!m.capa && (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${cor}1A`, color: `color-mix(in srgb, ${cor} 75%, black)` }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M10 13h5M10 16.5h5" /></svg>
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-[16.5px] font-semibold leading-snug">{m.titulo.trim() || "Material"}</h3>
                        {m.descricao.trim() && <p className="mt-1 whitespace-pre-line break-words text-[13.5px] leading-snug text-text-secondary">{m.descricao}</p>}
                        <p className="mt-1.5 text-[12px] text-text-tertiary">{meta}{m.acesso === "livre" ? " · Grátis" : ""}</p>
                      </div>
                    </div>

                    {pedeContato ? (
                      aberto === m.id ? (
                        <div className="mt-3.5 rounded-2xl bg-white/70 p-3 ring-1 ring-black/[0.04]">
                          <p className="mb-2.5 text-[13px] leading-snug text-text-secondary">Deixe seu contato e o material é liberado aqui mesmo.</p>
                          <ContatoForm
                            businessId={business.id}
                            sessionId={sessionId}
                            origem="material"
                            interesse={`Material: ${m.titulo.trim() || "sem título"}`.slice(0, 120)}
                            botao="Liberar material"
                            aoCapturar={() => { setLiberados((p) => [...p, m.id]); setAberto(null); }}
                          />
                          <p className="mt-2 text-[11.5px] leading-snug text-text-tertiary">Usamos seu contato só para falar sobre este material e novidades de {business.name}.</p>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAberto(m.id)} style={estilo} className="mt-3.5 min-h-[48px] w-full rounded-full text-[14.5px] font-semibold active:scale-[0.98]">Quero receber</button>
                      )
                    ) : (
                      <a href={m.url} target="_blank" rel="noopener" download onClick={() => baixou(m)} style={estilo} className="mt-3.5 inline-flex min-h-[48px] w-full items-center justify-center rounded-full text-[14.5px] font-semibold active:scale-[0.98]">
                        {m.acesso === "contato" ? "Baixar agora" : "Baixar"}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
