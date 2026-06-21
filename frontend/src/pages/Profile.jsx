import { useState } from "react";
import {
  Camera,
  MapPin,
  CalendarDays,
  Link as LinkIcon,
  Image,
  FileText,
  Link2,
  MessageSquare,
  Users,
  ShieldCheck,
  Edit3,
  Settings,
} from "lucide-react";
import { currentUser as fallbackUser } from "../data/mockData.js";

function getLoggedInUser() {
  const savedUser = JSON.parse(sessionStorage.getItem("user") || "null");

  if (!savedUser) return fallbackUser;

  return {
    ...fallbackUser,
    ...savedUser,
    username: savedUser.username?.startsWith("@")
      ? savedUser.username
      : `@${savedUser.username}`,
    bio:
      savedUser.bio ||
      "Building modern messaging experiences with clean design, fast interactions, and real-time communication.",
    location: savedUser.location || "Atlanta, GA",
    website: savedUser.website || "chater.app",
    joinedDate: savedUser.joinedDate || "Joined 2026",
  };
}

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const stats = [
  {
    label: "Messages",
    value: "2,834",
    icon: MessageSquare,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    label: "Contacts",
    value: "127",
    icon: Users,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    label: "Media",
    value: "458",
    icon: Image,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    label: "Files",
    value: "156",
    icon: FileText,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
];

const tabs = [
  { id: "media", label: "Media", icon: Image },
  { id: "files", label: "Files", icon: FileText },
  { id: "links", label: "Links", icon: Link2 },
];

export default function Profile() {
  const currentUser = getLoggedInUser();
  const [activeTab, setActiveTab] = useState("media");

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-white/70 via-slate-50/80 to-indigo-50/60">
      <div className="max-w-7xl mx-auto p-5 md:p-8">
        <div className="relative overflow-hidden rounded-[34px] bg-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(99,102,241,0.72),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(139,92,246,0.72),transparent_34%),linear-gradient(135deg,#111827,#312e81)]" />

          <div className="relative z-10 p-6 md:p-8">
            <div className="flex justify-between items-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/12 border border-white/15 text-white/90 text-xs font-black backdrop-blur-xl">
                <ShieldCheck size={14} />
                Verified Profile
              </div>

              <div className="flex gap-2">
                <button className="w-11 h-11 rounded-2xl bg-white/12 border border-white/15 text-white hover:bg-white/20 flex items-center justify-center backdrop-blur-xl">
                  <Camera size={19} />
                </button>

                <button className="w-11 h-11 rounded-2xl bg-white/12 border border-white/15 text-white hover:bg-white/20 flex items-center justify-center backdrop-blur-xl">
                  <Settings size={19} />
                </button>
              </div>
            </div>

            <div className="mt-14 md:mt-20 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="flex flex-col md:flex-row md:items-end gap-5">
                <div className="relative">
                  <div className="w-28 h-28 md:w-32 md:h-32 rounded-[34px] bg-gradient-to-br from-[#6366F1] via-[#8B5CF6] to-[#06B6D4] text-white flex items-center justify-center text-5xl font-black border-4 border-white/90 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
                    {initials(currentUser.name)}
                  </div>

                  <button className="absolute -right-2 -bottom-2 w-11 h-11 rounded-2xl bg-white text-indigo-600 shadow-[0_12px_26px_rgba(0,0,0,0.18)] flex items-center justify-center">
                    <Camera size={18} />
                  </button>
                </div>

                <div className="pb-1">
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                    {currentUser.name}
                  </h1>

                  <p className="text-indigo-100 font-bold mt-1">
                    {currentUser.username}
                  </p>

                  <p className="text-white/82 mt-4 max-w-2xl leading-7">
                    {currentUser.bio}
                  </p>

                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-white/78">
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={16} />
                      {currentUser.location}
                    </span>

                    <span className="inline-flex items-center gap-2">
                      <LinkIcon size={16} />
                      {currentUser.website}
                    </span>

                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={16} />
                      {currentUser.joinedDate}
                    </span>
                  </div>
                </div>
              </div>

              <button className="h-12 px-5 rounded-2xl bg-white text-indigo-700 font-black shadow-[0_18px_42px_rgba(0,0,0,0.18)] hover:bg-indigo-50 flex items-center gap-2 justify-center">
                <Edit3 size={18} />
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="premium-card rounded-[28px] p-5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-3xl font-black ${stat.color}`}>
                      {stat.value}
                    </p>
                    <p className="text-sm font-black text-slate-500 mt-1">
                      {stat.label}
                    </p>
                  </div>

                  <div
                    className={`w-13 h-13 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}
                  >
                    <Icon size={22} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 mt-5">
          <div className="premium-card rounded-[32px] p-5 md:p-6">
            <div className="flex gap-2 border-b border-slate-200/80 mb-6 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-3 font-black flex items-center gap-2 border-b-2 -mb-px ${
                      isActive
                        ? "text-indigo-600 border-indigo-600"
                        : "text-slate-500 border-transparent hover:text-indigo-600"
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "media" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div
                    key={item}
                    className="aspect-video rounded-[24px] overflow-hidden bg-gradient-to-br from-indigo-100 via-purple-100 to-cyan-100 border border-white shadow-[0_12px_30px_rgba(99,102,241,0.12)] group"
                  >
                    <div className="h-full flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                      <Image size={34} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "files" && (
              <div className="space-y-3">
                {["Project brief.pdf", "Design system.fig", "Meeting notes.docx"].map(
                  (file) => (
                    <div
                      key={file}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white/70 border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <FileText size={21} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{file}</p>
                        <p className="text-sm text-slate-500">Shared recently</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {activeTab === "links" && (
              <div className="space-y-3">
                {["https://chater.app", "https://github.com", "https://figma.com"].map(
                  (link) => (
                    <div
                      key={link}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white/70 border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                        <Link2 size={21} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 truncate">{link}</p>
                        <p className="text-sm text-slate-500">Saved link</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="premium-card rounded-[32px] p-6">
              <h2 className="text-xl font-black text-slate-950 mb-4">
                Account Overview
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Status</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-sm font-black">
                    Online
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Plan</span>
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-black">
                    Free
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Security</span>
                  <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-sm font-black">
                    Protected
                  </span>
                </div>
              </div>
            </div>

            <div className="premium-card rounded-[32px] p-6">
              <h2 className="text-xl font-black text-slate-950 mb-4">
                Recent Activity
              </h2>

              <div className="space-y-4">
                {[
                  "Updated profile information",
                  "Joined 3 new conversations",
                  "Shared 12 media files",
                ].map((item) => (
                  <div key={item} className="flex gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-2" />
                    <div>
                      <p className="font-bold text-slate-800">{item}</p>
                      <p className="text-sm text-slate-500">Today</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
