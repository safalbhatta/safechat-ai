import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import API from "../../services/api";

function ChatWindow({ selectedUser, activeChat, socket }) {
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
  setTypingUser("");

  if (activeChat?._id) {
    fetchMessages();
  } else {
    setMessages([]);
  }
}, [activeChat, selectedUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      if (message.chatId === activeChat?._id) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === message._id);
          return exists ? prev : [...prev, message];
        });

        socket.emit("messagesSeen", {
          receiverId: message.senderId,
          chatId: message.chatId,
        });
      }
    };

    const handleMessagesSeen = ({ chatId }) => {
      if (chatId === activeChat?._id) {
        setMessages((prev) =>
          prev.map((msg) => ({ ...msg, isViewed: true }))
        );
      }
    };

    const handleTyping = (senderName) => {
      setTypingUser(senderName);
    };

    const handleStopTyping = () => {
      setTypingUser("");
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [socket, activeChat]);

  const fetchMessages = async () => {
    try {
      const res = await API.get(`/messages/${activeChat._id}`);
      setMessages(res.data);

      const currentUser = JSON.parse(localStorage.getItem("user"));

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

  const handleMessageSent = (newMessage) => {
    setMessages((prev) => [...prev, newMessage]);

    socket?.emit("sendMessage", {
      receiverId: selectedUser._id,
      message: newMessage,
    });

    socket?.emit("stopTyping", {
      receiverId: selectedUser._id,
    });
  };

  if (!selectedUser) {
    return (
      <div className="chat-window empty-chat">
        <h2>Welcome to SafeChat</h2>
        <p>Select a user from the left side to start messaging.</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-user">
          <div className="avatar">{selectedUser.username?.charAt(0)}</div>
          <div>
            <h3>{selectedUser.username}</h3>
            <p>{selectedUser.email}</p>
          </div>
        </div>
      </div>

      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="empty-messages">
            No messages yet. Start the conversation.
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg._id} message={msg} />)
        )}

        {typingUser && (
          <div className="typing-indicator">
            <div className="typing-bubble">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={bottomRef}></div>
      </div>

      <MessageInput
        activeChat={activeChat}
        selectedUser={selectedUser}
        onMessageSent={handleMessageSent}
        socket={socket}
      />
    </div>
  );
}

export default ChatWindow;