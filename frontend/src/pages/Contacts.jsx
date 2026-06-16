import { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  MoreVertical,
  MessageSquare,
  Phone,
  Video,
  Mail,
  Users,
  Star,
  Filter,
} from "lucide-react";
import api from "../lib/api.js";

function getUserName(user) {
  return user?.username || user?.name || user?.email || "Unknown User";
}

function initials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await api.get("/users");
        setUsers(res.data || []);
      } catch (error) {
        console.error("Failed to load users:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const filteredUsers = users.filter((user) =>
    getUserName(user).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-premium h-full overflow-y-auto">
      <div className="page-container">
        <section className="page-hero mb-6">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/16 border border-white/18 text-white/90 text-xs font-black mb-4">
                <Users size={15} />
                Network Center
              </div>

              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                Contacts
              </h1>

              <p className="text-indigo-50 mt-3 max-w-2xl leading-7">
                Manage your people, start fast conversations, and keep your
                favorite connections close.
              </p>
            </div>

            <button className="h-12 px-5 rounded-2xl bg-white text-indigo-700 font-black shadow-[0_18px_42px_rgba(0,0,0,0.18)] hover:bg-indigo-50 flex items-center gap-2 justify-center">
              <UserPlus size={19} />
              Add Contact
            </button>
          </div>
        </section>

        <section className="page-card rounded-[30px] p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts..."
                className="input-premium w-full h-13 rounded-2xl pl-12 pr-4"
              />
            </div>

            <button className="h-13 px-5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 font-black flex items-center justify-center gap-2">
              <Filter size={18} />
              Filter
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full py-20 flex justify-center text-slate-400 font-bold">
              Loading contacts...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="col-span-full py-20 flex justify-center text-slate-400 font-bold">
              No contacts found.
            </div>
          ) : (
            filteredUsers.map((user, index) => (
              <div
                key={user._id}
                className="page-card page-card-hover rounded-[30px] p-5"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-[#6366F1] via-[#8B5CF6] to-[#06B6D4] text-white flex items-center justify-center text-xl font-black shadow-[0_14px_32px_rgba(99,102,241,0.30)]">
                        {initials(getUserName(user))}
                      </div>

                      <span
                        className={`absolute -right-1 -bottom-1 w-5 h-5 rounded-full border-3 border-white ${
                          user.isOnline ? "bg-emerald-400" : "bg-slate-300"
                        }`}
                      />
                    </div>

                    <div>
                      <h3 className="font-black text-lg text-slate-950">
                        {getUserName(user)}
                      </h3>
                      <p className="text-sm text-slate-500 font-bold">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <button className="w-10 h-10 rounded-2xl hover:bg-slate-100 text-slate-400 flex items-center justify-center">
                    <MoreVertical size={19} />
                  </button>
                </div>

                <p className="text-slate-500 text-sm leading-6 mb-5">
                  {user.bio ||
                    "Available for fast messaging, collaboration, and updates."}
                </p>

                <div className="flex items-center gap-2 mb-5">
                  <span
                    className={`pill-soft ${
                      user.isOnline
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {user.isOnline ? "online" : "offline"}
                  </span>

                  {index < 2 && (
                    <span className="pill-soft bg-indigo-50 text-indigo-600 inline-flex items-center gap-1">
                      <Star size={13} fill="currentColor" />
                      Favorite
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[MessageSquare, Phone, Video, Mail].map((Icon, i) => (
                    <button
                      key={i}
                      className="h-11 rounded-2xl bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center"
                    >
                      <Icon size={18} />
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
