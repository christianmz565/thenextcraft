import { FolderKanban, LayoutDashboard, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

const navigation = [
  { key: "dashboard", href: "/dashboard", label: "Vista general", icon: LayoutDashboard },
  { key: "projects", href: "/app/proyecto-atlas", label: "Proyectos", icon: FolderKanban },
  { key: "new", href: "/app/new", label: "Nuevo proyecto", icon: Plus },
] as const;

type AppShellProps = {
  children: ReactNode;
  active?: (typeof navigation)[number]["key"];
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
};

export function AppShell({
  children,
  active,
  eyebrow = "Espacio de trabajo",
  title,
  actions,
}: AppShellProps) {
  return (
    <div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden border-r bg-sidebar md:flex md:min-h-svh md:flex-col">
        <div className="flex h-20 items-center border-b px-6">
          <BrandMark href="/dashboard" />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Navegación principal">
          {navigation.map(({ key, href, label, icon: Icon }) => {
            const selected = key === active;
            return (
              <Link
                key={href}
                href={href}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 border-l-2 border-transparent px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  selected && "border-sidebar-foreground bg-sidebar-accent text-sidebar-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <div className="mb-4 flex items-center gap-3 text-sm">
            <span className="grid size-9 place-items-center bg-foreground font-mono text-xs text-background">
              MC
            </span>
            <span>
              <strong className="block font-medium">Marina Costa</strong>
              <span className="text-xs text-muted-foreground">Estudio Norte</span>
            </span>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur md:static">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 md:min-h-20 md:px-8 lg:px-12">
            <div className="md:hidden">
              <BrandMark href="/dashboard" compact />
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {eyebrow}
              </p>
              <h1 className="truncate text-xl font-medium tracking-tight">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <button
                type="button"
                aria-label="Configuración"
                className="grid size-11 place-items-center border border-transparent hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Settings2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <nav className="grid grid-cols-3 border-t md:hidden" aria-label="Navegación móvil">
            {navigation.map(({ key, href, label, icon: Icon }) => {
              const selected = key === active;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 border-r px-1 text-[10px] text-muted-foreground last:border-r-0",
                    selected && "bg-foreground text-background",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="min-w-0 px-4 py-8 md:px-8 lg:px-12 lg:py-12">{children}</main>
      </div>
    </div>
  );
}
