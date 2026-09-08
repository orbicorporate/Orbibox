const RESEND_API_URL = "https://api.resend.com/emails";

// Enquanto não há domínio próprio verificado no Resend, o remetente de teste
// só consegue entregar pro e-mail da conta dona do Resend. Trocar aqui assim
// que o domínio (ex: cobranca@orbibox.app) estiver verificado lá.
const FROM = "Orbibox <onboarding@resend.dev>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY não configurada — e-mail não enviado:", subject, "para", to);
    return;
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Falha ao enviar e-mail via Resend:", res.status, body);
  }
}
