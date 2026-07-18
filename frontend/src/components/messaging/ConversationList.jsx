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
  UserPlus,
  MoreHorizontal,
  Check,
  ArrowLeft,
  ArrowRight,
  Camera,
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
  return JSON.parse(sessionStorage.getItem("user") || "null");
}

function getUserName(user) {
  return user?.name || user?.username || user?.email || "Unknown User";
}

function getUserHandle(user) {
  return user?.username ? `@${user.username}` : user?.email || "";
}

function getUserSearchText(user) {
  return `${user?.name || ""} ${user?.username || ""} ${user?.email || ""}`.toLowerCase();
}

function getId(value) {
  return typeof value === "object" ? value?._id : value;
}

function isSameId(id1, id2) {
  return id1?.toString() === id2?.toString();
}

function Avatar({ user, size = "normal" }) {
  const sizeClass =
    size === "large"
      ? "w-16 h-16 text-xl"
      : size === "small"
      ? "w-10 h-10 text-sm"
      : "w-13 h-13";

  return (
    <div className="relative shrink-0">
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white flex items-center justify-center font-black shadow-[0_10px_24px_rgba(99,102,241,0.22)] overflow-hidden`}
      >
        {user?.profilePic ? (
          <img
            src={user.profilePic}
            alt={getUserName(user)}
            className="w-full h-full object-cover"
          />
        ) : (
          initials(getUserName(user))
        )}
      </div>

      {!user?.isGroup && size !== "small" && (
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

  const [panelMode, setPanelMode] = useState("main");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingChatId, setStartingChatId] = useState("");
  const [notice, setNotice] = useState("");
  const [chatMenu, setChatMenu] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [moreFilterOpen, setMoreFilterOpen] = useState(false);

  const [friendRequests, setFriendRequests] = useState({
    incoming: [],
    outgoing: [],
  });
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  const [groupSearch, setGroupSearch] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [newFriendSearch, setNewFriendSearch] = useState("");
  const [newFriendResults, setNewFriendResults] = useState([]);
  const [newFriendSuggestions, setNewFriendSuggestions] = useState([]);
  const [isSearchingFriend, setIsSearchingFriend] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [peopleSearchResults, setPeopleSearchResults] = useState([]);
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);

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
          name: chat.groupName || "Group chat",
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
          name: chat.groupName || "Group chat",
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
      const [usersRes, chatsRes, reqsRes] = await Promise.all([
        api.get("/users"),
        api.get("/chats"),
        api
          .get("/users/requests")
          .catch(() => ({ data: { incoming: [], outgoing: [] } })),
      ]);

      const fetchedChats = chatsRes.data || [];

      setUsers(usersRes.data || []);
      setFriendRequests(reqsRes.data || { incoming: [], outgoing: [] });
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
    globalSocket.on("friendRequestReceived", loadData);
    globalSocket.on("friendRequestAccepted", loadData);
    globalSocket.on("chat:changed", loadData);

    return () => {
      globalSocket.off("userProfileUpdated", loadData);
      globalSocket.off("friendRequestReceived", loadData);
      globalSocket.off("friendRequestAccepted", loadData);
      globalSocket.off("chat:changed", loadData);
    };
  }, [loadData, reloadKey, globalSocket]);

  useEffect(() => {
    const requestedChatId = new URLSearchParams(location.search).get("chat");

    if (!requestedChatId || !chats.length || selectedChatId === requestedChatId) {
      return;
    }

    const requestedChat = chats.find((chat) => chat._id === requestedChatId);
    if (!requestedChat) return;

    onSelectChat(requestedChat, getChatTarget(requestedChat));
  }, [location.search, chats, selectedChatId, onSelectChat, getChatTarget]);

  useEffect(() => {
    if (panelMode !== "newFriend") return;

    const loadSuggestions = async () => {
      try {
        setLoadingSuggestions(true);
        const res = await api.get("/users/suggestions");
        setNewFriendSuggestions(res.data || []);
      } catch (error) {
        console.error("Failed to load suggestions:", error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    loadSuggestions();
  }, [panelMode]);

  useEffect(() => {
    if (panelMode !== "newFriend") return;

    const query = newFriendSearch.trim();

    if (query.length < 2) {
      setNewFriendResults([]);
      setIsSearchingFriend(false);
      return;
    }

    setIsSearchingFriend(true);

    const timer = setTimeout(() => {
      api
        .get(`/users/search?query=${encodeURIComponent(query)}`)
        .then((res) => setNewFriendResults(res.data || []))
        .catch((error) => {
          console.error("New friend search failed:", error);
          setNewFriendResults([]);
        })
        .finally(() => setIsSearchingFriend(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [panelMode, newFriendSearch]);

  useEffect(() => {
    if (panelMode !== "newChat") {
      setPeopleSearchResults([]);
      setIsSearchingPeople(false);
      return;
    }

    const query = searchQuery.trim();

    if (query.length < 2) {
      setPeopleSearchResults([]);
      setIsSearchingPeople(false);
      return;
    }

    setIsSearchingPeople(true);

    const timer = setTimeout(() => {
      api
        .get(`/users/search?query=${encodeURIComponent(query)}`)
        .then((response) => setPeopleSearchResults(response.data || []))
        .catch((error) => {
          console.error("People search failed:", error);
          setPeopleSearchResults([]);
        })
        .finally(() => setIsSearchingPeople(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [panelMode, searchQuery]);

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
  }, [location.search, activeFilter]);

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice("");
    }, 2200);

    return () => clearTimeout(timer);
  }, [notice]);

  const sortedFriends = useMemo(() => {
    return [...users]
      .filter((user) => !isSameId(user._id, currentUserId))
      .sort((a, b) => getUserName(a).localeCompare(getUserName(b)));
  }, [users, currentUserId]);

  const groupUsers = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();

    return sortedFriends.filter((user) => {
      if (!q) return true;
      return getUserSearchText(user).includes(q);
    });
  }, [sortedFriends, groupSearch]);

  const selectedGroupUsers = useMemo(() => {
    return groupMemberIds
      .map((id) => users.find((user) => isSameId(user._id, id)))
      .filter(Boolean);
  }, [groupMemberIds, users]);

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

        const isOutgoingPendingRequest =
          !chat.isGroupChat &&
          chat.requestStatus === "pending" &&
          isSameId(getId(chat.initiatedBy), currentUserId);

        if (
          !chat.lastMessage &&
          !chat.isGroupChat &&
          !isOutgoingPendingRequest
        ) {
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
    return sortedFriends.filter((user) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return getUserSearchText(user).includes(q);
    });
  }, [sortedFriends, searchQuery]);

  const newChatPeople = useMemo(() => {
    const query = searchQuery.trim();

    if (query.length >= 2) {
      return peopleSearchResults.filter(
        (user) => !isSameId(user._id, currentUserId)
      );
    }

    return sortedFriends;
  }, [searchQuery, peopleSearchResults, sortedFriends, currentUserId]);

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

  const resetNewChatFlow = () => {
    setPanelMode("main");
    setGroupSearch("");
    setGroupMemberIds([]);
    setGroupName("");
    setNewFriendSearch("");
    setNewFriendResults([]);
    setPeopleSearchResults([]);
    setIsSearchingPeople(false);
  };

  const openNewChatFlow = () => {
    setPanelMode("newChat");
    setSearchQuery("");
    setMoreFilterOpen(false);
    setChatMenu(null);
  };

  const openNewGroupMembers = () => {
    setPanelMode("newGroupMembers");
    setGroupSearch("");
    setGroupMemberIds([]);
    setGroupName("");
  };

  const openNewFriend = () => {
    setPanelMode("newFriend");
    setNewFriendSearch("");
    setNewFriendResults([]);
    setPeopleSearchResults([]);
    setIsSearchingPeople(false);
  };

  const handleBack = () => {
    if (panelMode === "newGroupMembers" || panelMode === "newFriend") {
      setPanelMode("newChat");
      return;
    }

    if (panelMode === "newGroupDetails") {
      setPanelMode("newGroupMembers");
      return;
    }

    resetNewChatFlow();
  };

  const toggleGroupMember = (userId) => {
    setGroupMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
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

      setGroupSearch("");
      setGroupMemberIds([]);
      setGroupName("");
      setPanelMode("main");
      setNotice("Group created");
      loadData();
    } catch (error) {
      console.error("Failed to create group:", error);
      setNotice(error.response?.data?.message || "Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleStartChat = async (user) => {
    const existingChat = chats.find((chat) => {
      if (chat.isGroupChat) return false;

      const other = getOtherMember(chat);
      return other?._id === user._id;
    });

    if (existingChat) {
      handleOpenExistingChat(existingChat);
      resetNewChatFlow();
      return;
    }

    try {
      setStartingChatId(user._id);

      const res = await api.post("/chats", {
        receiverId: user._id,
      });

      onSelectChat(res.data, user);
      resetNewChatFlow();
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

  const handleSendRequest = async (userId) => {
    try {
      await api.post("/users/request", { targetUserId: userId });
      setNotice("Friend request sent");
      loadData();
    } catch (error) {
      setNotice(error.response?.data?.message || "Failed to send request");
    }
  };

  const handleAcceptRequest = async (userId) => {
    try {
      await api.post("/users/request/accept", { requesterId: userId });
      setNotice("Friend request accepted");
      loadData();
    } catch (error) {
      setNotice(error.response?.data?.message || "Failed to accept request");
    }
  };

  const handleDeclineRequest = async (userId) => {
    try {
      await api.post("/users/request/decline", { requesterId: userId });
      setNotice("Friend request declined");
      loadData();
    } catch (error) {
      setNotice(error.response?.data?.message || "Failed to decline request");
    }
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

  const confirmAndRun = ({
    title,
    body,
    confirmLabel,
    danger = false,
    onConfirm,
  }) => {
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
      chatMenu?.chat?.isFavorite
        ? "Removed from Favorites"
        : "Added to Favorites"
    );
  };

  const handleToggleBlockChat = () => {
    const chat = chatMenu?.chat;
    const latestUser = getCurrentUser();
    const otherUser = getOtherMember(chat);

    const isBlockedByMe = latestUser?.blockedContacts?.some((contact) =>
      isSameId(getId(contact), otherUser?._id)
    );

    confirmAndRun({
      title: isBlockedByMe ? "Unblock user?" : "Block user?",
      body: isBlockedByMe
        ? "This will unblock this user and allow messages again."
        : "This will block this user from sending you messages.",
      confirmLabel: isBlockedByMe ? "Unblock" : "Block",
      danger: !isBlockedByMe,
      onConfirm: async () => {
        if (!otherUser?._id) return;

        try {
          const res = await api.post(`/users/toggle-block/${otherUser._id}`);
          sessionStorage.setItem("user", JSON.stringify(res.data));
          window.dispatchEvent(new Event("userUpdated"));
          setNotice(isBlockedByMe ? "User unblocked" : "User blocked");
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

  const isFriend = (userId) => users.some((user) => isSameId(user._id, userId));

  const isIncomingRequest = (userId) =>
    friendRequests.incoming.some((req) => isSameId(getId(req), userId));

  const isOutgoingRequest = (userId) =>
    friendRequests.outgoing.some((req) => isSameId(getId(req), userId));

  const renderFriendActionButton = (user) => {
    if (isFriend(user._id)) {
      return (
        <button
          type="button"
          onClick={() => handleStartChat(user)}
          className="px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black hover:bg-emerald-200"
        >
          Chat
        </button>
      );
    }

    if (isIncomingRequest(user._id)) {
      return (
        <button
          type="button"
          onClick={() => handleAcceptRequest(user._id)}
          className="px-4 py-2 rounded-full bg-emerald-500 text-white text-xs font-black hover:bg-emerald-600"
        >
          Accept
        </button>
      );
    }

    if (isOutgoingRequest(user._id)) {
      return (
        <span className="px-4 py-2 rounded-full bg-slate-100 text-slate-500 text-xs font-black">
          Pending
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleSendRequest(user._id)}
        className="px-4 py-2 rounded-full bg-[#F0EDFF] text-[#6366F1] text-xs font-black hover:bg-[#E4DEFF]"
      >
        Add
      </button>
    );
  };

  const renderUserListRow = ({
    user,
    onClick,
    selected = false,
    rightContent = null,
  }) => {
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
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 rounded-[22px] hover:bg-white/88 apple-card-hover text-left"
      >
        <Avatar user={displayUser} />

        <div className="flex-1 min-w-0 border-b border-slate-200/60 pb-3">
          <div className="font-black text-slate-950 truncate">
            {getUserName(user)}
          </div>
          <div className="text-sm text-slate-500 truncate">
            {getUserHandle(user)}
          </div>
        </div>

        {rightContent ||
          (selected && (
            <span className="w-7 h-7 rounded-full bg-[#6366F1] text-white flex items-center justify-center shrink-0">
              <Check size={16} />
            </span>
          ))}
      </button>
    );
  };

  const renderNewChatPanel = () => {
    return (
      <>
        <header className="px-4 pt-5 pb-4 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700"
            >
              <ArrowLeft size={22} />
            </button>

            <h1 className="text-2xl font-black text-slate-950">New chat</h1>
          </div>

          <div className="relative mt-4">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search anyone by name, username, or email"
              className="apple-input w-full h-12 rounded-full pl-11 pr-4 text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </header>

        <div className="px-3 py-4 flex-1 overflow-y-auto">
          <button
            type="button"
            onClick={openNewGroupMembers}
            className="w-full flex items-center gap-4 p-3 rounded-[24px] hover:bg-white/88 apple-card-hover text-left"
          >
            <div className="w-13 h-13 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Users size={24} />
            </div>

            <div className="font-black text-slate-950">New group</div>
          </button>

          <button
            type="button"
            onClick={openNewFriend}
            className="w-full flex items-center gap-4 p-3 rounded-[24px] hover:bg-white/88 apple-card-hover text-left"
          >
            <div className="w-13 h-13 rounded-full bg-[#6366F1] text-white flex items-center justify-center">
              <UserPlus size={24} />
            </div>

            <div className="font-black text-slate-950">New friend</div>
          </button>

          <div className="px-3 pt-5 pb-2 text-xs font-black uppercase tracking-wide text-slate-400">
            {searchQuery.trim().length >= 2 ? "People" : "Friends"}
          </div>

          {isSearchingPeople ? (
            <div className="py-8 flex items-center justify-center text-slate-400 gap-2 font-bold">
              <Loader2 size={18} className="animate-spin" />
              Searching people...
            </div>
          ) : newChatPeople.length === 0 ? (
            <div className="px-4 py-8 text-sm text-slate-400 text-center font-bold">
              {searchQuery.trim().length >= 2
                ? "No registered users found."
                : "No friends found. Search above to message anyone."}
            </div>
          ) : (
            newChatPeople.map((user) =>
              renderUserListRow({
                user,
                onClick: () => handleStartChat(user),
                rightContent: (
                  <span className="px-3 py-1.5 rounded-full bg-[#F0EDFF] text-[#6366F1] text-xs font-black">
                    Message
                  </span>
                ),
              })
            )
          )}
        </div>
      </>
    );
  };

  const renderNewGroupMembersPanel = () => {
    return (
      <>
        <header className="px-4 pt-5 pb-4 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700"
            >
              <ArrowLeft size={22} />
            </button>

            <div className="min-w-0">
              <h1 className="text-2xl font-black text-slate-950">
                Add group members
              </h1>
              <p className="text-sm text-slate-500 font-bold">
                {groupMemberIds.length} selected
              </p>
            </div>
          </div>

          {selectedGroupUsers.length > 0 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {selectedGroupUsers.map((user) => (
                <div
                  key={user._id}
                  className="relative shrink-0 flex flex-col items-center w-16"
                >
                  <Avatar user={user} size="small" />
                  <button
                    type="button"
                    onClick={() => toggleGroupMember(user._id)}
                    className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center"
                  >
                    <X size={13} />
                  </button>
                  <div className="mt-1 text-[11px] font-bold text-slate-600 truncate w-full text-center">
                    {getUserName(user)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="relative mt-3">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={groupSearch}
              onChange={(event) => setGroupSearch(event.target.value)}
              placeholder="Search friends"
              className="apple-input w-full h-12 rounded-full pl-11 pr-4 text-slate-900 placeholder:text-slate-400"
              autoFocus
            />
          </div>
        </header>

        <div className="px-3 py-4 flex-1 overflow-y-auto">
          <div className="px-3 pb-2 text-xs font-black uppercase tracking-wide text-slate-400">
            Friends
          </div>

          {groupUsers.length === 0 ? (
            <div className="px-4 py-8 text-sm text-slate-400 text-center font-bold">
              No friends found.
            </div>
          ) : (
            groupUsers.map((user) =>
              renderUserListRow({
                user,
                selected: groupMemberIds.includes(user._id),
                onClick: () => toggleGroupMember(user._id),
              })
            )
          )}
        </div>

        {groupMemberIds.length > 0 && (
          <div className="p-4 border-t border-slate-200/70 bg-white/80 backdrop-blur-xl flex justify-end">
            <button
              type="button"
              onClick={() => setPanelMode("newGroupDetails")}
              className="w-14 h-14 rounded-full apple-primary flex items-center justify-center shadow-lg"
              title="Next"
            >
              <ArrowRight size={24} />
            </button>
          </div>
        )}
      </>
    );
  };

  const renderNewGroupDetailsPanel = () => {
    return (
      <>
        <header className="px-4 pt-5 pb-4 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700"
            >
              <ArrowLeft size={22} />
            </button>

            <div className="min-w-0">
              <h1 className="text-2xl font-black text-slate-950">
                New group
              </h1>
              <p className="text-sm text-slate-500 font-bold">
                Add subject
              </p>
            </div>
          </div>
        </header>

        <div className="px-5 py-7 flex-1 overflow-y-auto">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="w-20 h-20 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 hover:bg-slate-300"
            >
              <Camera size={28} />
            </button>

            <div className="flex-1 min-w-0">
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Group subject"
                className="w-full h-13 border-b-2 border-emerald-500 outline-none bg-transparent text-slate-950 font-black placeholder:text-slate-400"
                autoFocus
              />

              <p className="mt-2 text-xs text-slate-400 font-bold">
                {selectedGroupUsers.length} members selected
              </p>
            </div>
          </div>

          <div className="mt-8">
            <div className="px-1 pb-3 text-xs font-black uppercase tracking-wide text-slate-400">
              Members
            </div>

            <div className="flex flex-wrap gap-3">
              {selectedGroupUsers.map((user) => (
                <div
                  key={user._id}
                  className="px-3 py-2 rounded-full bg-white border border-slate-200 shadow-sm flex items-center gap-2"
                >
                  <Avatar user={user} size="small" />
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-800 truncate max-w-[110px]">
                      {getUserName(user)}
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-[110px]">
                      {getUserHandle(user)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200/70 bg-white/80 backdrop-blur-xl flex justify-end">
          <button
            type="button"
            onClick={handleCreateGroup}
            disabled={creatingGroup || !groupName.trim()}
            className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Create group"
          >
            {creatingGroup ? (
              <Loader2 size={23} className="animate-spin" />
            ) : (
              <Check size={25} />
            )}
          </button>
        </div>
      </>
    );
  };

  const renderNewFriendPanel = () => {
    const query = newFriendSearch.trim();
    const listToShow = query.length >= 2 ? newFriendResults : newFriendSuggestions;

    return (
      <>
        <header className="px-4 pt-5 pb-4 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700"
            >
              <ArrowLeft size={22} />
            </button>

            <h1 className="text-2xl font-black text-slate-950">New friend</h1>
          </div>

          <div className="relative mt-4">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={newFriendSearch}
              onChange={(event) => setNewFriendSearch(event.target.value)}
              placeholder="Search name or username"
              className="apple-input w-full h-12 rounded-full pl-11 pr-4 text-slate-900 placeholder:text-slate-400"
              autoFocus
            />
          </div>
        </header>

        <div className="px-3 py-4 flex-1 overflow-y-auto">
          <div className="px-3 pb-2 text-xs font-black uppercase tracking-wide text-slate-400">
            {query.length >= 2 ? "Search results" : "Recommendations"}
          </div>

          {(isSearchingFriend || loadingSuggestions) && (
            <div className="py-8 flex items-center justify-center text-slate-400 gap-2 font-bold">
              <Loader2 size={18} className="animate-spin" />
              Searching...
            </div>
          )}

          {!isSearchingFriend && !loadingSuggestions && listToShow.length === 0 && (
            <div className="px-4 py-8 text-sm text-slate-400 text-center font-bold">
              {query.length >= 2 ? "No users found." : "No recommendations right now."}
            </div>
          )}

          {!isSearchingFriend &&
            !loadingSuggestions &&
            listToShow.map((user) => {
              const displayUser = {
                ...user,
                isOnline:
                  onlineUsers.includes(user._id) &&
                  user?.privacy?.lastSeen !== "Nobody",
              };

              return (
                <div
                  key={user._id}
                  className="w-full flex items-center gap-3 p-3 rounded-[22px] hover:bg-white/88 apple-card-hover"
                >
                  <Avatar user={displayUser} />

                  <div className="flex-1 min-w-0 border-b border-slate-200/60 pb-3">
                    <div className="font-black text-slate-950 truncate">
                      {getUserName(user)}
                    </div>
                    <div className="text-sm text-slate-500 truncate">
                      {getUserHandle(user)}
                    </div>
                  </div>

                  <div className="shrink-0">{renderFriendActionButton(user)}</div>
                </div>
              );
            })}
        </div>
      </>
    );
  };

  const renderMainPanel = () => {
    return (
      <>
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRequestsModal(true)}
                className="relative w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                title="Friend requests"
              >
                <UserPlus size={19} />
                {friendRequests.incoming.length > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">
                    {friendRequests.incoming.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={openNewChatFlow}
                className="w-11 h-11 rounded-full apple-primary flex items-center justify-center"
                title="New chat"
              >
                <Edit size={19} />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats or friends"
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
                  const isPendingRequest =
                    !chat.isGroupChat && chat.requestStatus === "pending";
                  const isIncomingRequest =
                    isPendingRequest &&
                    isSameId(getId(chat.requestRecipient), currentUserId);
                  const isOutgoingRequest =
                    isPendingRequest &&
                    isSameId(getId(chat.initiatedBy), currentUserId);

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
                            <div className="min-w-0 flex items-center gap-2">
                              <h3 className="font-black truncate text-slate-950">
                                {title}
                              </h3>
                              {isPendingRequest && (
                                <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wide">
                                  Request
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {chat.isPinned && <span className="text-xs">📌</span>}
                              {chat.isMuted && <span className="text-xs">🔕</span>}
                              {chat.isFavorite && <span className="text-xs">♡</span>}
                              {getCurrentUser()?.blockedContacts?.some((c) =>
                                isSameId(getId(c), getOtherMember(chat)?._id)
                              ) && <span className="text-xs">🚫</span>}
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
                                  className={
                                    unread
                                      ? "text-slate-900 font-black"
                                      : "text-slate-500"
                                  }
                                >
                                  {isIncomingRequest
                                    ? `Message request · ${
                                        chat.lastMessage || "New message"
                                      }`
                                    : isOutgoingRequest &&
                                      !chat.requestMessageSent
                                    ? "Send one message request"
                                    : isOutgoingRequest
                                    ? `Request pending · ${
                                        chat.lastMessage || "Message sent"
                                      }`
                                    : chat.lastMessage ||
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
                    Friends
                  </div>

                  {filteredUsers.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => handleStartChat(user)}
                      disabled={startingChatId === user._id}
                      className="w-full text-left rounded-[26px] p-3 mb-2 hover:bg-white/88 apple-card-hover disabled:opacity-60"
                    >
                      <div className="flex gap-3 items-center">
                        <Avatar
                          user={{
                            ...user,
                            isOnline:
                              onlineUsers.includes(user._id) &&
                              user?.privacy?.lastSeen !== "Nobody",
                          }}
                        />

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
                            {getUserHandle(user)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
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
      </>
    );
  };

  return (
    <section className="h-full flex flex-col apple-panel border-r border-slate-200/70 relative overflow-hidden">
      {panelMode === "newChat" && renderNewChatPanel()}
      {panelMode === "newGroupMembers" && renderNewGroupMembersPanel()}
      {panelMode === "newGroupDetails" && renderNewGroupDetailsPanel()}
      {panelMode === "newFriend" && renderNewFriendPanel()}
      {panelMode === "main" && renderMainPanel()}

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
              <span>
                {chatMenu.chat.isArchived ? "Unarchive chat" : "Archive chat"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleMuteChat}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
            >
              <BellOff size={18} />
              <span>
                {chatMenu.chat.isMuted
                  ? "Unmute notifications"
                  : "Mute notifications"}
              </span>
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
              <span>
                {chatMenu.chat.isUnreadMarked ? "Mark as read" : "Mark as unread"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleFavoriteChat}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
            >
              <Heart size={18} />
              <span>
                {chatMenu.chat.isFavorite
                  ? "Remove from Favorites"
                  : "Add to Favorites"}
              </span>
            </button>

            <div className="h-px bg-slate-200 my-1" />

            {!chatMenu.chat?.isGroupChat && (
              <button
                type="button"
                onClick={handleToggleBlockChat}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
              >
                <Ban size={18} />
                <span>
                  {getCurrentUser()?.blockedContacts?.some((c) =>
                    isSameId(getId(c), getOtherMember(chatMenu.chat)?._id)
                  )
                    ? "Unblock"
                    : "Block"}
                </span>
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

      {showRequestsModal && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowRequestsModal(false)}
          />

          <div className="relative w-full max-w-md bg-white rounded-[28px] shadow-2xl flex flex-col max-h-[80vh] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-950">
                Friend Requests
              </h2>

              <button
                type="button"
                onClick={() => setShowRequestsModal(false)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {friendRequests.incoming.length === 0 &&
              friendRequests.outgoing.length === 0 ? (
                <div className="py-10 text-center text-slate-400 font-bold">
                  No pending friend requests
                </div>
              ) : (
                <>
                  {friendRequests.incoming.length > 0 && (
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wide text-slate-400 mb-2">
                        Incoming
                      </h3>

                      {friendRequests.incoming.map((req) => (
                        <div
                          key={req._id}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar user={req} size="small" />
                            <div className="flex-1 min-w-0">
                              <div className="font-black text-slate-950 truncate">
                                {getUserName(req)}
                              </div>
                              <div className="text-sm text-slate-500 truncate">
                                {getUserHandle(req)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAcceptRequest(req._id)}
                              className="px-3 py-1.5 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeclineRequest(req._id)}
                              className="px-3 py-1.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-full"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {friendRequests.outgoing.length > 0 && (
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wide text-slate-400 mb-2 mt-4">
                        Outgoing
                      </h3>

                      {friendRequests.outgoing.map((req) => (
                        <div
                          key={req._id}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar user={req} size="small" />
                            <div className="flex-1 min-w-0">
                              <div className="font-black text-slate-950 truncate">
                                {getUserName(req)}
                              </div>
                              <div className="text-sm text-slate-500 truncate">
                                {getUserHandle(req)}
                              </div>
                            </div>
                          </div>

                          <span className="text-xs px-3 py-1.5 text-slate-500 font-bold">
                            Pending
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
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
