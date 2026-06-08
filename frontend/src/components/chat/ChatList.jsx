import { useEffect, useState } from "react";
import ChatCard from "./ChatCard";
import API from "../../services/api";

function ChatList({ selectedUser, setSelectedUser, setActiveChat, onlineUsers }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await API.get("/users");
      setUsers(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h2>Chats</h2>
        <input className="search-input" placeholder="Search..." />
      </div>

      {users.map((user) => (
        <ChatCard
          key={user._id}
          chat={user}
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
          setActiveChat={setActiveChat}
          isOnline={onlineUsers.includes(user._id)}
        />
      ))}
    </div>
  );
}

export default ChatList;