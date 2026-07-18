import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MessageSquare,
  Archive,
  Users,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext.jsx";

const navItems = [
  { icon: MessageSquare, label: "Chats", path: "/app" },
  { icon: Archive, label: "Archived", path: "/app?filter=archived" },
  { icon: Users, label: "Contacts", path: "/app/contacts" },
  { icon: Bell, label: "Alerts", path: "/app/notifications" },
  { icon: User, label: "Profile", path: "/app/profile" },
  { icon: BarChart3, label: "Stats", path: "/app/analytics" },
  { icon: Settings, label: "Settings", path: "/app/settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notificationUnreadCount, markAllNotificationsRead } = useSocket();
  const [user, setUser] = useState(JSON.parse(sessionStorage.getItem("user") || "{}"));
  
  useEffect(() => {
    const handleUserUpdated = () => {
      setUser(JSON.parse(sessionStorage.getItem("user") || "{}"));
    };
    window.addEventListener("userUpdated", handleUserUpdated);
    return () => window.removeEventListener("userUpdated", handleUserUpdated);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <aside className="apple-sidebar w-[92px] h-full rounded-[32px] flex flex-col items-center py-5">
      <button
        onClick={() => navigate("/app")}
        title="Chater"
        className="apple-primary w-14 h-14 rounded-[22px] flex items-center justify-center mb-7"
      >
        <MessageSquare size={27} />
      </button>

      <nav className="flex-1 flex flex-col gap-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
  item.path === "/app"
    ? location.pathname === "/app" && location.search !== "?filter=archived"
    : item.path === "/app?filter=archived"
    ? location.pathname === "/app" && location.search === "?filter=archived"
    : location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              onClick={async () => {
                if (item.path === "/app/notifications") {
                  try {
                    await markAllNotificationsRead();
                  } catch (error) {
                    console.error("Failed to clear notification badge:", error);
                  }
                }

                navigate(item.path);
              }}
              title={item.label}
              className={`relative w-13 h-13 rounded-[20px] flex items-center justify-center ${
                isActive
                  ? "apple-primary"
                  : "text-slate-500 hover:text-[#6366F1] hover:bg-white/82"
              }`}
            >
              {isActive && (
                <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-7 rounded-full bg-[#6366F1]" />
              )}
              <Icon size={22} />
              {item.path === "/app/notifications" && notificationUnreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                  {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        title="Logout"
        className="w-13 h-13 rounded-[20px] flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50"
      >
        <LogOut size={22} />
      </button>
    </aside>
  );
}
