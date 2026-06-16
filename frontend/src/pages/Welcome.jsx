import { useNavigate } from "react-router-dom";
import { MessageSquare, ArrowRight } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fbff] text-[#101742] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[650px] h-[650px] rounded-full bg-[#6366f1]/20 blur-3xl -translate-x-1/3 -translate-y-1/3" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#8b5cf6]/20 blur-3xl translate-x-1/3 -translate-y-1/3" />

      <header className="relative z-10 px-8 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-white shadow-lg">
            <MessageSquare size={25} />
          </div>
          <h1 className="text-3xl font-black">Chater</h1>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/login")}
            className="px-5 py-2.5 rounded-xl font-bold hover:bg-white/70"
          >
            Sign In
          </button>

          <button
            onClick={() => navigate("/register")}
            className="px-5 py-2.5 rounded-xl font-bold text-white bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] shadow-lg"
          >
            Get Started
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-8 py-24 grid lg:grid-cols-2 gap-14 items-center">
        <section>
          <div className="inline-flex px-4 py-2 rounded-full bg-white/80 text-[#6366f1] font-bold shadow-sm mb-6">
            Premium messaging platform
          </div>

          <h2 className="text-6xl font-black tracking-tight leading-tight">
            Modern messaging
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-[#8b5cf6]">
              for modern teams
            </span>
          </h2>

          <p className="mt-6 text-xl leading-8 text-[#64748b] max-w-xl">
            Connect, collaborate, and communicate with Chater. The premium messaging platform designed for productivity and seamless collaboration.
          </p>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => navigate("/register")}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-white bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] shadow-xl"
            >
              Start Messaging Free
              <ArrowRight size={20} />
            </button>

            <button
              onClick={() => navigate("/login")}
              className="px-6 py-3.5 rounded-2xl font-black bg-white/80 border border-white shadow-sm"
            >
              Sign In
            </button>
          </div>
        </section>

        <section className="hidden lg:block">
          <div className="rounded-[32px] bg-white/90 backdrop-blur-2xl border border-white p-8 shadow-[0_35px_90px_rgba(99,102,241,0.22)]">
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#eef4ff] p-4">
                Hey! Check out this new design system 🎨
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white p-4 ml-12">
                Looks amazing! When can we start using it?
              </div>
              <div className="rounded-2xl bg-[#eef4ff] p-4">
                It is live right now — try it! 🚀
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

