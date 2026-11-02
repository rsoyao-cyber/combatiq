import Link from "next/link";
import { cn } from "@/lib/utils";

// Link-based tabs: each tab is a URL (?tab=…), so tabs are deep-linkable and
// work with back/forward. The page renders only the active tab.
export function Tabs({
  tabs,
  active,
  hrefFor,
  label,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  hrefFor: (key: string) => string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex gap-1 border-b border-border overflow-x-auto">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={hrefFor(t.key)}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "h-10 px-3.5 -mb-px inline-flex items-center whitespace-nowrap border-b-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-md",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
