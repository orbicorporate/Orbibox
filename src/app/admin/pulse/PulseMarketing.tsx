"use client";

import { useState } from "react";
import { OrbiWorking } from "@/components/orbi/OrbiWorking";

type Canal = {
  key: string;
  icone: string;
  titulo: string;
  resumo: string;
  passos: string[];
  // Tipo de conteúdo que a Orbi gera pra esse canal.
  geraLabel: string;
  geraKind: "bio" | "story" | "whatsapp" | "grupo" | "anuncio";
};

const CANAIS: Canal[] = [
  {
    key: "bio",
    icone: "◎",
    titulo: "Link na bio do Instagram",
    resumo: "O lugar nº 1 pra colocar seu Orbibox. É o único link clicável do perfil — use ele.",
    passos: [
      "Vá em Editar perfil → Site e cole o seu link do Orbibox.",
      "Na descrição da bio, escreva uma linha chamando pra tocar no link (ex: “👇 Toque e conheça tudo”).",
      "Fixe um Story nos destaques explicando o que a pessoa encontra no link.",
    ],
    geraLabel: "✦ Gerar uma bio que converte",
    geraKind: "bio",
  },
  {
    key: "story",
    icone: "◑",
    titulo: "Stories e Direct",
    resumo: "Stories dão alcance diário; o Direct transforma conversa em cliente. Leve os dois pro seu link.",
    passos: [
      "Poste Stories com a figurinha de link apontando pro Orbibox — mostre um produto e diga “tá tudo no link”.",
      "Quem responde Story ou chama no Direct: mande o link direto, em vez de explicar tudo por lá.",
      "Use enquetes e caixinhas pra puxar assunto e, na sequência, mandar o link.",
    ],
    geraLabel: "✦ Gerar textos de Story e Direct",
    geraKind: "story",
  },
  {
    key: "whatsapp",
    icone: "☎\uFE0E",
    titulo: "WhatsApp e status",
    resumo: "Seu contato mais quente. Coloque o link onde todo mundo vê e mande na conversa certa.",
    passos: [
      "Coloque o link do Orbibox no seu recado/assinatura do WhatsApp Business.",
      "Poste no Status mostrando um produto e o link pra saber mais.",
      "Quando alguém perguntar preço ou “o que você faz?”, mande o link em vez de digitar tudo.",
    ],
    geraLabel: "✦ Gerar mensagens de WhatsApp",
    geraKind: "whatsapp",
  },
  {
    key: "grupo",
    icone: "⚉",
    titulo: "Grupos e comunidades",
    resumo: "Grupos de bairro, nicho e parceiros são vitrine grátis — desde que você divulgue com jeito.",
    passos: [
      "Participe de grupos do seu público (bairro, profissão, interesse) e contribua antes de divulgar.",
      "Quando fizer sentido, compartilhe o link com uma frase de valor, não só “segue meu link”.",
      "Combine parcerias: você divulga o parceiro, ele divulga o seu Orbibox.",
    ],
    geraLabel: "✦ Gerar post pra grupos",
    geraKind: "grupo",
  },
  {
    key: "anuncio",
    icone: "➜",
    titulo: "Tráfego pago",
    resumo: "Quando quiser acelerar, um anúncio simples levando pro Orbibox já traz gente nova todo dia.",
    passos: [
      "Comece pequeno: impulsione um post que já foi bem, mandando pro link do Orbibox.",
      "Público: comece pela sua cidade/região e o interesse do seu produto.",
      "Olhe o Pulse: se o link recebe cliques mas ninguém age, ajuste a vitrine antes de gastar mais.",
    ],
    geraLabel: "✦ Gerar ideias de anúncio",
    geraKind: "anuncio",
  },
];

export function PulseMarketing({ businessId, slug }: { businessId: string; slug: string }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [gerando, setGerando] = useState<string | null>(null);
  const [saida, setSaida] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);

  async function gerar(canal: Canal) {
    setGerando(canal.key);
    setErro(null);
    try {
      const res = await fetch("/api/marketing-tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, kind: canal.geraKind }),
      });
      const data = await res.json();
      if (!res.ok) setErro(data.error ?? "Não consegui gerar agora.");
      else setSaida((s) => ({ ...s, [canal.key]: data.text }));
    } catch {
      setErro("Erro de conexão. Tenta de novo.");
    } finally {
      setGerando(null);
    }
  }

  const linkPublico = typeof window !== "undefined" ? `${window.location.origin}/${slug}` : `/${slug}`;

  return (
    <div className="mt-10">
      <div className="rounded-[28px] orbi-gradient p-[1.5px]">
        <div className="rounded-[27px] bg-surface-white p-6">
          <p className="text-[13px] uppercase tracking-wide text-text-tertiary"><span className="orbi-gradient-text">✦</span> Divulgação com a Orbi</p>
          <h2 className="mt-1 font-[family-name:var(--font-manrope)] text-[22px] font-medium leading-tight">
            Como atrair gente pro seu Orbibox
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            Seu link só trabalha se as pessoas chegam nele. A Orbi te mostra, canal por canal, como divulgar do jeito certo — e ainda cria os textos prontos pra você postar.
          </p>

          <button
            onClick={() => navigator.clipboard?.writeText(linkPublico)}
            className="mt-4 flex w-full items-center justify-between gap-2 rounded-2xl bg-surface-soft px-4 py-3 text-left"
          >
            <span className="min-w-0 truncate text-[13px] text-text-secondary">{linkPublico.replace(/^https?:\/\//, "")}</span>
            <span className="shrink-0 text-[12px] font-medium text-on-background">Copiar link</span>
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {CANAIS.map((canal) => {
          const open = aberto === canal.key;
          return (
            <div key={canal.key} className="overflow-hidden rounded-[22px] border border-divider bg-surface-white">
              <button onClick={() => setAberto(open ? null : canal.key)} className="flex w-full items-center gap-3 p-4 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[16px]">{canal.icone}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{canal.titulo}</span>
                  <span className="block truncate text-[12px] text-text-tertiary">{canal.resumo}</span>
                </span>
                <span className="shrink-0 text-[13px] text-text-tertiary">{open ? "−" : "+"}</span>
              </button>
              {open && (
                <div className="border-t border-divider p-4">
                  <p className="text-[13px] leading-relaxed text-text-secondary">{canal.resumo}</p>
                  <ol className="mt-3 flex flex-col gap-2">
                    {canal.passos.map((p, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[11px] font-medium">{i + 1}</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ol>

                  {saida[canal.key] && (
                    <div className="mt-4 rounded-2xl bg-surface-soft p-4">
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-on-background">{saida[canal.key]}</p>
                      <button
                        onClick={() => navigator.clipboard?.writeText(saida[canal.key])}
                        className="mt-3 rounded-full bg-surface-white px-4 py-1.5 text-[12px] font-medium"
                      >
                        Copiar
                      </button>
                    </div>
                  )}

                  {erro && gerando !== canal.key && <p className="mt-3 text-[13px] text-red-600">{erro}</p>}

                  <div className="mt-4">
                    {gerando === canal.key ? (
                      <OrbiWorking label="A Orbi está criando…" variant="inline" />
                    ) : (
                      <button
                        onClick={() => gerar(canal)}
                        className="rounded-full orbi-gradient px-4 py-2.5 text-[13px] font-medium text-on-background"
                      >
                        {saida[canal.key] ? "Gerar outra versão" : canal.geraLabel}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
