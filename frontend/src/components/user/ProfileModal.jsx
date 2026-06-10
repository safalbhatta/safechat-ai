import { X, Mail, User, ShieldCheck, LogOut, IdCard } from "lucide-react";

function ProfileModal({ onClose }) {
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal">
        <div className="profile-modal-header">
          <div>
            <span className="eyebrow">Account</span>
            <h2>My Profile</h2>
          </div>

          <button className="profile-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="profile-main">
          <div className="profile-big-avatar">
            {user?.username?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <h3>{user?.username || "User"}</h3>
          <p>{user?.email || "No email found"}</p>

          <div className="profile-status">
            <ShieldCheck size={16} />
            Protected SafeChat AI account
          </div>
        </div>

        <div className="profile-info-list">
          <div className="profile-info-item">
            <div className="profile-info-icon">
              <User size={18} />
            </div>

            <div>
              <span>Username</span>
              <p>{user?.username || "Unknown"}</p>
            </div>
          </div>

          <div className="profile-info-item">
            <div className="profile-info-icon">
              <Mail size={18} />
            </div>

            <div>
              <span>Email</span>
              <p>{user?.email || "Unknown"}</p>
            </div>
          </div>

          <div className="profile-info-item">
            <div className="profile-info-icon">
              <IdCard size={18} />
            </div>

            <div>
              <span>User ID</span>
              <p>{user?._id || "Unknown"}</p>
            </div>
          </div>
        </div>

        <button className="profile-logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}

export default ProfileModal;