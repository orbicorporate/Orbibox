// Cliente mínimo server-side para a Anthropic Messages API.
// Nunca importar este arquivo de um componente "use client".

import { AI_MODEL, ANTHROPIC_API_URL, ANTHROPIC_VERSION } from "@/lib/aiModel";

type Message = { role: "user" | "assistant"; content: string };

export async function askClaude({
  system,
  messages,
  maxTokens = 500,
  model = AI_MODEL,
  cacheSystem = false,
}: {
  system: string;
  messages: Message[];
  maxTokens?: number;
  model?: string;
  cacheSystem?: boolean;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY não configurada.");
  }

  // Com cacheSystem, o prompt do sistema (contexto do negócio, que se repete
  // em toda a conversa) é marcado como cacheável: paga cheio na 1ª mensagem e
  // ~90% mais barato nas seguintes. Ideal pro chat, onde o mesmo contexto vai
  // em cada troca.
  const systemPayload = cacheSystem
    ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
    : system;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPayload,
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

/**
 * Pede uma resposta ESTRUTURADA: força a IA a "chamar uma ferramenta" cujo
 * argumento é o JSON que queremos. A API devolve esse argumento já como
 * objeto, sem texto solto em volta, então não existe mais JSON quebrado por
 * aspas, quebra de linha ou comentário no meio. Se a resposta vier cortada
 * (limite de tokens), devolve o que veio e quem chama decide.
 */
export async function askClaudeJSON<T>({
  system,
  messages,
  schema,
  toolName = "responder",
  maxTokens = 8000,
  model = AI_MODEL,
}: {
  system: string;
  messages: Message[];
  schema: Record<string, unknown>;
  toolName?: string;
  maxTokens?: number;
  model?: string;
}): Promise<{ data: T | null; truncated: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages,
      tools: [{ name: toolName, description: "Entrega a resposta final estruturada.", input_schema: schema }],
      tool_choice: { type: "tool", name: toolName },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const block = data.content?.find((b: { type: string }) => b.type === "tool_use");
  return { data: (block?.input as T) ?? null, truncated: data.stop_reason === "max_tokens" };
}
