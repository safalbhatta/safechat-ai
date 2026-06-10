import { useState } from "react";
import {
  Archive,
  BellOff,
  Eraser,
  MoreVertical,
  Pin,
  Trash2,
  Undo2,
  Volume2,
} from "lucide-react";
import API from "../../services/api";

function ChatCard({
  chat,
  existingChat,
  selectedUser,
  setSelectedUser,
  setActiveChat,
  clearUnreadForChat,
  onChatAction,
  isOnline,
}) {
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = async () => {
    try {
      setSelectedUser(chat);

      const res = await API.post("/chats", {
        receiverId: chat._id,
      });

      setActiveChat(res.data);

      if (res.data?._id) {
        clearUnreadForChat(res.data._id);
      }
    } catch (error) {
      console.log("Create chat error:", error);
    }
  };

  const handleAction = async (event, action) => {
    event.stopPropagation();

    if (!existingChat?._id) {
      setShowMenu(false);
      return;
    }

    await onChatAction(action, existingChat._id);
    setShowMenu(false);
  };

  const formatChatTime = (date) => {
    if (!date) return "";

    const messageDate = new Date(date);
    const now = new Date();

    const isToday = messageDate.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    const isYesterday = messageDate.toDateString() === yesterday.toDateString();

    if (isToday) {
      return messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    if (isYesterday) {
      return "Yesterday";
    }

    return messageDate.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  const isActive = selectedUser?._id === chat._id;
  const previewText = existingChat?.lastMessage || chat.email;
  const unreadCount = existingChat?.unreadCount || 0;
  const lastTime = formatChatTime(existingChat?.updatedAt);

  return (
    <button
      className={isActive ? "chat-card active-chat" : "chat-card"}
      onClick={handleClick}
    >
      <div className="avatar-wrapper">
        <div className="avatar">{chat.username?.charAt(0)?.toUpperCase()}</div>
        <span className={isOnline ? "status-dot online" : "status-dot offline"} />
      </div>

      <div className="chat-details">
        <div className="chat-row">
          <div className="chat-name-row">
            <h4>{chat.username}</h4>

            {existingChat?.isPinned && <Pin size={13} className="chat-mini-icon" />}
            {existingChat?.isMuted && (
              <BellOff size={13} className="chat-mini-icon" />
            )}
          </div>

          <div className="chat-meta-right">
            {lastTime && <span className="chat-time">{lastTime}</span>}

            {unreadCount > 0 && !isActive && (
              <span className="unread-badge">{unreadCount}</span>
            )}

            {existingChat && (
              <button
                className="chat-more-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowMenu((prev) => !prev);
                }}
                type="button"
              >
                <MoreVertical size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="chat-preview-row">
          <p className={unreadCount > 0 && !isActive ? "unread-preview" : ""}>
            {previewText}
          </p>

          <span className={isOnline ? "mini-status online-text" : "mini-status"}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        {showMenu && existingChat && (
          <div className="chat-action-menu" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(event) => handleAction(event, "toggle-pin")}
              type="button"
            >
              <Pin size={14} />
              {existingChat.isPinned ? "Unpin chat" : "Pin chat"}
            </button>

            <button
              onClick={(event) => handleAction(event, "toggle-mute")}
              type="button"
            >
              {existingChat.isMuted ? <Volume2 size={14} /> : <BellOff size={14} />}
              {existingChat.isMuted ? "Unmute chat" : "Mute chat"}
            </button>

            <button
              onClick={(event) =>
                handleAction(
                  event,
                  existingChat.isArchived ? "unarchive" : "archive"
                )
              }
              type="button"
            >
              {existingChat.isArchived ? (
                <Undo2 size={14} />
              ) : (
                <Archive size={14} />
              )}
              {existingChat.isArchived ? "Unarchive chat" : "Archive chat"}
            </button>

            <button
              onClick={(event) => handleAction(event, "clear")}
              type="button"
            >
              <Eraser size={14} />
              Clear chat
            </button>

            <button
              className="danger"
              onClick={(event) => handleAction(event, "delete-for-me")}
              type="button"
            >
              <Trash2 size={14} />
              Delete chat
            </button>
          </div>
        )}
      </div>
    </button>
  );
}

export default ChatCard;