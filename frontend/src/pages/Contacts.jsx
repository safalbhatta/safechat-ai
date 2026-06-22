import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  UserPlus,
  MessageSquare,
  Users,
  X,
  Loader2,
  Sparkles,
  Globe,
  Bell
} from "lucide-react";
import api from "../lib/api.js";
import { useSocket } from "../context/SocketContext.jsx";

function getUserName(user) {
  return user?.name || user?.username || user?.email || "Unknown User";
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
  const [suggestions, setSuggestions] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const { socket: globalSocket, onlineUsers } = useSocket();
  const navigate = useNavigate();

  // Tab State: 'friends', 'online', 'suggestions'
  const [activeTab, setActiveTab] = useState("friends");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalResults, setModalResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notice, setNotice] = useState("");

  const loadData = async () => {
    try {
      const [usersRes, suggRes, reqsRes] = await Promise.all([
        api.get("/users"),
        api.get("/users/suggestions").catch(() => ({ data: [] })),
        api.get("/users/requests").catch(() => ({ data: { incoming: [], outgoing: [] } }))
      ]);
      setUsers(usersRes.data || []);
      setSuggestions(suggRes.data || []);
      setFriendRequests(reqsRes.data || { incoming: [], outgoing: [] });
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (globalSocket) {
      globalSocket.on("userProfileUpdated", loadData);
      globalSocket.on("friendRequestReceived", loadData);
      globalSocket.on("friendRequestAccepted", loadData);
      return () => {
        globalSocket.off("userProfileUpdated", loadData);
        globalSocket.off("friendRequestReceived", loadData);
        globalSocket.off("friendRequestAccepted", loadData);
      };
    }
  }, [globalSocket]);

  useEffect(() => {
    if (modalSearch.trim().length >= 1) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        api.get(`/users/search?query=${modalSearch}`)
          .then(res => setModalResults(res.data || []))
          .catch(err => console.error(err))
          .finally(() => setIsSearching(false));
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setModalResults([]);
      setIsSearching(false);
    }
  }, [modalSearch]);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  };

  const handleSendRequest = async (userId) => {
    try {
      await api.post(`/users/request`, { targetUserId: userId });
      showNotice("Friend request sent!");
      loadData();
      setShowAddModal(false);
      setModalSearch("");
    } catch (error) {
      showNotice(error.response?.data?.message || "Failed to send request");
    }
  };

  const handleAcceptRequest = async (userId) => {
    try {
      await api.post(`/users/request/accept`, { requesterId: userId });
      showNotice("Friend request accepted!");
      loadData();
    } catch (error) {
      showNotice(error.response?.data?.message || "Failed to accept request");
    }
  };

  const handleDeclineRequest = async (userId) => {
    try {
      await api.post(`/users/request/decline`, { requesterId: userId });
      showNotice("Friend request declined!");
      loadData();
    } catch (error) {
      showNotice(error.response?.data?.message || "Failed to decline request");
    }
  };

  const filteredUsers = users.filter((user) =>
    getUserName(user).toLowerCase().includes(search.toLowerCase())
  );

  const onlineFriends = filteredUsers.filter(u => 
    onlineUsers.includes(u._id) && u?.privacy?.lastSeen !== "Nobody"
  );

  const renderUserCard = (rawUser, type = "friend") => {
    const isOnline = onlineUsers.includes(rawUser._id) && rawUser?.privacy?.lastSeen !== "Nobody";
    const user = { ...rawUser, isOnline };

    return (
      <div key={user._id} className="page-card page-card-hover rounded-[30px] p-5 flex flex-col h-full bg-white/60 backdrop-blur-md">
        <div className="flex items-start justify-between mb-4 w-full">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-[#6366F1] via-[#8B5CF6] to-[#06B6D4] text-white flex items-center justify-center text-xl font-black shadow-lg">
                {initials(getUserName(user))}
              </div>
              <span className={`absolute -right-1 -bottom-1 w-4 h-4 rounded-full border-2 border-white ${user.isOnline ? "bg-emerald-400" : "bg-slate-300"}`} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-black text-lg text-slate-950 truncate">{getUserName(user)}</h3>
              <p className="text-sm text-slate-500 font-bold truncate">{user.username ? `@${user.username}` : user.email}</p>
            </div>
          </div>
        </div>

        <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-1">
          {user.bio || "Available for fast messaging and updates."}
        </p>

        {type === "friend" && (
          <button 
            onClick={() => navigate("/app")}
            className="w-full h-11 rounded-xl bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 flex items-center justify-center gap-2 transition-colors"
          >
            <MessageSquare size={18} /> Message
          </button>
        )}

        {type === "suggestion" && (
          <button 
            onClick={() => handleSendRequest(user._id)}
            className="w-full h-11 rounded-xl bg-emerald-50 text-emerald-600 font-bold hover:bg-emerald-100 flex items-center justify-center gap-2 transition-colors"
          >
            <UserPlus size={18} /> Add Friend
          </button>
        )}

        {type === "incoming" && (
          <div className="flex items-center gap-2 mt-auto">
            <button 
              onClick={() => handleAcceptRequest(user._id)}
              className="flex-1 h-11 rounded-xl bg-emerald-50 text-emerald-600 font-bold hover:bg-emerald-100 flex items-center justify-center transition-colors"
            >
              Accept
            </button>
            <button 
              onClick={() => handleDeclineRequest(user._id)}
              className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              Decline
            </button>
          </div>
        )}

        {type === "outgoing" && (
          <div className="w-full h-11 rounded-xl bg-slate-50 text-slate-400 font-bold flex items-center justify-center gap-2 cursor-not-allowed">
            Request Pending
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-premium h-full flex flex-col lg:flex-row overflow-hidden">
      
      {/* Sidebar for Navigation (Facebook style) */}
      <aside className="w-full lg:w-[320px] lg:border-r border-slate-200/60 bg-slate-50/50 lg:bg-transparent shrink-0 flex flex-col">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">Friends</h1>
          </div>

          <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${
                activeTab === "friends" 
                  ? "bg-white text-indigo-600 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100" 
                  : "text-slate-600 hover:bg-slate-100/80"
              }`}
            >
              <Users size={20} className={activeTab === "friends" ? "text-indigo-600" : "text-slate-400"} />
              All Friends
              {users.length > 0 && <span className="ml-auto text-xs font-black bg-slate-100 text-slate-500 py-1 px-2.5 rounded-full">{users.length}</span>}
            </button>

            <button
              onClick={() => setActiveTab("online")}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${
                activeTab === "online" 
                  ? "bg-white text-emerald-600 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100" 
                  : "text-slate-600 hover:bg-slate-100/80"
              }`}
            >
              <Globe size={20} className={activeTab === "online" ? "text-emerald-600" : "text-slate-400"} />
              Online Now
              {onlineFriends.length > 0 && <span className="ml-auto text-xs font-black bg-emerald-100 text-emerald-600 py-1 px-2.5 rounded-full">{onlineFriends.length}</span>}
            </button>

            <button
              onClick={() => setActiveTab("suggestions")}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${
                activeTab === "suggestions" 
                  ? "bg-white text-amber-600 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100" 
                  : "text-slate-600 hover:bg-slate-100/80"
              }`}
            >
              <Sparkles size={20} className={activeTab === "suggestions" ? "text-amber-500" : "text-slate-400"} />
              Suggestions
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${
                activeTab === "requests" 
                  ? "bg-white text-rose-600 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100" 
                  : "text-slate-600 hover:bg-slate-100/80"
              }`}
            >
              <Bell size={20} className={activeTab === "requests" ? "text-rose-500" : "text-slate-400"} />
              Friend Requests
              {friendRequests.incoming.length > 0 && <span className="ml-auto text-xs font-black bg-rose-100 text-rose-600 py-1 px-2.5 rounded-full">{friendRequests.incoming.length}</span>}
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 hidden lg:block">
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full h-12 rounded-2xl bg-indigo-600 text-white font-black shadow-[0_12px_24px_rgba(79,70,229,0.25)] hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all"
          >
            <UserPlus size={19} /> Add Friend
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-white/40 p-6 lg:p-10 relative">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-black text-slate-900 capitalize">
              {activeTab === "friends" && "Your Friends"}
              {activeTab === "online" && "Online Friends"}
              {activeTab === "suggestions" && "Suggested For You"}
              {activeTab === "requests" && "Friend Requests"}
            </h2>

            {/* Mobile Add Friend Button */}
            <button 
              onClick={() => setShowAddModal(true)}
              className="lg:hidden w-full md:w-auto h-12 px-6 rounded-2xl bg-indigo-600 text-white font-black shadow-[0_12px_24px_rgba(79,70,229,0.25)] hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <UserPlus size={19} /> Add Friend
            </button>

            {activeTab !== "suggestions" && (
              <div className="relative w-full md:w-72">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search friends..."
                  className="w-full h-11 bg-white border border-slate-200 rounded-2xl pl-11 pr-4 focus:outline-none focus:border-indigo-400 transition-colors shadow-sm"
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-20 flex justify-center text-slate-400 font-bold items-center gap-3">
              <Loader2 className="animate-spin" /> Loading data...
            </div>
          ) : (
            <>
              {activeTab === "friends" && (
                filteredUsers.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400"><Users size={32}/></div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">No friends found</h3>
                    <p className="text-slate-500 font-bold">{search ? "Try a different search term." : "You haven't added any friends yet."}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredUsers.map(u => renderUserCard(u, "friend"))}
                  </div>
                )
              )}

              {activeTab === "online" && (
                onlineFriends.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400"><Globe size={32}/></div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">No one is online</h3>
                    <p className="text-slate-500 font-bold">None of your friends are currently active.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {onlineFriends.map(u => renderUserCard(u, "friend"))}
                  </div>
                )
              )}

              {activeTab === "suggestions" && (
                suggestions.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400"><Sparkles size={32}/></div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">No suggestions</h3>
                    <p className="text-slate-500 font-bold">We don't have any new people to suggest right now.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {suggestions.map(u => renderUserCard(u, "suggestion"))}
                  </div>
                )
              )}

              {activeTab === "requests" && (
                <div className="space-y-10">
                  {friendRequests.incoming.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <Bell className="text-rose-500" size={20} /> Incoming Requests
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {friendRequests.incoming.map(u => renderUserCard(u, "incoming"))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400"><Bell size={24}/></div>
                      <h3 className="text-lg font-black text-slate-800 mb-1">No incoming requests</h3>
                      <p className="text-slate-500 font-bold text-sm">You're all caught up!</p>
                    </div>
                  )}

                  {friendRequests.outgoing.length > 0 && (
                    <div className="pt-8 border-t border-slate-200/60">
                      <h3 className="text-lg font-black text-slate-800 mb-4 text-slate-400">Outgoing Requests</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 opacity-80">
                        {friendRequests.outgoing.map(u => renderUserCard(u, "outgoing"))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* Add Friend Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-black text-slate-950">Add Friend</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">
                <X size={22} />
              </button>
            </div>
            
            <div className="relative mb-5">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="Search by username, email, or name"
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {isSearching && (
                <div className="py-8 text-center text-slate-400 font-bold flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> Searching...
                </div>
              )}

              {!isSearching && modalSearch && modalResults.length === 0 && (
                <div className="py-8 text-center text-slate-400 font-bold">No users found.</div>
              )}

              {!isSearching && modalResults.map(user => {
                const isFriend = users.some(u => u._id === user._id);
                return (
                  <div key={user._id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 group border border-transparent hover:border-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#06B6D4] text-white flex items-center justify-center font-black">
                        {initials(getUserName(user))}
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-black text-slate-950 truncate">{getUserName(user)}</div>
                        <div className="text-sm text-slate-500 truncate">{user.username ? `@${user.username}` : user.email}</div>
                      </div>
                    </div>
                    {isFriend ? (
                      <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-100 rounded-full">Friends</span>
                    ) : (
                      <button 
                        onClick={() => handleSendRequest(user._id)}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl hover:bg-indigo-100 transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed left-1/2 bottom-24 -translate-x-1/2 z-[1000000] px-5 py-3 rounded-full bg-slate-900 text-white font-bold shadow-xl animate-in fade-in slide-in-from-bottom-4">
          {notice}
        </div>
      )}
    </div>
  );
}
