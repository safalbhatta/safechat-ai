import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const currentUserId = user?._id || user?.id;

    if (!currentUserId) return;

    const newSocket = io(
      import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:5002",
      {
        transports: ["websocket", "polling"],
      }
    );

    newSocket.on("connect", () => {
      newSocket.emit("addUser", currentUserId);
    });

    newSocket.on("getOnlineUsers", (users) => {
      setOnlineUsers(users);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}
