/**
 * Datas do varejo brasileiro que valem uma campanha. A Orbi avisa o dono
 * com antecedência e já traz voucher e post prontos pra data.
 */
export type DataComemorativa = {
  id: string;
  nome: string;
  data: Date;
  /** Uma linha pra Orbi entender o clima da data ao escrever a campanha. */
  clima: string;
};

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher).
function pascoa(ano: number) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes, dia);
}

// n-ésimo domingo do mês (0 = janeiro).
function enesimoDomingo(ano: number, mes: number, n: number) {
  const d = new Date(ano, mes, 1);
  const primeiro = (7 - d.getDay()) % 7;
  return new Date(ano, mes, 1 + primeiro + (n - 1) * 7);
}

// Última sexta de novembro.
function blackFriday(ano: number) {
  const d = new Date(ano, 10, 30);
  while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
  return d;
}

function datasDoAno(ano: number): DataComemorativa[] {
  const p = pascoa(ano);
  const carnaval = new Date(p); carnaval.setDate(p.getDate() - 47);
  return [
    { id: `carnaval-${ano}`, nome: "Carnaval", data: carnaval, clima: "festa, cor, alegria, feriado prolongado" },
    { id: `mulher-${ano}`, nome: "Dia da Mulher", data: new Date(ano, 2, 8), clima: "homenagem, carinho, autoestima" },
    { id: `consumidor-${ano}`, nome: "Dia do Consumidor", data: new Date(ano, 2, 15), clima: "agradecer quem compra, oferta especial" },
    { id: `pascoa-${ano}`, nome: "Páscoa", data: p, clima: "chocolate, família, presente" },
    { id: `maes-${ano}`, nome: "Dia das Mães", data: enesimoDomingo(ano, 4, 2), clima: "presente, emoção, gratidão" },
    { id: `namorados-${ano}`, nome: "Dia dos Namorados", data: new Date(ano, 5, 12), clima: "casal, romance, presente a dois" },
    { id: `pais-${ano}`, nome: "Dia dos Pais", data: enesimoDomingo(ano, 7, 2), clima: "presente, homenagem, família" },
    { id: `cliente-${ano}`, nome: "Dia do Cliente", data: new Date(ano, 8, 15), clima: "gratidão, fidelidade, mimo" },
    { id: `criancas-${ano}`, nome: "Dia das Crianças", data: new Date(ano, 9, 12), clima: "diversão, cor, família, levar os pequenos" },
    { id: `halloween-${ano}`, nome: "Halloween", data: new Date(ano, 9, 31), clima: "brincadeira, fantasia, doces" },
    { id: `blackfriday-${ano}`, nome: "Black Friday", data: blackFriday(ano), clima: "oferta forte, urgência, estoque limitado" },
    { id: `natal-${ano}`, nome: "Natal", data: new Date(ano, 11, 25), clima: "presente, família, confraternização" },
    { id: `anonovo-${ano + 1}`, nome: "Ano Novo", data: new Date(ano + 1, 0, 1), clima: "recomeço, celebração, metas" },
  ];
}

/** Dias inteiros entre hoje (horário de Brasília) e a data. */
export function diasAte(data: Date, agora = new Date()) {
  const hoje = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(data); alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/** A próxima data que vale preparar: entre hoje e as próximas 3 semanas. */
export function proximaData(agora = new Date(), janelaDias = 21): (DataComemorativa & { dias: number }) | null {
  const ano = Number(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo", year: "numeric" }));
  const todas = [...datasDoAno(ano - 1), ...datasDoAno(ano), ...datasDoAno(ano + 1)]
    .map((d) => ({ ...d, dias: diasAte(d.data, agora) }))
    .filter((d) => d.dias >= 0 && d.dias <= janelaDias)
    .sort((a, b) => a.dias - b.dias);
  return todas[0] ?? null;
}

export function quandoTexto(dias: number) {
  if (dias === 0) return "é hoje";
  if (dias === 1) return "é amanhã";
  return `em ${dias} dias`;
}
