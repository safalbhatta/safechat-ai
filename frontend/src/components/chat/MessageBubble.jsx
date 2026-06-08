import { Check, CheckCheck } from "lucide-react";

function MessageBubble({ message }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const isMe = message.senderId === user?._id;

  return (
    <div className={`message ${isMe ? "sent" : "received"}`}>
      <span>{message.text}</span>

      {isMe && (
        <small className="message-status">
          {message.isViewed ? <CheckCheck size={14} /> : <Check size={14} />}
        </small>
      )}
    </div>
  );
}

export default MessageBubble;