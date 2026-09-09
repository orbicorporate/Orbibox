type Schedulable = { starts_at: string | null; ends_at: string | null };

/** Filtra itens/boxes fora da janela de data agendada — usado na página
 * pública pra que uma promoção vencida ou ainda não iniciada simplesmente
 * não apareça, sem o dono precisar lembrar de ativar/desativar na mão. */
export function filterLive<T extends Schedulable>(rows: T[]): T[] {
  const now = Date.now();
  return rows.filter((row) => {
    if (row.starts_at && new Date(row.starts_at).getTime() > now) return false;
    if (row.ends_at && new Date(row.ends_at).getTime() < now) return false;
    return true;
  });
}
