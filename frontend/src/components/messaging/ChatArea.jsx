import { useEffect, useRef, useState } from "react";
import { useSocket } from "../../context/SocketContext.jsx";
import {
  Phone,
  Video,
  Info,
  Search,
  Send,
  Smile,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Check,
  CheckCheck,
  MessageCircle,
  Reply,
  Copy,
  Forward,
  Pin,
  Star,
  SquareCheck,
  Flag,
  Trash2,
  Pencil,
  X,
  Download,
  Ban,
  MinusCircle,
  ShieldCheck,
  UserMinus,
  LogOut,
  Eye,
  ShieldAlert,
} from "lucide-react";
import api from "../../lib/api.js";

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

function getValueId(value) {
  return typeof value === "object" ? value?._id : value;
}

function idsMatch(id1, id2) {
  return id1?.toString() === id2?.toString();
}

function Avatar({ user }) {
  return (
    <div className="relative shrink-0">
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white flex items-center justify-center font-black shadow-[0_10px_24px_rgba(99,102,241,0.20)] overflow-hidden">
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

      {!user?.isGroup && (
        <span
          className={`absolute right-0 bottom-0 w-3 h-3 rounded-full border-2 border-white ${
            user?.isOnline ? "bg-emerald-400" : "bg-slate-300"
          }`}
        />
      )}
    </div>
  );
}

export default function ChatArea({
  chat,
  otherUser,
  onMessageSent,
  onChatDeleted,
  onlineUsers = [],
  onOnlineUsersUpdate,
  onTypingUpdate,
}) {
  const { socket: globalSocket } = useSocket();
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?._id || currentUser?.id;
  const isGroupChat = Boolean(chat?.isGroupChat || otherUser?.isGroup);
  const directReceiverId = isGroupChat ? null : otherUser?._id;
  const chatDisplayName = isGroupChat
    ? chat?.groupName || otherUser?.name || "Group chat"
    : getUserName(otherUser);
  const chatMemberCount = chat?.members?.length || 0;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState("");
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [notice, setNotice] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [forwardTarget, setForwardTarget] = useState(null);
  const [forwardUsers, setForwardUsers] = useState([]);
  const [forwardGroups, setForwardGroups] = useState([]);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardLoading, setForwardLoading] = useState(false);
 const [selectedMessageIds, setSelectedMessageIds] = useState([]);
const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
const [profilePanelOpen, setProfilePanelOpen] = useState(false);
const [messageRequestStatus, setMessageRequestStatus] = useState(
  chat?.requestStatus || "accepted"
);
const [requestMessageSent, setRequestMessageSent] = useState(
  Boolean(chat?.requestMessageSent)
);
const [requestActionLoading, setRequestActionLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const chatAreaRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingStartedAtRef = useRef(null);

  const requestInitiatorId = getValueId(chat?.initiatedBy);
  const requestRecipientId = getValueId(chat?.requestRecipient);
  const isPendingMessageRequest =
    !isGroupChat && messageRequestStatus === "pending";
  const isMessageRequestSender =
    isPendingMessageRequest && idsMatch(requestInitiatorId, currentUserId);
  const isMessageRequestRecipient =
    isPendingMessageRequest && idsMatch(requestRecipientId, currentUserId);

  useEffect(() => {
    setMessageRequestStatus(chat?.requestStatus || "accepted");
    setRequestMessageSent(Boolean(chat?.requestMessageSent));
  }, [chat?._id, chat?.requestStatus, chat?.requestMessageSent]);

  const blockedContactsRef = useRef(currentUser?.blockedContacts || []);
  useEffect(() => {
    blockedContactsRef.current = currentUser?.blockedContacts || [];
  }, [currentUser?.blockedContacts]);

  useEffect(() => {
    setIsTyping(false);
    setIsOtherTyping(false);
    setTypingUserName("");
  }, [chat?._id]);

  useEffect(() => {
    if (!globalSocket || !currentUserId || !chat?._id) return;

    globalSocket.emit("activeChat", {
      userId: currentUserId,
      chatId: chat._id,
    });

    return () => {
      globalSocket.emit("leaveChat", {
        userId: currentUserId,
        chatId: chat._id,
      });
    };
  }, [globalSocket, currentUserId, chat?._id]);

  useEffect(() => {
    if (!currentUserId || !globalSocket) return;

    socketRef.current = globalSocket;

    const handleReceiveMessage = (incomingMessage) => {
      const incomingChatId =
        incomingMessage.chatId?._id || incomingMessage.chatId;

      if (chat?._id && incomingChatId?.toString() === chat._id.toString()) {
        api
          .get(`/messages/${chat._id}`)
          .then((response) => {
            setMessages(response.data || []);
          })
          .catch((err) => console.log("Failed to mark as viewed", err));

        api
          .patch(`/notifications/chat/${chat._id}/read`)
          .catch((err) =>
            console.log("Failed to mark chat notifications as read", err)
          );
      }

      setMessages((prev) => {
        const alreadyExists = prev.some(
          (item) => item._id === incomingMessage._id
        );

        if (alreadyExists) return prev;

        if (
          chat?._id &&
          incomingChatId?.toString() === chat._id.toString()
        ) {
          return [...prev, incomingMessage];
        }

        return prev;
      });

      onMessageSent?.();
    };

    const handleMessageUpdated = (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        )
      );
      onMessageSent?.();
    };

    const handleMessagesSeen = ({
      chatId,
      viewedMessageIds = [],
    }) => {
      if (chatId?.toString() !== chat?._id?.toString()) return;

      const viewedIds = new Set(
        viewedMessageIds.map((messageId) => messageId.toString())
      );

      if (viewedIds.size === 0) return;

      setMessages((prev) =>
        prev.map((msg) =>
          viewedIds.has(msg._id?.toString())
            ? { ...msg, isViewed: true }
            : msg
        )
      );
    };

    const handleTypingSocket = (data) => {
      const isSenderBlocked = blockedContactsRef.current.some(
        (contact) =>
          (contact._id || contact).toString() ===
          data.senderId?.toString()
      );
      if (isSenderBlocked) return;

      if (chat?._id && data.chatId === chat._id) {
        setIsOtherTyping(true);
        setTypingUserName(data.senderName || "Someone");
      }

      onTypingUpdate?.({ chatId: data.chatId, isTyping: true });
    };

    const handleStopTypingSocket = (data) => {
      const isSenderBlocked = blockedContactsRef.current.some(
        (contact) =>
          (contact._id || contact).toString() ===
          data.senderId?.toString()
      );
      if (isSenderBlocked) return;

      if (chat?._id && data.chatId === chat._id) {
        setIsOtherTyping(false);
        setTypingUserName("");
      }

      onTypingUpdate?.({ chatId: data.chatId, isTyping: false });
    };

    const handleChatChanged = ({ chatId, action } = {}) => {
      if (!chat?._id || chatId?.toString() !== chat._id.toString()) return;

      if (action === "message-request-accepted") {
        setMessageRequestStatus("accepted");
        setNotice("Message request accepted");
        onMessageSent?.();
      }

      if (action === "message-request-deleted") {
        onChatDeleted?.(chat._id);
      }

      if (action === "message-request-received") {
        setRequestMessageSent(true);
        onMessageSent?.();
      }
    };

    globalSocket.on("receiveMessage", handleReceiveMessage);
    globalSocket.on("messageUpdated", handleMessageUpdated);
    globalSocket.on("messagesSeen", handleMessagesSeen);
    globalSocket.on("typing", handleTypingSocket);
    globalSocket.on("stopTyping", handleStopTypingSocket);
    globalSocket.on("chat:changed", handleChatChanged);

    return () => {
      globalSocket.off("receiveMessage", handleReceiveMessage);
      globalSocket.off("messageUpdated", handleMessageUpdated);
      globalSocket.off("messagesSeen", handleMessagesSeen);
      globalSocket.off("typing", handleTypingSocket);
      globalSocket.off("stopTyping", handleStopTypingSocket);
      globalSocket.off("chat:changed", handleChatChanged);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);

        if (socketRef.current && chat?._id && currentUserId) {
          socketRef.current.emit("stopTyping", {
            senderId: currentUserId,
            chatId: chat._id,
          });
        }
      }
    };
  }, [
    currentUserId,
    chat?._id,
    onMessageSent,
    onChatDeleted,
    onTypingUpdate,
    globalSocket,
  ]);

  useEffect(() => {
  const handleClickOutside = () => {
    setActiveMessageMenu(null);
    setEmojiPickerOpen(false);
  };

  window.addEventListener("click", handleClickOutside);

  return () => {
    window.removeEventListener("click", handleClickOutside);
  };
}, []);

  useEffect(() => {
    const loadMessages = async () => {
      if (!chat?._id) {
        setMessages([]);
        return;
      }

      try {
        setLoadingMessages(true);
        const res = await api.get(`/messages/${chat._id}`);
        setMessages(res.data || []);
        api
          .patch(`/notifications/chat/${chat._id}/read`)
          .catch((error) =>
            console.log("Failed to mark chat notifications as read", error)
          );
      } catch (error) {
        console.error("Failed to load messages:", error);
        setNotice("Failed to load messages");
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [chat?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice("");
    }, 2200);

    return () => clearTimeout(timer);
  }, [notice]);

  const getId = (value) => {
    return typeof value === "object" ? value?._id : value;
  };

  const isSameId = (id1, id2) => {
    return id1?.toString() === id2?.toString();
  };

  const isCurrentUserInList = (list = []) => {
    return list.some((item) => isSameId(getId(item), currentUserId));
  };

  const isSafetyMessageHiddenForMe = (
    msg
  ) => {
    if (
      !msg?.isSafetyHidden ||
      msg?.isDeleted
    ) {
      return false;
    }

    const senderId = getId(
      msg.senderId
    );

    if (
      isSameId(
        senderId,
        currentUserId
      )
    ) {
      return false;
    }

    return !isCurrentUserInList(
      msg.revealedBy || []
    );
  };

  const getSafetyMessageDetails = (
    category
  ) => {
    switch (category) {
      case "spam":
        return {
          title:
            "Possible spam message detected",
          description:
            "This message has been hidden for your safety.",
          reportCategory: "Spam",
        };
      case "abusive":
        return {
          title:
            "Potentially abusive message detected",
          description:
            "This content may contain a personal attack.",
          reportCategory:
            "Harassment",
        };
      case "hateful":
        return {
          title:
            "Potential hateful content detected",
          description:
            "This content may target a protected group.",
          reportCategory:
            "Hate Speech",
        };
      default:
        return {
          title:
            "Safety warning",
          description:
            "This message was hidden by SafeChat AI.",
          reportCategory: "Other",
        };
    }
  };

  const getMessagePreview = (msg) => {
    if (!msg) return "";

    if (msg.isDeleted) {
      return "This message was deleted";
    }

    if (
      isSafetyMessageHiddenForMe(msg)
    ) {
      return getSafetyMessageDetails(
        msg.predictedCategory
      ).title;
    }

    if (msg.messageType === "voice") {
      return "Voice message";
    }

    if (msg.messageType === "image") {
      return "📷 Photo";
    }

    return msg.text || "";
  };

  const getReactionSummary = (reactions = []) => {
    const counts = {};

    reactions.forEach((reaction) => {
      if (!reaction?.emoji) return;
      counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
    });

    return Object.entries(counts);
  };

  useEffect(() => {
    const handleChatCleared = (event) => {
      const clearedChatId = event.detail?.chatId;

      if (clearedChatId?.toString() !== chat?._id?.toString()) return;

      setMessages([]);
      onMessageSent?.();
    };

    window.addEventListener("safechat:chat-cleared", handleChatCleared);

    return () => {
      window.removeEventListener("safechat:chat-cleared", handleChatCleared);
    };
  }, [chat?._id, onMessageSent]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (
      !message.trim() ||
      !chat?._id ||
      (!isGroupChat && !directReceiverId)
    ) {
      return;
    }

    if (
      isPendingMessageRequest &&
      (!isMessageRequestSender || requestMessageSent)
    ) {
      setNotice(
        isMessageRequestRecipient
          ? "Accept this message request before replying"
          : "Your message request is waiting for acceptance"
      );
      return;
    }

    const text = message.trim();
    const replyToId = replyingTo?._id || null;

    setMessage("");

    try {
      const payload = {
        chatId: chat._id,
        text,
        replyTo: replyToId,
      };

      if (!isGroupChat) {
        payload.receiverId = directReceiverId;
      }

      const res = await api.post("/messages", payload);
      const savedMessage = res.data;

      setMessages((prev) => [...prev, savedMessage]);

      socketRef.current?.emit("sendMessage", {
        chatId: chat._id,
        message: savedMessage,
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      socketRef.current?.emit("stopTyping", {
        senderId: currentUserId,
        chatId: chat._id,
      });

      if (isPendingMessageRequest) {
        setRequestMessageSent(true);
      }

      setReplyingTo(null);
      onMessageSent?.();
    } catch (error) {
      console.error("Failed to send message:", error);
      setNotice(error.response?.data?.message || "Failed to send message");
      setMessage(text);
    }
  };

  // ── Image upload handler ──────────────────────────────────────────────────
  const imageInputRef = useRef(null);
  const [sendingImage, setSendingImage] = useState(false);

  const handleSendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !chat?._id) return;

    if (isPendingMessageRequest) {
      setNotice("Send a text message request first. Images are available after it is accepted");
      e.target.value = "";
      return;
    }

    setSendingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("chatId", chat._id);
      if (!isGroupChat && directReceiverId) {
        formData.append("receiverId", directReceiverId);
      }

      const res = await api.post("/messages/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const savedMessage = res.data;

      setMessages((prev) => [...prev, savedMessage]);
      socketRef.current?.emit("sendMessage", {
        chatId: chat._id,
        message: savedMessage,
      });
    } catch (error) {
      console.error("Failed to send image:", error);
      setNotice(error.response?.data?.message || "Failed to send image");
    } finally {
      setSendingImage(false);
      e.target.value = "";
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const lastTypingEmitTimeRef = useRef(0);

  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (!socketRef.current || !chat?._id || !currentUserId) return;

    const now = Date.now();

    if (now - lastTypingEmitTimeRef.current > 2000) {
      socketRef.current.emit("typing", {
        senderId: currentUserId,
        senderName: getUserName(currentUser),
        chatId: chat._id,
      });
      lastTypingEmitTimeRef.current = now;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stopTyping", {
        senderId: currentUserId,
        chatId: chat._id,
      });
      lastTypingEmitTimeRef.current = 0;
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const startVoiceRecording = async () => {
    if (!chat?._id || (!isGroupChat && !directReceiverId)) return;

    if (isPendingMessageRequest) {
      setNotice(
        "Voice messages are available after the message request is accepted"
      );
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setNotice("Voice recording is not supported in this browser");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          stream.getTracks().forEach((track) => track.stop());
          stopRecordingTimer();

          const duration = Math.max(
            1,
            Math.round((Date.now() - recordingStartedAtRef.current) / 1000)
          );

          const audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType || "audio/webm",
          });

          if (audioBlob.size < 1000) {
            setIsRecording(false);
            setRecordingSeconds(0);
            return;
          }

          const formData = new FormData();
          formData.append("chatId", chat._id);

          if (!isGroupChat) {
            formData.append("receiverId", directReceiverId);
          }

          formData.append("audioDuration", duration);
          formData.append(
            "audio",
            audioBlob,
            `voice-${Date.now()}.webm`
          );

          const res = await api.post("/messages/voice", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          const savedMessage = res.data;

          setMessages((prev) => [...prev, savedMessage]);

          socketRef.current?.emit("sendMessage", {
            chatId: chat._id,
            message: savedMessage,
          });

          onMessageSent?.();
        } catch (error) {
          console.error("Failed to send voice message:", error);
          setNotice(
            error.response?.data?.message || "Failed to send voice message"
          );
        } finally {
          setIsRecording(false);
          setRecordingSeconds(0);
          audioChunksRef.current = [];
          mediaRecorderRef.current = null;
        }
      };

      mediaRecorder.start();

      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Microphone error:", error);
      setNotice("Microphone permission denied or unavailable");
      setIsRecording(false);
      stopRecordingTimer();
    }
  };

  const stopVoiceRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
  };

  const openMessageMenuAt = (x, y, msg, isSent) => {
    const menuWidth = 230;
    const menuHeight = isSent ? 455 : 395;
    const gap = 16;
    const padding = 12;

    const rect = chatAreaRef.current?.getBoundingClientRect();

    let finalX;

    if (isSent) {
      finalX = x - menuWidth - gap;
    } else {
      finalX = x + gap;
    }

    let finalY = y - 42;

    if (rect) {
      finalX = clamp(finalX, rect.left + padding, rect.right - menuWidth - padding);
      finalY = clamp(finalY, rect.top + padding, rect.bottom - menuHeight - padding);
    } else {
      finalX = clamp(finalX, padding, window.innerWidth - menuWidth - padding);
      finalY = clamp(finalY, padding, window.innerHeight - menuHeight - padding);
    }

    setActiveMessageMenu({
      message: msg,
      isSent,
      x: finalX,
      y: finalY,
    });
  };

  const openMessageMenu = (
    event,
    msg,
    isSent
  ) => {
    event.preventDefault();

    if (
      isSafetyMessageHiddenForMe(msg)
    ) {
      return;
    }

    openMessageMenuAt(
      event.clientX,
      event.clientY,
      msg,
      isSent
    );
  };

  const closeMessageMenu = () => {
    setActiveMessageMenu(null);
  };

  const handleLongPressStart = (
    event,
    msg,
    isSent
  ) => {
    if (
      isSafetyMessageHiddenForMe(msg)
    ) {
      return;
    }

    const touch =
      event.touches?.[0];

    longPressTimerRef.current =
      setTimeout(() => {
        openMessageMenuAt(
          touch?.clientX || 80,
          touch?.clientY || 180,
          msg,
          isSent
        );
      }, 550);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const updateMessageInState = (updatedMessage) => {
    setMessages((prev) =>
      prev.map((item) =>
        item._id === updatedMessage._id ? updatedMessage : item
      )
    );
  };

  const emitUpdatedMessage = (updatedMessage) => {
    socketRef.current?.emit("messageUpdated", {
      chatId: chat?._id,
      message: updatedMessage,
    });
  };

  const handleReplyMessage = () => {
    const msg = activeMessageMenu?.message;

    if (!msg || msg.isDeleted) {
      closeMessageMenu();
      return;
    }

    setReplyingTo(msg);
    closeMessageMenu();
  };

  const handleStartEditMessage = () => {
    const msg = activeMessageMenu?.message;

    if (!msg?._id || !msg?.text || msg?.messageType === "voice") {
      closeMessageMenu();
      return;
    }

    setEditingMessage(msg);
    setEditText(msg.text);
    closeMessageMenu();
  };

  const handleSaveEditMessage = async () => {
    if (!editingMessage?._id) return;

    if (!editText.trim()) {
      setNotice("Message cannot be empty");
      return;
    }

    if (editText.trim() === editingMessage.text) {
      setEditingMessage(null);
      setEditText("");
      return;
    }

    try {
      const res = await api.patch(`/messages/${editingMessage._id}/edit`, {
        text: editText.trim(),
      });

      const updatedMessage = res.data;

      updateMessageInState(updatedMessage);
      emitUpdatedMessage(updatedMessage);
      onMessageSent?.();

      setEditingMessage(null);
      setEditText("");
    } catch (error) {
      console.error("Failed to edit message:", error);
      setNotice(error.response?.data?.message || "Failed to edit message");
    }
  };

  const handleCopyMessage = async () => {
    const msg = activeMessageMenu?.message;
    const text = msg?.messageType === "voice" ? msg?.audioUrl : msg?.text;

    if (!text) {
      closeMessageMenu();
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied");
    } catch (error) {
      console.error("Copy failed:", error);
      setNotice("Copy failed");
    }

    closeMessageMenu();
  };

  const handleOpenForwardModal = async () => {
    const msg = activeMessageMenu?.message;

    if (!msg || msg.isDeleted) {
      closeMessageMenu();
      return;
    }

    setForwardTarget(msg);
    setForwardSearch("");
    closeMessageMenu();

    try {
      setForwardLoading(true);

      const [usersResponse, chatsResponse] = await Promise.all([
        api.get("/users"),
        api.get("/chats"),
      ]);

      setForwardUsers(usersResponse.data || []);
      setForwardGroups(
        (chatsResponse.data || []).filter((item) => item.isGroupChat)
      );
    } catch (error) {
      console.error("Failed to load forward destinations:", error);
      setNotice("Failed to load forward destinations");
    } finally {
      setForwardLoading(false);
    }
  };

  const handleForwardToUser = async (destination) => {
    if (!forwardTarget || !destination?._id) return;

    try {
      setForwardLoading(true);

      const isGroupDestination = Boolean(destination.isGroup);
      let targetChat;
      let receiverId = null;

      if (isGroupDestination) {
        targetChat = destination.chat;
      } else {
        receiverId = destination._id;

        const chatRes = await api.post("/chats", {
          receiverId,
        });

        targetChat = chatRes.data;
      }

      if (!targetChat?._id) {
        throw new Error("Forward destination is unavailable");
      }

      const messagesToForward =
        forwardTarget._id === "__multiple__"
          ? forwardTarget.selectedMessages || []
          : [forwardTarget];

      const forwardedResponses = await Promise.all(
        messagesToForward.map((msg) => {
          const payload = {
            chatId: targetChat._id,
          };

          if (!isGroupDestination) {
            payload.receiverId = receiverId;
          }

          return api.post(`/messages/${msg._id}/forward`, payload);
        })
      );

      const forwardedMessages = forwardedResponses.map(
        (response) => response.data
      );

      if (targetChat._id === chat?._id) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((item) => item._id));
          const newItems = forwardedMessages.filter(
            (item) => !existingIds.has(item._id)
          );

          return [...prev, ...newItems];
        });
      }

      forwardedMessages.forEach((forwardedMessage) => {
        socketRef.current?.emit("sendMessage", {
          chatId: targetChat._id,
          message: forwardedMessage,
        });
      });

      setForwardTarget(null);
      setForwardSearch("");
      setSelectedMessageIds([]);
      setNotice(
        forwardedMessages.length > 1
          ? "Messages forwarded"
          : "Message forwarded"
      );
      onMessageSent?.();
    } catch (error) {
      console.error("Failed to forward message:", error);
      setNotice(
        error.response?.data?.message ||
          error.message ||
          "Failed to forward message"
      );
    } finally {
      setForwardLoading(false);
    }
  };

  const handleTogglePinMessage = async () => {
    const msg = activeMessageMenu?.message;

    if (!msg?._id) {
      closeMessageMenu();
      return;
    }

    try {
      const res = await api.patch(`/messages/${msg._id}/toggle-pin`);
      const updatedMessage = res.data;

      updateMessageInState(updatedMessage);
      emitUpdatedMessage(updatedMessage);
      setNotice(isCurrentUserInList(msg.pinnedBy) ? "Unpinned" : "Pinned");
    } catch (error) {
      console.error("Failed to pin message:", error);
      setNotice(error.response?.data?.message || "Failed to pin message");
    } finally {
      closeMessageMenu();
    }
  };

  const handleToggleStarMessage = async () => {
    const msg = activeMessageMenu?.message;

    if (!msg?._id) {
      closeMessageMenu();
      return;
    }

    try {
      const res = await api.patch(`/messages/${msg._id}/toggle-star`);
      const updatedMessage = res.data;

      updateMessageInState(updatedMessage);
      emitUpdatedMessage(updatedMessage);
      setNotice(isCurrentUserInList(msg.starredBy) ? "Unstarred" : "Starred");
    } catch (error) {
      console.error("Failed to star message:", error);
      setNotice(error.response?.data?.message || "Failed to star message");
    } finally {
      closeMessageMenu();
    }
  };

  const handleToggleSelectMessage = () => {
    const msg = activeMessageMenu?.message;

    if (!msg?._id) {
      closeMessageMenu();
      return;
    }

    setSelectedMessageIds((prev) =>
      prev.includes(msg._id)
        ? prev.filter((id) => id !== msg._id)
        : [...prev, msg._id]
    );

    closeMessageMenu();
  };

  const handleOpenDeleteModal = () => {
    const msg = activeMessageMenu?.message;

    if (!msg?._id) {
      closeMessageMenu();
      return;
    }

    setDeleteTarget(msg);
    closeMessageMenu();
  };

  const handleConfirmDeleteMessage = async () => {
    if (!deleteTarget?._id) return;

    try {
      const res = await api.patch(`/messages/${deleteTarget._id}/delete`);
      const deletedMessage = res.data;

      updateMessageInState(deletedMessage);
      emitUpdatedMessage(deletedMessage);
      onMessageSent?.();

      setDeleteTarget(null);
      setNotice("Message deleted for everyone");
    } catch (error) {
      console.error("Failed to delete message for everyone:", error);
      setNotice(error.response?.data?.message || "Failed to delete for everyone");
    }
  };

  const handleDeleteMessageForMe = async () => {
    if (!deleteTarget?._id) return;

    try {
      await api.patch(`/messages/${deleteTarget._id}/delete-for-me`);

      setMessages((prev) =>
        prev.filter((item) => item._id !== deleteTarget._id)
      );

      setDeleteTarget(null);
      setNotice("Message deleted for you");
      onMessageSent?.();
    } catch (error) {
      console.error("Failed to delete message for me:", error);
      setNotice(error.response?.data?.message || "Failed to delete for me");
    }
  };

  const handleRevealSafetyMessage =
    async (msg) => {
      if (!msg?._id) return;

      try {
        const response =
          await api.patch(
            `/messages/${msg._id}/reveal`
          );

        updateMessageInState(
          response.data
        );
        setNotice(
          "Message revealed"
        );
      } catch (error) {
        console.error(
          "Failed to reveal message:",
          error
        );

        setNotice(
          error.response?.data
            ?.message ||
            "Failed to reveal message"
        );
      }
    };

  const handleDeleteSafetyMessage =
    async (msg) => {
      if (!msg?._id) return;

      try {
        await api.patch(
          `/messages/${msg._id}/delete-for-me`
        );

        setMessages((previous) =>
          previous.filter(
            (item) =>
              item._id !== msg._id
          )
        );

        setNotice(
          "Message deleted"
        );
        onMessageSent?.();
      } catch (error) {
        console.error(
          "Failed to delete safety message:",
          error
        );

        setNotice(
          error.response?.data
            ?.message ||
            "Failed to delete message"
        );
      }
    };

  const handleReportSafetyMessage =
    async (msg) => {
      if (!msg?._id) return;

      const safety =
        getSafetyMessageDetails(
          msg.predictedCategory
        );

      try {
        const response =
          await api.patch(
            `/messages/${msg._id}/flag`,
            {
              flagCategory:
                safety.reportCategory,
              flagReason:
                `Reported from SafeChat AI ${msg.predictedCategory} warning`,
            }
          );

        updateMessageInState(
          response.data
        );
        setNotice(
          "Message reported"
        );
      } catch (error) {
        console.error(
          "Failed to report safety message:",
          error
        );

        setNotice(
          error.response?.data
            ?.message ||
            "Failed to report message"
        );
      }
    };

  const handleEmojiReaction = async (emoji) => {
    const msg = activeMessageMenu?.message;

    if (!msg?._id) {
      closeMessageMenu();
      return;
    }

    try {
      const res = await api.patch(`/messages/${msg._id}/reaction`, {
        emoji,
      });

      const updatedMessage = res.data;

      updateMessageInState(updatedMessage);
      emitUpdatedMessage(updatedMessage);
    } catch (error) {
      console.error("Failed to react:", error);
      setNotice(error.response?.data?.message || "Failed to react");
    } finally {
      closeMessageMenu();
    }
  };

  const handleReportPlaceholder = () => {
    setNotice("Report will be added later");
    closeMessageMenu();
  };

  const selectedMessages = messages.filter((msg) =>
    selectedMessageIds.includes(msg._id)
  );

  const isSelectionMode = selectedMessageIds.length > 0;

  const clearSelection = () => {
    setSelectedMessageIds([]);
  };

  const handleBubbleClick = (msg) => {
    if (!isSelectionMode || !msg?._id) return;

    setSelectedMessageIds((prev) =>
      prev.includes(msg._id)
        ? prev.filter((id) => id !== msg._id)
        : [...prev, msg._id]
    );
  };

  const handleCopySelectedMessages = async () => {
    if (selectedMessages.length === 0) return;

    const copyText = selectedMessages
      .map((msg) => {
        if (msg.isDeleted) return "This message was deleted";
        if (msg.messageType === "voice") return msg.audioUrl || "Voice message";
        return msg.text || "";
      })
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(copyText);
      setNotice("Copied selected messages");
    } catch (error) {
      console.error("Copy selected failed:", error);
      setNotice("Copy failed");
    }
  };

  const handleStarSelectedMessages = async () => {
    if (selectedMessages.length === 0) return;

    try {
      const responses = await Promise.all(
        selectedMessages.map((msg) =>
          api.patch(`/messages/${msg._id}/toggle-star`)
        )
      );

      responses.forEach((res) => {
        updateMessageInState(res.data);
        emitUpdatedMessage(res.data);
      });

      setNotice("Updated starred messages");
    } catch (error) {
      console.error("Failed to star selected:", error);
      setNotice(error.response?.data?.message || "Failed to star selected");
    }
  };

  const handleDeleteSelectedMessages = async () => {
    const deletableMessages = selectedMessages.filter((msg) => {
      const senderId =
        typeof msg.senderId === "object" ? msg.senderId._id : msg.senderId;

      return senderId?.toString() === currentUserId?.toString() && !msg.isDeleted;
    });

    if (deletableMessages.length === 0) {
      setNotice("You can delete only your sent messages");
      return;
    }

    try {
      const responses = await Promise.all(
        deletableMessages.map((msg) => api.patch(`/messages/${msg._id}/delete`))
      );

      responses.forEach((res) => {
        updateMessageInState(res.data);
        emitUpdatedMessage(res.data);
      });

      setSelectedMessageIds([]);
      setNotice("Selected messages deleted");
      onMessageSent?.();
    } catch (error) {
      console.error("Failed to delete selected:", error);
      setNotice(error.response?.data?.message || "Failed to delete selected");
    }
  };

  const handleForwardSelectedMessages = async () => {
    if (selectedMessages.length === 0) return;

    setForwardTarget({
      _id: "__multiple__",
      text: `${selectedMessages.length} selected messages`,
      selectedMessages,
    });

    setForwardSearch("");

    try {
      setForwardLoading(true);

      const [usersResponse, chatsResponse] = await Promise.all([
        api.get("/users"),
        api.get("/chats"),
      ]);

      setForwardUsers(usersResponse.data || []);
      setForwardGroups(
        (chatsResponse.data || []).filter((item) => item.isGroupChat)
      );
    } catch (error) {
      console.error("Failed to load forward destinations:", error);
      setNotice("Failed to load forward destinations");
    } finally {
      setForwardLoading(false);
    }
  };

  const handleDownloadSelectedMessages = () => {
    setNotice("Download will be added later");
  };
const emojiOptions = [
  "😀", "😂", "😍", "🥰", "😎", "😭", "😡", "😮",
  "👍", "👎", "👏", "🙏", "💪", "🔥", "❤️", "💔",
  "🎉", "✨", "✅", "❌", "💯", "🤝", "👀", "😴",
];

const handlePickEmoji = (emoji) => {
  setMessage((prev) => `${prev}${emoji}`);
  setEmojiPickerOpen(false);
};
const handleClearCurrentChat = async () => {
  if (!chat?._id) return;

  try {
    await api.patch(`/chats/${chat._id}/clear`);

    setMessages([]);
    setNotice("Chat cleared");
    onMessageSent?.();

    window.dispatchEvent(
      new CustomEvent("safechat:chat-cleared", {
        detail: {
          chatId: chat._id,
        },
      })
    );
  } catch (error) {
    console.error("Failed to clear chat:", error);
    setNotice(error.response?.data?.message || "Failed to clear chat");
  }
};

const handleBlockCurrentChat = async () => {
  if (isGroupChat || !directReceiverId) return;

  try {
    const res = await api.post(`/users/toggle-block/${directReceiverId}`);
    sessionStorage.setItem("user", JSON.stringify(res.data));
    window.dispatchEvent(new Event("userUpdated"));
    setNotice("Block setting updated");
    onMessageSent?.();
  } catch (error) {
    console.error("Failed to block/unblock user:", error);
    setNotice(error.response?.data?.message || "Failed to update block settings");
  }
};

const handleDeleteCurrentChat = async () => {
  if (!chat?._id) return;

  try {
    await api.patch(`/chats/${chat._id}/delete-for-me`);

    setMessages([]);
    setProfilePanelOpen(false);
    setNotice("Chat deleted");
    onMessageSent?.();
  } catch (error) {
    console.error("Failed to delete chat:", error);
    setNotice(error.response?.data?.message || "Failed to delete chat");
  }
};

const handleExitCurrentGroup = async () => {
  if (!chat?._id || !isGroupChat) return;

  try {
    await api.patch(`/chats/${chat._id}/exit-group`);
    setProfilePanelOpen(false);
    setNotice("Exited group");
    onMessageSent?.();
    window.location.href = "/app";
  } catch (error) {
    console.error("Failed to exit group:", error);
    setNotice(error.response?.data?.message || "Failed to exit group");
  }
};

const handleUnfriendUser = async () => {
  if (isGroupChat || !directReceiverId) return;

  try {
    await api.post(`/users/remove-friend`, {
      friendId: directReceiverId,
    });
    setNotice("User removed from friends");
    setProfilePanelOpen(false);
    // Reload UI state via custom event or socket
    window.dispatchEvent(new Event("userUpdated"));
  } catch (error) {
    console.error("Failed to unfriend user:", error);
    setNotice(error.response?.data?.message || "Failed to unfriend user");
  }
};

const handleAcceptMessageRequest = async () => {
  if (!chat?._id || !isMessageRequestRecipient) return;

  try {
    setRequestActionLoading(true);
    const response = await api.patch(
      `/chats/${chat._id}/message-request/accept`
    );

    setMessageRequestStatus("accepted");
    setRequestMessageSent(Boolean(response.data?.requestMessageSent));
    setNotice("Conversation started");
    onMessageSent?.();
  } catch (error) {
    console.error("Failed to accept message request:", error);
    setNotice(
      error.response?.data?.message || "Failed to accept message request"
    );
  } finally {
    setRequestActionLoading(false);
  }
};

const handleDeleteMessageRequest = async () => {
  if (!chat?._id || !isPendingMessageRequest) return;

  try {
    setRequestActionLoading(true);
    await api.delete(`/chats/${chat._id}/message-request`);
    setNotice("Message request deleted");
    onChatDeleted?.(chat._id);
  } catch (error) {
    console.error("Failed to delete message request:", error);
    setNotice(
      error.response?.data?.message || "Failed to delete message request"
    );
  } finally {
    setRequestActionLoading(false);
  }
};

  if (!chat || !otherUser) {
    return (
      <section className="h-full flex items-center justify-center imessage-bg">
        <div className="relative z-10 text-center max-w-sm px-6">
          <div className="w-20 h-20 rounded-full bg-white/80 border border-slate-200 shadow-lg flex items-center justify-center mx-auto mb-5">
            <MessageCircle size={36} className="text-[#6366F1]" />
          </div>

          <h2 className="text-2xl font-black text-slate-950">
            Select a person
          </h2>

          <p className="text-slate-500 mt-2 leading-6">
            Choose a real registered user from the left side to start a backend
            chat.
          </p>
        </div>
      </section>
    );
  }

  const isOtherUserOnline =
    !isGroupChat &&
    onlineUsers.includes(otherUser?._id) &&
    otherUser?.privacy?.lastSeen !== "Nobody";

  const displayOtherUser = isGroupChat
    ? {
        ...otherUser,
        name: chatDisplayName,
        username: chatDisplayName,
        isGroup: true,
        isOnline: false,
      }
    : { ...otherUser, isOnline: isOtherUserOnline };

  const isBlockedByMe =
    !isGroupChat &&
    currentUser?.blockedContacts?.some(
      (contact) =>
        (contact._id || contact).toString() ===
        otherUser?._id?.toString()
    );

  const deleteTargetSenderId =
    typeof deleteTarget?.senderId === "object"
      ? deleteTarget?.senderId?._id
      : deleteTarget?.senderId;

  const canDeleteTargetForEveryone =
    deleteTargetSenderId?.toString() === currentUserId?.toString() &&
    !deleteTarget?.isDeleted;

  const forwardDestinations = [
    ...forwardGroups.map((groupChat) => ({
      _id: groupChat._id,
      name: groupChat.groupName || "Group chat",
      username: groupChat.groupName || "Group chat",
      email: `${groupChat.members?.length || 0} members`,
      isGroup: true,
      chat: groupChat,
    })),
    ...forwardUsers,
  ];

  const filteredForwardUsers = forwardDestinations.filter((destination) => {
    const text = `${getUserName(destination)} ${
      destination.email || ""
    }`.toLowerCase();
    const q = forwardSearch.trim().toLowerCase();

    if (!destination.isGroup && isSameId(destination._id, currentUserId)) {
      return false;
    }

    if (!q) return true;

    return text.includes(q);
  });

  return (
    <section
  className="h-full flex flex-col min-w-0 relative overflow-hidden transition-[padding] duration-300"
  style={{
    paddingRight: profilePanelOpen ? "clamp(380px, 45%, 620px)" : "0px",
  }}
>
    <header className="h-[82px] px-6 flex items-center justify-between bg-white/70 backdrop-blur-2xl border-b border-slate-200/70">
  <button
    type="button"
    onClick={() => setProfilePanelOpen(true)}
    className="flex-1 min-w-0 flex items-center gap-3 text-left rounded-[24px] px-2 py-2 -ml-2 hover:bg-slate-50/80 transition"
    title={isGroupChat ? "Open group info" : "Open contact info"}
  >
    <Avatar user={displayOtherUser} />

    <div className="min-w-0">
      <h2 className="font-black text-lg text-slate-950 truncate">
        {chatDisplayName}
      </h2>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        {!isGroupChat && (
          <span
            className={`w-2 h-2 rounded-full ${
              isOtherUserOnline ? "bg-emerald-400" : "bg-slate-300"
            }`}
          />
        )}
        <span className="truncate">
          {isGroupChat
            ? `${chatMemberCount} member${chatMemberCount === 1 ? "" : "s"}`
            : `${isOtherUserOnline ? "Online" : "Offline"}${
                otherUser?.username ? ` • @${otherUser.username}` : ""
              }`}
        </span>
      </div>
    </div>
  </button>

  <div className="flex gap-2 shrink-0">
    <button
      type="button"
      className="w-10 h-10 rounded-full text-[#6366F1] hover:bg-[#F0EDFF] flex items-center justify-center"
    >
      <Phone size={20} />
    </button>

    <button
      type="button"
      className="w-10 h-10 rounded-full text-[#6366F1] hover:bg-[#F0EDFF] flex items-center justify-center"
    >
      <Video size={20} />
    </button>

    <button
      type="button"
      onClick={() => setProfilePanelOpen(true)}
      className="w-10 h-10 rounded-full text-[#6366F1] hover:bg-[#F0EDFF] flex items-center justify-center"
      title="Open contact info"
    >
      <Info size={20} />
    </button>
  </div>
</header>

      <div ref={chatAreaRef} className="imessage-bg flex-1 overflow-y-auto px-5 py-6">
        <div className="relative z-10 max-w-4xl mx-auto space-y-4">
          <div className="flex justify-center mb-5">
            <span className="px-3 py-1 rounded-full bg-white/84 border border-slate-200 text-xs font-black text-slate-400">
              Today
            </span>
          </div>

          {loadingMessages ? (
            <div className="text-center text-slate-400 font-bold py-10">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-slate-400 font-bold py-10">
              No messages yet. Say hello.
            </div>
          ) : (
            messages.map((msg, index) => {
              const senderId =
                typeof msg.senderId === "object"
                  ? msg.senderId._id
                  : msg.senderId;

              const isSent = senderId?.toString() === currentUserId?.toString();

              const previous = messages[index - 1];
              const next = messages[index + 1];

              const previousSender =
                typeof previous?.senderId === "object"
                  ? previous?.senderId?._id
                  : previous?.senderId;

              const nextSender =
                typeof next?.senderId === "object"
                  ? next?.senderId?._id
                  : next?.senderId;

              const isFirstInGroup = !previous || previousSender !== senderId;
              const isLastInGroup = !next || nextSender !== senderId;
              const isSelected = selectedMessageIds.includes(msg._id);
              const reactionSummary = getReactionSummary(msg.reactions);
              const isPinned = isCurrentUserInList(msg.pinnedBy);
              const isStarred = isCurrentUserInList(msg.starredBy);
              const safetyHiddenForCurrentUser =
                isSafetyMessageHiddenForMe(
                  msg
                );
              const safetyDetails =
                getSafetyMessageDetails(
                  msg.predictedCategory
                );
              const confidencePercent =
                Number.isFinite(
                  Number(
                    msg.classificationConfidence
                  )
                )
                  ? Math.round(
                      Number(
                        msg.classificationConfidence
                      ) * 100
                    )
                  : null;

              return (
                <div
                  key={msg._id || msg.id}
                  className={`flex ${
                    isSent ? "justify-end" : "justify-start"
                  } group items-center gap-2`}
                >
                 
                  {isSelectionMode && (
                    <button
                      type="button"
                      onClick={() => handleBubbleClick(msg)}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-white/80 border-slate-300 text-transparent"
                      }`}
                    >
                      <Check size={16} />
                    </button>
                  )}

                  <div
                    className={`max-w-[76%] flex flex-col ${
                      isSent ? "items-end" : "items-start"
                    }`}
                  >
                    {isGroupChat && !isSent && isFirstInGroup && (
                      <div className="px-2 pb-1 text-xs font-black text-[#6366F1]">
                        {getUserName(msg.senderId)}
                      </div>
                    )}

                    <div
                      onClick={() => handleBubbleClick(msg)}
                      onContextMenu={(event) =>
                        openMessageMenu(event, msg, isSent)
                      }
                      onTouchStart={(event) =>
                        handleLongPressStart(event, msg, isSent)
                      }
                      onTouchEnd={handleLongPressEnd}
                      onTouchMove={handleLongPressEnd}
                      className={`px-4 py-2.5 text-[15px] leading-6 cursor-pointer select-none ${
                        isSent ? "message-out" : "message-in"
                      } ${
                        isSent
                          ? `${
                              isFirstInGroup
                                ? "rounded-t-[22px]"
                                : "rounded-t-[10px]"
                            } ${
                              isLastInGroup
                                ? "rounded-bl-[22px] rounded-br-[6px]"
                                : "rounded-b-[10px]"
                            }`
                          : `${
                              isFirstInGroup
                                ? "rounded-t-[22px]"
                                : "rounded-t-[10px]"
                            } ${
                              isLastInGroup
                                ? "rounded-br-[22px] rounded-bl-[6px]"
                                : "rounded-b-[10px]"
                            }`
                      } ${isSelected ? "ring-2 ring-emerald-400/60 bg-emerald-50/40" : ""}`}
                    >
                      {!safetyHiddenForCurrentUser && !msg.isDeleted && msg.replyTo && (
                        <div className="mb-2 px-3 py-2 rounded-[14px] bg-white/20 border-l-2 border-white/60 text-xs opacity-85 max-w-[260px]">
                          <div className="font-black mb-0.5">Replying to</div>
                          <div className="truncate">
                            {getMessagePreview(msg.replyTo)}
                          </div>
                        </div>
                      )}

                      {!safetyHiddenForCurrentUser && !msg.isDeleted && msg.isForwarded && (
                        <div className="mb-1 text-xs opacity-70 font-bold">
                          Forwarded
                        </div>
                      )}

                      {safetyHiddenForCurrentUser ? (
                        <div
                          className="min-w-[260px] max-w-[340px]"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                              <ShieldAlert
                                size={19}
                              />
                            </span>

                            <div className="min-w-0">
                              <div className="font-black text-slate-950">
                                {
                                  safetyDetails.title
                                }
                              </div>

                              <div className="mt-1 text-sm leading-5 text-slate-600">
                                {
                                  safetyDetails.description
                                }
                              </div>

                              <div className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                                SafeChat AI
                                {confidencePercent !==
                                null
                                  ? ` · ${confidencePercent}% confidence`
                                  : ""}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleRevealSafetyMessage(
                                  msg
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#6366F1] px-3 py-2 text-xs font-black text-white"
                            >
                              <Eye
                                size={15}
                              />
                              View message
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteSafetyMessage(
                                  msg
                                )
                              }
                              className="rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>

                            {msg.predictedCategory !==
                              "spam" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleReportSafetyMessage(
                                    msg
                                  )
                                }
                                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                              >
                                Report
                              </button>
                            )}
                          </div>
                        </div>
                      ) : msg.isDeleted ? (
                        "This message was deleted"
                      ) : msg.messageType === "voice" && msg.audioUrl ? (
                        <div className="min-w-[230px]">
                          <audio
                            controls
                            src={msg.audioUrl}
                            className="w-full h-9"
                          />
                          <div className="text-xs opacity-70 mt-1">
                            Voice message
                            {msg.audioDuration
                              ? ` · ${formatRecordingTime(msg.audioDuration)}`
                              : ""}
                          </div>
                        </div>
                      ) : msg.messageType === "image" && msg.imageUrl ? (
                        <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={msg.imageUrl}
                            alt="Shared image"
                            className="max-w-[260px] max-h-[320px] rounded-2xl object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        msg.text
                      )}

                      {!safetyHiddenForCurrentUser &&
                        !msg.isDeleted &&
                        msg.classificationStatus ===
                          "classified" &&
                        msg.predictedCategory &&
                        msg.predictedCategory !==
                          "normal" && (
                          <div className="mt-2 text-[11px] font-black uppercase tracking-wide opacity-70">
                            AI:{" "}
                            {msg.predictedCategory}
                            {confidencePercent !==
                            null
                              ? ` · ${confidencePercent}%`
                              : ""}
                          </div>
                        )}

                      {!msg.isDeleted && (isPinned || isStarred) && (
                        <div className="mt-1 flex gap-1 text-xs opacity-75">
                          {isPinned && <span>📌</span>}
                          {isStarred && <span>⭐</span>}
                        </div>
                      )}
                    </div>

                    {reactionSummary.length > 0 && !msg.isDeleted && (
                      <div className="mt-1 flex gap-1 px-1">
                        {reactionSummary.map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className="px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-sm text-xs"
                          >
                            {emoji} {count}
                          </span>
                        ))}
                      </div>
                    )}

                    {isLastInGroup && (
                      <div className="flex items-center gap-1.5 mt-1 px-1 text-xs text-slate-400">
                        <span>
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>

                        {msg.isEdited && !msg.isDeleted && <span>edited</span>}

                        {isSelected && <span>selected</span>}

                        {isSent && (
                          <>
                            {msg.isViewed ? (
                              <CheckCheck
                                size={14}
                                className="text-[#6366F1]"
                              />
                            ) : (
                              <Check size={14} />
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isOtherTyping && (
            <div className="flex justify-start mb-6 px-6 animate-fade-in-up">
              <div className="max-w-[76%] flex flex-col items-start">
                <div className="px-4 py-3.5 text-[15px] leading-6 message-in rounded-[22px] rounded-bl-[6px] flex gap-1.5 items-center h-[44px]">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                </div>
                <div className="mt-1 px-1 text-xs text-slate-400">
                  {typingUserName || chatDisplayName} is typing...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
{profilePanelOpen && (
  <aside
    className="absolute right-0 top-0 bottom-0 z-[9000] bg-white border-l border-slate-200 shadow-[-12px_0_32px_rgba(15,23,42,0.08)] flex flex-col"
    style={{ width: "clamp(380px, 45%, 620px)" }}
  >
    <div className="h-[82px] px-5 flex items-center gap-3 border-b border-slate-200/70">
      <button
        type="button"
        onClick={() => setProfilePanelOpen(false)}
        className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700"
      >
        <X size={23} />
      </button>

      <h3 className="text-lg font-black text-slate-950 flex-1">
        {isGroupChat ? "Group info" : "Contact info"}
      </h3>

      <button
        type="button"
        className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700"
      >
        <Pencil size={20} />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto">
      <div className="px-6 pt-8 pb-7 flex flex-col items-center text-center border-b border-slate-100">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white flex items-center justify-center text-4xl font-black shadow-[0_18px_42px_rgba(99,102,241,0.25)] overflow-hidden">
          {!isGroupChat && otherUser?.profilePic ? (
            <img
              src={otherUser.profilePic}
              alt={chatDisplayName}
              className="w-full h-full object-cover"
            />
          ) : (
            initials(chatDisplayName)
          )}
        </div>

        <h2 className="mt-4 text-2xl font-black text-slate-950">
          {chatDisplayName}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {isGroupChat
            ? `${chatMemberCount} member${chatMemberCount === 1 ? "" : "s"}`
            : otherUser?.email || "No email"}
        </p>

        {!isGroupChat && otherUser?.username && (
          <p className="mt-1 text-sm font-bold text-slate-500">
            @{otherUser.username}
          </p>
        )}

        <div className="mt-5 flex items-center justify-center gap-5">
          <button
            type="button"
            className="flex flex-col items-center gap-2 text-slate-700"
          >
            <span className="w-14 h-14 rounded-full bg-slate-100 hover:bg-[#F0EDFF] hover:text-[#6366F1] flex items-center justify-center">
              <Phone size={22} />
            </span>
            <span className="text-sm font-bold">Voice</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center gap-2 text-slate-700"
          >
            <span className="w-14 h-14 rounded-full bg-slate-100 hover:bg-[#F0EDFF] hover:text-[#6366F1] flex items-center justify-center">
              <Video size={22} />
            </span>
            <span className="text-sm font-bold">Video</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center gap-2 text-slate-700"
          >
            <span className="w-14 h-14 rounded-full bg-slate-100 hover:bg-[#F0EDFF] hover:text-[#6366F1] flex items-center justify-center">
              <Search size={22} />
            </span>
            <span className="text-sm font-bold">Search</span>
          </button>
        </div>
      </div>

      <div className="px-6 py-5 border-b border-slate-100">
        {isGroupChat ? (
          <div className="rounded-[22px] bg-slate-50 border border-slate-200 p-4">
            <div className="text-xs font-black uppercase tracking-wide text-slate-400 mb-3">
              Members
            </div>

            <div className="space-y-3">
              {(chat?.members || []).map((member) => (
                <div
                  key={member?._id || member}
                  className="flex items-center gap-3"
                >
                  <Avatar user={member} />
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-800 truncate">
                      {getUserName(member)}
                      {isSameId(member?._id || member, currentUserId)
                        ? " (you)"
                        : ""}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {member?.username
                        ? `@${member.username}`
                        : member?.email || ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] bg-slate-50 border border-slate-200 p-4">
            <div className="text-xs font-black uppercase tracking-wide text-slate-400 mb-1">
              Status
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOtherUserOnline ? "bg-emerald-400" : "bg-slate-300"
                }`}
              />
              {isOtherUserOnline ? "Online" : "Offline"}
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-5 border-b border-slate-100">
        <button
          type="button"
          className="w-full flex items-center gap-4 text-left"
        >
          <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <ImageIcon size={22} />
          </div>

          <div className="flex-1">
            <div className="font-black text-slate-950">
              Media, links and docs
            </div>
            <div className="text-sm text-slate-500">
              Shared files will appear here
            </div>
          </div>

          <span className="text-sm font-bold text-slate-400">0</span>
        </button>
      </div>

      <div className="px-6 py-3">
  <button
    type="button"
    onClick={handleClearCurrentChat}
    className="w-full py-4 flex items-center gap-5 text-left border-b border-slate-100 text-red-600 hover:bg-red-50 rounded-[14px] px-2"
  >
    <MinusCircle size={24} />
    <span className="font-bold">Clear chat</span>
  </button>

  {!chat?.isGroupChat && (
    <>
      <button
        onClick={handleBlockCurrentChat}
        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-[20px] transition-colors group text-red-600 dark:text-red-500"
      >
        <span className="font-bold">{isBlockedByMe ? "Unblock" : "Block"}</span>
        <ShieldCheck className="text-red-400 group-hover:text-red-600 dark:group-hover:text-red-500" size={20} />
      </button>

      <button
        onClick={handleUnfriendUser}
        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-[20px] transition-colors group text-red-600 dark:text-red-500"
      >
        <span className="font-bold">Unfriend</span>
        <UserMinus className="text-red-400 group-hover:text-red-600 dark:group-hover:text-red-500" size={20} />
      </button>
    </>
  )}

  {isGroupChat && (
    <button
      type="button"
      onClick={handleExitCurrentGroup}
      className="w-full py-4 flex items-center gap-5 text-left border-b border-slate-100 text-red-600 hover:bg-red-50 rounded-[14px] px-2"
    >
      <LogOut size={24} />
      <span className="font-bold">Exit group</span>
    </button>
  )}

  <button
    type="button"
    onClick={handleReportPlaceholder}
    className="w-full py-4 flex items-center gap-5 text-left border-b border-slate-100 text-red-600 hover:bg-red-50 rounded-[14px] px-2"
  >
    <Flag size={24} />
    <span className="font-bold">Report</span>
  </button>

  <button
    type="button"
    onClick={handleDeleteCurrentChat}
    className="w-full py-4 flex items-center gap-5 text-left text-red-600 hover:bg-red-50 rounded-[14px] px-2"
  >
    <Trash2 size={24} />
    <span className="font-bold">Delete chat</span>
  </button>
</div>
    </div>
  </aside>
)}
      {activeMessageMenu && (
        <div
          className="fixed z-[9999]"
          style={{
            left: activeMessageMenu.x,
            top: activeMessageMenu.y,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-2 flex items-center gap-1 rounded-full bg-white shadow-[0_14px_40px_rgba(15,23,42,0.18)] border border-slate-200 px-2 py-1.5">
            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiReaction(emoji)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-lg flex items-center justify-center transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="w-[210px] rounded-[18px] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.22)] border border-slate-200 overflow-hidden py-2">
            <button
              type="button"
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
              onClick={handleReplyMessage}
            >
              <Reply size={18} />
              <span>Reply</span>
            </button>

            {activeMessageMenu.isSent &&
              !activeMessageMenu.message?.isDeleted &&
              activeMessageMenu.message?.messageType !== "voice" && (
                <button
                  type="button"
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
                  onClick={handleStartEditMessage}
                >
                  <Pencil size={18} />
                  <span>Edit</span>
                </button>
              )}

            <button
              type="button"
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
              onClick={handleCopyMessage}
            >
              <Copy size={18} />
              <span>Copy</span>
            </button>

            <button
              type="button"
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
              onClick={handleOpenForwardModal}
            >
              <Forward size={18} />
              <span>Forward</span>
            </button>

            <button
              type="button"
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
              onClick={handleTogglePinMessage}
            >
              <Pin size={18} />
              <span>
                {isCurrentUserInList(activeMessageMenu.message?.pinnedBy)
                  ? "Unpin"
                  : "Pin"}
              </span>
            </button>

            <button
              type="button"
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
              onClick={handleToggleStarMessage}
            >
              <Star size={18} />
              <span>
                {isCurrentUserInList(activeMessageMenu.message?.starredBy)
                  ? "Unstar"
                  : "Star"}
              </span>
            </button>

            <div className="h-px bg-slate-200 my-1" />

            <button
              type="button"
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-900"
              onClick={handleToggleSelectMessage}
            >
              <SquareCheck size={18} />
              <span>
                {selectedMessageIds.includes(activeMessageMenu.message?._id)
                  ? "Unselect"
                  : "Select"}
              </span>
            </button>

            <div className="h-px bg-slate-200 my-1" />

            <button
              type="button"
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 text-slate-400"
              onClick={handleReportPlaceholder}
            >
              <Flag size={18} />
              <span>Report</span>
            </button>

            <button
              type="button"
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-red-50 text-red-600"
              onClick={handleOpenDeleteModal}
            >
              <Trash2 size={18} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed left-1/2 bottom-24 -translate-x-1/2 z-[10000] px-4 py-2 rounded-full bg-slate-950 text-white text-sm font-bold shadow-xl">
          {notice}
        </div>
      )}

      {editingMessage && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/30 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-[24px] bg-white shadow-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-black text-slate-950 mb-3">
              Edit message
            </h3>

            <textarea
              value={editText}
              onChange={(event) => setEditText(event.target.value)}
              className="w-full min-h-28 rounded-[18px] border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#6366F1]/30"
              autoFocus
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setEditingMessage(null);
                  setEditText("");
                }}
                className="px-4 py-2 rounded-full font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveEditMessage}
                className="px-5 py-2 rounded-full apple-primary font-black"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/30 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white shadow-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-black text-slate-950 mb-2">
              Delete message?
            </h3>

            <p className="text-sm text-slate-500 leading-6">
              This will replace your message with a deleted-message placeholder.
            </p>

            <div className="flex flex-col gap-2 mt-5">
              <button
                type="button"
                onClick={handleDeleteMessageForMe}
                className="w-full px-5 py-3 rounded-full bg-slate-100 text-slate-900 font-black hover:bg-slate-200"
              >
                Delete for me
              </button>

              {canDeleteTargetForEveryone && (
                <button
                  type="button"
                  onClick={handleConfirmDeleteMessage}
                  className="w-full px-5 py-3 rounded-full bg-red-500 text-white font-black hover:bg-red-600"
                >
                  Delete for everyone
                </button>
              )}

              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="w-full px-5 py-3 rounded-full font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {forwardTarget && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/30 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md max-h-[80vh] rounded-[24px] bg-white shadow-2xl border border-slate-200 p-5 flex flex-col">
            <h3 className="text-lg font-black text-slate-950 mb-3">
              Forward message
            </h3>

            <div className="mb-3 rounded-[18px] bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <span className="font-black text-slate-700">Message: </span>
              {forwardTarget?._id === "__multiple__"
                ? `${forwardTarget.selectedMessages?.length || 0} selected messages`
                : getMessagePreview(forwardTarget)}
            </div>

            <input
              value={forwardSearch}
              onChange={(event) => setForwardSearch(event.target.value)}
              placeholder="Search people or groups"
              className="apple-input w-full h-11 rounded-full px-4 text-slate-900 placeholder:text-slate-400 mb-3"
              autoFocus
            />

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {forwardLoading ? (
                <div className="py-8 text-center text-slate-400 font-bold">
                  Loading...
                </div>
              ) : filteredForwardUsers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-bold">
                  No destinations found
                </div>
              ) : (
                filteredForwardUsers.map((user) => (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => handleForwardToUser(user)}
                    className="w-full flex items-center gap-3 p-3 rounded-[18px] hover:bg-slate-50 text-left"
                  >
                    <Avatar user={user} />
                    <div className="min-w-0">
                      <div className="font-black text-slate-950 truncate">
                        {getUserName(user)}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {user.email}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setForwardTarget(null);
                  setForwardSearch("");
                }}
                className="px-4 py-2 rounded-full font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isSelectionMode && (
        <div className="h-[72px] px-5 bg-white/94 backdrop-blur-2xl border-t border-slate-200/70 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={clearSelection}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-900"
            >
              <X size={24} />
            </button>

            <span className="font-black text-slate-950">
              {selectedMessageIds.length} selected
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleCopySelectedMessages}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-900"
              title="Copy"
            >
              <Copy size={23} />
            </button>

            <button
              type="button"
              onClick={handleStarSelectedMessages}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-900"
              title="Star"
            >
              <Star size={23} />
            </button>

            <button
              type="button"
              onClick={handleDeleteSelectedMessages}
              className="w-10 h-10 rounded-full hover:bg-red-50 flex items-center justify-center text-slate-900 hover:text-red-600"
              title="Delete"
            >
              <Trash2 size={23} />
            </button>

            <button
              type="button"
              onClick={handleForwardSelectedMessages}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-900"
              title="Forward"
            >
              <Forward size={23} />
            </button>

            <button
              type="button"
              onClick={handleDownloadSelectedMessages}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              title="Download"
            >
              <Download size={23} />
            </button>
          </div>
        </div>
      )}

      <footer
        className={`px-4 py-3 bg-white/74 backdrop-blur-2xl border-t border-slate-200/70 ${
          isSelectionMode ? "hidden" : ""
        }`}
      >
        {isPendingMessageRequest && isMessageRequestRecipient ? (
          <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="font-black text-slate-950">
              {chatDisplayName} is not your friend
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Do you want to accept this message request and start the
              conversation?
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={requestActionLoading}
                onClick={handleAcceptMessageRequest}
                className="flex-1 h-11 rounded-full bg-[#6366F1] text-white font-black disabled:opacity-60"
              >
                {requestActionLoading ? "Please wait..." : "Accept"}
              </button>

              <button
                type="button"
                disabled={requestActionLoading}
                onClick={handleDeleteMessageRequest}
                className="flex-1 h-11 rounded-full bg-white border border-red-200 text-red-600 font-black hover:bg-red-50 disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        ) : isPendingMessageRequest &&
          isMessageRequestSender &&
          requestMessageSent ? (
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-center">
            <div className="font-black text-slate-950">
              Message request sent
            </div>
            <p className="mt-1 text-sm text-slate-500">
              You can continue chatting after {chatDisplayName} accepts it.
            </p>
            <button
              type="button"
              disabled={requestActionLoading}
              onClick={handleDeleteMessageRequest}
              className="mt-3 px-4 py-2 rounded-full text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Cancel request
            </button>
          </div>
        ) : isBlockedByMe ? (
          <div className="flex items-center justify-center p-2 text-slate-500 font-medium">
            You have blocked this user. Unblock to send a message.
          </div>
        ) : (
          <>
            {isPendingMessageRequest && isMessageRequestSender && (
              <div className="mb-2 mx-2 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-slate-600">
                You can send one message. More messages will be enabled after
                {` ${chatDisplayName} `}accepts the request.
              </div>
            )}

            {replyingTo && (
              <div className="mb-2 mx-12 rounded-[18px] bg-white border border-slate-200 shadow-sm px-4 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-black text-[#6366F1]">Replying to</div>
                  <div className="text-sm text-slate-600 truncate">
                    {getMessagePreview(replyingTo)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 font-black"
                >
                  ×
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button
                type="button"
                className="w-10 h-10 rounded-full text-[#6366F1] hover:bg-[#F0EDFF] flex items-center justify-center"
              >
                <Paperclip size={20} />
              </button>

              {/* Hidden file input for image upload */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSendImage}
              />

              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={sendingImage}
                title="Send image"
                className="w-10 h-10 rounded-full text-[#6366F1] hover:bg-[#F0EDFF] flex items-center justify-center disabled:opacity-50"
              >
                {sendingImage ? (
                  <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ImageIcon size={20} />
                )}
              </button>

              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={
                    isPendingMessageRequest
                      ? "Send one message request"
                      : `Message ${chatDisplayName}`
                  }
                  value={message}
                  onChange={handleTyping}
                  className="apple-input w-full h-12 rounded-full pl-5 pr-12 text-slate-900 placeholder:text-slate-400"
                />

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEmojiPickerOpen((prev) => !prev);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-slate-400 hover:text-[#6366F1] hover:bg-[#F0EDFF] flex items-center justify-center"
                >
                  <Smile size={20} />
                </button>

                {emojiPickerOpen && (
                  <div
                    className="absolute right-0 bottom-14 z-[9999] w-[280px] rounded-[22px] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.20)] border border-slate-200 p-3 grid grid-cols-8 gap-1"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {emojiOptions.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handlePickEmoji(emoji)}
                        className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-xl"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {message.trim() ? (
                <button
                  type="submit"
                  className="w-11 h-11 rounded-full apple-primary flex items-center justify-center"
                >
                  <Send size={19} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPendingMessageRequest}
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  className={`h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-40 ${
                    isRecording
                      ? "w-28 bg-red-50 text-red-500 font-black text-xs"
                      : "w-11 text-[#6366F1] hover:bg-[#F0EDFF]"
                  }`}
                >
                  {isRecording ? (
                    `Stop ${formatRecordingTime(recordingSeconds)}`
                  ) : (
                    <Mic size={19} />
                  )}
                </button>
              )}
            </form>
          </>
        )}
      </footer>
    </section>
  );
}
