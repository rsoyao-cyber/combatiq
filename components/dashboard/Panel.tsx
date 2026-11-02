import { cn } from "@/lib/utils";

// Titled card used for each section of a dashboard page.
export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 min-w-0", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
