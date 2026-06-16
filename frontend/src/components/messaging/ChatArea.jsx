import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  Phone,
  Video,
  Info,
  Send,
  Smile,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Check,
  CheckCheck,
  MessageCircle,
  Trash2,
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
  return JSON.parse(localStorage.getItem("user") || "null");
}

function getUserName(user) {
  return user?.username || user?.name || user?.email || "Unknown User";
}

function Avatar({ user }) {
  return (
    <div className="relative shrink-0">
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white flex items-center justify-center font-black shadow-[0_10px_24px_rgba(99,102,241,0.20)]">
        {initials(getUserName(user))}
      </div>

      <span
        className={`absolute right-0 bottom-0 w-3 h-3 rounded-full border-2 border-white ${
          user?.isOnline ? "bg-emerald-400" : "bg-slate-300"
        }`}
      />
    </div>
  );
}

export default function ChatArea({
  chat,
  otherUser,
  onMessageSent,
  onlineUsers = [],
  onOnlineUsersUpdate,
}) {
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?._id || currentUser?.id;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingStartedAtRef = useRef(null);
  useEffect(() => {
    if (!currentUserId) return;

    // Reset typing state when switching to a different chat
    setIsTyping(false);

    const socket = io(
      import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:5002",
      {
        transports: ["websocket", "polling"],
      }
    );

    socketRef.current = socket;

    // Register user on initial connection AND automatic reconnections after inactivity
    socket.on("connect", () => {
      socket.emit("addUser", currentUserId);
    });

    socket.on("getOnlineUsers", (users) => {
      onOnlineUsersUpdate?.(users);
    });

    socket.on("receiveMessage", (incomingMessage) => {
      // If the message is for the currently active chat, silently mark it as viewed in the DB
      if (chat?._id && incomingMessage.chatId === chat._id) {
        api
          .get(`/messages/${chat._id}`)
          .catch((err) => console.log("Failed to mark as viewed", err));
      }

      setMessages((prev) => {
        const alreadyExists = prev.some(
          (item) => item._id === incomingMessage._id
        );

        if (alreadyExists) return prev;

        if (chat?._id && incomingMessage.chatId === chat._id) {
          return [...prev, incomingMessage];
        }

        return prev;
      });

      // Trigger the parent's reload callback to update sidebar in real-time
      onMessageSent?.();
    });

    socket.on("messageUpdated", (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        )
      );
      onMessageSent?.();
    });

    socket.on("typing", (data) => {
      if (chat?._id && data.chatId === chat._id) {
        setIsTyping(true);
      }
    });

    socket.on("stopTyping", (data) => {
      if (chat?._id && data.chatId === chat._id) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [currentUserId, chat?._id, onOnlineUsersUpdate]);

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
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [chat?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!message.trim() || !chat?._id || !otherUser?._id) return;

    const text = message.trim();
    setMessage("");

    try {
      const res = await api.post("/messages", {
        chatId: chat._id,
        receiverId: otherUser._id,
        text,
      });

      const savedMessage = res.data;

      setMessages((prev) => [...prev, savedMessage]);

      socketRef.current?.emit("sendMessage", {
        receiverId: otherUser._id,
        message: savedMessage,
      });

      // Stop typing indicator when message is sent
      socketRef.current?.emit("stopTyping", {
        receiverId: otherUser._id,
        chatId: chat._id,
      });

      onMessageSent?.();
    } catch (error) {
      console.error("Failed to send message:", error);
      alert(error.response?.data?.message || "Failed to send message");
      setMessage(text);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?"))
      return;

    try {
      const res = await api.delete(`/messages/${messageId}`);
      const deletedMessage = res.data;

      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? deletedMessage : msg))
      );

      socketRef.current?.emit("messageUpdated", {
        receiverId: otherUser._id,
        message: deletedMessage,
      });

      onMessageSent?.();
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (!socketRef.current || !otherUser?._id || !chat?._id) return;

    socketRef.current.emit("typing", {
      receiverId: otherUser._id,
      senderName: getUserName(currentUser),
      chatId: chat._id,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("stopTyping", {
        receiverId: otherUser._id,
        chatId: chat._id,
      });
    }, 2000); // Stop typing after 2 seconds of inactivity
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
    if (!chat?._id || !otherUser?._id) return;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Voice recording is not supported in this browser");
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
          formData.append("receiverId", otherUser._id);
          formData.append("audioDuration", duration);
          formData.append("audio", audioBlob, `voice-${Date.now()}.webm`);

          const res = await api.post("/messages/voice", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          const savedMessage = res.data;

          setMessages((prev) => [...prev, savedMessage]);

          socketRef.current?.emit("sendMessage", {
            receiverId: otherUser._id,
            message: savedMessage,
          });

          onMessageSent?.();
        } catch (error) {
          console.error("Failed to send voice message:", error);
          alert(
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
      alert("Microphone permission denied or unavailable");
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

  const isOtherUserOnline = onlineUsers.includes(otherUser?._id);
  const displayOtherUser = { ...otherUser, isOnline: isOtherUserOnline };

  return (
    <section className="h-full flex flex-col min-w-0">
      <header className="h-[82px] px-6 flex items-center justify-between bg-white/70 backdrop-blur-2xl border-b border-slate-200/70">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar user={displayOtherUser} />

          <div className="min-w-0">
            <h2 className="font-black text-lg text-slate-950 truncate">
              {getUserName(otherUser)}
            </h2>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOtherUserOnline ? "bg-emerald-400" : "bg-slate-300"
                }`}
              />
              <span>{isOtherUserOnline ? "Online" : otherUser?.email}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {[Phone, Video, Info].map((Icon, index) => (
            <button
              key={index}
              className="w-10 h-10 rounded-full text-[#6366F1] hover:bg-[#F0EDFF] flex items-center justify-center"
            >
              <Icon size={20} />
            </button>
          ))}
        </div>
      </header>

      <div className="imessage-bg flex-1 overflow-y-auto px-5 py-6">
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

              return (
                <div
                  key={msg._id || msg.id}
                  className={`flex ${
                    isSent ? "justify-end" : "justify-start"
                  } group items-center gap-2`}
                >
                  {isSent && !msg.isDeleted && (
                    <button
                      onClick={() => handleDeleteMessage(msg._id || msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full shrink-0"
                      title="Delete message"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <div
                    className={`max-w-[76%] flex flex-col ${
                      isSent ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-2.5 text-[15px] leading-6 ${
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
                      }`}
                    >
                      {msg.isDeleted ? (
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
                      ) : (
                        msg.text
                      )}
                    </div>

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

          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[76%] flex flex-col items-start">
                <div className="px-4 py-3.5 text-[15px] leading-6 message-in rounded-[22px] rounded-bl-[6px] flex gap-1.5 items-center h-[44px]">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                </div>
                <div className="mt-1 px-1 text-xs text-slate-400">
                  {getUserName(otherUser)} is typing...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <footer className="px-4 py-3 bg-white/74 backdrop-blur-2xl border-t border-slate-200/70">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button
            type="button"
            className="w-10 h-10 rounded-full text-[#6366F1] hover:bg-[#F0EDFF] flex items-center justify-center"
          >
            <Paperclip size={20} />
          </button>

          <button
            type="button"
            className="w-10 h-10 rounded-full text-[#6366F1] hover:bg-[#F0EDFF] flex items-center justify-center"
          >
            <ImageIcon size={20} />
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              placeholder={`Message ${getUserName(otherUser)}`}
              value={message}
              onChange={handleTyping}
              className="apple-input w-full h-12 rounded-full pl-5 pr-12 text-slate-900 placeholder:text-slate-400"
            />

            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-slate-400 hover:text-[#6366F1] hover:bg-[#F0EDFF] flex items-center justify-center"
            >
              <Smile size={20} />
            </button>
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
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className={`h-11 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? "w-28 bg-red-50 text-red-500 font-black text-xs"
                  : "w-11 text-[#6366F1] hover:bg-[#F0EDFF]"
              }`}
            >
              {isRecording ? (
                `Stop ${formatRecordingTime(recordingSeconds)}`
              ) : (
                <Mic size={20} />
              )}
            </button>
          )}
        </form>
      </footer>
    </section>
  );
}
