import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import Sidebar from "../components/layout/Sidebar";
import ChatList from "../components/chat/ChatList";
import ChatWindow from "../components/chat/ChatWindow";

function Messenger() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

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

  return (
    <div className="app-container">
      <Sidebar />

      <ChatList
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        setActiveChat={setActiveChat}
        onlineUsers={onlineUsers}
      />

      <ChatWindow
        selectedUser={selectedUser}
        activeChat={activeChat}
        socket={socket}
        onlineUsers={onlineUsers}
      />
    </div>
  );
}

export default Messenger;