import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  Calendar,
  Loader2,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserPlus,
  LogOut,
} from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api.js";

const CATEGORY_CONFIG = [
  {
    key: "normal",
    name: "Normal",
    color: "#22C55E",
  },
  {
    key: "spam",
    name: "Spam",
    color: "#F59E0B",
  },
  {
    key: "abusive",
    name: "Abusive",
    color: "#EF4444",
  },
  {
    key: "hateful",
    name: "Hateful",
    color: "#991B1B",
  },
];

function getStoredUser() {
  return JSON.parse(
    sessionStorage.getItem("user") ||
      "null"
  );
}

function getDisplayName(user) {
  return (
    user?.name ||
    user?.username ||
    user?.email ||
    "SafeChat user"
  );
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

function formatJoinedDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      year: "numeric",
    }
  );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function ChartTooltip({
  active,
  payload,
}) {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  const item = payload[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-white/10 dark:bg-slate-800">
      <span className="text-slate-600 dark:text-slate-300">
        {item.name}:{" "}
      </span>
      <strong className="text-slate-950 dark:text-white">
        {formatNumber(item.value)}
      </strong>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [data, setData] =
    useState(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const loadProfileAnalytics =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          "/analytics/profile"
        );

        setData(response.data);
      } catch (requestError) {
        console.error(
          "Failed to load profile analytics:",
          requestError
        );

        setError(
          requestError.response?.data
            ?.message ||
            "Failed to load profile statistics"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadProfileAnalytics();

    const handleUserUpdated = () => {
      loadProfileAnalytics();
    };

    window.addEventListener(
      "userUpdated",
      handleUserUpdated
    );

    return () => {
      window.removeEventListener(
        "userUpdated",
        handleUserUpdated
      );
    };
  }, []);

  const storedUser = getStoredUser();
  const user =
    data?.user || storedUser || {};
  const summary =
    data?.summary || {};
  const distribution =
    data?.distribution || {};

  const chartData = useMemo(
    () =>
      CATEGORY_CONFIG.map(
        (category) => ({
          ...category,
          value:
            Number(
              distribution[
                category.key
              ]
            ) || 0,
        })
      ),
    [distribution]
  );

  const classifiedTotal =
    chartData.reduce(
      (total, category) =>
        total + category.value,
      0
    );

  const stats = [
    {
      icon: MessageSquare,
      label: "Total Messages",
      value: formatNumber(
        summary.totalMessages
      ),
      helper:
        "Messages you have sent",
      color: "#6366F1",
    },
    {
      icon: UserPlus,
      label: "Friends",
      value: formatNumber(
        summary.friendCount
      ),
      helper:
        "Accepted contacts",
      color: "#22C55E",
    },
    {
      icon: Calendar,
      label: "Joined",
      value: formatJoinedDate(
        summary.joinedAt ||
          user.createdAt
      ),
      helper:
        "Account creation date",
      color: "#8B5CF6",
    },
    {
      icon: ShieldCheck,
      label: "Safe Message Rate",
      value:
        summary.classifiedMessages > 0
          ? `${Number(
              summary.safeMessageRate ||
                0
            ).toFixed(1)}%`
          : "—",
      helper:
        summary.classifiedMessages > 0
          ? "Normal among classified messages"
          : "No classified messages yet",
      color: "#F59E0B",
    },
  ];

  return (
    <div className="h-full overflow-y-auto rounded-[34px] bg-slate-50 dark:bg-slate-900">
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-indigo-100 via-violet-100 to-slate-100 dark:from-indigo-950/70 dark:via-violet-950/60 dark:to-slate-900">
        <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -right-20 -top-16 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
      </div>

      <div className="px-6 pb-10 md:px-10">
        <div className="-mt-16 mb-7 flex flex-col gap-4 sm:flex-row sm:items-end">
          <motion.div
            initial={{
              scale: 0.85,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 180,
            }}
          >
            <div className="relative inline-block rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-1">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-4xl font-bold text-white">
                {user.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt={getDisplayName(
                      user
                    )}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(
                    getDisplayName(user)
                  )
                )}
              </div>

              <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-[3px] border-slate-50 bg-emerald-500 dark:border-slate-900" />
            </div>
          </motion.div>

          <div className="min-w-0 flex-1 pb-2">
            <h1 className="truncate text-2xl font-black text-slate-950 dark:text-white">
              {getDisplayName(user)}
            </h1>

            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
              {user.username
                ? `@${String(
                    user.username
                  ).replace(/^@/, "")}`
                : user.email || ""}
              {user.bio
                ? ` · ${user.bio}`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pb-2">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/app/settings"
                )
              }
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <Settings size={17} />
              Edit Profile
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/app")
              }
              className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
            >
              <MessageSquare
                size={17}
              />
              Messages
            </button>

            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("token");
                sessionStorage.removeItem("user");
                navigate("/login", { replace: true });
              }}
              className="md:hidden flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
            >
              <LogOut size={17} />
              Log Out
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle size={20} />
            <span className="font-bold">
              {error}
            </span>
            <button
              type="button"
              onClick={
                loadProfileAnalytics
              }
              className="ml-auto rounded-full bg-white px-3 py-1.5 text-sm font-black text-red-600 dark:bg-slate-900"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map(
            (stat, index) => {
              const Icon =
                stat.icon;

              return (
                <motion.div
                  key={stat.label}
                  initial={{
                    opacity: 0,
                    y: 16,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      index * 0.07,
                  }}
                  className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/70"
                >
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background: `${stat.color}18`,
                      color:
                        stat.color,
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  <p className="text-2xl font-black text-slate-950 dark:text-white">
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      stat.value
                    )}
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                    {stat.label}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {stat.helper}
                  </p>
                </motion.div>
              );
            }
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/70">
            <h2 className="text-lg font-black text-slate-950 dark:text-white">
              AI Message Analysis
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Categories predicted for
              your sent text messages
            </p>

            <div className="mt-4 h-64">
              {classifiedTotal > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={
                        chartData
                      }
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      innerRadius={64}
                      outerRadius={94}
                      paddingAngle={3}
                    >
                      {chartData.map(
                        (entry) => (
                          <Cell
                            key={
                              entry.key
                            }
                            fill={
                              entry.color
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip
                      content={
                        <ChartTooltip />
                      }
                    />

                    <Legend
                      formatter={(
                        value
                      ) => (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShieldCheck
                    size={38}
                    className="text-slate-300"
                  />
                  <p className="mt-3 font-black text-slate-700 dark:text-slate-200">
                    No classified
                    messages yet
                  </p>
                  <p className="mt-1 max-w-xs text-sm text-slate-400">
                    Start the Python
                    model service and
                    send text messages
                    to populate this
                    chart.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/70">
            <h2 className="text-lg font-black text-slate-950 dark:text-white">
              Category Breakdown
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {formatNumber(
                classifiedTotal
              )}{" "}
              classified sent messages
            </p>

            <div className="mt-7 space-y-5">
              {chartData.map(
                (category) => {
                  const percentage =
                    classifiedTotal > 0
                      ? (category.value /
                          classifiedTotal) *
                        100
                      : 0;

                  return (
                    <div
                      key={
                        category.key
                      }
                    >
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              background:
                                category.color,
                            }}
                          />

                          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            {
                              category.name
                            }
                          </span>
                        </div>

                        <span className="text-sm font-black text-slate-950 dark:text-white">
                          {formatNumber(
                            category.value
                          )}{" "}
                          (
                          {percentage.toFixed(
                            1
                          )}
                          %)
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <motion.div
                          initial={{
                            width: 0,
                          }}
                          animate={{
                            width: `${percentage}%`,
                          }}
                          transition={{
                            duration: 0.7,
                          }}
                          className="h-full rounded-full"
                          style={{
                            background:
                              category.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="mt-7 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-400/20 dark:bg-indigo-500/10">
              <div className="flex items-center gap-2 font-black text-indigo-900 dark:text-indigo-200">
                <ShieldCheck
                  size={19}
                />
                Safe message rate
              </div>

              <p className="mt-2 text-sm leading-6 text-indigo-700 dark:text-indigo-300">
                {summary.classifiedMessages >
                0
                  ? `${Number(
                      summary.safeMessageRate ||
                        0
                    ).toFixed(
                      1
                    )}% of your classified sent messages were predicted as Normal.`
                  : "This value will appear after the model classifies your sent messages."}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
