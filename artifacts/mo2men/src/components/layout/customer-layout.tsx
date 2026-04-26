import { ReactNode } from "react";

export function CustomerLayout({ children, tableNumber }: { children: ReactNode, tableNumber?: string }) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden sm:border-x sm:border-border">
      {tableNumber && (
        <header className="bg-card px-6 py-4 flex items-center justify-between border-b border-border z-10 sticky top-0">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-foreground font-sans tracking-tight">مؤمن</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">MO2men</p>
          </div>
          <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20 flex items-center gap-2">
            <span className="text-sm font-bold">طاولة {tableNumber}</span>
          </div>
        </header>
      )}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}
