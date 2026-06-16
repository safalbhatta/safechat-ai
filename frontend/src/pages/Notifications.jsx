import { useState } from "react";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  UserPlus,
  Heart,
  AlertCircle,
  Search,
  Settings,
} from "lucide-react";
import { notifications } from "../data/mockData.js";

const iconMap = {
  message: MessageSquare,
  contact: UserPlus,
  reaction: Heart,
  alert: AlertCircle,
};

export default function Notifications() {
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "unread"
      ? notifications.filter((item) => !item.read)
      : notifications;

  return (
    <div className="page-premium h-full overflow-y-auto">
      <div className="page-container">
        <section className="page-hero mb-6">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/16 border border-white/18 text-white/90 text-xs font-black mb-4">
                <Bell size={15} />
                Activity Center
              </div>

              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                Notifications
              </h1>

              <p className="text-indigo-50 mt-3 max-w-2xl leading-7">
                Stay updated with conversations, reactions, contact requests,
                and account activity.
              </p>
            </div>

            <div className="flex gap-2">
              <button className="h-12 px-5 rounded-2xl bg-white/15 border border-white/20 text-white font-black hover:bg-white/20 flex items-center gap-2">
                <Settings size={18} />
                Preferences
              </button>

              <button className="h-12 px-5 rounded-2xl bg-white text-indigo-700 font-black shadow-[0_18px_42px_rgba(0,0,0,0.18)] hover:bg-indigo-50 flex items-center gap-2">
                <CheckCheck size={18} />
                Mark All Read
              </button>
            </div>
          </div>
        </section>

        <section className="page-card rounded-[30px] p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                placeholder="Search notifications..."
                className="input-premium w-full h-13 rounded-2xl pl-12 pr-4"
              />
            </div>

            <div className="flex gap-2">
              {["all", "unread"].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`h-13 px-5 rounded-2xl font-black ${
                    filter === item
                      ? "bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white shadow-[0_12px_28px_rgba(99,102,241,0.25)]"
                      : "bg-white border border-slate-200 text-slate-500 hover:text-indigo-600"
                  }`}
                >
                  {item === "all" ? "All" : "Unread"}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {filtered.map((item) => {
            const Icon = iconMap[item.type] || Bell;

            return (
              <div
                key={item.id}
                className={`page-card page-card-hover rounded-[28px] p-5 flex gap-4 ${
                  !item.read ? "border-indigo-200" : ""
                }`}
              >
                <div
                  className={`icon-tile shrink-0 ${
                    !item.read
                      ? "bg-indigo-50 text-indigo-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon size={22} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div>
                      <h3 className="font-black text-slate-950">
                        {item.title}
                      </h3>
                      <p className="text-slate-500 mt-1 leading-6">
                        {item.message}
                      </p>
                    </div>

                    <span className="text-sm text-slate-400 font-bold whitespace-nowrap">
                      {item.timestamp}
                    </span>
                  </div>
                </div>

                {!item.read && (
                  <div className="w-3 h-3 rounded-full bg-indigo-500 mt-2 shrink-0" />
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
