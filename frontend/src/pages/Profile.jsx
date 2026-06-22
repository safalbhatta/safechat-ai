import { useState, useEffect } from "react";
import { MessageSquare, UserPlus, Calendar, Hash } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { motion } from "motion/react";
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
      "Product Engineer",
    location: savedUser.location || "Atlanta, GA",
    joinedDate: savedUser.joinedDate || "Jan 2023",
  };
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

const donutData = [
  { name: "Normal", value: 7842, color: "#22C55E" },
  { name: "Spam", value: 423, color: "#F59E0B" },
  { name: "Abusive", value: 187, color: "#EF4444" },
  { name: "Hateful", value: 48, color: "#991B1B" },
];

const STATS = [
  { icon: <MessageSquare className="w-5 h-5" />, label: "Total Messages", value: "8,500", color: "#6C63FF" },
  { icon: <UserPlus className="w-5 h-5" />, label: "Friends", value: "342", color: "#22C55E" },
  { icon: <Calendar className="w-5 h-5" />, label: "Joined", value: "Jan 2023", color: "#8B5CF6" },
  { icon: <Hash className="w-5 h-5" />, label: "Safety Score", value: "92%", color: "#F59E0B" },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-xl text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-lg">
        <p style={{ color: payload[0].payload.color }}>
          <span className="text-slate-700 dark:text-slate-300">{payload[0].name}:</span> <strong>{payload[0].value.toLocaleString()}</strong>
        </p>
      </div>
    );
  }
  return null;
};

export default function Profile() {
  const [currentUser, setCurrentUser] = useState(getLoggedInUser());

  useEffect(() => {
    const handleUserUpdated = () => {
      setCurrentUser(getLoggedInUser());
    };
    window.addEventListener("userUpdated", handleUserUpdated);
    return () => window.removeEventListener("userUpdated", handleUserUpdated);
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-[34px]">
      {/* Hero banner */}
      <div className="h-48 relative bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-slate-50 dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-slate-900">
        <div
          className="absolute inset-0"
          style={{
            background: "url('https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=200&fit=crop&auto=format') center/cover",
            opacity: 0.15,
          }}
        />
      </div>

      <div className="px-6 md:px-10 pb-10">
        {/* Profile row */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <div className="relative p-1 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 inline-block">
              <div 
                className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center font-bold text-4xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white"
              >
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  initials(currentUser.name)
                )}
              </div>
              <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-green-500 border-[3px] border-slate-50 dark:border-slate-900" />
            </div>
          </motion.div>

          <div className="flex-1 pb-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-[Poppins,sans-serif]">
              {currentUser.name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {currentUser.username} · {currentUser.bio}
            </p>
          </div>

          <div className="flex gap-3 pb-2">
            <button className="px-4 py-2 font-medium text-sm rounded-lg flex items-center gap-2 transition-opacity hover:opacity-80 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white">
              Edit Profile
            </button>
            <button className="px-4 py-2 font-medium text-sm rounded-lg flex items-center gap-2 transition-opacity hover:opacity-80 bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-none">
              <MessageSquare className="w-4 h-4" />
              Message
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-5 rounded-2xl bg-white/80 dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm dark:shadow-none"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${s.color}18`, color: s.color }}
              >
                {s.icon}
              </div>
              <p className="text-2xl font-bold mb-0.5 text-slate-900 dark:text-white font-[Poppins,sans-serif]">
                {s.value}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* AI Analysis */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl bg-white/80 dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm dark:shadow-none"
          >
            <h3 className="mb-1 text-lg font-medium text-slate-900 dark:text-white font-[Poppins,sans-serif]">
              AI Message Analysis
            </h3>
            <p className="text-sm mb-6 text-slate-500 dark:text-slate-400">
              Breakdown of your message categories
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => <span className="text-slate-500 dark:text-slate-400 text-[13px]">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl bg-white/80 dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm dark:shadow-none"
          >
            <h3 className="mb-1 text-lg font-medium text-slate-900 dark:text-white font-[Poppins,sans-serif]">
              Category Breakdown
            </h3>
            <p className="text-sm mb-6 text-slate-500 dark:text-slate-400">
              Detailed message statistics
            </p>
            <div className="space-y-4">
              {donutData.map((d) => {
                const pct = Math.round((d.value / 8500) * 100);
                return (
                  <div key={d.name}>
                    <div className="flex justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-sm text-slate-500 dark:text-slate-400">{d.name}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {d.value.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="h-2 rounded-full"
                        style={{ background: d.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
