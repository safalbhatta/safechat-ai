import { MessageCircle, Users, Settings, LogOut } from "lucide-react";

function Sidebar() {
  return (
    <div className="sidebar">
      <div>
        <div className="profile-avatar">A</div>

        <button className="sidebar-icon active">
          <MessageCircle size={22} />
        </button>

        <button className="sidebar-icon">
          <Users size={22} />
        </button>

        <button className="sidebar-icon">
          <Settings size={22} />
        </button>
      </div>

      <button className="sidebar-icon">
        <LogOut size={22} />
      </button>
    </div>
  );
}

export default Sidebar;