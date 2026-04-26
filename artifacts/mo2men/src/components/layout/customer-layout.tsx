import { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";

export function CustomerLayout({ children, tableNumber }: { children: ReactNode, tableNumber?: string }) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden sm:border-x sm:border-border">
      {tableNumber && (
        <header className="bg-card px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3 border-b border-border z-10 sticky top-0">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size={40} />
            <div className="flex flex-col min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-foreground font-sans tracking-tight leading-tight truncate">ألسن كوفي</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest leading-tight">Alson Coffee</p>
            </div>
          </div>
          <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20 flex items-center gap-2 shrink-0">
            <span className="text-xs sm:text-sm font-bold whitespace-nowrap">طاولة {tableNumber}</span>
          </div>
        </header>
      )}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}
