"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Embaixador = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  pix_key: string | null;
  code: string;
  panel_token: string;
  commission_rate: number;
  commission_months: number;
  active: boolean;
  indicados: number;
  assinantes: number;
  comissao_pendente_cents: number;
  comissao_paga_cents: number;
};

type BonusLink = {
  id: string;
  code: string;
  label: string | null;
  kind: string;
  max_uses: number | null;
  uses: number;
  active: boolean;
};

const KIND_LABEL: Record<string, string> = {
  days_30: "30 dias de Nióbio",
  days_90: "90 dias de Nióbio",
  lifetime: "Nióbio vitalício",
};

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Código curto e legível, sem caracteres que confundem (0/O, 1/I).
function gerarCodigo(base: string, tamanho = 6) {
  const limpo = base.normalize("NFD").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4);
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let sufixo = "";
  for (let i = 0; i < tamanho; i++) {
    sufixo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return `${limpo}${sufixo}`.slice(0, 12);
}

export function EmbaixadoresManager({ embaixadores: iniciais, bonusLinks: bonusIniciais }: { embaixadores: Embaixador[]; bonusLinks: BonusLink[] }) {
  const supabase = createClient();
  const [aba, setAba] = useState<"afiliados" | "bonus">("afiliados");
  const [embaixadores, setEmbaixadores] = useState(iniciais);
  const [bonus, setBonus] = useState(bonusIniciais);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Formulário de embaixador
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoPhone, setNovoPhone] = useState("");
  const [novoPix, setNovoPix] = useState("");

  // Formulário de link de bônus
  const [bonusLabel, setBonusLabel] = useState("");
  const [bonusKind, setBonusKind] = useState<"days_30" | "days_90" | "lifetime">("days_30");
  const [bonusMax, setBonusMax] = useState("");

  const base = typeof window !== "undefined" ? window.location.origin : "";

  async function copiar(texto: string, id: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      setTimeout(() => setCopiado(null), 1500);
    } catch { /* sem clipboard */ }
  }

  async function criarEmbaixador() {
    const nome = novoNome.trim();
    if (!nome || salvando) return;
    setSalvando(true);
    setErro(null);
    const { data, error } = await supabase
      .from("affiliates")
      .insert({
        name: nome,
        email: novoEmail.trim() || null,
        phone: novoPhone.trim() || null,
        pix_key: novoPix.trim() || null,
        code: gerarCodigo(nome),
      })
      .select("id, name, email, phone, pix_key, code, panel_token, commission_rate, commission_months, active")
      .single();
    setSalvando(false);
    if (error || !data) { setErro(error?.message ?? "Não consegui criar."); return; }
    setEmbaixadores((a) => [
      { ...data, indicados: 0, assinantes: 0, comissao_pendente_cents: 0, comissao_paga_cents: 0 },
      ...a,
    ]);
    setNovoNome(""); setNovoEmail(""); setNovoPhone(""); setNovoPix("");
  }

  async function alternarEmbaixador(af: Embaixador) {
    const { error } = await supabase.from("affiliates").update({ active: !af.active }).eq("id", af.id);
    if (!error) {
      setEmbaixadores((lista) => lista.map((x) => (x.id === af.id ? { ...x, active: !x.active } : x)));
    }
  }

  async function criarBonus() {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    const max = parseInt(bonusMax, 10);
    const { data, error } = await supabase
      .from("bonus_links")
      .insert({
        code: gerarCodigo(bonusLabel || "BONUS"),
        label: bonusLabel.trim() || null,
        kind: bonusKind,
        max_uses: Number.isFinite(max) && max > 0 ? max : null,
      })
      .select("id, code, label, kind, max_uses, uses, active")
      .single();
    setSalvando(false);
    if (error || !data) { setErro(error?.message ?? "Não consegui criar."); return; }
    setBonus((b) => [data, ...b]);
    setBonusLabel(""); setBonusMax("");
  }

  async function alternarBonus(link: BonusLink) {
    const { error } = await supabase.from("bonus_links").update({ active: !link.active }).eq("id", link.id);
    if (!error) {
      setBonus((lista) => lista.map((x) => (x.id === link.id ? { ...x, active: !x.active } : x)));
    }
  }

  const totalPendente = embaixadores.reduce((s, a) => s + Number(a.comissao_pendente_cents ?? 0), 0);
  const totalPago = embaixadores.reduce((s, a) => s + Number(a.comissao_paga_cents ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {([["afiliados", "Embaixadores"], ["bonus", "Links de bônus"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`rounded-full px-4 py-2 text-[13.5px] font-medium ${aba === id ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {erro && <p className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-red-700">{erro}</p>}

      {aba === "afiliados" ? (
        <>
          {/* Regras do programa, como combinamos: comissão recorrente por
              12 meses, sem exigir conta, com carência de garantia. */}
          <div className="rounded-[24px] bg-surface-soft p-5">
            <p className="text-[13.5px] font-semibold">Como funciona a comissão</p>
            <div className="mt-2.5 flex flex-col gap-2">
              {[
                ["30% de comissão", "sobre cada cobrança paga por quem o embaixador indicar."],
                ["Recorrente por 12 meses", "conta desde a primeira cobrança de cada indicado, não só a primeira venda."],
                ["Carência de 7 dias", "cada comissão fica retida uma semana (garantia). Se o cliente cancelar nesse prazo, ela não é paga."],
                ["Sem precisar de conta", "o embaixador não usa o Orbibox. Você cadastra aqui e ele acompanha tudo por um link próprio."],
                ["Bônus pro indicado", "quem entra por um embaixador e assina o plano anual ganha 1 mês grátis extra."],
              ].map(([titulo, texto]) => (
                <div key={titulo} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-tertiary" />
                  <p className="text-[12.5px] leading-snug text-text-secondary">
                    <span className="font-semibold text-on-background">{titulo}</span>, {texto}
                  </p>
                </div>
              ))}
            </div>
            {/* Página pública pra mandar pro parceiro antes de cadastrar. */}
            <button
              type="button"
              onClick={() => copiar(`${base}/afiliados`, "pagina-publica")}
              className="mt-3 w-full cursor-pointer rounded-full bg-on-background py-2.5 text-[13px] font-semibold text-white"
            >
              {copiado === "pagina-publica" ? "Link copiado ✓" : "Copiar página pra mostrar ao embaixador"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[20px] border border-divider bg-surface-white p-4">
              <p className="text-[12.5px] text-text-tertiary">Comissão a pagar</p>
              <p className="mt-1 text-[24px] font-bold">{brl(totalPendente)}</p>
            </div>
            <div className="rounded-[20px] border border-divider bg-surface-white p-4">
              <p className="text-[12.5px] text-text-tertiary">Já pago</p>
              <p className="mt-1 text-[24px] font-bold">{brl(totalPago)}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-divider bg-surface-white p-5">
            <p className="text-[15px] font-semibold">Novo embaixador</p>
            <p className="mt-1 text-[12.5px] text-text-tertiary">
              Preencha os dados e gere o link. A chave Pix é onde você vai pagar a comissão.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do embaixador" className="w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />
              <input value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="E-mail (opcional)" className="w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />
              <input value={novoPhone} onChange={(e) => setNovoPhone(e.target.value)} placeholder="WhatsApp (opcional)" className="w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />
              <input value={novoPix} onChange={(e) => setNovoPix(e.target.value)} placeholder="Chave Pix pra pagar a comissão (opcional)" className="w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />
              <button onClick={criarEmbaixador} disabled={!novoNome.trim() || salvando} className="rounded-full bg-button-primary py-3 text-[14px] font-semibold text-white disabled:opacity-40">
                {salvando ? "Criando…" : "Criar embaixador e gerar link"}
              </button>
            </div>
          </div>

          {embaixadores.length === 0 ? (
            <p className="rounded-[20px] bg-surface-soft px-4 py-6 text-center text-[13.5px] text-text-tertiary">Nenhum embaixador ainda.</p>
          ) : (
            embaixadores.map((af) => {
              const link = `${base}/a/${af.code}`;
              return (
                <div key={af.id} className="rounded-[24px] border border-divider bg-surface-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-semibold">{af.name}</p>
                      <p className="mt-0.5 text-[12.5px] text-text-tertiary">
                        {af.email || "sem e-mail"}{af.phone ? ` · ${af.phone}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => alternarEmbaixador(af)}
                      className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-semibold ${af.active ? "bg-green-100 text-green-700" : "bg-surface-soft text-text-tertiary"}`}
                    >
                      {af.active ? "Ativo" : "Pausado"}
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-soft px-4 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{link}</span>
                    <button onClick={() => copiar(link, af.id)} className="shrink-0 rounded-full bg-on-background px-3 py-1 text-[12px] font-semibold text-white">
                      {copiado === af.id ? "Copiado ✓" : "Copiar"}
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-2 rounded-2xl bg-surface-soft px-4 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-text-secondary">Painel do parceiro</span>
                    <button onClick={() => copiar(`${base}/parceiro/${af.panel_token}`, `${af.id}-painel`)} className="shrink-0 rounded-full bg-surface-white px-3 py-1 text-[12px] font-semibold">
                      {copiado === `${af.id}-painel` ? "Copiado ✓" : "Copiar link"}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <div><p className="text-[18px] font-bold">{af.indicados}</p><p className="text-[11px] text-text-tertiary">indicados</p></div>
                    <div><p className="text-[18px] font-bold">{af.assinantes}</p><p className="text-[11px] text-text-tertiary">assinaram</p></div>
                    <div><p className="text-[15px] font-bold">{brl(Number(af.comissao_pendente_cents))}</p><p className="text-[11px] text-text-tertiary">a pagar</p></div>
                    <div><p className="text-[15px] font-bold">{brl(Number(af.comissao_paga_cents))}</p><p className="text-[11px] text-text-tertiary">pago</p></div>
                  </div>

                  {af.pix_key && <p className="mt-3 text-[12px] text-text-tertiary">Pix: {af.pix_key}</p>}
                </div>
              );
            })
          )}
        </>
      ) : (
        <>
          <div className="rounded-[24px] border border-divider bg-surface-white p-5">
            <p className="text-[15px] font-semibold">Novo link de bônus</p>
            <p className="mt-1 text-[12.5px] text-text-tertiary">
              Quem entrar por esse link ganha o plano Nióbio liberado, sem cartão. Escolha por quanto tempo: 30 dias, 90 dias ou pra sempre. Dá pra limitar quantas pessoas podem usar.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <input value={bonusLabel} onChange={(e) => setBonusLabel(e.target.value)} placeholder="Pra que serve, ex: Evento Sorocaba" className="w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />
              <div className="flex gap-2">
                {(["days_30", "days_90", "lifetime"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setBonusKind(k)}
                    className={`flex-1 rounded-full border-2 px-2 py-2 text-[12.5px] font-medium ${bonusKind === k ? "border-on-background" : "border-divider text-text-secondary"}`}
                  >
                    {k === "days_30" ? "30 dias" : k === "days_90" ? "90 dias" : "Vitalício"}
                  </button>
                ))}
              </div>
              <input value={bonusMax} onChange={(e) => setBonusMax(e.target.value)} inputMode="numeric" placeholder="Limite de usos (vazio = ilimitado)" className="w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />
              <button onClick={criarBonus} disabled={salvando} className="rounded-full bg-button-primary py-3 text-[14px] font-semibold text-white disabled:opacity-40">
                {salvando ? "Criando…" : "Gerar link de bônus"}
              </button>
            </div>
          </div>

          {bonus.length === 0 ? (
            <p className="rounded-[20px] bg-surface-soft px-4 py-6 text-center text-[13.5px] text-text-tertiary">Nenhum link de bônus ainda.</p>
          ) : (
            bonus.map((link) => {
              const url = `${base}/b/${link.code}`;
              return (
                <div key={link.id} className="rounded-[24px] border border-divider bg-surface-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15.5px] font-semibold">{link.label || KIND_LABEL[link.kind]}</p>
                      <p className="mt-0.5 text-[12.5px] text-text-tertiary">
                        {KIND_LABEL[link.kind]} · {link.uses} uso(s){link.max_uses ? ` de ${link.max_uses}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => alternarBonus(link)}
                      className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-semibold ${link.active ? "bg-green-100 text-green-700" : "bg-surface-soft text-text-tertiary"}`}
                    >
                      {link.active ? "Ativo" : "Pausado"}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-soft px-4 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{url}</span>
                    <button onClick={() => copiar(url, link.id)} className="shrink-0 rounded-full bg-on-background px-3 py-1 text-[12px] font-semibold text-white">
                      {copiado === link.id ? "Copiado ✓" : "Copiar"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
