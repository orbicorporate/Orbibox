const RESEND_API_URL = "https://api.resend.com/emails";

// Remetente com o domínio orbibox.app verificado no Resend.
const FROM = "Orbibox <avisos@orbibox.app>";

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
    console.error("RESEND_API_KEY não configurada, e-mail não enviado:", subject, "para", to);
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
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
    return { ok: false, detail: `${res.status} ${body}` };
  }
  return { ok: true, detail: "" };
}
