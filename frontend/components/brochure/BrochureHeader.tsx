// Dark-green banner that mirrors the printed brochure header (feature page).
export default function BrochureHeader({
  title,
  subhead,
}: {
  title: string;
  subhead: string;
}) {
  return (
    <header className="relative overflow-hidden bg-[#1f5d36] px-10 py-14 md:px-16 md:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute right-6 top-6 hidden h-40 w-56 opacity-40 sm:block"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #6fae86 0 2px, transparent 2px 16px)",
          maskImage: "linear-gradient(to bottom right, #000, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom right, #000, transparent)",
        }}
      />
      <h1 className="relative text-5xl font-extrabold tracking-[-0.02em] text-white md:text-6xl">
        {title}
      </h1>
      <p className="relative mt-3 max-w-xl text-xl font-medium italic leading-snug text-[#a9d3b6] md:text-2xl">
        {subhead}
      </p>
    </header>
  );
}
