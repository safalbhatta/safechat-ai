import { useLocation, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Users,
  Bell,
  BarChart3,
  Settings,
  User,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext.jsx";

const navItems = [
  { icon: MessageSquare, label: "Chats", path: "/app" },
  { icon: Users, label: "People", path: "/app/contacts" },
  { icon: Bell, label: "Alerts", path: "/app/notifications" },
  { icon: User, label: "Me", path: "/app/profile" },
  { icon: BarChart3, label: "Stats", path: "/app/analytics" },
  { icon: Settings, label: "More", path: "/app/settings" },
];

export default function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notificationUnreadCount, markAllNotificationsRead } = useSocket();

  return (
    <nav className="md:hidden fixed bottom-3 left-3 right-3 z-50 rounded-[28px] bg-white/82 backdrop-blur-2xl border border-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.14)] px-2 py-2">
      <div className="grid grid-cols-6 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === "/app"
              ? location.pathname === "/app"
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
              className={`h-[54px] rounded-2xl flex flex-col items-center justify-center gap-1 ${
                isActive
                  ? "apple-primary"
                  : "text-slate-500 hover:bg-[#F0EDFF] hover:text-[#6366F1]"
              }`}
            >
              <span className="relative">
                <Icon size={19} />
                {item.path === "/app/notifications" && notificationUnreadCount > 0 && (
                  <span className="absolute -right-3 -top-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center border border-white">
                    {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-black">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
