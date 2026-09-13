// Cliente mínimo server-side para a Anthropic Messages API.
// Nunca importar este arquivo de um componente "use client".

import { AI_MODEL, ANTHROPIC_API_URL, ANTHROPIC_VERSION } from "@/lib/aiModel";

type Message = { role: "user" | "assistant"; content: string };

export async function askClaude({
  system,
  messages,
  maxTokens = 500,
}: {
  system: string;
  messages: Message[];
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY não configurada.");
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
  return textBlock?.text ?? "";
}
