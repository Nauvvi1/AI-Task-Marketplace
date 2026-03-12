export type DraftSession = {
  serviceCode?: string;
  orderId?: string;
  brief?: Record<string, string>;
  currentStep?: number;
};

export const sessions = new Map<string, DraftSession>();

export function getSession(chatId: string): DraftSession {
  if (!sessions.has(chatId)) sessions.set(chatId, {});
  return sessions.get(chatId)!;
}

export function resetSession(chatId: string) {
  sessions.set(chatId, {});
}
