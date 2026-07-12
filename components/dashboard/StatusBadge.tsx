import clsx from "clsx";

const toneMap = {
  green: "border-occ-green/40 bg-occ-green/10 text-green-200",
  amber: "border-occ-amber/40 bg-occ-amber/10 text-amber-100",
  red: "border-occ-red/40 bg-occ-red/10 text-red-100",
  cyan: "border-occ-cyan/40 bg-occ-cyan/10 text-cyan-100",
  violet: "border-occ-violet/40 bg-occ-violet/10 text-violet-100",
  neutral: "border-occ-line bg-occ-panel2 text-zinc-300"
};

export function StatusBadge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneMap;
}) {
  return (
    <span className={clsx("inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium", toneMap[tone])}>
      {children}
    </span>
  );
}
