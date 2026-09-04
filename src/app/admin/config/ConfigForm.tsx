"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Business = {
  id: string;
  name: string;
  slug: string;
  site_type: string | null;
  contact_whatsapp: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_site: string | null;
  about_business: string | null;
  differentials: string | null;
  policies: string | null;
};

const TIPO_LABEL: Record<string, string> = {
  ecommerce: "Loja virtual",
  institucional: "Site institucional",
  links: "Página de links",
};

export function ConfigForm({ business }: { business: Business }) {
  const supabase = createClient();
  const [b, setB] = useState(business);
  const [saved, setSaved] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);

  function set<K extends keyof Business>(key: K, value: Business[K]) {
    setB((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  type CampoEditavel =
    | "contact_whatsapp" | "contact_phone" | "contact_email" | "contact_site"
    | "about_business" | "differentials" | "policies";

  async function save(key: CampoEditavel, value: string) {
    const patch: Partial<Record<CampoEditavel, string | null>> = { [key]: value.trim() || null };
    await supabase.from("businesses").update(patch).eq("id", b.id);
    setSaved(true);
  }

  async function importFromSite() {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await fetch("/api/import-about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: b.name, url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportMsg({ kind: "erro", text: data.error || "Não consegui ler esse site." });
        return;
      }
      if (data.about) { set("about_business", data.about); await save("about_business", data.about); }
      if (Array.isArray(data.differentials) && data.differentials.length > 0) {
        const plain = data.differentials.map((d: { title: string; description?: string }) => (d.description ? `${d.title}: ${d.description}` : d.title)).join("\n");
        set("differentials", plain);
        await save("differentials", plain);
        await supabase.from("businesses").update({ differentials_cards: data.differentials }).eq("id", b.id);
      }
      if (data.policies) { set("policies", data.policies); await save("policies", data.policies); }
      setImportMsg({ kind: "ok", text: "Pronto — confira os campos abaixo e ajuste se quiser." });
    } catch {
      setImportMsg({ kind: "erro", text: "Não consegui ler esse site agora." });
    } finally {
      setImporting(false);
    }
  }

  const campo = "mt-2 w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background";
  const rotulo = "mt-5 text-[12px] uppercase tracking-wide text-text-tertiary";

  // Sinaliza o que a Orbi realmente sabe — sem chip decorativo.
  const conhecimento = [
    { nome: "Catálogo", cheio: true, obs: "itens publicados na Vitrine" },
    { nome: "Sobre o negócio", cheio: !!b.about_business, obs: "usado para responder quem você é" },
    { nome: "Diferenciais", cheio: !!b.differentials, obs: "o que te separa dos outros" },
    { nome: "Políticas", cheio: !!b.policies, obs: "prazos, entrega, trocas" },
  ];

  return (
    <div className="mt-6 flex flex-col pb-4">
      {b.site_type && (
        <div className="rounded-[22px] bg-surface-soft p-4">
          <p className="text-[13px] text-text-secondary">
            A Orbi classificou seu site como{" "}
            <span className="font-medium text-on-background">{TIPO_LABEL[b.site_type] ?? b.site_type}</span>.
          </p>
        </div>
      )}

      <p className="mt-6 font-[family-name:var(--font-manrope)] text-[20px] font-medium">Contatos do box</p>
      <p className="mt-1 text-[13px] text-text-secondary">
        Aparecem como botões para o visitante. Deixe vazio o que não quiser mostrar.
      </p>

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

      <p className="mt-8 font-[family-name:var(--font-manrope)] text-[20px] font-medium">O que a Orbi sabe</p>
      <p className="mt-1 text-[13px] text-text-secondary">
        Quanto mais preenchido, menos ela precisa dizer que não sabe.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {conhecimento.map((k) => (
          <span
            key={k.nome}
            title={k.obs}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] ${
              k.cheio ? "bg-orbi-gradient-start/30 text-on-background" : "bg-surface-soft text-text-tertiary"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${k.cheio ? "bg-orbi-gradient-start" : "bg-text-tertiary"}`} />
            {k.nome}
          </span>
        ))}
      </div>

      <div className="mt-5 rounded-[20px] bg-surface-soft p-4">
        <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Deixa a Orbi preencher a partir do seu site</p>
        <p className="mt-1 text-[12px] text-text-secondary">Cola o link e ela lê a página e já preenche Sobre o negócio, Diferenciais e Políticas abaixo.</p>
        <div className="mt-2 flex gap-2">
          <input
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://seusite.com.br"
            className="min-w-0 flex-1 rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[13px] outline-none focus:border-on-background"
          />
          <button
            onClick={importFromSite}
            disabled={importing || !importUrl.trim()}
            className="shrink-0 rounded-full orbi-gradient px-4 py-2.5 text-[13px] font-medium text-on-background disabled:opacity-50"
          >
            {importing ? "Lendo…" : "✦ Importar"}
          </button>
        </div>
        {importMsg && (
          <p className={`mt-2 text-[12px] ${importMsg.kind === "ok" ? "text-text-secondary" : "text-red-600"}`}>{importMsg.text}</p>
        )}
      </div>

      <p className={rotulo}>Sobre o negócio</p>
      <textarea
        value={b.about_business ?? ""}
        onChange={(e) => set("about_business", e.target.value)}
        onBlur={(e) => save("about_business", e.target.value)}
        rows={3}
        placeholder="O que vocês fazem e para quem."
        className={`${campo} resize-none`}
      />

      <p className={rotulo}>Diferenciais</p>
      <textarea
        value={b.differentials ?? ""}
        onChange={(e) => set("differentials", e.target.value)}
        onBlur={(e) => save("differentials", e.target.value)}
        rows={2}
        placeholder="O que te separa dos concorrentes."
        className={`${campo} resize-none`}
      />

      <p className={rotulo}>Políticas</p>
      <textarea
        value={b.policies ?? ""}
        onChange={(e) => set("policies", e.target.value)}
        onBlur={(e) => save("policies", e.target.value)}
        rows={3}
        placeholder="Prazos de entrega, frete, trocas, horários, formas de pagamento."
        className={`${campo} resize-none`}
      />

      {saved && <p className="mt-3 text-[12px] text-text-tertiary">Salvo ✓</p>}

      <Link
        href="/admin/agent"
        className="mt-8 rounded-full border border-divider bg-surface-white px-5 py-3 text-center text-[14px] font-medium"
      >
        Personalidade da Orbi →
      </Link>
    </div>
  );
}
