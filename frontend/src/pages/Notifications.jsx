import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  Heart,
  Loader2,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useSocket } from "../context/SocketContext.jsx";

const typeOptions = [
  { value: "all", label: "All activity" },
  { value: "message", label: "Messages" },
  { value: "reaction", label: "Reactions" },
  { value: "contact_request", label: "Contact requests" },
  { value: "friend_request_accepted", label: "Friend updates" },
  { value: "account", label: "Account activity" },
];

const preferenceRows = [
  {
    key: "newMessages",
    title: "New messages",
    description: "Direct and group message notifications.",
  },
  {
    key: "reactions",
    title: "Message reactions",
    description: "Activity when someone reacts to your message.",
  },
  {
    key: "contactRequests",
    title: "Contact requests",
    description: "Incoming requests from other SafeChat users.",
  },
  {
    key: "friendUpdates",
    title: "Contact updates",
    description: "Accepted contact requests and related activity.",
  },
  {
    key: "accountActivity",
    title: "Account activity",
    description: "Logins, password changes, and session updates.",
  },
  {
    key: "sound",
    title: "Notification sound",
    description: "Play a short sound while SafeChat is open.",
  },
  {
    key: "desktop",
    title: "Desktop notifications",
    description: "Show a browser notification while this tab is in the background.",
  },
];

const getIcon = (type) => {
  if (type === "message") return MessageSquare;
  if (type === "reaction") return Heart;
  if (type === "contact_request") return UserPlus;
  if (type === "friend_request_accepted") return UserCheck;
  if (type === "account") return ShieldCheck;
  return AlertCircle;
};

const getActorName = (notification) =>
  notification.actorId?.name ||
  notification.actorId?.username ||
  notification.title ||
  "SafeChat AI";

const initials = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "S";

const formatRelativeTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 45) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${seconds < 7200 ? "" : "s"} ago`;
  if (seconds < 172800) return "Yesterday";
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

function Toggle({ checked, disabled = false, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        checked ? "bg-indigo-600" : "bg-slate-200"
      } ${disabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const {
    notifications,
    notificationUnreadCount,
    notificationPreferences,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearReadNotifications,
    saveNotificationPreferences,
  } = useSocket();

  const [filter, setFilter] = useState("all");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [draftPreferences, setDraftPreferences] = useState(notificationPreferences);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setDraftPreferences(notificationPreferences);
  }, [notificationPreferences, preferencesOpen]);

  useEffect(() => {
    markAllNotificationsRead().catch((error) => {
      console.error("Failed to clear notification badge:", error);
    });
  }, [markAllNotificationsRead]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        await loadNotifications({
          filter,
          type,
          search: search.trim(),
          limit: 50,
        });
      } catch (error) {
        console.error("Failed to load notifications:", error);
        setNotice(error.response?.data?.message || "Failed to load notifications");
      } finally {
        setLoading(false);
      }
    }, search ? 300 : 0);

    return () => clearTimeout(timer);
  }, [filter, type, search, loadNotifications]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const displayedNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((item) => {
      if (filter === "unread" && item.isRead) return false;
      if (type !== "all" && item.type !== type) return false;

      if (query) {
        const searchable = `${item.title || ""} ${item.body || ""}`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      return true;
    });
  }, [notifications, filter, type, search]);

  const readCount = useMemo(
    () => notifications.filter((item) => item.isRead).length,
    [notifications]
  );

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await markNotificationRead(notification._id);
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }

    const chatId = notification.chatId?._id || notification.chatId;

    if (
      chatId &&
      ["message", "reaction", "system"].includes(notification.type)
    ) {
      navigate(`/app?chat=${chatId}`);
      return;
    }

    if (notification.type === "contact_request" || notification.type === "friend_request_accepted") {
      navigate("/app/contacts");
      return;
    }

    if (notification.type === "account") {
      navigate("/app/settings");
    }
  };

  const handleDelete = async (event, notificationId) => {
    event.stopPropagation();
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      setNotice(error.response?.data?.message || "Failed to delete notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotice("All notifications marked as read");
    } catch (error) {
      setNotice(error.response?.data?.message || "Failed to update notifications");
    }
  };

  const handleClearRead = async () => {
    try {
      await clearReadNotifications();
      setNotice("Read notifications cleared");
    } catch (error) {
      setNotice(error.response?.data?.message || "Failed to clear notifications");
    }
  };

  const updateDraftPreference = async (key, value) => {
    if (key === "desktop" && value && "Notification" in window) {
      const permission = await window.Notification.requestPermission();
      if (permission !== "granted") {
        setNotice("Desktop notification permission was not granted");
        setDraftPreferences((current) => ({ ...current, desktop: false }));
        return;
      }
    }

    setDraftPreferences((current) => ({ ...current, [key]: value }));
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPreferences(true);
      await saveNotificationPreferences(draftPreferences);
      setPreferencesOpen(false);
      setNotice("Notification preferences saved");
    } catch (error) {
      setNotice(error.response?.data?.message || "Failed to save preferences");
    } finally {
      setSavingPreferences(false);
    }
  };

  return (
    <div className="page-premium h-full overflow-y-auto">
      <div className="page-container pb-28 md:pb-8">
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

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPreferencesOpen(true)}
                className="h-12 px-5 rounded-2xl bg-white/15 border border-white/20 text-white font-black hover:bg-white/20 flex items-center gap-2"
              >
                <Settings size={18} />
                Preferences
              </button>

              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={notificationUnreadCount === 0}
                className="h-12 px-5 rounded-2xl bg-white text-indigo-700 font-black shadow-[0_18px_42px_rgba(0,0,0,0.18)] hover:bg-indigo-50 flex items-center gap-2 disabled:opacity-55 disabled:cursor-not-allowed"
              >
                <CheckCheck size={18} />
                Mark All Read
              </button>
            </div>
          </div>
        </section>

        <section className="page-card rounded-[30px] p-5 mb-6">
          <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notifications..."
                className="input-premium w-full h-13 rounded-2xl pl-12 pr-4"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="input-premium h-13 rounded-2xl px-4 text-slate-600 font-bold"
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                {["all", "unread"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`h-13 px-5 rounded-2xl font-black ${
                      filter === item
                        ? "bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white shadow-[0_12px_28px_rgba(99,102,241,0.25)]"
                        : "bg-white border border-slate-200 text-slate-500 hover:text-indigo-600"
                    }`}
                  >
                    {item === "all" ? "All" : `Unread${notificationUnreadCount ? ` (${notificationUnreadCount})` : ""}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-sm font-bold text-slate-500">
            {displayedNotifications.length} notification{displayedNotifications.length === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            disabled={readCount === 0}
            onClick={handleClearRead}
            className="text-sm font-black text-slate-500 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 size={16} />
            Clear read
          </button>
        </div>

        <section className="space-y-4">
          {loading ? (
            <div className="page-card rounded-[28px] min-h-44 flex items-center justify-center gap-3 text-slate-500 font-bold">
              <Loader2 className="animate-spin" size={22} />
              Loading notifications...
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="page-card rounded-[28px] min-h-64 flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
                <Bell size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900">You are all caught up</h3>
              <p className="text-slate-500 mt-2 max-w-md">
                New messages, reactions, contact requests, and account updates will appear here.
              </p>
            </div>
          ) : (
            displayedNotifications.map((notification) => {
              const Icon = getIcon(notification.type);
              const actorName = getActorName(notification);

              return (
                <article
                  key={notification._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotificationClick(notification)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      handleNotificationClick(notification);
                    }
                  }}
                  className={`page-card page-card-hover rounded-[28px] p-4 md:p-5 flex gap-4 cursor-pointer outline-none focus:ring-4 focus:ring-indigo-100 ${
                    !notification.isRead ? "border-indigo-200 bg-indigo-50/45" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white flex items-center justify-center font-black shadow-[0_10px_24px_rgba(99,102,241,0.20)] overflow-hidden">
                      {notification.actorId?.profilePic ? (
                        <img
                          src={notification.actorId.profilePic}
                          alt={actorName}
                          className="w-full h-full object-cover"
                        />
                      ) : notification.actorId ? (
                        initials(actorName)
                      ) : (
                        <Icon size={22} />
                      )}
                    </div>
                    <span className="absolute -right-1 -bottom-1 w-6 h-6 rounded-lg bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shadow-sm">
                      <Icon size={13} />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-950 truncate">
                          {notification.title}
                        </h3>
                        <p className="text-slate-500 mt-1 leading-6 break-words">
                          {notification.body}
                        </p>
                        {notification.metadata?.isGroupChat && (
                          <span className="inline-flex mt-2 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-black">
                            Group message
                          </span>
                        )}
                      </div>

                      <span className="text-sm text-slate-400 font-bold whitespace-nowrap">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 shrink-0">
                    {!notification.isRead && (
                      <span className="w-3 h-3 rounded-full bg-indigo-500 mt-2" title="Unread" />
                    )}
                    <button
                      type="button"
                      onClick={(event) => handleDelete(event, notification._id)}
                      title="Delete notification"
                      className="w-9 h-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>

      {preferencesOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setPreferencesOpen(false)}
          />
          <div className="relative w-full max-w-xl max-h-[88vh] overflow-y-auto bg-white rounded-[32px] shadow-2xl border border-white p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Notification preferences</h2>
                <p className="text-slate-500 mt-1">Choose which activity appears in your Activity Center.</p>
              </div>
              <button
                type="button"
                onClick={() => setPreferencesOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X size={21} />
              </button>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-black text-slate-950">All notifications</h3>
                <p className="text-sm text-slate-500 mt-1">Turn the complete notification system on or off.</p>
              </div>
              <Toggle
                label="All notifications"
                checked={draftPreferences.enabled !== false}
                onChange={(value) => updateDraftPreference("enabled", value)}
              />
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {preferenceRows.map((row) => (
                <div key={row.key} className="p-4 flex items-center justify-between gap-4 bg-white">
                  <div>
                    <h3 className="font-black text-slate-900">{row.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{row.description}</p>
                  </div>
                  <Toggle
                    label={row.title}
                    checked={draftPreferences[row.key] !== false}
                    disabled={draftPreferences.enabled === false}
                    onChange={(value) => updateDraftPreference(row.key, value)}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreferencesOpen(false)}
                className="h-12 px-5 rounded-2xl border border-slate-200 text-slate-600 font-black hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                className="h-12 px-5 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white font-black shadow-[0_12px_28px_rgba(99,102,241,0.25)] flex items-center gap-2 disabled:opacity-60"
              >
                {savingPreferences ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Save preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed left-1/2 bottom-24 md:bottom-8 -translate-x-1/2 z-[1000000] px-5 py-3 rounded-full bg-slate-900 text-white font-bold shadow-xl">
          {notice}
        </div>
      )}
    </div>
  );
}
