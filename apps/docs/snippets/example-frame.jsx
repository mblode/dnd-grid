export function ExampleFrame({ children, minWidth }) {
  return (
    <div className="not-prose my-6 rounded-lg border border-zinc-200/70 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="overflow-x-auto">
        <div className="p-4" style={minWidth ? { minWidth } : undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}
