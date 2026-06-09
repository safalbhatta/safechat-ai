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
    <button
      className={selectedUser?._id === chat._id ? "chat-card active-chat" : "chat-card"}
      onClick={handleClick}
    >
      <div className="avatar-wrapper">
        <div className="avatar">{chat.username?.charAt(0)}</div>
        <span className={isOnline ? "status-dot online" : "status-dot offline"}></span>
      </div>

      <div className="chat-details">
        <div className="chat-row">
          <h4>{chat.username}</h4>
          <small>{isOnline ? "Online" : "Offline"}</small>
        </div>
        <p>{chat.email}</p>
      </div>
    </button>
  );
}

export default ChatCard;