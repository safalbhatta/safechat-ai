import { useState } from "react";
import {
  Check,
  CheckCheck,
  Flag,
  X,
  Reply,
  Copy,
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import API from "../../services/api";

function MessageBubble({ message, onReply, onMessageUpdated }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const isMe = message.senderId === user?._id;

  const [showActions, setShowActions] = useState(false);
  const [showFlagBox, setShowFlagBox] = useState(false);
  const [flagCategory, setFlagCategory] = useState("Spam");
  const [flagReason, setFlagReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");

  const isFlagged = message.isFlagged === true;
  const isDeleted = message.isDeleted === true;

  const formatMessageTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyMessage = async () => {
    if (isDeleted) return;

    try {
      await navigator.clipboard.writeText(message.text);
      setShowActions(false);
    } catch (error) {
      console.log("Copy message error:", error);
    }
  };

  const submitEdit = async () => {
    if (!editText.trim()) return;

    try {
      const res = await API.patch(`/messages/${message._id}/edit`, {
        text: editText.trim(),
      });

      onMessageUpdated(res.data, true);
      setIsEditing(false);
      setShowActions(false);
    } catch (error) {
      console.log("Edit message error:", error);
    }
  };

  const deleteMessage = async () => {
    try {
      const res = await API.patch(`/messages/${message._id}/delete`);

      onMessageUpdated(res.data, true);
      setShowActions(false);
    } catch (error) {
      console.log("Delete message error:", error);
    }
  };

  const submitFlag = async () => {
    try {
      const res = await API.patch(`/messages/${message._id}/flag`, {
        flagCategory,
        flagReason,
      });

      onMessageUpdated(res.data, true);
      setShowFlagBox(false);
      setShowActions(false);
      setFlagReason("");
    } catch (error) {
      console.log("Flag message error:", error);
    }
  };

  const getStatusTitle = () => {
    if (!isMe) return "";
    return message.isViewed ? "Seen" : "Sent";
  };

  return (
    <div className={`message-row ${isMe ? "message-row-sent" : "message-row-received"}`}>
      <div className={`message-stack ${isMe ? "message-stack-sent" : ""}`}>
        {isFlagged && (
          <div className="manual-flag-badge">
            <Flag size={13} />
            Flagged: {message.flagCategory}
          </div>
        )}

        <div className="message-action-wrapper">
          <div
            className={`message ${isMe ? "sent" : "received"} ${
              isFlagged ? "flagged-message" : ""
            } ${isDeleted ? "deleted-message" : ""}`}
          >
            {message.replyTo && (
              <div className="message-reply-preview">
                <strong>Reply</strong>
                <span>
                  {message.replyTo.isDeleted
                    ? "This message was deleted"
                    : message.replyTo.text}
                </span>
              </div>
            )}

            {isEditing ? (
              <div className="edit-message-box">
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  autoFocus
                />

                <div className="edit-actions">
                  <button onClick={() => setIsEditing(false)} type="button">
                    Cancel
                  </button>

                  <button onClick={submitEdit} type="button">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="message-text">
                  {isDeleted ? "This message was deleted" : message.text}
                </span>

                {isFlagged && message.flagReason && (
                  <span className="inline-flag-reason">
                    Reason: {message.flagReason}
                  </span>
                )}
              </>
            )}

            <div className="message-footer">
              {message.isEdited && !isDeleted && (
                <span className="edited-label">edited</span>
              )}

              <span className="message-time">
                {formatMessageTime(message.createdAt)}
              </span>

              {isMe && (
                <span
                  className={message.isViewed ? "message-status seen" : "message-status"}
                  title={getStatusTitle()}
                >
                  {message.isViewed ? <CheckCheck size={15} /> : <Check size={15} />}
                </span>
              )}
            </div>
          </div>

          <button
            className="message-more-btn"
            onClick={() => setShowActions((prev) => !prev)}
            type="button"
          >
            <MoreHorizontal size={17} />
          </button>

          {showActions && (
            <div className={isMe ? "message-actions sent-actions" : "message-actions"}>
              {!isDeleted && (
                <button onClick={() => onReply(message)} type="button">
                  <Reply size={14} />
                  Reply
                </button>
              )}

              {!isDeleted && (
                <button onClick={copyMessage} type="button">
                  <Copy size={14} />
                  Copy
                </button>
              )}

              {isMe && !isDeleted && (
                <button onClick={() => setIsEditing(true)} type="button">
                  <Pencil size={14} />
                  Edit
                </button>
              )}

              {isMe && !isDeleted && (
                <button onClick={deleteMessage} type="button">
                  <Trash2 size={14} />
                  Delete
                </button>
              )}

              {!isDeleted && !isFlagged && (
                <button onClick={() => setShowFlagBox(true)} type="button">
                  <Flag size={14} />
                  Flag
                </button>
              )}
            </div>
          )}
        </div>

        {showFlagBox && (
          <div className="flag-box">
            <div className="flag-box-header">
              <strong>Flag this message</strong>

              <button onClick={() => setShowFlagBox(false)} type="button">
                <X size={15} />
              </button>
            </div>

            <select
              value={flagCategory}
              onChange={(e) => setFlagCategory(e.target.value)}
            >
              <option value="Spam">Spam</option>
              <option value="Harassment">Harassment</option>
              <option value="Hate Speech">Hate Speech</option>
              <option value="Threat">Threat</option>
              <option value="Scam">Scam</option>
              <option value="Other">Other</option>
            </select>

            <textarea
              placeholder="Optional reason..."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
            />

            <button className="submit-flag-btn" onClick={submitFlag} type="button">
              Submit Flag
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;