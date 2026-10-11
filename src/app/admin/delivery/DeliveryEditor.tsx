"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";
import { LogoApp } from "@/components/delivery/LogoApp";
import { useArrastarOrdem } from "@/hooks/useArrastarOrdem";
import { APPS_DELIVERY, linkDoApp, type DeliveryApp } from "@/lib/delivery";

/** Junta os apps salvos com a lista completa: quem ainda não foi ligado aparece desligado, no fim. */
function completar(salvos: DeliveryApp[]): DeliveryApp[] {
  const resto = APPS_DELIVERY.filter((a) => !salvos.some((s) => s.id === a.id)).map((a) => ({ id: a.id, url: "", ativo: false }));
  return [...salvos, ...resto];
}

export function DeliveryEditor({ businessId, boxId: boxInicial, config, apps: salvos, ativo: ativoInicial, totalBoxes }: { businessId: string; boxId: string | null; config: Record<string, unknown>; apps: DeliveryApp[]; ativo: boolean; totalBoxes: number }) {
  const supabase = useRef(createClient()).current;
  const [boxId, setBoxId] = useState(boxInicial);
  const [cfg, setCfg] = useState(config);
  const [apps, setApps] = useState<DeliveryApp[]>(() => completar(salvos));
  const [ativo, setAtivo] = useState(ativoInicial);
  const [criando, setCriando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrasto = useArrastarOrdem(apps.map((a) => a.id), true, (ids) => {
    const lista = ids.map((id) => apps.find((a) => a.id === id)!).filter(Boolean);
    setApps(lista);
    gravar(lista);
  });

  async function ativar() {
    setCriando(true);
    const novo = { label: "Peça por delivery", subtitle: "iFood, Rappi, WhatsApp e mais", icon: "🛵", action: "delivery", color: "transparent", apps: [] };
    const { data, error } = await supabase
      .from("smart_boxes")
      .insert({ business_id: businessId, box_type: "custom", title: "Peça por delivery", position: totalBoxes, is_active: true, config: novo })
      .select("id")
      .single();
    setCriando(false);
    if (!error && data) { setBoxId(data.id); setCfg(novo); }
  }

  function gravar(lista: DeliveryApp[]) {
    if (!boxId) return;
    if (timer.current) clearTimeout(timer.current);
    // Espera a pessoa parar de digitar o link antes de salvar.
    timer.current = setTimeout(async () => {
      const novo = { ...cfg, apps: lista.filter((a) => a.ativo || a.url.trim()) };
      const res = await supabase.from("smart_boxes").update({ config: novo }).eq("id", boxId);
      if (conferirSalvo(res)) setCfg(novo);
    }, 600);
  }

  function mudar(id: string, parte: Partial<DeliveryApp>) {
    const lista = apps.map((a) => (a.id === id ? { ...a, ...parte } : a));
    setApps(lista);
    gravar(lista);
  }

  function mover(id: string, d: -1 | 1) {
    const i = apps.findIndex((a) => a.id === id);
    const j = i + d;
    if (j < 0 || j >= apps.length) return;
    const lista = [...apps];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    setApps(lista);
    gravar(lista);
  }

  async function alternarBotao() {
    if (!boxId) return;
    const novo = !ativo;
    setAtivo(novo);
    const res = await supabase.from("smart_boxes").update({ is_active: novo }).eq("id", boxId);
    if (!conferirSalvo(res)) setAtivo(!novo);
  }

  const ligados = apps.filter((a) => a.ativo && linkDoApp(a)).length;

  return (
    <div className="flex flex-col pb-10">
      <Link href="/admin/boxes" className="mt-2 text-[14px] text-text-tertiary hover:underline">← Botões da home</Link>
      <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight tracking-[-0.02em]">Delivery</h1>
      <p className="mt-1 text-[14px] leading-snug text-text-secondary">Um botão na sua página com os apps onde seus clientes pedem. Cada um leva direto à sua loja, e cada toque aparece no Pulse.</p>

      {!boxId ? (
        <div className="mt-5 rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.06]">
          <p className="text-[15px] font-medium">Ainda não há botão de delivery</p>
          <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">Ative o botão, depois ligue os apps e cole o link de cada um.</p>
          <button type="button" onClick={ativar} disabled={criando} className="mt-4 min-h-[48px] rounded-full bg-on-background px-6 text-[14.5px] font-semibold text-white active:scale-[0.98] disabled:opacity-60">
            {criando ? "Criando…" : "Ativar botão de delivery"}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between gap-3 rounded-[22px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
            <div className="min-w-0">
              <p className="text-[14.5px] font-medium">Botão na página</p>
              <p className="mt-0.5 text-[12.5px] text-text-tertiary">{ligados === 0 ? "Fica escondido até você ligar um app com link." : ligados === 1 ? "Com um app só, o toque abre direto a loja." : `${ligados} apps ligados.`}</p>
            </div>
            <button type="button" role="switch" aria-checked={ativo} onClick={alternarBotao} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${ativo ? "bg-on-background" : "bg-divider"}`}>
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${ativo ? "left-7" : "left-1"}`} />
              <span className="sr-only">{ativo ? "Ligado" : "Desligado"}</span>
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            {arrasto.ordem.map((id) => apps.find((x) => x.id === id)!).filter(Boolean).map((a) => {
              const i = apps.findIndex((x) => x.id === a.id);
              const info = APPS_DELIVERY.find((x) => x.id === a.id)!;
              const semLink = a.ativo && !a.url.trim();
              return (
                <div key={a.id} ref={arrasto.ref(a.id)} {...arrasto.props(a.id)} className={`rounded-[22px] border bg-surface-white p-3.5 transition-[colors,transform,box-shadow] ${arrasto.pegado === a.id ? "scale-[1.02] shadow-xl" : ""} ${a.ativo ? "border-on-background/20" : "border-divider"}`}>
                  <div className="flex items-center gap-3">
                    <LogoApp id={a.id} tamanho={44} />
                    <p className="min-w-0 flex-1 truncate text-[15px] font-medium">{info.nome}</p>
                    <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => mover(a.id, -1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-[14px] disabled:opacity-30">↑</button>
                    <button type="button" aria-label="Descer" disabled={i === apps.length - 1} onClick={() => mover(a.id, 1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-[14px] disabled:opacity-30">↓</button>
                    <button type="button" role="switch" aria-checked={a.ativo} onClick={() => mudar(a.id, { ativo: !a.ativo })} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${a.ativo ? "bg-on-background" : "bg-divider"}`}>
                      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${a.ativo ? "left-7" : "left-1"}`} />
                      <span className="sr-only">{a.ativo ? "Ligado" : "Desligado"}</span>
                    </button>
                  </div>
                  {a.ativo && (
                    <div className="mt-3">
                      <input
                        value={a.url}
                        onChange={(e) => mudar(a.id, { url: e.target.value })}
                        placeholder={info.dica}
                        inputMode={a.id === "whatsapp" ? "tel" : "url"}
                        autoCapitalize="none"
                        className="w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[14.5px] outline-none focus:border-on-background"
                      />
                      {semLink && <p className="mt-1.5 text-[12.5px] text-[#C2650A]">Sem o link, este app não aparece para o cliente.</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[12.5px] leading-snug text-text-tertiary">A ordem aqui é a ordem que o cliente vê. Use as setas para mudar.</p>
        </>
      )}
    </div>
  );
}
