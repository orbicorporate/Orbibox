"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  businessId: string;
  semItens: boolean;
  semBotoes: boolean;
  site: string | null;
  instagram: string | null;
};

/**
 * Aparece quando o dono saiu durante a montagem do Orbibox (o onboarding só conclui no fim).
 * Mostra o que falta e oferece completar sem refazer tudo.
 */
export function PaginaPelaMetade({ businessId, semItens, semBotoes, site, instagram }: Props) {
  const router = useRouter();
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const podeImportar = semItens && (!!site || !!instagram);

  async function importar() {
    setImportando(true);
    setErro(null);
    try {
      const res = await fetch("/api/import-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, url: site ?? "", instagram: instagram ?? "" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setErro(d?.error ?? "Não consegui ler o site agora. Tente de novo em instantes.");
      else router.refresh();
    } catch {
      setErro("Sem conexão agora. Tente de novo em instantes.");
    } finally {
      setImportando(false);
    }
  }

  async function concluir() {
    const supabase = createClient();
    await supabase.from("businesses").update({ onboarding_status: "ready" }).eq("id", businessId);
    router.refresh();
  }

  return (
    <section className="mt-4 rounded-[22px] bg-surface-white p-4 ring-1 ring-divider">
      <p className="text-[15px] font-medium">Sua página ficou pela metade</p>
      <p className="mt-1 text-[13px] leading-snug text-text-secondary">
        A montagem foi interrompida quando você saiu da tela. O que já existe está salvo. Falta:
      </p>
      <ul className="mt-2 flex flex-col gap-1 text-[13.5px]">
        {semBotoes && <li>• Os botões da sua página</li>}
        {semItens && <li>• Os itens do catálogo</li>}
        {!semBotoes && !semItens && <li>• Só confirmar que está tudo certo</li>}
      </ul>
      {erro && <p role="alert" className="mt-2 text-[12.5px] text-red-700">{erro}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {semBotoes && (
          <Link href="/admin/boxes" className="inline-flex min-h-[44px] items-center rounded-full bg-on-background px-5 text-[14px] font-medium text-white active:scale-[0.98]">
            Escolher meus botões
          </Link>
        )}
        {podeImportar && (
          <button type="button" onClick={importar} disabled={importando} className="inline-flex min-h-[44px] items-center rounded-full border border-divider bg-surface-white px-5 text-[14px] font-medium disabled:opacity-60 active:scale-[0.98]">
            {importando ? "Lendo seu site…" : "Importar meus itens de novo"}
          </button>
        )}
        <button type="button" onClick={concluir} className="inline-flex min-h-[44px] items-center rounded-full border border-divider bg-surface-white px-5 text-[14px] font-medium text-text-secondary active:scale-[0.98]">
          Está bom assim
        </button>
      </div>
    </section>
  );
}
