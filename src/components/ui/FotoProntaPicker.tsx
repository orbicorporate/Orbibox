"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { OrbiWorking } from "@/components/orbi/OrbiWorking";

type Foto = { id: string; thumb: string; full: string; autor: string; fonte: string };

/**
 * Folha que a Orbi abre com fotos prontas de banco de imagens pro item.
 * Ela mesma monta a busca; a pessoa só escolhe (ou refina o termo).
 * Ao tocar numa foto, ela chega como arquivo pro recorte de sempre.
 */
export function FotoProntaPicker({
  businessId,
  assunto,
  formato,
  onEscolher,
  onFechar,
}: {
  businessId: string;
  assunto: string;
  formato: string;
  onEscolher: (file: File) => void;
  onFechar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [fotos, setFotos] = useState<Foto[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // Mostra 9 de cada vez; foto que não carrega some da grade.
  const [mostrar, setMostrar] = useState(9);
  const [quebradas, setQuebradas] = useState<Set<string>>(new Set());

  async function buscar(termo: string) {
    setCarregando(true);
    setMostrar(9);
    setQuebradas(new Set());
    setErro(null);
    try {
      const r = await fetch("/api/fotos-prontas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, assunto, busca: termo, formato }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErro(j.error ?? "Não consegui buscar agora.");
        setFotos([]);
      } else {
        setBusca(j.busca ?? termo);
        setFotos(j.fotos ?? []);
      }
    } catch {
      setErro("Falha de conexão. Tenta de novo.");
      setFotos([]);
    } finally {
      setCarregando(false);
    }
  }

  // Primeira busca: a Orbi escolhe o termo sozinha.
  useEffect(() => {
    let vivo = true;
    fetch("/api/fotos-prontas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, assunto, formato }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!vivo) return;
        if (!ok) setErro(j.error ?? "Não consegui buscar agora.");
        setBusca(j.busca ?? "");
        setFotos(j.fotos ?? []);
      })
      .catch(() => vivo && setErro("Falha de conexão. Tenta de novo."))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [businessId, assunto, formato]);

  async function escolher(f: Foto) {
    setBaixando(f.id);
    setErro(null);
    try {
      const r = await fetch(`/api/fotos-prontas/imagem?u=${encodeURIComponent(f.full)}`);
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const file = new File([blob], `foto-${f.id}.jpg`, { type: blob.type || "image/jpeg" });
      onEscolher(file);
    } catch {
      setErro("Não consegui abrir essa foto. Tenta outra.");
    } finally {
      setBaixando(null);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center" onClick={onFechar}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-[28px] bg-surface-white sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 px-5 pt-5">
          <div>
            <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold">Fotos prontas</p>
            <p className="text-[12.5px] text-text-tertiary">A Orbi buscou pra você. Toque numa pra usar.</p>
          </div>
          <button onClick={onFechar} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[14px]" aria-label="Fechar">
            ✕
          </button>
        </div>

        <form
          className="mt-3 flex gap-2 px-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (busca.trim()) buscar(busca.trim());
          }}
        >
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar outra coisa (em inglês acha mais)"
            className="min-w-0 flex-1 rounded-full border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
          />
          <button type="submit" className="shrink-0 rounded-full bg-button-primary px-4 text-[13px] font-medium text-white">
            Buscar
          </button>
        </form>

        <div className="mt-3 flex-1 overflow-y-auto px-5 pb-5">
          {carregando ? (
            <div className="py-10">
              <OrbiWorking label="Procurando fotos…" />
            </div>
          ) : (
            <>
              {erro && <p className="mb-2 text-[12.5px] text-red-600">{erro}</p>}
              {fotos && fotos.length === 0 && !erro && (
                <p className="py-8 text-center text-[13px] text-text-tertiary">Nada encontrado. Tenta outras palavras.</p>
              )}
              <div className="grid grid-cols-3 gap-1.5">
                {(fotos ?? []).filter((f) => !quebradas.has(f.id)).slice(0, mostrar).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => escolher(f)}
                    disabled={!!baixando}
                    className="relative aspect-square overflow-hidden rounded-xl bg-surface-soft disabled:opacity-60"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.thumb}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => setQuebradas((q) => new Set(q).add(f.id))}
                      className="h-full w-full object-cover"
                    />
                    {baixando === f.id && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[12px] font-medium text-white">Abrindo…</span>
                    )}
                  </button>
                ))}
              </div>
              {fotos && fotos.filter((f) => !quebradas.has(f.id)).length > mostrar && (
                <button onClick={() => setMostrar((m) => m + 9)} className="mt-3 w-full rounded-full border border-divider py-2.5 text-[13px] font-medium">
                  Ver mais fotos
                </button>
              )}
              {fotos && fotos.length > 0 && (
                <p className="mt-3 text-center text-[11px] text-text-tertiary">Fotos livres pra uso comercial.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
