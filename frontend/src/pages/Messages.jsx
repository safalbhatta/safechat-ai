import { useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import ConversationList from "../components/messaging/ConversationList.jsx";
import ChatArea from "../components/messaging/ChatArea.jsx";
import { useSocket } from "../context/SocketContext.jsx";

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConversationList, setShowConversationList] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const { onlineUsers } = useSocket();
  const [typingChats, setTypingChats] = useState({});

  const handleSelectChat = (chat, user) => {
    setSelectedChat(chat);
    setSelectedUser(user);
    setShowConversationList(false);
  };

  const refreshChats = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  const handleChatDeleted = useCallback(() => {
    setSelectedChat(null);
    setSelectedUser(null);
    setShowConversationList(true);
    setReloadKey((prev) => prev + 1);
  }, []);

  const handleTypingUpdate = useCallback((data) => {
    setTypingChats((prev) => ({ ...prev, [data.chatId]: data.isTyping }));
  }, []);

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
          onlineUsers={onlineUsers}
          typingChats={typingChats}
        />
      </div>

      <div
        className={`${
          showConversationList ? "hidden md:flex" : "flex"
        } flex-1 min-w-0 flex-col`}
      >
        <div className="md:hidden flex-none h-14 px-4 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center shrink-0 z-10">
          <button
            onClick={() => setShowConversationList(true)}
            className="text-[#6366F1] font-black flex items-center gap-2 active:opacity-70 transition-opacity"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
            <span className="text-lg">Messages</span>
          </button>
        </div>

        <ChatArea
          chat={selectedChat}
          otherUser={selectedUser}
          onMessageSent={refreshChats}
          onChatDeleted={handleChatDeleted}
          onlineUsers={onlineUsers}
          onTypingUpdate={handleTypingUpdate}
        />
      </div>
    </div>
  );
}
