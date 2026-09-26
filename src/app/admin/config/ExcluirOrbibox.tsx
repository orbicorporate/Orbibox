"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Zona de perigo: excluir este Orbibox, confirmando com o nome. */
export function ExcluirOrbibox({ id, nome }: { id: string; nome: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const norm = (t: string) => t.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const confere = norm(texto) === norm(nome);

  async function excluir() {
    setExcluindo(true);
    setErro(null);
    const r = await fetch("/api/negocio/excluir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, confirmacao: texto }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErro(d.error ?? "Não consegui excluir agora.");
      setExcluindo(false);
      return;
    }
    // Sobrou outro Orbibox: abre ele. Não sobrou: começa do zero no onboarding.
    router.push(d.restantes > 0 ? "/admin" : "/onboarding");
    router.refresh();
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-8 self-center text-[13px] font-medium text-red-600"
      >
        Excluir este Orbibox
      </button>
    );
  }

  return (
    <div className="mt-8 rounded-[22px] border border-red-200 bg-red-50 p-4">
      <p className="text-[15px] font-semibold text-red-700">Excluir “{nome}”?</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-red-700/90">
        Apaga de vez a página, o link, a Orbi e tudo que ela aprendeu, a vitrine, os boxes, as conversas, os contatos, os vouchers e as métricas deste Orbibox. Não dá pra desfazer. Seu plano e seus outros Orbibox continuam.
      </p>
      <p className="mt-3 text-[12.5px] text-red-700">Pra confirmar, digite o nome: <span className="font-semibold">{nome}</span></p>
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={nome}
        className="mt-1.5 w-full rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-[14px] outline-none focus:border-red-500"
      />
      {erro && <p className="mt-2 text-[12.5px] text-red-700">{erro}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => { setAberto(false); setTexto(""); setErro(null); }}
          className="flex-1 rounded-full border border-divider bg-white py-2.5 text-[13px] font-medium text-text-secondary"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={excluir}
          disabled={!confere || excluindo}
          className="flex-1 rounded-full bg-red-600 py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
        >
          {excluindo ? "Excluindo…" : "Excluir de vez"}
        </button>
      </div>
    </div>
  );
}
