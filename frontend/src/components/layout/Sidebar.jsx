import { MessageCircle, Users, Settings, LogOut, Shield } from "lucide-react";

function Sidebar() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="profile-avatar">{user?.username?.charAt(0) || "U"}</div>

        <button className="sidebar-icon active"><MessageCircle size={22} /></button>
        <button className="sidebar-icon"><Users size={22} /></button>
        <button className="sidebar-icon"><Shield size={22} /></button>
        <button className="sidebar-icon"><Settings size={22} /></button>
      </div>

      <button
        className="sidebar-icon logout"
        onClick={() => {
          localStorage.removeItem("user");
          window.location.href = "/";
        }}
      >
        <LogOut size={22} />
      </button>
    </aside>
  );
}

export default Sidebar;