/**
 * Convites de voucher privado: tudo que é regra pura (sem banco, sem tela) fica aqui,
 * para o painel do dono, a página de quem recebe e as rotas usarem a mesma conta.
 */

export type StatusConvite = "pendente" | "ativado" | "usado" | "cancelado" | "bloqueado";

/** Rótulo e cores de cada situação, iguais no painel inteiro. */
export const STATUS_CONVITE: Record<StatusConvite, { rotulo: string; cor: string; fundo: string }> = {
  pendente: { rotulo: "Aguardando", cor: "#9A5B00", fundo: "#FFF1D6" },
  ativado: { rotulo: "Liberado", cor: "#0B6B5C", fundo: "#D9F3EC" },
  usado: { rotulo: "Usado", cor: "#4B3FA3", fundo: "#E8E4FB" },
  bloqueado: { rotulo: "Bloqueado", cor: "#B3261E", fundo: "#FCE4E1" },
  cancelado: { rotulo: "Cancelado", cor: "#5B6068", fundo: "#ECEDEF" },
};

export const MAX_CONVITES = 1000;
export const MAX_TENTATIVAS = 5;

/** O que a pessoa digitou vira o código guardado: sem traço nem espaço, em maiúsculas. */
export function limparCodigo(txt: string): string {
  return (txt ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
}

/** ABCD-EFGH, mais fácil de ler e de ditar. */
export function formatarCodigo(codigo: string): string {
  const c = limparCodigo(codigo);
  return c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

/** Só dígitos, com 55 na frente quando vem sem o código do país (mesma regra do banco). */
export function normalizarWhatsapp(txt: string | null | undefined): string | null {
  const d = (txt ?? "").replace(/\D/g, "");
  if (!d) return null;
  const n = d.length >= 10 && d.length <= 11 ? `55${d}` : d;
  return n.length >= 12 && n.length <= 15 ? n : null;
}

/** (15) •••••-7777: mostra só o fim, o suficiente para a pessoa se reconhecer. */
export function mascararWhatsapp(numero: string | null | undefined): string {
  const n = normalizarWhatsapp(numero);
  if (!n) return "";
  const nac = n.startsWith("55") ? n.slice(2) : n;
  const ddd = nac.slice(0, 2);
  return `(${ddd}) •••••-${nac.slice(-4)}`;
}

export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? "").trim().split(/\s+/)[0] ?? "";
}

export type LinhaLida = { nome: string | null; whatsapp: string | null; erro: "numero_invalido" | "repetido" | "vazia" | null; original: string };

/**
 * Lê uma lista colada de planilha ou do bloco de notas. Aceita "Nome, 11 99999-9999",
 * "Nome;número", "Nome<TAB>número" ou só o número. Aponta linhas com número inválido
 * e números repetidos, para a pessoa corrigir antes de criar.
 */
export function lerLista(texto: string): LinhaLida[] {
  const vistos = new Set<string>();
  const saida: LinhaLida[] = [];
  for (const bruta of (texto ?? "").split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    const partes = linha.split(/[\t;,]/).map((p) => p.trim()).filter(Boolean);
    let nome: string | null = null;
    let numTxt: string | null = null;
    for (const p of partes) {
      if (/^[\d\s()+.\-]+$/.test(p) && p.replace(/\D/g, "").length >= 3) numTxt = numTxt ?? p;
      else nome = nome ?? p;
    }
    if (!numTxt) {
      // "Maria 11999999999" sem separador
      const m = /^(.*?)[\s]+(\+?[\d()\s.\-]{10,})$/.exec(linha);
      if (m) { nome = nome ?? (m[1].trim() || null); numTxt = m[2].trim(); }
    }
    if (!numTxt && !nome) { saida.push({ nome: null, whatsapp: null, erro: "vazia", original: linha }); continue; }
    const wa = normalizarWhatsapp(numTxt);
    let erro: LinhaLida["erro"] = null;
    if (numTxt && !wa) erro = "numero_invalido";
    else if (wa && vistos.has(wa)) erro = "repetido";
    if (wa && !erro) vistos.add(wa);
    saida.push({ nome: nome ? nome.slice(0, 80) : null, whatsapp: wa, erro, original: linha });
  }
  return saida;
}

/** Link do convite: um por pessoa (com o código) ou um só para o grupo (sem código). */
export function linkConvite(base: string, slug: string, voucherId: string, codigo?: string | null): string {
  const raiz = base.replace(/\/$/, "");
  const c = codigo ? `?c=${limparCodigo(codigo)}` : "";
  return `${raiz}/${slug}/convite/${voucherId}${c}`;
}

/** Mensagem pronta para mandar o convite pelo WhatsApp. */
export function mensagemConvite(opts: { nomeNegocio: string; titulo: string; nome?: string | null; link: string; codigo?: string | null }): string {
  const oi = primeiroNome(opts.nome) ? `Oi, ${primeiroNome(opts.nome)}!` : "Oi!";
  const cod = opts.codigo ? `\nSeu código: ${formatarCodigo(opts.codigo)}` : "";
  return `${oi} Você foi convidado(a) para um voucher exclusivo de ${opts.nomeNegocio}: ${opts.titulo}.\n\nToque para liberar o seu:\n${opts.link}${cod}\n\nO voucher é pessoal e vale uma vez só.`;
}

/** Linha de CSV com aspas quando precisa. */
function celula(v: string | number | null | undefined): string {
  const t = v == null ? "" : String(v);
  return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function paraCsv(linhas: { nome: string | null; whatsapp: string | null; codigo: string; status: string; link: string }[]): string {
  const cab = ["Nome", "WhatsApp", "Código", "Situação", "Link"];
  const corpo = linhas.map((l) => [l.nome, l.whatsapp, formatarCodigo(l.codigo), l.status, l.link].map(celula).join(";"));
  return `﻿${[cab.join(";"), ...corpo].join("\r\n")}`;
}

/** Texto amigável para cada erro que a página de quem recebe pode mostrar. */
export const ERROS_CONVITE: Record<string, { titulo: string; texto: string }> = {
  codigo_invalido: { titulo: "Código não encontrado", texto: "Confira o código que você recebeu e tente de novo." },
  numero_nao_confere: { titulo: "Esse WhatsApp não é o do convite", texto: "Use o número do WhatsApp em que você recebeu o convite." },
  bloqueado: { titulo: "Convite bloqueado por segurança", texto: "Houve tentativas demais. Peça ao negócio para liberar o seu convite." },
  ja_ativado: { titulo: "Esse convite já foi aberto em outro aparelho", texto: "Se foi você, entre com o WhatsApp do convite. Se não foi, fale com o negócio." },
  ja_usado: { titulo: "Esse voucher já foi usado", texto: "Cada convite vale uma vez só." },
  cancelado: { titulo: "Convite cancelado", texto: "O negócio cancelou este convite. Fale com ele se achar que é um engano." },
  esgotado: { titulo: "As vagas acabaram", texto: "Todos os vouchers desta ação já foram liberados." },
  indisponivel: { titulo: "Voucher indisponível", texto: "Este voucher não está mais ativo." },
  otp_indisponivel: { titulo: "Não consegui enviar o código agora", texto: "Tente de novo em instantes ou fale com o negócio." },
  otp_errado: { titulo: "Código incorreto ou vencido", texto: "Confira o código que chegou no seu WhatsApp." },
  muitas_tentativas: { titulo: "Muitas tentativas", texto: "Aguarde alguns minutos e tente de novo." },
};
