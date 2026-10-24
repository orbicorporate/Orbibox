// Horário de funcionamento guardado no botão de endereço (config.horario).
export type Horario = { dias: number[]; abre: string; fecha: string };

const NOMES = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function lerHorario(v: unknown): Horario | null {
  const h = v as Partial<Horario> | null;
  if (!h || !Array.isArray(h.dias) || h.dias.length === 0) return null;
  const ok = (t: unknown) => typeof t === "string" && /^\d{2}:\d{2}$/.test(t);
  if (!ok(h.abre) || !ok(h.fecha)) return null;
  return { dias: h.dias.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6), abre: h.abre as string, fecha: h.fecha as string };
}

const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hora = (t: string) => (t.endsWith(":00") ? `${Number(t.slice(0, 2))}h` : `${Number(t.slice(0, 2))}h${t.slice(3, 5)}`);

/** Agora, em Brasília: dia da semana (0 = domingo) e minutos desde 00:00. */
export function agoraBrasilia(d: Date = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(partes.find((p) => p.type === "weekday")?.value ?? "Sun");
  const h = Number(partes.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(partes.find((p) => p.type === "minute")?.value ?? 0);
  return { dia, minutos: h * 60 + m };
}

export function statusHorario(h: Horario, agora = agoraBrasilia()): { aberto: boolean; texto: string } {
  const abre = min(h.abre);
  const fecha = min(h.fecha);
  if (h.dias.includes(agora.dia) && agora.minutos >= abre && agora.minutos < fecha) return { aberto: true, texto: `Aberto agora · fecha às ${hora(h.fecha)}` };
  if (h.dias.includes(agora.dia) && agora.minutos < abre) return { aberto: false, texto: `Fechado · abre hoje às ${hora(h.abre)}` };
  for (let i = 1; i <= 7; i++) {
    const d = (agora.dia + i) % 7;
    if (h.dias.includes(d)) return { aberto: false, texto: `Fechado · abre ${i === 1 ? "amanhã" : NOMES[d]} às ${hora(h.abre)}` };
  }
  return { aberto: false, texto: "Fechado agora" };
}
