"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { GiftArt } from "@/components/mobile/GiftArt";
import { GIFT_THEMES, type GiftTheme } from "@/lib/giftThemes";
import type { Database } from "@/lib/supabase/types";

type Settings = Database["public"]["Tables"]["gift_settings"]["Row"];
type Gift = { id: string; code: string; value_cents: number; from_name: string | null; to_name: string | null; message: string | null; status: string; created_at: string };

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const STATUS = {
  pending: { label: "A liberar", cor: "#C2650A", fundo: "#FDEEDF" },
  paid: { label: "Liberado", cor: "#1F7A3D", fundo: "#DEF3E3" },
  used: { label: "Usado", cor: "#555960", fundo: "#ECEDE9" },
  canceled: { label: "Cancelado", cor: "#B0463C", fundo: "#FBE6E3" },
} as const;

export function GiftManager({ businessId, initialSettings, initialGifts }: { businessId: string; initialSettings: Settings | null; initialGifts: Gift[] }) {
  const supabase = createClient();
  const [enabled, setEnabled] = useState(initialSettings?.enabled ?? false);
  const [artUrl, setArtUrl] = useState(initialSettings?.art_url ?? null);
  const [artTheme, setArtTheme] = useState<GiftTheme>((initialSettings?.art_theme as GiftTheme) ?? "roxo");
  const [minValue, setMinValue] = useState(String((initialSettings?.min_value_cents ?? 2000) / 100));
  const [gifts, setGifts] = useState(initialGifts);
  const [saved, setSaved] = useState(false);

  async function salvar(patch: Partial<Settings>) {
    setSaved(false);
    await supabase.from("gift_settings").upsert({
      business_id: businessId,
      enabled, art_url: artUrl, art_theme: artTheme, min_value_cents: parseInt(minValue, 10) * 100 || 2000,
      ...patch,
    }, { onConflict: "business_id" });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function mudarTema(t: GiftTheme) {
    setArtTheme(t);
    await salvar({ art_theme: t });
  }

  async function toggle() {
    const v = !enabled;
    setEnabled(v);
    await salvar({ enabled: v });
  }

  async function mudarStatus(id: string, status: "paid" | "canceled") {
    await supabase.from("gift_cards").update({ status, ...(status === "paid" ? { paid_at: new Date().toISOString() } : {}) }).eq("id", id);
    setGifts((prev) => prev.map((g) => g.id === id ? { ...g, status } : g));
  }

  const pendentes = gifts.filter((g) => g.status === "pending");

  return (
    <div className="mt-5 flex flex-col gap-4">
      {/* Liga/desliga */}
      <div className="flex items-center justify-between rounded-[22px] border border-divider bg-surface-white p-5">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">Aceitar gift cards</p>
          <p className="mt-0.5 text-[13px] text-text-secondary">Mostra a opção de presentear na sua página.</p>
        </div>
        <button onClick={toggle} className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${enabled ? "bg-[#1F9E4C]" : "bg-surface-soft"}`}>
          <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
        </button>
      </div>

      {enabled && (
        <>
          {/* Arte */}
          <div className="rounded-[24px] border border-divider bg-surface-white p-5">
            <p className="text-[15px] font-semibold">Arte do gift card</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-text-secondary">
              A imagem de fundo do cartão. O valor, o nome e o código entram por cima, com um véu escuro automático pra garantir a leitura. Sem foto, usamos um dos degradês abaixo.
            </p>
            <div className="mt-4">
              <GiftArt valorCents={10000} paraQuem="Maria" deQuem="João" mensagem="Feliz aniversário!" negocio="Sua loja" codigo="GIFT-EXEMPL" artUrl={artUrl} artTheme={artTheme} bloqueado={false} />
            </div>
            <div className="mt-3">
              <ImageUpload value={artUrl} onChange={(url) => { setArtUrl(url); salvar({ art_url: url }); }} businessId={businessId} />
            </div>

            <p className="mt-5 text-[13px] font-semibold">{artUrl ? "Degradê de reserva (se você remover a foto)" : "Degradê"}</p>
            <div className="mt-2 flex gap-2.5">
              {(Object.keys(GIFT_THEMES) as GiftTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => mudarTema(t)}
                  aria-label={GIFT_THEMES[t].label}
                  className={`h-11 w-11 shrink-0 rounded-full transition-shadow ${artTheme === t ? "ring-2 ring-offset-2 ring-on-background" : ""}`}
                  style={{ background: GIFT_THEMES[t].swatch }}
                />
              ))}
            </div>

            <p className="mt-5 text-[13px] font-semibold">Valor mínimo</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[14px] text-text-tertiary">R$</span>
              <input value={minValue} onChange={(e) => setMinValue(e.target.value.replace(/\D/g, ""))} onBlur={() => salvar({})} inputMode="numeric" className="w-20 rounded-full border border-divider bg-surface-white px-3 py-2 text-[14px] outline-none focus:border-on-background" />
            </div>
          </div>

          {/* Pedidos a liberar */}
          <div className="rounded-[24px] border border-divider bg-surface-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold">Gifts a liberar</p>
              {pendentes.length > 0 && <span className="rounded-full bg-[#FDEEDF] px-2.5 py-1 text-[11.5px] font-bold text-[#C2650A]">{pendentes.length}</span>}
            </div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-text-secondary">
              Quando o cliente pagar (por fora, como combinado), toque em Liberar. A arte dele fica pronta na hora.
            </p>

            {gifts.length === 0 ? (
              <p className="mt-4 text-[13.5px] text-text-tertiary">Nenhum gift ainda.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                {gifts.map((g) => {
                  const st = STATUS[g.status as keyof typeof STATUS] ?? STATUS.pending;
                  return (
                    <div key={g.id} className="flex items-center gap-3 rounded-[18px] border border-divider bg-surface-white px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-bold">{brl(g.value_cents)}</p>
                          <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color: st.cor, backgroundColor: st.fundo }}>{st.label}</span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-text-tertiary">
                          {g.to_name ? `Para ${g.to_name}` : "Sem destinatário"}{g.from_name ? ` · de ${g.from_name}` : ""} · {g.code}
                        </p>
                      </div>
                      {g.status === "pending" && (
                        <div className="flex shrink-0 gap-1.5">
                          <button onClick={() => mudarStatus(g.id, "paid")} className="rounded-full bg-[#1F9E4C] px-3.5 py-2 text-[12.5px] font-semibold text-white">Liberar</button>
                          <button onClick={() => mudarStatus(g.id, "canceled")} className="rounded-full bg-surface-soft px-3 py-2 text-[12.5px] font-medium text-text-secondary">✕</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {saved && (
            <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center">
              <span className="orbi-green-gradient rounded-full px-4 py-2 text-[13px] font-semibold text-white shadow-lg">Salvo ✓</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
