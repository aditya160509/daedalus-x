export function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.05] px-1.5 font-sans text-[10px] font-medium text-text-2">
      {children}
    </kbd>
  );
}
