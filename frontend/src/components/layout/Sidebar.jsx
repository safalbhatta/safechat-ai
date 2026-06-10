import {
  MessageCircle,
  Users,
  Settings,
  LogOut,
  Shield,
  Flag,
} from "lucide-react";

function Sidebar({ onOpenProfile, onOpenModeration }) {
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <Shield size={22} />
        </div>

        <button
          className="profile-avatar profile-avatar-button"
          onClick={onOpenProfile}
          title="Open profile"
        >
          {user?.username?.charAt(0)?.toUpperCase() || "U"}
        </button>

        <div className="sidebar-menu">
          <button className="sidebar-icon active" title="Chats">
            <MessageCircle size={21} />
          </button>

          <button className="sidebar-icon" title="Users">
            <Users size={21} />
          </button>

          <button
            className="sidebar-icon"
            title="Flagged Messages"
            onClick={onOpenModeration}
          >
            <Flag size={21} />
          </button>

          <button className="sidebar-icon" title="Security">
            <Shield size={21} />
          </button>

          <button className="sidebar-icon" title="Settings">
            <Settings size={21} />
          </button>
        </div>
      </div>

      <button className="sidebar-icon logout" onClick={handleLogout} title="Logout">
        <LogOut size={21} />
      </button>
    </aside>
  );
}

export default Sidebar;