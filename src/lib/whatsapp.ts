/**
 * Número pronto para o wa.me: só dígitos e com o código do país. Sem o 55, o WhatsApp
 * completa pelo país e pelo DDD de quem abre o link, e a mensagem pode ir para outro número.
 */
export function numeroWa(numero: string | null | undefined): string {
  const d = (numero ?? "").replace(/\D/g, "");
  if (!d) return "";
  return d.length <= 11 ? `55${d}` : d;
}
