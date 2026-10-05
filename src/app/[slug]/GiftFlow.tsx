"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { GiftArt } from "@/components/mobile/GiftArt";

type Config = {
  enabled: boolean;
  art_url: string | null;
  art_theme: string | null;
  suggested_values: number[] | null;
  allow_custom_value: boolean;
  min_value_cents: number;
  message: string | null;
};

/**
 * Cliente monta um gift card: valor, pra quem, de quem, mensagem. Vê a arte
 * bloqueada (marca d'água) e libera por WhatsApp: a loja combina o
 * pagamento, recebe, e libera no painel. Aí a arte fica limpa.
 */
export function GiftFlow({ businessId, businessName, whatsapp, onBack }: {
  businessId: string;
  businessName: string;
  whatsapp: string | null;
  onBack: () => void;
}) {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [valor, setValor] = useState<number>(100);
  const [customValor, setCustomValor] = useState("");
  const [paraQuem, setParaQuem] = useState("");
  const [deQuem, setDeQuem] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [criado, setCriado] = useState<{ code: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("gift_settings").select("enabled, art_url, art_theme, suggested_values, allow_custom_value, min_value_cents, message").eq("business_id", businessId).maybeSingle().then(({ data }) => {
      setCfg((data as Config) ?? { enabled: false, art_url: null, art_theme: "roxo", suggested_values: [50, 100, 150, 200], allow_custom_value: true, min_value_cents: 2000, message: null });
      if (data?.suggested_values?.[1]) setValor(data.suggested_values[1]);
    });
  }, [businessId]);

  const valorFinal = customValor ? Math.round(parseFloat(customValor.replace(",", ".")) || 0) : valor;
  const valorCents = valorFinal * 100;

  async function criar() {
    if (!cfg) return;
    if (valorCents < cfg.min_value_cents) {
      setErro(`O valor mínimo é R$ ${(cfg.min_value_cents / 100).toFixed(0)}.`);
      return;
    }
    setCriando(true);
    setErro(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.rpc("create_gift_card", {
        p_business_id: businessId,
        p_value_cents: valorCents,
        p_from: deQuem,
        p_to: paraQuem,
        p_message: mensagem,
        p_whatsapp: "",
      });
      const r = (data ?? {}) as { ok?: boolean; code?: string };
      if (!r.ok || !r.code) { setErro("Não consegui gerar agora. Tenta de novo."); return; }
      setCriado({ code: r.code });
    } catch {
      setErro("Erro de conexão. Tenta de novo.");
    } finally {
      setCriando(false);
    }
  }

  function liberarPorWhatsapp() {
    if (!criado || !whatsapp) return;
    const texto = `Oi! Quero presentear alguém com um gift card de ${businessName}.\n\nValor: ${(valorCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}\n${paraQuem ? `Para: ${paraQuem}\n` : ""}${deQuem ? `De: ${deQuem}\n` : ""}Código: ${criado.code}\n\nComo faço pra pagar e liberar?`;
    window.open(`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`, "_blank");
  }

  if (!cfg) {
    return <div className="w-full py-10 text-center text-[14px] text-text-tertiary">Carregando…</div>;
  }

  if (!cfg.enabled) {
    return (
      <div className="w-full">
        <button onClick={onBack} className="mb-3 text-[14px] text-text-tertiary hover:underline">← voltar</button>
        <div className="rounded-[24px] border border-divider bg-surface-white p-6 text-center text-[14px] text-text-secondary">
          Os gift cards ainda não estão disponíveis aqui.
        </div>
      </div>
    );
  }

  const sugeridos = cfg.suggested_values ?? [50, 100, 150, 200];

  return (
    <div className="w-full">
      <button onClick={onBack} className="mb-3 text-[14px] text-text-tertiary hover:underline">← voltar</button>
      <h2 className="font-[family-name:var(--font-manrope)] text-[24px] font-medium tracking-[-0.01em]">Dê um presente</h2>
      <p className="mt-1 text-[14px] text-text-secondary">Monte um gift card de {businessName} pra quem você quiser.</p>

      {/* Prévia da arte, atualiza ao vivo. Bloqueada até liberar. */}
      <div className="mt-5">
        <GiftArt
          valorCents={valorCents}
          paraQuem={paraQuem}
          deQuem={deQuem}
          mensagem={mensagem}
          negocio={businessName}
          codigo={criado?.code ?? "GIFT-••••••"}
          artUrl={cfg.art_url}
          artTheme={cfg.art_theme}
          bloqueado
        />
      </div>

      {!criado ? (
        <>
          <p className="mt-6 text-[13px] font-semibold">Valor</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sugeridos.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => { setValor(v); setCustomValor(""); }}
                className={`rounded-full px-4 py-2 text-[14px] font-semibold ${!customValor && valor === v ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}
              >
                R$ {v}
              </button>
            ))}
            {cfg.allow_custom_value && (
              <div className="flex items-center gap-1.5 rounded-full bg-surface-soft px-3 py-1.5">
                <span className="text-[13px] text-text-tertiary">R$</span>
                <input
                  value={customValor}
                  onChange={(e) => setCustomValor(e.target.value.replace(/[^\d,]/g, ""))}
                  placeholder="outro"
                  inputMode="numeric"
                  className="w-16 bg-transparent text-[14px] font-semibold outline-none"
                />
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <input value={paraQuem} onChange={(e) => setParaQuem(e.target.value)} placeholder="Pra quem é o presente? (opcional)" className="w-full rounded-full border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
            <input value={deQuem} onChange={(e) => setDeQuem(e.target.value)} placeholder="Seu nome (opcional)" className="w-full rounded-full border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
            <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={2} placeholder="Mensagem (opcional)" className="w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
          </div>

          {erro && <p className="mt-2 text-[13px] text-red-600">{erro}</p>}

          <button onClick={criar} disabled={criando} className="mt-4 w-full rounded-full bg-on-background py-3.5 text-[15px] font-semibold text-white disabled:opacity-50">
            {criando ? "Gerando…" : "Gerar meu gift card"}
          </button>
        </>
      ) : (
        <div className="mt-5 rounded-[24px] bg-surface-soft p-5">
          <p className="text-center text-[15px] font-semibold">Seu gift está reservado 🎁</p>
          <ol className="mt-4 flex flex-col gap-3">
            {[
              ["Libere pelo WhatsApp", "Abre uma conversa com a loja já com o código do gift."],
              ["A loja combina o pagamento", "Pix, cartão ou como vocês preferirem."],
              ["Envie o presente", "Com o pagamento confirmado, abra o seu gift e mande pra quem vai receber."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-on-background text-[12px] font-semibold text-white">{i + 1}</span>
                <span className="text-[13.5px] leading-snug">
                  <span className="block font-medium">{t}</span>
                  <span className="text-text-secondary">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          {whatsapp && (
            <button onClick={liberarPorWhatsapp} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 text-[15px] font-semibold text-white">
              Liberar gift pelo WhatsApp
            </button>
          )}
          <a href={`/gift/${criado.code}`} target="_blank" rel="noreferrer" className="mt-3 block rounded-full border border-divider bg-surface-white py-3 text-center text-[14px] font-medium">
            Abrir meu gift (código {criado.code})
          </a>
          <p className="mt-3 text-center text-[12px] text-text-tertiary">Guarde esse código. Ele também fica no link acima.</p>
          <button onClick={onBack} className="mt-2 block w-full py-2 text-center text-[13px] text-text-secondary underline">
            Voltar ao início
          </button>
        </div>
      )}
    </div>
  );
}
