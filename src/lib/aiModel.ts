// Modelo de IA usado em TODO o app, num lugar só. Trocar aqui atualiza todas
// as inteligências da Orbi de uma vez (geração de conteúdo, curadoria, chat,
// análise de marca, etc). Sempre o melhor modelo disponível.
export const AI_MODEL = "claude-sonnet-5";

// Modelo econômico pra tarefas onde a qualidade do Sonnet não é necessária
// (ex: chat de atendimento ao visitante). Metade do preço, resposta igual
// de boa nesses casos.
export const AI_MODEL_RAPIDO = "claude-haiku-4-5";

export const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";
