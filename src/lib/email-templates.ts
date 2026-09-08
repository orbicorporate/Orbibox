function wrapper(title: string, bodyHtml: string, ctaUrl: string, ctaLabel: string) {
  return `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
    <p style="font-size: 13px; letter-spacing: 0.02em; color: #6E7079; text-transform: uppercase; margin: 0 0 16px;">Orbibox</p>
    <h1 style="font-size: 22px; margin: 0 0 16px; color: #111318;">${title}</h1>
    <div style="font-size: 15px; line-height: 1.6; color: #33353D;">${bodyHtml}</div>
    <a href="${ctaUrl}" style="display: inline-block; margin-top: 24px; background: #111318; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-size: 14px; font-weight: 500;">${ctaLabel}</a>
  </div>`;
}

export function paymentFailedEmail(params: { businessName: string; manageUrl: string }) {
  return {
    subject: "Não conseguimos processar seu pagamento — Orbibox",
    html: wrapper(
      "Seu pagamento não passou",
      `<p>Tentamos cobrar a assinatura do <strong>${params.businessName}</strong> e o cartão foi recusado.</p>
       <p>Sua Orbibox continua no ar por enquanto, mas atualize a forma de pagamento pra evitar que o acesso seja suspenso.</p>`,
      params.manageUrl,
      "Atualizar pagamento"
    ),
  };
}
