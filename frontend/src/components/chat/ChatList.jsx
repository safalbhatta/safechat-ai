import { useEffect, useState } from "react";
import { Archive, Inbox, Search, ShieldCheck } from "lucide-react";
import ChatCard from "./ChatCard";
import API from "../../services/api";

function ChatList({
  selectedUser,
  setSelectedUser,
  activeChat,
  setActiveChat,
  onlineUsers,
  latestMessage,
}) {
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetchUsers();
    fetchChats();
  }, []);

  useEffect(() => {
    if (!latestMessage?.chatId) return;

    setChats((prevChats) => {
      const chatExists = prevChats.some(
        (chat) => chat._id === latestMessage.chatId
      );

      if (!chatExists) {
        fetchChats();
        return prevChats;
      }

      const updatedChats = prevChats.map((chat) => {
        if (chat._id !== latestMessage.chatId) return chat;

        const shouldIncreaseUnread =
          latestMessage.receiverId === currentUser?._id &&
          latestMessage.chatId !== activeChat?._id &&
          !chat.isMuted;

        return {
          ...chat,
          lastMessage: latestMessage.isDeleted
            ? "This message was deleted"
            : latestMessage.text,
          unreadCount: shouldIncreaseUnread ? (chat.unreadCount || 0) + 1 : 0,
          updatedAt: new Date().toISOString(),
        };
      });

      return updatedChats.sort(sortChats);
    });
  }, [latestMessage, activeChat?._id, currentUser?._id]);

  const fetchUsers = async () => {
    try {
      const res = await API.get("/users");
      setUsers(res.data);
    } catch (error) {
      console.log("Fetch users error:", error);
    }
  };

  const fetchChats = async () => {
    try {
      const res = await API.get("/chats");
      setChats(res.data);
    } catch (error) {
      console.log("Fetch chats error:", error);
    }
  };

  const sortChats = (a, b) => {
    if (a?.isPinned && !b?.isPinned) return -1;
    if (!a?.isPinned && b?.isPinned) return 1;

    return new Date(b?.updatedAt || 0) - new Date(a?.updatedAt || 0);
  };

  const getChatForUser = (userId) => {
    return chats.find((chat) =>
      chat.members.some((member) => {
        const memberId = member._id || member;
        return memberId.toString() === userId.toString();
      })
    );
  };

  const clearUnreadForChat = (chatId) => {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat._id === chatId ? { ...chat, unreadCount: 0 } : chat
      )
    );
  };

  const handleChatAction = async (action, chatId) => {
    try {
      if (!chatId) return;

      await API.patch(`/chats/${chatId}/${action}`);

      if (
        action === "archive" ||
        action === "delete-for-me" ||
        action === "clear"
      ) {
        if (activeChat?._id === chatId) {
          setSelectedUser(null);
          setActiveChat(null);
        }
      }

      await fetchChats();
    } catch (error) {
      console.log("Chat action error:", error);
    }
  };

  const buildChatRows = () => {
    const rows = users.map((user) => {
      const existingChat = getChatForUser(user._id);

      return {
        user,
        existingChat,
      };
    });

    return rows
      .filter(({ user, existingChat }) => {
        const keyword = search.toLowerCase();

        const matchesSearch =
          user.username?.toLowerCase().includes(keyword) ||
          user.email?.toLowerCase().includes(keyword);

        if (!matchesSearch) return false;

        if (showArchived) {
          return existingChat?.isArchived;
        }

        if (existingChat?.isArchived) {
          return false;
        }

        return true;
      })
      .sort((a, b) => sortChats(a.existingChat, b.existingChat));
  };

  const chatRows = buildChatRows();

  return (
    <section className="chat-list">
      <div className="chat-list-header">
        <div className="chat-title-row">
          <div>
            <span className="eyebrow">
              {showArchived ? "Archived" : "Messenger"}
            </span>
            <h2>SafeChat AI</h2>
          </div>

          <div className="safe-badge">
            <ShieldCheck size={16} />
          </div>
        </div>

        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="chat-filter-row">
          <button
            className={!showArchived ? "chat-filter active" : "chat-filter"}
            onClick={() => setShowArchived(false)}
            type="button"
          >
            <Inbox size={15} />
            Chats
          </button>

          <button
            className={showArchived ? "chat-filter active" : "chat-filter"}
            onClick={() => setShowArchived(true)}
            type="button"
          >
            <Archive size={15} />
            Archived
          </button>
        </div>
      </div>

      <div className="chat-list-body">
        {chatRows.length === 0 ? (
          <div className="empty-list">
            {showArchived ? "No archived chats." : "No chats found."}
          </div>
        ) : (
          chatRows.map(({ user, existingChat }) => (
            <ChatCard
              key={user._id}
              chat={user}
              existingChat={existingChat}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              setActiveChat={setActiveChat}
              clearUnreadForChat={clearUnreadForChat}
              onChatAction={handleChatAction}
              isOnline={onlineUsers.includes(user._id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default ChatList;