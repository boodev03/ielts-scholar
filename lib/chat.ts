export function buildConversationTitle(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return "New conversation";
  if (compact.length <= 72) return compact;
  return `${compact.slice(0, 69)}...`;
}
