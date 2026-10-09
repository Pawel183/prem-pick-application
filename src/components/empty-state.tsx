export function EmptyState({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/60 px-5 py-10 text-center">
      <p className="text-muted-foreground">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
