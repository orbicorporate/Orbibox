export function rangeFromParams(sp: { since?: string; until?: string; label?: string }) {
  return {
    since: sp.since || null,
    until: sp.until || null,
    presetLabel: sp.label || null,
  };
}

/**
 * Monta os pontos do gráfico "ao longo do tempo" a partir do período filtrado.
 * Até 31 dias -> um ponto por dia. Períodos maiores -> um ponto por mês,
 * pra não empilhar dezenas de barras ilegíveis.
 */
export function buildSeries(
  cliques: { created_at: string | null }[],
  since: string | null,
  until: string | null
) {
  const fim = until ? new Date(until) : new Date();
  let inicio: Date;
  if (since) {
    inicio = new Date(since);
  } else {
    inicio = new Date(fim);
    inicio.setDate(fim.getDate() - 6);
  }

  const diffDias = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 86400000));

  if (diffDias <= 31) {
    const dias = Array.from({ length: diffDias + 1 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
    const NOMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const valores = dias.map((d) => {
      const chave = d.toISOString().slice(0, 10);
      return cliques.filter((c) => (c.created_at ?? "").slice(0, 10) === chave).length;
    });
    const labels = dias.map((d) => (diffDias <= 9 ? NOMES[d.getDay()] : String(d.getDate())));
    return { valores, labels };
  }

  // Buckets mensais.
  const meses: { chave: string; label: string }[] = [];
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const MES_NOMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  while (cursor <= fim) {
    meses.push({ chave: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`, label: MES_NOMES[cursor.getMonth()] });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const valores = meses.map((m) => cliques.filter((c) => (c.created_at ?? "").slice(0, 7) === m.chave).length);
  return { valores, labels: meses.map((m) => m.label) };
}
