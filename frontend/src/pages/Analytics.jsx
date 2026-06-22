import { BarChart3 } from "lucide-react";

export default function Analytics() {
  return (
    <div className="page-premium h-full overflow-y-auto flex flex-col items-center justify-center">
      <div className="text-center flex flex-col items-center p-8">
        <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mb-6 shadow-[0_20px_40px_rgba(0,0,0,0.06)] border border-slate-100">
          <BarChart3 size={40} className="text-indigo-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
          Analytics Coming Soon
        </h1>
        <p className="text-lg text-slate-500 font-bold max-w-md leading-relaxed">
          We're hard at work building powerful insights and performance metrics for your account. Stay tuned!
        </p>
      </div>
    </div>
  );
}
