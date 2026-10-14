/**
 * Leitura de WhatsApp e nome em texto livre (mensagens do chat). Roda no
 * servidor e no navegador, sem dependências.
 */

/** Só dígitos, sem o 55 do país, e só se for um celular ou fixo brasileiro plausível. */
export function digitosBR(bruto: string): string | null {
  let d = bruto.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  // Celular tem o 9 depois do DDD; fixo começa em 2 a 5.
  if (d.length === 11 && d[2] !== "9") return null;
  if (d.length === 10 && !/[2-5]/.test(d[2])) return null;
  return d;
}

const RE_TEL = /(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/g;

/** Primeiro telefone válido encontrado no texto, só dígitos (com DDD). */
export function extrairWhatsapp(texto: string): string | null {
  const achados = texto.match(RE_TEL) ?? [];
  for (const a of achados) {
    const d = digitosBR(a);
    if (d) return d;
  }
  return null;
}

/** "meu nome é Ana", "sou o João Silva", "me chamo Carla". Só aceita nome com inicial maiúscula. */
export function extrairNome(texto: string): string | null {
  const m = texto.match(/(?:[Mm]eu nome é|[Mm]e chamo|[Ss]ou (?:o |a )?|[Aa]qui é (?:o |a )?)([A-ZÀ-Ý][\p{L}]{1,20}(?:\s[A-ZÀ-Ý][\p{L}]{1,20})?)/u);
  return m ? m[1].trim() : null;
}

export function primeiroNome(nome?: string | null): string {
  return (nome ?? "").trim().split(/\s+/)[0] ?? "";
}

/** Texto de confirmação que a Orbi diz depois de anotar o contato. */
export function mensagemContatoAnotado(nome?: string | null): string {
  const n = primeiroNome(nome);
  return `${n ? `Anotado, ${n}!` : "Anotado!"} Um especialista da equipe vai ver nossa conversa e te chamar no WhatsApp.`;
}
