"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDialogs } from "@/hooks/useDialogs";
import type { Database } from "@/lib/supabase/types";

type Admin = Database["public"]["Tables"]["business_admins"]["Row"];

export function AdminsManager({
  businessId,
  initialAdmins,
  isOwner,
}: {
  businessId: string;
  initialAdmins: Admin[];
  isOwner: boolean;
}) {
  const supabase = createClient();
  const { confirm, DialogRenderer } = useDialogs();
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Só o dono pode gerenciar — administradores convidados apenas veem a lista.
  if (!isOwner) {
    return (
      <div className="mt-4 rounded-2xl border border-divider bg-surface-white p-4">
        <p className="text-[13px] font-medium">Quem tem acesso</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {admins.map((a) => (
            <li key={a.id} className="text-[13px] text-text-secondary">
              {a.email} {a.accepted_at ? "" : <span className="text-text-tertiary">· convite pendente</span>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12px] text-text-tertiary">Só o dono da conta pode adicionar ou remover pessoas.</p>
      </div>
    );
  }

  async function convidar() {
    const clean = email.trim().toLowerCase();
    setError(null);
    if (!clean || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
      setError("Digite um e-mail válido.");
      return;
    }
    if (admins.some((a) => a.email === clean)) {
      setError("Essa pessoa já tem acesso.");
      return;
    }
    setSaving(true);
    const { data, error: insErr } = await supabase
      .from("business_admins")
      .insert({ business_id: businessId, email: clean })
      .select()
      .single();
    setSaving(false);
    if (insErr || !data) {
      setError("Não foi possível adicionar. Tente de novo.");
      return;
    }
    setAdmins((p) => [...p, data as Admin]);
    setEmail("");
  }

  async function remover(admin: Admin) {
    if (!(await confirm({ title: "Remover acesso", message: `Remover o acesso de ${admin.email}? A pessoa não vai mais conseguir entrar no painel.`, confirmLabel: "Remover", danger: true }))) return;
    await supabase.from("business_admins").delete().eq("id", admin.id);
    setAdmins((p) => p.filter((a) => a.id !== admin.id));
  }

  return (
    <div className="mt-4 rounded-2xl border border-divider bg-surface-white p-4">
      <DialogRenderer />
      <p className="text-[14px] font-medium">Equipe · quem pode acessar</p>
      <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
        Convide alguém pelo e-mail pra ajudar a gerenciar esse Orbibox. A pessoa cria uma conta com esse mesmo e-mail
        (ou faz login) e o acesso aparece automaticamente. Ela pode editar tudo, menos gerenciar a equipe e a cobrança.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") convidar(); }}
          placeholder="email@pessoa.com"
          className="flex-1 rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
        />
        <button
          onClick={convidar}
          disabled={saving}
          className="rounded-2xl bg-button-primary px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
        >
          {saving ? "..." : "Convidar"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[12px] text-red-600">{error}</p>}

      {admins.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-soft px-3 py-2">
              <span className="min-w-0 truncate text-[13px]">
                {a.email}
                {!a.accepted_at && <span className="ml-1 text-[11px] text-text-tertiary">· pendente</span>}
              </span>
              <button onClick={() => remover(a)} className="shrink-0 text-[12px] text-red-600">
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
