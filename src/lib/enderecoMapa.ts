/** Texto de busca pro mapa: garante o país, pra o Google não cair numa rua homônima de fora. */
export function consultaMapa(endereco: string): string {
  const e = endereco.trim();
  return /brasil|brazil/i.test(e) ? e : `${e}, Brasil`;
}
