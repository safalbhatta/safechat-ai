import { useEffect, useRef, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import API from "../../services/api";

function ChatWindow({
  selectedUser,
  activeChat,
  socket,
  onlineUsers,
  onChatActivity,
}) {
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [replyMessage, setReplyMessage] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const messagesAreaRef = useRef(null);
  const bottomRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const isSelectedUserOnline = selectedUser
    ? onlineUsers.includes(selectedUser._id)
    : false;

  useEffect(() => {
    setTypingUser("");
    setReplyMessage(null);
    setShowScrollButton(false);
    setNewMessageCount(0);

    if (activeChat?._id) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [activeChat?._id]);

  useEffect(() => {
    scrollToBottom("auto");
  }, [activeChat?._id]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      onChatActivity?.(message);

      if (message.chatId === activeChat?._id) {
        const nearBottom = isNearBottom();

        setMessages((prev) => {
          const exists = prev.some((m) => m._id === message._id);
          return exists ? prev : [...prev, message];
        });

        socket.emit("messagesSeen", {
          receiverId: message.senderId,
          chatId: message.chatId,
        });

        if (nearBottom) {
          setTimeout(() => scrollToBottom("smooth"), 50);
        } else {
          setNewMessageCount((prev) => prev + 1);
          setShowScrollButton(true);
        }
      }
    };

    const handleMessageUpdatedFromSocket = (updatedMessage) => {
      if (updatedMessage.chatId === activeChat?._id) {
        setMessages((prev) =>
          prev.map((message) =>
            message._id === updatedMessage._id ? updatedMessage : message
          )
        );
      }

      onChatActivity?.(updatedMessage);
    };

    const handleMessagesSeen = ({ chatId }) => {
      if (chatId === activeChat?._id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.senderId === currentUser?._id ? { ...msg, isViewed: true } : msg
          )
        );
      }
    };

    const handleTyping = ({ senderName, chatId }) => {
      if (chatId === activeChat?._id) {
        setTypingUser(senderName);
      }
    };

    const handleStopTyping = ({ chatId }) => {
      if (chatId === activeChat?._id) {
        setTypingUser("");
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageUpdated", handleMessageUpdatedFromSocket);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageUpdated", handleMessageUpdatedFromSocket);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [socket, activeChat?._id, currentUser?._id, onChatActivity]);

  const fetchMessages = async () => {
    try {
      const res = await API.get(`/messages/${activeChat._id}`);
      setMessages(res.data);

      setTimeout(() => scrollToBottom("auto"), 50);

      const hasUnseenReceivedMessages = res.data.some(
        (msg) => msg.receiverId === currentUser?._id && !msg.isViewed
      );

      if (hasUnseenReceivedMessages && selectedUser?._id) {
        socket?.emit("messagesSeen", {
          receiverId: selectedUser._id,
          chatId: activeChat._id,
        });
      }
    } catch (error) {
      console.log("Fetch messages error:", error);
    }
  };

  const isNearBottom = () => {
    const area = messagesAreaRef.current;
    if (!area) return true;

    const distanceFromBottom =
      area.scrollHeight - area.scrollTop - area.clientHeight;

    return distanceFromBottom < 120;
  };

  const scrollToBottom = (behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
    setShowScrollButton(false);
    setNewMessageCount(0);
  };

  const handleScroll = () => {
    const nearBottom = isNearBottom();

    setShowScrollButton(!nearBottom);

    if (nearBottom) {
      setNewMessageCount(0);
    }
  };

  const handleMessageSent = (newMessage) => {
    setMessages((prev) => [...prev, newMessage]);
    setReplyMessage(null);
    onChatActivity?.(newMessage);

    socket?.emit("sendMessage", {
      receiverId: selectedUser._id,
      message: newMessage,
    });

    socket?.emit("stopTyping", {
      receiverId: selectedUser._id,
      chatId: activeChat._id,
    });

    setTimeout(() => scrollToBottom("smooth"), 50);
  };

  const handleMessageUpdated = (updatedMessage, shouldNotifyReceiver = true) => {
    setMessages((prev) =>
      prev.map((message) =>
        message._id === updatedMessage._id ? updatedMessage : message
      )
    );

    onChatActivity?.(updatedMessage);

    if (shouldNotifyReceiver && selectedUser?._id) {
      socket?.emit("messageUpdated", {
        receiverId: selectedUser._id,
        message: updatedMessage,
      });
    }
  };

  const shouldShowDateSeparator = (message, index) => {
    if (index === 0) return true;

    const currentDate = new Date(message.createdAt).toDateString();
    const previousDate = new Date(messages[index - 1].createdAt).toDateString();

    return currentDate !== previousDate;
  };

  const formatDateSeparator = (date) => {
    const messageDate = new Date(date);
    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return "Today";
    }

    if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return messageDate.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year:
        messageDate.getFullYear() === today.getFullYear()
          ? undefined
          : "numeric",
    });
  };

  if (!selectedUser) {
    return (
      <section className="chat-window empty-chat">
        <div className="empty-chat-card">
          <div className="empty-chat-icon">
            <ShieldCheck size={34} />
          </div>
          <h2>Welcome to SafeChat AI</h2>
          <p>Select a user to start a secure real-time conversation.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-window">
      <div className="chat-header">
        <div className="chat-user">
          <div className="avatar-wrapper">
            <div className="avatar">
              {selectedUser.username?.charAt(0)?.toUpperCase()}
            </div>
            <span
              className={
                isSelectedUserOnline ? "status-dot online" : "status-dot offline"
              }
            />
          </div>

          <div>
            <h3>{selectedUser.username}</h3>
            <p>{isSelectedUserOnline ? "Online now" : selectedUser.email}</p>
          </div>
        </div>

        <div className="chat-header-actions">
          <div className="chat-security">
            <ShieldCheck size={16} />
            Protected
          </div>
        </div>
      </div>

      <div className="messages-area-wrapper">
        <div
          className="messages-area"
          ref={messagesAreaRef}
          onScroll={handleScroll}
        >
          {messages.length === 0 ? (
            <div className="empty-messages">
              No messages yet. Start the conversation.
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={msg._id}>
                {shouldShowDateSeparator(msg, index) && (
                  <div className="date-separator">
                    <span>{formatDateSeparator(msg.createdAt)}</span>
                  </div>
                )}

                <MessageBubble
                  message={msg}
                  onReply={setReplyMessage}
                  onMessageUpdated={handleMessageUpdated}
                />
              </div>
            ))
          )}

          {typingUser && (
            <div className="typing-indicator">
              <div className="typing-bubble">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {showScrollButton && (
          <button
            className="scroll-bottom-btn"
            onClick={() => scrollToBottom("smooth")}
            type="button"
          >
            {newMessageCount > 0 && (
              <span className="new-message-count">{newMessageCount}</span>
            )}
            <ChevronDown size={19} />
          </button>
        )}
      </div>

      <MessageInput
        activeChat={activeChat}
        selectedUser={selectedUser}
        onMessageSent={handleMessageSent}
        socket={socket}
        replyMessage={replyMessage}
        onCancelReply={() => setReplyMessage(null)}
      />
    </section>
  );
}

export default ChatWindow;