import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import ConversationList from "../components/messaging/ConversationList.jsx";
import ChatArea from "../components/messaging/ChatArea.jsx";

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConversationList, setShowConversationList] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const handleSelectChat = (chat, user) => {
    setSelectedChat(chat);
    setSelectedUser(user);
    setShowConversationList(false);
  };

  const refreshChats = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className="h-full flex overflow-hidden">
      <div
        className={`${
          showConversationList ? "block" : "hidden md:block"
        } w-full md:w-[410px] shrink-0`}
      >
        <ConversationList
          selectedChatId={selectedChat?._id}
          onSelectChat={handleSelectChat}
          reloadKey={reloadKey}
        />
      </div>

      <div
        className={`${
          showConversationList ? "hidden md:flex" : "flex"
        } flex-1 min-w-0 flex-col`}
      >
        <button
          onClick={() => setShowConversationList(true)}
          className="md:hidden h-12 px-4 bg-white/84 border-b border-slate-200 text-[#6366F1] font-black flex items-center gap-2"
        >
          <ArrowLeft size={19} />
          Messages
        </button>

        <ChatArea
          chat={selectedChat}
          otherUser={selectedUser}
          onMessageSent={refreshChats}
        />
      </div>
    </div>
  );
}
