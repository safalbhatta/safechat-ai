import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import Sidebar from "../components/layout/Sidebar";
import ChatList from "../components/chat/ChatList";
import ChatWindow from "../components/chat/ChatWindow";
import ProfileModal from "../components/user/ProfileModal";
import ModerationDashboard from "../components/moderation/ModerationDashboard";

function Messenger() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [latestMessage, setLatestMessage] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showModerationDashboard, setShowModerationDashboard] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!user?._id) return;

    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("addUser", user._id);
    });

    newSocket.on("getOnlineUsers", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user?._id]);

  const handleChatActivity = (message) => {
    setLatestMessage({
      ...message,
      eventId: Date.now(),
    });
  };

  return (
    <div className="messenger-page">
      <div className="messenger-shell">
        <Sidebar
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenModeration={() => setShowModerationDashboard(true)}
        />

        <ChatList
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          onlineUsers={onlineUsers}
          latestMessage={latestMessage}
        />

        <ChatWindow
          selectedUser={selectedUser}
          activeChat={activeChat}
          socket={socket}
          onlineUsers={onlineUsers}
          onChatActivity={handleChatActivity}
        />
      </div>

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {showModerationDashboard && (
        <ModerationDashboard onClose={() => setShowModerationDashboard(false)} />
      )}
    </div>
  );
}

export default Messenger;