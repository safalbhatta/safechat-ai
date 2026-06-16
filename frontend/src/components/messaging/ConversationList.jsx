import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Edit, MessageCircle, Users, Loader2 } from "lucide-react";
import api from "../../lib/api.js";

function initials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}

function getUserName(user) {
  return user?.username || user?.name || user?.email || "Unknown User";
}

function Avatar({ user }) {
  return (
    <div className="relative shrink-0">
      <div className="w-13 h-13 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white flex items-center justify-center font-black shadow-[0_10px_24px_rgba(99,102,241,0.22)]">
        {initials(getUserName(user))}
      </div>

      <span
        className={`absolute right-0 bottom-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
          user?.isOnline ? "bg-emerald-400" : "bg-slate-300"
        }`}
      />
    </div>
  );
}

export default function ConversationList({
  selectedChatId,
  onSelectChat,
  reloadKey,
}) {
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?._id || currentUser?.id;

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingChatId, setStartingChatId] = useState("");

  const getOtherMember = useCallback(
    (chat) => {
      return chat?.members?.find(
        (member) => member._id?.toString() !== currentUserId?.toString()
      );
    },
    [currentUserId]
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [usersRes, chatsRes] = await Promise.all([
        api.get("/users"),
        api.get("/chats"),
      ]);

      setUsers(usersRes.data || []);
      setChats(chatsRes.data || []);
    } catch (error) {
      console.error("Failed to load chats/users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, reloadKey]);

  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      const otherUser = getOtherMember(chat);
      const text = `${getUserName(otherUser)} ${otherUser?.email || ""}`.toLowerCase();
      return text.includes(searchQuery.toLowerCase());
    });
  }, [chats, searchQuery, getOtherMember]);

  const chatMemberIds = useMemo(() => {
  const ids = new Set();

  chats.forEach((chat) => {
    chat.members?.forEach((member) => {
      ids.add(member._id?.toString());
    });
  });

  return ids;
}, [chats]);

const filteredUsers = useMemo(() => {
  const q = searchQuery.trim().toLowerCase();

  // Do not show all users by default.
  // Users only appear when searching to start a new chat.
  if (!q) return [];

  return users.filter((user) => {
    const userId = user._id?.toString();

    // Do not show myself
    if (userId === currentUserId?.toString()) return false;

    // Do not show users I already have a chat with
    if (chatMemberIds.has(userId)) return false;

    const text = `${getUserName(user)} ${user.email || ""}`.toLowerCase();
    return text.includes(q);
  });
}, [users, searchQuery, currentUserId, chatMemberIds]);

  const handleStartChat = async (user) => {
    try {
      setStartingChatId(user._id);

      const res = await api.post("/chats", {
        receiverId: user._id,
      });

      await loadData();
      onSelectChat(res.data, user);
    } catch (error) {
      console.error("Failed to start chat:", error);
      alert(error.response?.data?.message || "Failed to start chat");
    } finally {
      setStartingChatId("");
    }
  };

  const handleOpenExistingChat = (chat) => {
    const otherUser = getOtherMember(chat);
    onSelectChat(chat, otherUser);
  };

  return (
    <section className="h-full flex flex-col apple-panel border-r border-slate-200/70">
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[34px] leading-none font-black tracking-tight text-slate-950">
              Messages
            </h1>
            <p className="text-sm text-slate-500 mt-2">
  Your private conversations
</p>
          </div>

          <button
            onClick={loadData}
            className="w-11 h-11 rounded-full apple-primary flex items-center justify-center"
            title="Refresh"
          >
            <Edit size={19} />
          </button>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users or chats"
            className="apple-input w-full h-12 rounded-full pl-11 pr-4 text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </header>

      <div className="px-3 pb-4 flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-60 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={34} className="animate-spin" />
            <p className="font-black mt-3">Loading users...</p>
          </div>
        ) : (
          <>
            <div className="px-3 pt-2 pb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
              <MessageCircle size={14} />
              Chats
            </div>

            {filteredChats.length === 0 ? (
              <div className="px-4 py-4 text-sm text-slate-400">
                No chats yet. Start one below.
              </div>
            ) : (
              filteredChats.map((chat) => {
                const otherUser = getOtherMember(chat);
                const isSelected = chat._id === selectedChatId;

                return (
                  <button
                    key={chat._id}
                    onClick={() => handleOpenExistingChat(chat)}
                    className={`w-full text-left rounded-[26px] p-3 mb-2 apple-card-hover ${
                      isSelected
                        ? "bg-white shadow-[0_16px_38px_rgba(99,102,241,0.12)] border border-[#E0E7FF]"
                        : "hover:bg-white/88"
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      <Avatar user={otherUser} />

                      <div className="flex-1 min-w-0 border-b border-slate-200/60 pb-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-black text-slate-950 truncate">
                            {getUserName(otherUser)}
                          </h3>

                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {chat.updatedAt
                              ? new Date(chat.updatedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <p className="flex-1 truncate text-sm text-slate-500">
                            {chat.lastMessage || "No messages yet"}
                          </p>

                          {chat.unreadCount > 0 && (
                            <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#6366F1] text-white text-xs font-black flex items-center justify-center">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}

            <div className="px-3 pt-5 pb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
              <Users size={14} />
Search People
            </div>

            {filteredUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => handleStartChat(user)}
                disabled={startingChatId === user._id}
                className="w-full text-left rounded-[26px] p-3 mb-2 hover:bg-white/88 apple-card-hover disabled:opacity-60"
              >
                <div className="flex gap-3 items-center">
                  <Avatar user={user} />

                  <div className="flex-1 min-w-0 border-b border-slate-200/60 pb-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-black text-slate-950 truncate">
                        {getUserName(user)}
                      </h3>

                      {startingChatId === user._id && (
                        <Loader2 size={16} className="animate-spin text-slate-400" />
                      )}
                    </div>

                    <p className="truncate text-sm text-slate-500">
                      {user.email}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {filteredUsers.length === 0 && filteredChats.length === 0 && (
              <div className="h-60 flex flex-col items-center justify-center text-center text-slate-400">
                <MessageCircle size={40} />
                <p className="font-black mt-3">No users found</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
