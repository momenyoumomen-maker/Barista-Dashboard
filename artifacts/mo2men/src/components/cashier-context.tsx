import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const STORAGE_KEY = "alson.cashier.shiftId";

interface CashierContextValue {
  rememberedShiftId: number | null;
  rememberShift: (id: number) => void;
  forgetShift: () => void;
}

const CashierContext = createContext<CashierContextValue | undefined>(undefined);

export function CashierProvider({ children }: { children: ReactNode }) {
  const [rememberedShiftId, setRememberedShiftId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) || null : null;
  });

  useEffect(() => {
    if (rememberedShiftId === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, String(rememberedShiftId));
    }
  }, [rememberedShiftId]);

  const value: CashierContextValue = {
    rememberedShiftId,
    rememberShift: (id) => setRememberedShiftId(id),
    forgetShift: () => setRememberedShiftId(null),
  };

  return <CashierContext.Provider value={value}>{children}</CashierContext.Provider>;
}

export function useCashier() {
  const ctx = useContext(CashierContext);
  if (!ctx) throw new Error("useCashier must be used inside CashierProvider");
  return ctx;
}
