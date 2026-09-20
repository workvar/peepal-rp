export default function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      {/* Dual-ring spinner with gradient */}
      <div className="relative w-10 h-10">
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            background: "conic-gradient(from 0deg, #1f5d36, #4f9268, transparent)",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))",
          }}
        />
        <div
          className="absolute inset-1.5 rounded-full"
          style={{
            background: "rgba(31,93,54,0.08)",
          }}
        />
      </div>
      <span
        className="text-sm font-medium"
        style={{ color: "rgb(var(--text-muted))" }}
      >
        {text}
      </span>
    </div>
  );
}
