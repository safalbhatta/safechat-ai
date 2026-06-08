import API from "../../services/api";

function ChatCard({ chat, selectedUser, setSelectedUser, setActiveChat, isOnline }) {
  const handleClick = async () => {
    try {
      setSelectedUser(chat);

      const res = await API.post("/chats", {
        receiverId: chat._id,
      });

      setActiveChat(res.data);
    } catch (error) {
      console.log("Create chat error:", error);
    }
  };

  return (
    <div
      className={selectedUser?._id === chat._id ? "chat-card active-chat" : "chat-card"}
      onClick={handleClick}
    >
      <div className="avatar-wrapper">
        <div className="avatar">{chat.username?.charAt(0)}</div>
        <span className={isOnline ? "status-dot online" : "status-dot offline"}></span>
      </div>

      <div className="chat-details">
        <h4>{chat.username}</h4>
        <p>{isOnline ? "Online" : "Offline"}</p>
      </div>
    </div>
  );
}

export default ChatCard;