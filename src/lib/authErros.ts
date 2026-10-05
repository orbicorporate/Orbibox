// Traduz os erros do Supabase Auth (que vêm em inglês) pra frases claras.
export function erroDeAuth(msg: string | null | undefined): string {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already"))
    return "Esse e-mail já tem conta. Entre com ele ou use “Esqueci minha senha”.";
  if (m.includes("password") && (m.includes("at least") || m.includes("short") || m.includes("weak")))
    return "Senha muito curta. Use pelo menos 6 caracteres.";
  if (m.includes("invalid") && m.includes("email")) return "Esse e-mail parece ter algo errado. Confira e tente de novo.";
  if (m.includes("email not confirmed")) return "Falta confirmar seu e-mail. Abra o link que enviamos (veja também o spam).";
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "E-mail ou senha não conferem.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes"))
    return "Muitas tentativas seguidas. Espere um minutinho e tente de novo.";
  if (m.includes("fetch") || m.includes("network")) return "Sem conexão agora. Confira sua internet e tente de novo.";
  return "Algo deu errado. Tente de novo em instantes.";
}
