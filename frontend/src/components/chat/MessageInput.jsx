import { useRef, useState } from "react";
import { Send, Smile, Paperclip, X } from "lucide-react";
import API from "../../services/api";

function MessageInput({
  activeChat,
  selectedUser,
  onMessageSent,
  socket,
  replyMessage,
  onCancelReply,
}) {
  const [text, setText] = useState("");
  const typingTimeoutRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user"));

  const handleTyping = (value) => {
    setText(value);

    if (!selectedUser || !activeChat || !socket) return;

    socket.emit("typing", {
      receiverId: selectedUser._id,
      senderName: user?.username,
      chatId: activeChat._id,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", {
        receiverId: selectedUser._id,
        chatId: activeChat._id,
      });
    }, 1000);
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    if (!activeChat || !selectedUser) return;

    try {
      const res = await API.post("/messages", {
        chatId: activeChat._id,
        receiverId: selectedUser._id,
        text: text.trim(),
        replyTo: replyMessage?._id || null,
      });

      onMessageSent(res.data);
      setText("");

      socket?.emit("stopTyping", {
        receiverId: selectedUser._id,
        chatId: activeChat._id,
      });
    } catch (error) {
      console.log("Send message error:", error);
    }
  };

  return (
    <div className="message-input-shell">
      {replyMessage && (
        <div className="reply-preview">
          <div>
            <strong>Replying to message</strong>
            <p>
              {replyMessage.isDeleted
                ? "This message was deleted"
                : replyMessage.text}
            </p>
          </div>

          <button onClick={onCancelReply} type="button">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="message-input">
        <button className="input-action" type="button">
          <Smile size={20} />
        </button>

        <button className="input-action" type="button">
          <Paperclip size={20} />
        </button>

        <input
          type="text"
          placeholder={replyMessage ? "Write your reply..." : "Write a message..."}
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button className="send-button" type="button" onClick={sendMessage}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

export default MessageInput;