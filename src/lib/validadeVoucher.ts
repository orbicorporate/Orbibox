/**
 * Janela de uso do voucher: dias da semana e horário em que ele vale.
 * dias_semana: 0 = domingo ... 6 = sábado (null ou vazio = todos os dias).
 * hora_inicio / hora_fim: "HH:MM" ou "HH:MM:SS" no fuso de São Paulo
 * (null = sem limite). Se hora_fim for menor que hora_inicio, a janela
 * atravessa a meia-noite (ex.: 18h às 02h).
 */
export type JanelaVoucher = {
  dias_semana?: number[] | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
};

export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const DIAS_NOME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"] as const;
const FUSO = "America/Sao_Paulo";

function diasValidos(j: JanelaVoucher): number[] {
  const d = (j.dias_semana ?? []).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return Array.from(new Set(d)).sort((a, b) => a - b);
}

function minutos(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hora);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function hLabel(hora: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hora);
  if (!m) return hora;
  return m[2] === "00" ? `${Number(m[1])}h` : `${Number(m[1])}h${m[2]}`;
}

/** Tem alguma restrição de dia ou horário? */
export function temJanela(j: JanelaVoucher): boolean {
  const dias = diasValidos(j);
  return (dias.length > 0 && dias.length < 7) || minutos(j.hora_inicio) !== null || minutos(j.hora_fim) !== null;
}

/** Texto curto para o cartão: "Válido às quartas, das 18h às 23h". Null se vale sempre. */
export function rotuloJanela(j: JanelaVoucher): string | null {
  if (!temJanela(j)) return null;
  const dias = diasValidos(j);
  let diasTxt = "";
  if (dias.length > 0 && dias.length < 7) {
    const seguidos = dias.length > 2 && dias.every((d, i) => i === 0 || d === dias[i - 1] + 1);
    if (dias.length === 1) {
      const d = dias[0];
      diasTxt = d === 0 || d === 6 ? `aos ${DIAS_NOME[d]}s` : `às ${DIAS_NOME[d]}s`;
    } else if (seguidos) {
      diasTxt = `de ${DIAS_NOME[dias[0]]} a ${DIAS_NOME[dias[dias.length - 1]]}`;
    } else {
      const nomes = dias.map((d) => DIAS_CURTOS[d]);
      diasTxt = `nos dias ${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
    }
  }
  let horaTxt = "";
  if (j.hora_inicio && j.hora_fim) horaTxt = `das ${hLabel(j.hora_inicio)} às ${hLabel(j.hora_fim)}`;
  else if (j.hora_inicio) horaTxt = `a partir das ${hLabel(j.hora_inicio)}`;
  else if (j.hora_fim) horaTxt = `até as ${hLabel(j.hora_fim)}`;
  return `Válido ${[diasTxt, horaTxt].filter(Boolean).join(", ")}`;
}

/** Texto direto para a etiqueta na foto: "De terça a quinta", "Das 11h às 15h". Null se vale sempre. */
export function rotuloTag(j: JanelaVoucher): string | null {
  const l = rotuloJanela(j);
  if (!l) return null;
  const sem = l.replace(/^Válido /, "");
  return sem.charAt(0).toUpperCase() + sem.slice(1).replace(/, das /, " · Das ").replace(/, a partir/, " · A partir").replace(/, até/, " · Até");
}

/** Dia da semana (0-6) e minutos do dia agora, no fuso de São Paulo. */
function agoraSP(agora: Date): { dia: number; min: number } {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: FUSO, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(agora);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { dia, min: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** O voucher pode ser usado agora? */
export function dentroDaJanela(j: JanelaVoucher, agora: Date = new Date()): boolean {
  if (!temJanela(j)) return true;
  const dias = diasValidos(j);
  const filtraDia = dias.length > 0 && dias.length < 7;
  const ini = minutos(j.hora_inicio);
  const fim = minutos(j.hora_fim);
  const { dia, min } = agoraSP(agora);

  // Janela que atravessa a meia-noite: o dia vale pelo começo da janela.
  if (ini !== null && fim !== null && fim < ini) {
    if (min >= ini) return !filtraDia || dias.includes(dia);
    if (min < fim) return !filtraDia || dias.includes((dia + 6) % 7);
    return false;
  }
  if (filtraDia && !dias.includes(dia)) return false;
  if (ini !== null && min < ini) return false;
  if (fim !== null && min >= fim) return false;
  return true;
}
