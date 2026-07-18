import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  BrainCircuit,
  Clock3,
  Loader2,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatLatency(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return `${Number(value).toFixed(2)} ms`;
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString();
}

function formatShortDate(value) {
  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    }
  );
}

function labelName(value) {
  return (
    CATEGORY_CONFIG.find(
      (item) =>
        item.key === value
    )?.name || value
  );
}

function categoryColor(value) {
  return (
    CATEGORY_CONFIG.find(
      (item) =>
        item.key === value
    )?.color || "#64748B"
  );
}

function DashboardTooltip({
  active,
  payload,
  label,
}) {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-white/10 dark:bg-slate-800">
      <p className="mb-1 font-black text-slate-900 dark:text-white">
        {label}
      </p>

      {payload.map((item) => (
        <p
          key={item.dataKey}
          style={{
            color: item.color,
          }}
        >
          {item.name}:{" "}
          <strong>
            {formatNumber(
              item.value
            )}
          </strong>
        </p>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [days, setDays] =
    useState(30);
  const [data, setData] =
    useState(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const loadAnalytics =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/analytics/dashboard?days=${days}`
        );

        setData(response.data);
      } catch (requestError) {
        console.error(
          "Failed to load analytics:",
          requestError
        );

        setError(
          requestError.response?.data
            ?.message ||
            "Failed to load analytics"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const summary =
    data?.summary || {};
  const distribution =
    data?.distribution || {};
  const model = data?.model || {};
  const timeline = useMemo(
    () =>
      (data?.timeline || []).map(
        (row) => ({
          ...row,
          label: formatShortDate(
            row.date
          ),
        })
      ),
    [data?.timeline]
  );

  const pieData = useMemo(
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

  const totalDistribution =
    pieData.reduce(
      (total, item) =>
        total + item.value,
      0
    );

  const modelOnline =
    model.reachable &&
    model.modelLoaded &&
    model.status === "online";

  const metricCards = [
    {
      label:
        "Classified Messages",
      value: formatNumber(
        summary.totalClassified
      ),
      helper: `Last ${days} days`,
      icon: BrainCircuit,
      color: "#6366F1",
    },
    {
      label:
        "Normal Messages",
      value: formatNumber(
        summary.normalMessages
      ),
      helper:
        summary.totalClassified > 0
          ? `${formatPercent(
              (summary.normalMessages /
                summary.totalClassified) *
                100
            )} of classified`
          : "No classified messages",
      icon: ShieldCheck,
      color: "#22C55E",
    },
    {
      label:
        "Filtered Messages",
      value: formatNumber(
        summary.filteredMessages
      ),
      helper:
        "Spam, abusive, or hateful",
      icon: ShieldAlert,
      color: "#EF4444",
    },
    {
      label:
        "Average Confidence",
      value:
        summary.totalClassified > 0
          ? formatPercent(
              summary.averageConfidence
            )
          : "—",
      helper:
        "Across classified messages",
      icon: Activity,
      color: "#8B5CF6",
    },
  ];

  return (
    <div className="h-full overflow-y-auto rounded-[34px] bg-slate-50 p-5 dark:bg-slate-900 md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-black text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300">
              <BarChart3
                size={16}
              />
              AI Safety Analytics
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Message Intelligence
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500 dark:text-slate-400">
              Live statistics from
              MongoDB and your SBERT +
              Logistic Regression
              classifier.
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
            Time range
            <select
              value={days}
              onChange={(event) =>
                setDays(
                  Number(
                    event.target.value
                  )
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-black text-slate-900 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white"
            >
              <option value={7}>
                Last 7 days
              </option>
              <option value={30}>
                Last 30 days
              </option>
              <option value={90}>
                Last 90 days
              </option>
            </select>
          </label>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle size={20} />
            <span className="font-bold">
              {error}
            </span>

            <button
              type="button"
              onClick={loadAnalytics}
              className="ml-auto rounded-full bg-white px-3 py-1.5 text-sm font-black text-red-600 dark:bg-slate-900"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {metricCards.map(
            (card) => {
              const Icon =
                card.icon;

              return (
                <section
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/70"
                >
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      color:
                        card.color,
                      background: `${card.color}18`,
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="text-2xl font-black text-slate-950 dark:text-white">
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      card.value
                    )}
                  </div>

                  <div className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                    {card.label}
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    {card.helper}
                  </div>
                </section>
              );
            }
          )}
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
          <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/70">
            <div className="mb-5">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">
                Categories Over Time
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Daily Normal, Spam,
                Abusive, and Hateful
                predictions
              </p>
            </div>

            <div className="h-80">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={timeline}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#CBD5E1"
                    opacity={0.45}
                  />

                  <XAxis
                    dataKey="label"
                    tick={{
                      fontSize: 11,
                    }}
                    minTickGap={20}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    content={
                      <DashboardTooltip />
                    }
                  />

                  <Legend />

                  {CATEGORY_CONFIG.map(
                    (category) => (
                      <Bar
                        key={
                          category.key
                        }
                        dataKey={
                          category.key
                        }
                        name={
                          category.name
                        }
                        stackId="categories"
                        fill={
                          category.color
                        }
                        radius={
                          category.key ===
                          "hateful"
                            ? [
                                6,
                                6,
                                0,
                                0,
                              ]
                            : 0
                        }
                      />
                    )
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/70">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">
                Category Distribution
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                All classified messages
                visible to your account
              </p>
            </div>

            <div className="h-72">
              {totalDistribution > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="46%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {pieData.map(
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

                    <Tooltip />

                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <BrainCircuit
                    size={40}
                    className="text-slate-300"
                  />

                  <p className="mt-3 font-black text-slate-700 dark:text-slate-200">
                    No classified
                    messages
                  </p>

                  <p className="mt-1 max-w-xs text-sm text-slate-400">
                    Start the model
                    service and send
                    text messages.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {pieData.map(
                (category) => (
                  <div
                    key={
                      category.key
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background:
                            category.color,
                        }}
                      />
                      {category.name}
                    </div>

                    <div className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                      {formatNumber(
                        category.value
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/70">
            <div className="mb-5">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">
                Sent and Received
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Daily messaging
                activity for the
                selected period
              </p>
            </div>

            <div className="h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={timeline}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#CBD5E1"
                    opacity={0.45}
                  />

                  <XAxis
                    dataKey="label"
                    tick={{
                      fontSize: 11,
                    }}
                    minTickGap={20}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    content={
                      <DashboardTooltip />
                    }
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="sent"
                    name="Sent"
                    stroke="#6366F1"
                    strokeWidth={3}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="received"
                    name="Received"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">
                  Model Runtime
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Python inference
                  service status
                </p>
              </div>

              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-black ${
                  modelOnline
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                }`}
              >
                {modelOnline ? (
                  <Wifi size={16} />
                ) : (
                  <WifiOff
                    size={16}
                  />
                )}

                {modelOnline
                  ? "Online"
                  : "Offline"}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {[
                [
                  "Model",
                  model.modelName ||
                    "SBERT + Logistic Regression",
                ],
                [
                  "Version",
                  model.modelVersion ||
                    "Not available",
                ],
                [
                  "Encoder",
                  model.sbertModelName ||
                    "sentence-transformers/all-MiniLM-L6-v2",
                ],
                [
                  "Embedding",
                  model.embeddingDimension
                    ? `${model.embeddingDimension} dimensions`
                    : "384 dimensions",
                ],
                [
                  "Safety threshold",
                  model.safetyThreshold !==
                  undefined
                    ? formatPercent(
                        model.safetyThreshold *
                          100
                      )
                    : "55.0%",
                ],
                [
                  "Average latency",
                  formatLatency(
                    summary.averageLatencyMs
                  ),
                ],
                [
                  "Last classification",
                  formatDate(
                    summary.lastClassifiedAt
                  ),
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900"
                  >
                    <span className="text-sm font-bold text-slate-500">
                      {label}
                    </span>

                    <span className="max-w-[62%] break-words text-right text-sm font-black text-slate-950 dark:text-white">
                      {value}
                    </span>
                  </div>
                )
              )}
            </div>

            {!modelOnline &&
              model.error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  {model.error}
                </div>
              )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/70">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">
                Recent
                Classifications
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Latest text messages
                processed by the model
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 font-black text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                <MessageSquare
                  size={15}
                />
                {formatNumber(
                  summary.sentMessages
                )}{" "}
                sent
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 font-black text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                <MessageSquare
                  size={15}
                />
                {formatNumber(
                  summary.receivedMessages
                )}{" "}
                received
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 font-black text-red-700 dark:bg-red-500/10 dark:text-red-300">
                <ShieldAlert
                  size={15}
                />
                {formatNumber(
                  summary.filteredReceivedMessages
                )}{" "}
                filtered received
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="animate-spin" />
            </div>
          ) : !data
              ?.recentClassifications
              ?.length ? (
            <div className="py-16 text-center">
              <Clock3
                size={38}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-black text-slate-700 dark:text-slate-200">
                No recent
                classifications
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
                    <th className="px-3 py-3">
                      Message
                    </th>
                    <th className="px-3 py-3">
                      Sender
                    </th>
                    <th className="px-3 py-3">
                      Category
                    </th>
                    <th className="px-3 py-3">
                      Confidence
                    </th>
                    <th className="px-3 py-3">
                      Latency
                    </th>
                    <th className="px-3 py-3">
                      Time
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.recentClassifications.map(
                    (item) => (
                      <tr
                        key={item._id}
                        className="border-b border-slate-100 last:border-0 dark:border-white/5"
                      >
                        <td className="max-w-[340px] px-3 py-4">
                          <p className="truncate font-bold text-slate-800 dark:text-slate-200">
                            {item.isSafetyHidden
                              ? "Safety-hidden message"
                              : item.text ||
                                "No text"}
                          </p>
                        </td>

                        <td className="px-3 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">
                          {item.senderId
                            ?.name ||
                            item.senderId
                              ?.username ||
                            "Unknown"}
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className="inline-flex rounded-full px-3 py-1 text-xs font-black text-white"
                            style={{
                              background:
                                categoryColor(
                                  item.predictedCategory
                                ),
                            }}
                          >
                            {labelName(
                              item.predictedCategory
                            )}
                          </span>
                        </td>

                        <td className="px-3 py-4 text-sm font-black text-slate-800 dark:text-slate-200">
                          {formatPercent(
                            Number(
                              item.classificationConfidence ||
                                0
                            ) * 100
                          )}
                        </td>

                        <td className="px-3 py-4 text-sm text-slate-500">
                          {formatLatency(
                            item.classificationLatencyMs
                          )}
                        </td>

                        <td className="px-3 py-4 text-sm text-slate-500">
                          {formatDate(
                            item.classifiedAt ||
                              item.createdAt
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
