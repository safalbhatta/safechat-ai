import { useState } from "react";
import { Send, Smile, Paperclip } from "lucide-react";
import API from "../../services/api";

function MessageInput({ activeChat, selectedUser, onMessageSent, socket }) {
  const [text, setText] = useState("");
  const user = JSON.parse(localStorage.getItem("user"));

  const handleTyping = (value) => {
    setText(value);
    if (!selectedUser || !activeChat) return;

    socket?.emit("typing", {
      receiverId: selectedUser._id,
      senderName: user.username,
      chatId: activeChat._id,
    });

    clearTimeout(window.typingTimeout);

    window.typingTimeout = setTimeout(() => {
      socket?.emit("stopTyping", {
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
        text,
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
    <div className="message-input">
      <button className="input-action"><Smile size={20} /></button>
      <button className="input-action"><Paperclip size={20} /></button>

      <input
        type="text"
        placeholder="Write a message..."
        value={text}
        onChange={(e) => handleTyping(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
      />

      <button className="send-button" onClick={sendMessage}>
        <Send size={18} />
      </button>
    </div>
  );
}

export default MessageInput;