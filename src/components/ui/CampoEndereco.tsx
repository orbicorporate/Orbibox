"use client";

import { useRef, useState } from "react";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

type Partes = { cep: string; rua: string; cidade: string; uf: string };

function mascaraCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Lê "Rua X 10, Bairro, Cidade - SP, 00000-000". Se não bater, tudo vira "rua" e a pessoa completa. */
function ler(v: string): Partes {
  let resto = v.trim();
  let cep = "";
  const mCep = resto.match(/,?\s*(\d{5}-?\d{3})\s*$/);
  if (mCep) { cep = mascaraCep(mCep[1]); resto = resto.slice(0, mCep.index).trim(); }
  const mUf = resto.match(/^(.*?),?\s*([^,]+?)\s*[-/]\s*([A-Za-z]{2})$/);
  if (mUf && UFS.includes(mUf[3].toUpperCase())) return { cep, rua: mUf[1].trim(), cidade: mUf[2].trim(), uf: mUf[3].toUpperCase() };
  return { cep, rua: resto, cidade: "", uf: "" };
}

function montar(p: Partes) {
  return [p.rua.trim(), `${p.cidade.trim()} - ${p.uf}`, p.cep].filter(Boolean).join(", ");
}

/** Endereço guiado: CEP preenche o resto, e cidade e estado são obrigatórios (o mapa precisa deles). */
export function CampoEndereco({ value, onCommit, campo, rotulo }: { value: string; onCommit: (v: string) => void; campo: string; rotulo: string }) {
  const [p, setP] = useState<Partes>(() => ler(value));
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  function conferir(n: Partes) {
    const vazio = !n.rua.trim() && !n.cidade.trim() && !n.uf && !n.cep;
    if (vazio) { setErro(null); onCommit(""); return; }
    if (!n.rua.trim()) { setErro("Falta a rua e o número."); return; }
    if (!n.cidade.trim() || !n.uf) { setErro("Falta a cidade e o estado. Sem eles o mapa pode abrir em outro lugar."); return; }
    setErro(null);
    onCommit(montar(n));
  }

  async function buscarCep(cep: string) {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return;
    setBuscando(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j && !j.erro) {
        setP((a) => {
          const n = { ...a, cep: mascaraCep(d), rua: [j.logradouro, j.bairro].filter(Boolean).join(", ") || a.rua, cidade: j.localidade ?? a.cidade, uf: j.uf ?? a.uf };
          return n;
        });
        setErro("Confira e coloque o número.");
      } else setErro("CEP não encontrado. Preencha o resto à mão.");
    } catch {
      setErro("Não consegui buscar o CEP. Preencha o resto à mão.");
    } finally { setBuscando(false); }
  }

  // Salva só quando o foco sai do bloco todo, não a cada campo.
  function aoSair(e: React.FocusEvent) {
    if (caixa.current?.contains(e.relatedTarget as Node | null)) return;
    conferir(p);
  }

  return (
    <div ref={caixa} onBlur={aoSair}>
      <p className={rotulo}>Endereço</p>
      <input
        inputMode="numeric"
        value={p.cep}
        onChange={(e) => { const cep = mascaraCep(e.target.value); setP({ ...p, cep }); if (cep.length === 9) void buscarCep(cep); }}
        placeholder="CEP (preenche o resto sozinho)"
        className={campo}
      />
      {buscando && <p className="mt-1.5 text-[12px] text-text-tertiary">Buscando o CEP...</p>}
      <input
        value={p.rua}
        onChange={(e) => setP({ ...p, rua: e.target.value })}
        placeholder="Rua, número e bairro"
        className={campo}
      />
      <div className="mt-2 grid grid-cols-[1fr_88px] gap-2">
        <input
          value={p.cidade}
          onChange={(e) => setP({ ...p, cidade: e.target.value })}
          placeholder="Cidade (obrigatório)"
          className={`${campo} !mt-0`}
        />
        <select
          value={p.uf}
          onChange={(e) => setP({ ...p, uf: e.target.value })}
          aria-label="Estado"
          className={`${campo} !mt-0 ${p.uf ? "" : "text-text-tertiary"}`}
        >
          <option value="">UF</option>
          {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      {erro && <p className="mt-2 rounded-2xl bg-[#FFF6DB] px-3.5 py-2 text-[13px] leading-snug text-[#6B4A00]">{erro}</p>}
    </div>
  );
}
