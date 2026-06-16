import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Users,
  Clock,
  Zap,
  Activity,
  ArrowUpRight,
} from "lucide-react";

const stats = [
  {
    label: "Messages Sent",
    value: "12.8K",
    change: "+18.4%",
    icon: MessageSquare,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    label: "Active Contacts",
    value: "1,284",
    change: "+9.7%",
    icon: Users,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    label: "Avg Response",
    value: "2.4m",
    change: "-12.2%",
    icon: Clock,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    label: "Engagement",
    value: "94%",
    change: "+6.1%",
    icon: Zap,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
];

const bars = [58, 72, 46, 88, 64, 94, 78, 86, 68, 91, 76, 84];

export default function Analytics() {
  return (
    <div className="page-premium h-full overflow-y-auto">
      <div className="page-container">
        <section className="page-hero mb-6">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/16 border border-white/18 text-white/90 text-xs font-black mb-4">
                <BarChart3 size={15} />
                Growth Insights
              </div>

              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                Analytics
              </h1>

              <p className="text-indigo-50 mt-3 max-w-2xl leading-7">
                Track message activity, contact growth, engagement trends, and
                communication performance.
              </p>
            </div>

            <button className="h-12 px-5 rounded-2xl bg-white text-indigo-700 font-black shadow-[0_18px_42px_rgba(0,0,0,0.18)] hover:bg-indigo-50 flex items-center gap-2 justify-center">
              <TrendingUp size={19} />
              Export Report
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="page-card page-card-hover rounded-[30px] p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 font-black">
                      {stat.label}
                    </p>
                    <h3 className="text-4xl font-black text-slate-950 mt-2">
                      {stat.value}
                    </h3>
                  </div>

                  <div className={`icon-tile ${stat.bg} ${stat.color}`}>
                    <Icon size={23} />
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <span className="pill-soft bg-emerald-50 text-emerald-600 inline-flex items-center gap-1">
                    <ArrowUpRight size={13} />
                    {stat.change}
                  </span>
                  <span className="text-sm text-slate-400 font-bold">
                    vs last month
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
          <div className="page-card rounded-[32px] p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Message Activity
                </h2>
                <p className="text-slate-500 mt-1">
                  Monthly conversation volume
                </p>
              </div>

              <span className="pill-soft bg-indigo-50 text-indigo-600">
                Last 12 months
              </span>
            </div>

            <div className="h-[310px] flex items-end gap-3">
              {bars.map((height, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full h-[260px] rounded-full bg-slate-100 overflow-hidden flex items-end">
                    <div
                      className="w-full rounded-full bg-gradient-to-t from-[#6366F1] via-[#8B5CF6] to-[#06B6D4] shadow-[0_0_24px_rgba(99,102,241,0.30)]"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-400">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="page-card rounded-[32px] p-6">
              <h2 className="text-2xl font-black text-slate-950 mb-5">
                Live Performance
              </h2>

              <div className="space-y-5">
                {[
                  ["Delivery Rate", 96, "bg-indigo-500"],
                  ["Read Rate", 88, "bg-purple-500"],
                  ["Reply Rate", 74, "bg-cyan-500"],
                ].map(([label, value, color]) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-slate-700">{label}</span>
                      <span className="font-black text-slate-950">{value}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="page-card rounded-[32px] p-6">
              <div className="flex items-center gap-4">
                <div className="icon-tile bg-emerald-50 text-emerald-600">
                  <Activity size={23} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-950">
                    System Healthy
                  </h3>
                  <p className="text-slate-500">
                    All messaging services are running normally.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
