import { useState } from "react";

export function Dropdown({ trigger, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div onClick={() => setOpen((prev) => !prev)}>{trigger}</div>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl bg-white/95 backdrop-blur-xl border border-[#e2e8f0] shadow-[0_24px_70px_rgba(30,64,175,0.18)] p-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, icon, danger = false }) {
  return (
    <button
      type="button"
      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all ${
        danger
          ? "text-red-500 hover:bg-red-50"
          : "text-[#101742] hover:bg-[#f0edff] hover:text-[#6366f1]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
