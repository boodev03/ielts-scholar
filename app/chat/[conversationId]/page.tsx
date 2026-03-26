import ChatScreen from "../ChatScreen";

export default async function ConversationChatPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <ChatScreen conversationId={conversationId} />;
}
