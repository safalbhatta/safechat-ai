import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Search,
  Edit,
  MessageCircle,
  Users,
  Loader2,
  Trash2,
  Archive,
  BellOff,
  Pin,
  Heart,
  Ban,
  MinusCircle,
  LogOut,
  X,
  Check,
  MoreHorizontal,
} from "lucide-react";
import api from "../../lib/api.js";
import { useSocket } from "../../context/SocketContext.jsx";

function initials(name = "") {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
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

      {!user?.isGroup && (
        <span
          className={`absolute right-0 bottom-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
            user?.isOnline ? "bg-emerald-400" : "bg-slate-300"
          }`}
        />
      )}
    </div>
  );
}

export default function ConversationList({
  selectedChatId,
  onSelectChat,
  reloadKey,
  onlineUsers = [],
  typingChats = {},
}) {
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?._id || currentUser?.id;
  const location = useLocation();
  const { socket: globalSocket } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingChatId, setStartingChatId] = useState("");
  const [notice, setNotice] = useState("");
  const [chatMenu, setChatMenu] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [moreFilterOpen, setMoreFilterOpen] = useState(false);

  const selectedChatIdRef = useRef(selectedChatId);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  const getOtherMember = useCallback(
    (chat) => {
      if (chat?.isGroupChat) return null;

      return chat?.members?.find(
        (member) => member?._id?.toString() !== currentUserId?.toString()
      );
    },
    [currentUserId]
  );

  const getChatTitle = useCallback(
    (chat) => {
      if (chat?.isGroupChat) return chat.groupName || "Group chat";
      return getUserName(getOtherMember(chat));
    },
    [getOtherMember]
  );

  const getChatAvatarUser = useCallback(
    (chat) => {
      if (chat?.isGroupChat) {
        return {
          username: chat.groupName || "Group chat",
          isGroup: true,
        };
      }

      const otherUser = getOtherMember(chat);
      const isOnline =
        onlineUsers.includes(otherUser?._id) &&
        otherUser?.privacy?.lastSeen !== "Nobody";

      return otherUser ? { ...otherUser, isOnline } : null;
    },
    [getOtherMember, onlineUsers]
  );

  const getChatTarget = useCallback(
    (chat) => {
      if (chat?.isGroupChat) {
        return {
          _id: chat._id,
          username: chat.groupName || "Group chat",
          email: `${chat.members?.length || 0} members`,
          isGroup: true,
        };
      }

      return getOtherMember(chat);
    },
    [getOtherMember]
  );

  const loadData = useCallback(async () => {
    try {
      const [usersRes, chatsRes] = await Promise.all([
        api.get("/users"),
        api.get("/chats"),
      ]);

      const fetchedChats = chatsRes.data || [];

      setUsers(usersRes.data || []);
      setChats(
        fetchedChats.map((chat) =>
          chat._id === selectedChatIdRef.current
            ? { ...chat, unreadCount: 0, isUnreadMarked: false }
            : chat
        )
      );
    } catch (error) {
      console.error("Failed to load chats/users:", error);
      setNotice("Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    if (!globalSocket) return;

    globalSocket.on("userProfileUpdated", loadData);

    return () => {
      globalSocket.off("userProfileUpdated", loadData);
    };
  }, [loadData, reloadKey, globalSocket]);

  useEffect(() => {
  const closeMenu = () => {
    setChatMenu(null);
    setMoreFilterOpen(false);
  };

  window.addEventListener("click", closeMenu);

  return () => window.removeEventListener("click", closeMenu);
}, []);
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const filter = params.get("filter");

  if (filter === "archived") {
    setActiveFilter("archived");
  } else if (activeFilter === "archived") {
    setActiveFilter("all");
  }
}, [location.search]);
  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice("");
    }, 2200);

    return () => clearTimeout(timer);
  }, [notice]);

  const updateChatInState = (updatedChat) => {
    if (!updatedChat?._id) return;

    setChats((prev) =>
      prev.map((chat) => (chat._id === updatedChat._id ? updatedChat : chat))
    );
  };

  const removeChatFromState = (chatId) => {
    setChats((prev) => prev.filter((chat) => chat._id !== chatId));

    if (selectedChatId === chatId) {
      onSelectChat(null, null);
    }
  };

  const visibleChats = useMemo(() => {
  if (activeFilter === "archived") {
    return chats.filter((chat) => chat.isArchived);
  }

  return chats.filter((chat) => !chat.isArchived);
}, [chats, activeFilter]);

  const unreadTotal = useMemo(() => {
    return visibleChats.filter(
      (chat) => chat.unreadCount > 0 || chat.isUnreadMarked
    ).length;
  }, [visibleChats]);

  const filteredChats = useMemo(() => {
    return visibleChats
      .filter((chat) => {
        if (!chat.isGroupChat) {
          const otherUser = getOtherMember(chat);

          if (
            !otherUser ||
            (!otherUser.username && !otherUser.email && !otherUser.name)
          ) {
            return false;
          }
        }

        if (!chat.lastMessage && !chat.isGroupChat) {
          return false;
        }

        if (activeFilter === "unread") {
          if (!(chat.unreadCount > 0 || chat.isUnreadMarked)) return false;
        }

        if (activeFilter === "favorites") {
          if (!chat.isFavorite) return false;
        }

        if (activeFilter === "groups") {
          if (!chat.isGroupChat) return false;
        }

        const text = chat.isGroupChat
          ? `${chat.groupName || "Group chat"}`.toLowerCase()
          : `${getUserName(getOtherMember(chat))} ${
              getOtherMember(chat)?.email || ""
            }`.toLowerCase();

        return text.includes(searchQuery.toLowerCase());
      })
      .map((chat) =>
        chat._id === selectedChatId
          ? { ...chat, unreadCount: 0, isUnreadMarked: false }
          : chat
      );
  }, [
    visibleChats,
    searchQuery,
    getOtherMember,
    selectedChatId,
    activeFilter,
  ]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (user._id?.toString() === currentUserId?.toString()) return false;

      const text = `${getUserName(user)} ${user.email || ""}`.toLowerCase();
      return text.includes(searchQuery.toLowerCase());
    });
  }, [users, searchQuery, currentUserId]);

  const groupUsers = useMemo(() => {
    return users.filter((user) => {
      if (user._id?.toString() === currentUserId?.toString()) return false;

      const text = `${getUserName(user)} ${user.email || ""}`.toLowerCase();
      return text.includes(groupSearch.toLowerCase());
    });
  }, [users, groupSearch, currentUserId]);

  const handleStartChat = async (user) => {
    const existingChat = chats.find((chat) => {
      if (chat.isGroupChat) return false;

      const other = getOtherMember(chat);
      return other?._id === user._id;
    });

    if (existingChat) {
      handleOpenExistingChat(existingChat);
      return;
    }

    try {
      setStartingChatId(user._id);

      const res = await api.post("/chats", {
        receiverId: user._id,
      });

      onSelectChat(res.data, user);
      loadData();
    } catch (error) {
      console.error("Failed to start chat:", error);
      setNotice(error.response?.data?.message || "Failed to start chat");
    } finally {
      setStartingChatId("");
    }
  };

  const handleOpenExistingChat = async (chat) => {
    setChats((prevChats) =>
      prevChats.map((item) =>
        item._id === chat._id
          ? { ...item, unreadCount: 0, isUnreadMarked: false }
          : item
      )
    );

    if (chat.isUnreadMarked) {
      api
        .patch(`/chats/${chat._id}/mark-read`)
        .then((res) => updateChatInState(res.data))
        .catch((error) => console.error("Failed to mark chat as read:", error));
    }

    const target = getChatTarget(chat);
    onSelectChat(chat, target);
  };

  const openChatMenu = (event, chat) => {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 250;
    const menuHeight = chat.isGroupChat ? 365 : 405;
    const padding = 12;

    setChatMenu({
      chat,
      x: Math.min(event.clientX, window.innerWidth - menuWidth - padding),
      y: Math.min(event.clientY, window.innerHeight - menuHeight - padding),
    });
  };

  const toggleGroupMember = (userId) => {
    setGroupMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const resetGroupModal = () => {
    setShowGroupModal(false);
    setGroupName("");
    setGroupSearch("");
    setGroupMemberIds([]);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setNotice("Group name is required");
      return;
    }

    if (groupMemberIds.length === 0) {
      setNotice("Select at least one member");
      return;
    }

    try {
      setCreatingGroup(true);

      const res = await api.post("/chats/group", {
        groupName: groupName.trim(),
        memberIds: groupMemberIds,
      });

      const createdChat = res.data;

      setChats((prev) => [createdChat, ...prev]);
      onSelectChat(createdChat, getChatTarget(createdChat));
      resetGroupModal();
      setNotice("Group created");
    } catch (error) {
      console.error("Failed to create group:", error);
      setNotice(error.response?.data?.message || "Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const runChatUpdate = async (route, successMessage, remove = false) => {
    const chat = chatMenu?.chat;
    if (!chat?._id) return;

    try {
      const res = await api.patch(`/chats/${chat._id}/${route}`);

      if (remove) {
        removeChatFromState(chat._id);
      } else {
        updateChatInState(res.data);
      }

      setNotice(successMessage);
    } catch (error) {
      console.error(`Failed chat action ${route}:`, error);
      setNotice(error.response?.data?.message || "Action failed");
    } finally {
      setChatMenu(null);
    }
  };

  const confirmAndRun = ({ title, body, confirmLabel, danger = false, onConfirm }) => {
    setConfirmAction({ title, body, confirmLabel, danger, onConfirm });
    setChatMenu(null);
  };

  const handleArchiveChat = () => {
  if (chatMenu?.chat?.isArchived) {
    runChatUpdate("unarchive", "Chat unarchived", activeFilter !== "archived");
    return;
  }

  runChatUpdate("archive", "Chat archived", activeFilter !== "archived");
};

  const handleToggleMuteChat = () => {
    runChatUpdate(
      "toggle-mute",
      chatMenu?.chat?.isMuted ? "Notifications unmuted" : "Notifications muted"
    );
  };

  const handleTogglePinChat = () => {
    runChatUpdate(
      "toggle-pin",
      chatMenu?.chat?.isPinned ? "Chat unpinned" : "Chat pinned"
    );
  };

  const handleToggleUnreadChat = () => {
    runChatUpdate(
      "toggle-unread",
      chatMenu?.chat?.isUnreadMarked ? "Marked as read" : "Marked as unread"
    );
  };

  const handleToggleFavoriteChat = () => {
    runChatUpdate(
      "toggle-favorite",
      chatMenu?.chat?.isFavorite ? "Removed from Favorites" : "Added to Favorites"
    );
  };

  const handleToggleBlockChat = () => {
    const chat = chatMenu?.chat;
    const blocked = chat?.isBlocked;

    confirmAndRun({
      title: blocked ? "Unblock chat?" : "Block chat?",
      body: blocked
        ? "This will unblock this conversation."
        : "This will mark this one-to-one conversation as blocked for you.",
      confirmLabel: blocked ? "Unblock" : "Block",
      danger: !blocked,
      onConfirm: async () => {
        if (!chat?._id) return;

        try {
          const res = await api.patch(`/chats/${chat._id}/toggle-block`);
          updateChatInState(res.data);
          setNotice(blocked ? "Chat unblocked" : "Chat blocked");
        } catch (error) {
          console.error("Failed to block chat:", error);
          setNotice(error.response?.data?.message || "Failed to update block");
        }
      },
    });
  };

  const handleClearChat = () => {
  const chat = chatMenu?.chat;

  confirmAndRun({
    title: "Clear chat?",
    body: "This clears messages from this chat only for you.",
    confirmLabel: "Clear chat",
    danger: true,
    onConfirm: async () => {
      if (!chat?._id) return;

      try {
        const res = await api.patch(`/chats/${chat._id}/clear`);
        const updatedChat = res.data;

        updateChatInState(updatedChat);
        setNotice("Chat cleared");
loadData();

window.dispatchEvent(
  new CustomEvent("safechat:chat-cleared", {
    detail: {
      chatId: chat._id,
    },
  })
);

        if (selectedChatId === chat._id) {
          onSelectChat(null, null);

          setTimeout(() => {
            onSelectChat(updatedChat, getChatTarget(updatedChat));
          }, 0);
        }
      } catch (error) {
        console.error("Failed to clear chat:", error);
        setNotice(error.response?.data?.message || "Failed to clear chat");
      }
    },
  });
};

  const handleDeleteChat = () => {
    const chat = chatMenu?.chat;

    confirmAndRun({
      title: "Delete chat?",
      body: "This removes this conversation from your chat list only for you.",
      confirmLabel: "Delete chat",
      danger: true,
      onConfirm: async () => {
        if (!chat?._id) return;

        try {
          await api.patch(`/chats/${chat._id}/delete-for-me`);
          removeChatFromState(chat._id);
          setNotice("Chat deleted");
        } catch (error) {
          console.error("Failed to delete chat:", error);
          setNotice(error.response?.data?.message || "Failed to delete chat");
        }
      },
    });
  };

  const handleExitGroup = () => {
    const chat = chatMenu?.chat;

    confirmAndRun({
      title: "Exit group?",
      body: "You will stop seeing this group in your chat list.",
      confirmLabel: "Exit group",
      danger: true,
      onConfirm: async () => {
        if (!chat?._id) return;

        try {
          await api.patch(`/chats/${chat._id}/exit-group`);
          removeChatFromState(chat._id);
          setNotice("Exited group");
        } catch (error) {
          console.error("Failed to exit group:", error);
          setNotice(error.response?.data?.message || "Failed to exit group");
        }
      },
    });
  };

  const archivedTotal = chats.filter((chat) => chat.isArchived).length;

const mainFilters = [
  { key: "all", label: "All" },
  {
    key: "unread",
    label: unreadTotal > 0 ? `Unread ${unreadTotal}` : "Unread",
  },
  { key: "favorites", label: "Favorites" },
];

const moreFilters = [
  { key: "groups", label: "Groups" },
  {
    key: "archived",
    label: archivedTotal > 0 ? `Archived ${archivedTotal}` : "Archived",
  },
];

const isMoreFilterActive = ["groups", "archived"].includes(activeFilter);

  return (
    <section className="h-full flex flex-col apple-panel border-r border-slate-200/70">
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[34px] leading-none font-black tracking-tight text-slate-950">
              Messages
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Real users from backend
            </p>
          </div>

          <button
            onClick={() => setShowGroupModal(true)}
            className="w-11 h-11 rounded-full apple-primary flex items-center justify-center"
            title="Create group"
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
            placeholder="Search or start a new chat"
            className="apple-input w-full h-12 rounded-full pl-11 pr-4 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="mt-3 flex items-center gap-2 pb-1 relative">
  {mainFilters.map((item) => (
    <button
      key={item.key}
      type="button"
      onClick={() => {
        setActiveFilter(item.key);
        setMoreFilterOpen(false);
      }}
      className={`px-4 py-2 rounded-full text-sm font-black border whitespace-nowrap ${
        activeFilter === item.key
          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : "bg-white/80 text-slate-600 border-slate-200 hover:bg-white"
      }`}
    >
      {item.label}
    </button>
  ))}

  <div className="relative">
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setMoreFilterOpen((prev) => !prev);
      }}
      className={`w-11 h-10 rounded-full border flex items-center justify-center ${
        isMoreFilterActive
          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : "bg-white/80 text-slate-600 border-slate-200 hover:bg-white"
      }`}
      title="More filters"
    >
      <MoreHorizontal size={19} />
    </button>

    {moreFilterOpen && (
      <div
        className="absolute right-0 top-12 z-[99999] w-[190px] rounded-[18px] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] border border-slate-200 overflow-hidden py-2"
        onClick={(event) => event.stopPropagation()}
      >
        {moreFilters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setActiveFilter(item.key);
              setMoreFilterOpen(false);
            }}
            className={`w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 ${
              activeFilter === item.key
                ? "text-emerald-700 font-black"
                : "text-slate-900 font-bold"
            }`}
          >
            <span>{item.label}</span>
            {activeFilter === item.key && <Check size={16} />}
          </button>
        ))}
      </div>
    )}
  </div>
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
                No chats found.
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat._id === selectedChatId;
                const avatarUser = getChatAvatarUser(chat);
                const title = getChatTitle(chat);
                const unread = chat.unreadCount > 0 || chat.isUnreadMarked;

                return (
                  <button
                    key={chat._id}
                    onClick={() => handleOpenExistingChat(chat)}
                    onContextMenu={(event) => openChatMenu(event, chat)}
                    className={`group w-full text-left rounded-[26px] p-3 mb-2 apple-card-hover ${
                      isSelected
                        ? "bg-white shadow-[0_16px_38px_rgba(99,102,241,0.12)] border border-[#E0E7FF]"
                        : "hover:bg-white/88"
                    } ${unread ? "bg-white/90" : ""}`}
                  >
                    <div className="flex gap-3 items-center">
                      <Avatar user={avatarUser} />

                      <div className="flex-1 min-w-0 border-b border-slate-200/60 pb-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3
                            className={`font-black truncate ${
                              unread ? "text-slate-950" : "text-slate-950"
                            }`}
                          >
                            {title}
                          </h3>

                          <div className="flex items-center gap-2">
                            {chat.isPinned && <span className="text-xs">📌</span>}
                            {chat.isMuted && <span className="text-xs">🔕</span>}
                            {chat.isFavorite && <span className="text-xs">♡</span>}
                            {chat.isBlocked && <span className="text-xs">🚫</span>}
                            <span className="text-xs text-slate-400 whitespace-nowrap">
                              {chat.updatedAt
                                ? new Date(chat.updatedAt).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )
                                : ""}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <p className="flex-1 truncate text-sm">
                            {typingChats[chat._id] ? (
                              <span className="text-[#6366F1] font-semibold italic">
                                Typing...
                              </span>
                            ) : (
                              <span
                                className={unread ? "text-slate-900 font-black" : "text-slate-500"}
                              >
                                {chat.lastMessage ||
                                  (chat.isGroupChat
                                    ? `${chat.members?.length || 0} members`
                                    : "No messages yet")}
                              </span>
                            )}
                          </p>

                          {unread && (
                            <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#6366F1] text-white text-xs font-black flex items-center justify-center">
                              {chat.unreadCount > 0 ? chat.unreadCount : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}

            {activeFilter === "all" && (
              <>
                <div className="px-3 pt-5 pb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                  <Users size={14} />
                  People
                </div>

                {filteredUsers.map((user) => {
                  const isOnline =
                    onlineUsers.includes(user._id) &&
                    user?.privacy?.lastSeen !== "Nobody";
                  const displayUser = { ...user, isOnline };

                  return (
                    <button
                      key={user._id}
                      onClick={() => handleStartChat(user)}
                      disabled={startingChatId === user._id}
                      className="w-full text-left rounded-[26px] p-3 mb-2 hover:bg-white/88 apple-card-hover disabled:opacity-60"
                    >
                      <div className="flex gap-3 items-center">
                        <Avatar user={displayUser} />

                        <div className="flex-1 min-w-0 border-b border-slate-200/60 pb-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-black text-slate-950 truncate">
                              {getUserName(user)}
                            </h3>

                            {startingChatId === user._id && (
                              <Loader2
                                size={16}
                                className="animate-spin text-slate-400"
                              />
                            )}
                          </div>

                          <p className="truncate text-sm text-slate-500">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {filteredUsers.length === 0 && filteredChats.length === 0 && (
              <div className="h-60 flex flex-col items-center justify-center text-center text-slate-400">
                <MessageCircle size={40} />
                <p className="font-black mt-3">No users found</p>
              </div>
            )}
          </>
        )}
      </div>

      {chatMenu &&
        createPortal(
          <div
            className="fixed z-[999999] w-[240px] rounded-[18px] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.22)] border border-slate-200 overflow-hidden py-2"
            style={{ left: chatMenu.x, top: chatMenu.y }}
            onClick={(event) => event.stopPropagation()}
          >
          <button
            type="button"
            onClick={handleArchiveChat}
            className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
          >
            <Archive size={18} />
            <span>{chatMenu.chat.isArchived ? "Unarchive chat" : "Archive chat"}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMuteChat}
            className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
          >
            <BellOff size={18} />
            <span>{chatMenu.chat.isMuted ? "Unmute notifications" : "Mute notifications"}</span>
          </button>

          <button
            type="button"
            onClick={handleTogglePinChat}
            className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
          >
            <Pin size={18} />
            <span>{chatMenu.chat.isPinned ? "Unpin chat" : "Pin chat"}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleUnreadChat}
            className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
          >
            <MessageCircle size={18} />
            <span>{chatMenu.chat.isUnreadMarked ? "Mark as read" : "Mark as unread"}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleFavoriteChat}
            className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
          >
            <Heart size={18} />
            <span>{chatMenu.chat.isFavorite ? "Remove from Favorites" : "Add to Favorites"}</span>
          </button>

          <div className="h-px bg-slate-200 my-1" />

          {!chatMenu.chat.isGroupChat && (
            <button
              type="button"
              onClick={handleToggleBlockChat}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
            >
              <Ban size={18} />
              <span>{chatMenu.chat.isBlocked ? "Unblock" : "Block"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleClearChat}
            className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
          >
            <MinusCircle size={18} />
            <span>Clear chat</span>
          </button>

          {chatMenu.chat.isGroupChat ? (
            <button
              type="button"
              onClick={handleExitGroup}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-red-50 text-red-600"
            >
              <LogOut size={18} />
              <span>Exit group</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDeleteChat}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-red-50 text-red-600"
            >
              <Trash2 size={18} />
              <span>Delete chat</span>
            </button>
          )}
          </div>,
          document.body
        )}

      {confirmAction && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/30 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white shadow-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-black text-slate-950 mb-2">
              {confirmAction.title}
            </h3>

            <p className="text-sm text-slate-500 leading-6">
              {confirmAction.body}
            </p>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-full font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  const action = confirmAction.onConfirm;
                  setConfirmAction(null);
                  await action?.();
                }}
                className={`px-5 py-2 rounded-full text-white font-black ${
                  confirmAction.danger
                    ? "bg-red-500 hover:bg-red-600"
                    : "apple-primary"
                }`}
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/30 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md max-h-[82vh] rounded-[24px] bg-white shadow-2xl border border-slate-200 p-5 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-black text-slate-950">
                Create group
              </h3>

              <button
                type="button"
                onClick={resetGroupModal}
                className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group name"
              className="apple-input w-full h-11 rounded-full px-4 text-slate-900 placeholder:text-slate-400 mb-3"
              autoFocus
            />

            <input
              value={groupSearch}
              onChange={(event) => setGroupSearch(event.target.value)}
              placeholder="Search people to add"
              className="apple-input w-full h-11 rounded-full px-4 text-slate-900 placeholder:text-slate-400 mb-3"
            />

            <div className="mb-3 text-sm font-black text-slate-500">
              {groupMemberIds.length} selected
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {groupUsers.map((user) => {
                const selected = groupMemberIds.includes(user._id);
                const displayUser = {
                  ...user,
                  isOnline:
                    onlineUsers.includes(user._id) &&
                    user?.privacy?.lastSeen !== "Nobody",
                };

                return (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => toggleGroupMember(user._id)}
                    className="w-full flex items-center gap-3 p-3 rounded-[18px] hover:bg-slate-50 text-left"
                  >
                    <Avatar user={displayUser} />

                    <div className="flex-1 min-w-0">
                      <div className="font-black text-slate-950 truncate">
                        {getUserName(user)}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {user.email}
                      </div>
                    </div>

                    <span
                      className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${
                        selected
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-white border-slate-300 text-transparent"
                      }`}
                    >
                      <Check size={16} />
                    </span>
                  </button>
                );
              })}

              {groupUsers.length === 0 && (
                <div className="py-8 text-center text-slate-400 font-bold">
                  No users found
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={resetGroupModal}
                className="px-4 py-2 rounded-full font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={creatingGroup}
                className="px-5 py-2 rounded-full apple-primary font-black disabled:opacity-60 flex items-center gap-2"
              >
                {creatingGroup && <Loader2 size={16} className="animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed left-1/2 bottom-24 -translate-x-1/2 z-[10000] px-4 py-2 rounded-full bg-slate-950 text-white text-sm font-bold shadow-xl">
          {notice}
        </div>
      )}
    </section>
  );
}
//change
