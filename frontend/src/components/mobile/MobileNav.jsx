import { useLocation, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Users,
  Bell,
  BarChart3,
  Settings,
  User,
} from "lucide-react";

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
              onClick={() => navigate(item.path)}
              className={`h-[54px] rounded-2xl flex flex-col items-center justify-center gap-1 ${
                isActive
                  ? "apple-primary"
                  : "text-slate-500 hover:bg-[#F0EDFF] hover:text-[#6366F1]"
              }`}
            >
              <Icon size={19} />
              <span className="text-[10px] font-black">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

