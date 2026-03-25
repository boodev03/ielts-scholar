import Sidebar from "../modules/chat/Sidebar";
import ChatArea from "../modules/chat/ChatArea";
import LearningInsights from "../modules/chat/LearningInsights";

export default function ChatPage() {
  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <Sidebar />
      <ChatArea />
      <LearningInsights />
    </div>
  );
}
