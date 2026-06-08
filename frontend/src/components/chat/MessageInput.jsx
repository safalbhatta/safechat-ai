import { useState } from "react";
import { Send } from "lucide-react";
import API from "../../services/api";

function MessageInput({ activeChat, selectedUser, onMessageSent, socket }) {
  const [text, setText] = useState("");
  const user = JSON.parse(localStorage.getItem("user"));

  const handleTyping = (value) => {
    setText(value);

    if (!selectedUser) return;

    socket?.emit("typing", {
      receiverId: selectedUser._id,
      senderName: user.username,
    });

    clearTimeout(window.typingTimeout);

    window.typingTimeout = setTimeout(() => {
      socket?.emit("stopTyping", {
        receiverId: selectedUser._id,
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
      });
    } catch (error) {
      console.log("Send message error:", error);
    }
  };

  return (
    <div className="message-input">
      <input
        type="text"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => handleTyping(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
      />

      <button onClick={sendMessage}>
        <Send size={18} />
      </button>
    </div>
  );
}

export default MessageInput;