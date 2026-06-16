const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-11 h-11 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-28 h-28 text-3xl",
};

const statusClasses = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-slate-400",
};

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Avatar({ name, size = "md", status }) {
  return (
    <div className="relative shrink-0">
      <div
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white flex items-center justify-center font-black shadow-md`}
      >
        {getInitials(name)}
      </div>

      {status && (
        <span
          className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${
            statusClasses[status] || statusClasses.offline
          }`}
        />
      )}
    </div>
  );
}
