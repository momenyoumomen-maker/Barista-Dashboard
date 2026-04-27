import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCheckoutTable,
  getListOrdersQueryKey,
  getGetActiveShiftQueryKey,
  getListOrdersByTableQueryKey,
} from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  LogOut,
  Utensils,
} from "lucide-react";

type PaymentMethod = "cash" | "visa";

interface TableSummary {
  tableNumber: number;
  orders: Order[];
  total: number;
  itemCount: number;
}

export function CashierTablesPanel({ orders }: { orders: Order[] }) {
  const tableMap = useMemo(() => {
    const map = new Map<number, TableSummary>();
    for (const o of orders) {
      if (o.status === "served" || o.status === "cancelled") continue;
      const entry =
        map.get(o.tableNumber) ?? {
          tableNumber: o.tableNumber,
          orders: [],
          total: 0,
          itemCount: 0,
        };
      entry.orders.push(o);
      entry.total += Number(o.totalPrice);
      entry.itemCount += o.items.reduce((s, it) => s + it.quantity, 0);
      map.set(o.tableNumber, entry);
    }
    return map;
  }, [orders]);

  const tables = Array.from({ length: 20 }, (_, i) => i + 1);
  const [checkoutTable, setCheckoutTable] = useState<TableSummary | null>(null);

  return (
    <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border flex items-center gap-3">
        <Utensils className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold font-sans">الطاولات</h2>
        <span className="text-xs text-muted-foreground mr-auto">
          {tableMap.size} مشغولة • {20 - tableMap.size} متاحة
        </span>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {tables.map((n) => {
          const summary = tableMap.get(n);
          const isOccupied = !!summary;
          return (
            <button
              key={n}
              type="button"
              disabled={!isOccupied}
              onClick={() => summary && setCheckoutTable(summary)}
              className={`text-right rounded-2xl border p-3 transition-all ${
                isOccupied
                  ? "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 cursor-pointer"
                  : "border-border bg-muted/20 text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">#{n}</span>
                {isOccupied ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20">
                    مشغولة
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                    متاحة
                  </span>
                )}
              </div>
              {isOccupied && summary && (
                <div className="mt-2 space-y-0.5">
                  <div className="text-xs text-muted-foreground">
                    {summary.orders.length} طلب • {summary.itemCount} صنف
                  </div>
                  <div className="text-base font-bold text-primary tabular-nums">
                    {summary.total.toFixed(2)} ج.م
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <CheckoutTableDialog
        summary={checkoutTable}
        onClose={() => setCheckoutTable(null)}
      />
    </div>
  );
}

function CheckoutTableDialog({
  summary,
  onClose,
}: {
  summary: TableSummary | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [payment, setPayment] = useState<PaymentMethod | null>(null);

  const checkout = useCheckoutTable({
    mutation: {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getGetActiveShiftQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListOrdersByTableQueryKey(result.tableNumber),
        });
        toast({
          title: "تم إنهاء الجلسة",
          description: `طاولة ${result.tableNumber} • ${result.totalCollected.toFixed(2)} ج.م`,
        });
        setPayment(null);
        onClose();
      },
      onError: () => {
        toast({
          title: "تعذر إنهاء الجلسة",
          description: "حاول مرة أخرى.",
          variant: "destructive",
        });
      },
    },
  });

  return (
    <Dialog
      open={summary !== null}
      onOpenChange={(open) => {
        if (!open) {
          setPayment(null);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[480px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5" />
            إنهاء جلسة الطاولة {summary?.tableNumber}
          </DialogTitle>
        </DialogHeader>
        {summary && (
          <div className="space-y-4 pt-2">
            <div className="bg-muted/40 rounded-2xl p-4 space-y-2 max-h-[35vh] overflow-y-auto">
              {summary.orders.map((o) => (
                <div key={o.id} className="space-y-1 pb-2 border-b border-border last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold">طلب #{o.id}</span>
                    <span className="font-bold text-primary tabular-nums">
                      {Number(o.totalPrice).toFixed(2)} ج.م
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {o.items
                      .map((it) => `${it.quantity}× ${it.name}`)
                      .join("، ")}
                  </div>
                  {o.paymentMethod && (
                    <div className="text-[11px] text-muted-foreground">
                      دُفع مسبقاً: {o.paymentMethod === "cash" ? "كاش" : "فيزا"}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">إجمالي الجلسة</span>
              <span className="text-2xl font-bold text-primary tabular-nums">
                {summary.total.toFixed(2)} ج.م
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-bold">
                طريقة الدفع للطلبات غير المدفوعة
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPayment("cash")}
                  className={`flex flex-col items-center justify-center gap-2 h-20 rounded-xl border-2 transition-all ${
                    payment === "cash"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-sm font-bold">كاش</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayment("visa")}
                  className={`flex flex-col items-center justify-center gap-2 h-20 rounded-xl border-2 transition-all ${
                    payment === "visa"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-sm font-bold">فيزا</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setPayment(null);
                  onClose();
                }}
                disabled={checkout.isPending}
              >
                إلغاء
              </Button>
              <Button
                className="rounded-xl gap-2"
                disabled={checkout.isPending || payment === null}
                onClick={() =>
                  checkout.mutate({
                    tableNumber: summary.tableNumber,
                    data: { paymentMethod: payment ?? undefined },
                  })
                }
              >
                {checkout.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                تأكيد الإنهاء
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
