export default function Badge({ children }) {
  return (
    <span className="min-w-5 h-5 px-1.5 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-xs font-black flex items-center justify-center shadow-sm">
      {children}
    </span>
  );
}
