import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Coffee, Settings, LayoutDashboard } from "lucide-react";

export function StaffLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/barista", label: "الباريستا", icon: Coffee },
    { href: "/admin", label: "الإدارة", icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-card border-l border-border flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground font-sans">مؤمن</h1>
            <p className="text-xs text-muted-foreground">MO2men Coffee</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 pb-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
          {navItems.map((item) => {
            const active = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-semibold">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
