export function clsx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type Msg = { role: string; content: string };

/**
 * Procura um número de telefone/WhatsApp nas mensagens do visitante. A Orbi
 * pede o contato durante a conversa, então ele fica no texto — não numa coluna
 * separada. Aceita formatos comuns brasileiros (com/sem DDD, com/sem +55).
 * Retorna só os dígitos, ou null se não achar.
 */
export function acharWhatsapp(messages: Msg[]): string | null {
  for (const m of messages) {
    if (m.role !== "visitor") continue;
    const match = m.content.match(/(\+?\d[\d\s().-]{8,}\d)/);
    if (match) {
      const digits = match[1].replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 13) return digits;
    }
  }
  return null;
}

export function formatFone(digits: string) {
  const d = digits.replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

// Converte um ISO (UTC, como vem do banco) pro formato que <input type="datetime-local">
// espera (horário local, sem timezone), e vice-versa. Usado nos campos de
// agendamento de boxes e itens da vitrine.
export function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
