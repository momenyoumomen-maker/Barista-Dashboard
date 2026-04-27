import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetActiveShift,
  useStartShift,
  useEndShift,
  useListOrders,
  getGetActiveShiftQueryKey,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import type { Shift, ShiftSummary, Order } from "@workspace/api-client-react";
import { StaffLayout } from "@/components/layout/staff-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useOrderEvents } from "@/hooks/use-order-events";
import { useCashier } from "@/components/cashier-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Coffee,
  DollarSign,
  Loader2,
  LogIn,
  LogOut,
  Receipt,
  Timer,
  User,
  CheckCircle2,
} from "lucide-react";

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes} د`;
  if (minutes === 0) return `${hours} س`;
  return `${hours} س ${minutes} د`;
}

function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CashierPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { rememberShift, forgetShift } = useCashier();

  const { data: activeData, isLoading: isLoadingActive } = useGetActiveShift({
    query: { refetchInterval: 30000 },
  });
  const activeShift = activeData?.shift ?? null;

  useOrderEvents({
    onEvent: () => {
      queryClient.invalidateQueries({ queryKey: getGetActiveShiftQueryKey() });
      if (activeShift) {
        queryClient.invalidateQueries({
          queryKey: getListOrdersQueryKey(),
        });
      }
    },
  });

  if (isLoadingActive) {
    return (
      <StaffLayout>
        <div className="flex-1 flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StaffLayout>
    );
  }

  if (!activeShift) {
    return (
      <StaffLayout>
        <CashierLogin
          onStarted={(shift) => {
            rememberShift(shift.id);
            queryClient.invalidateQueries({
              queryKey: getGetActiveShiftQueryKey(),
            });
            toast({
              title: "تم بدء الوردية",
              description: `أهلاً ${shift.cashierName}!`,
            });
          }}
        />
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <CashierDashboard
        shift={activeShift}
        onShiftEnded={() => {
          forgetShift();
          queryClient.invalidateQueries({
            queryKey: getGetActiveShiftQueryKey(),
          });
        }}
      />
    </StaffLayout>
  );
}

function CashierLogin({ onStarted }: { onStarted: (shift: Shift) => void }) {
  const [name, setName] = useState("");
  const { toast } = useToast();
  const startShift = useStartShift();

  const handleStart = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    startShift.mutate(
      { data: { cashierName: trimmed } },
      {
        onSuccess: (shift) => onStarted(shift),
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : "حدث خطأ غير متوقع";
          toast({
            title: "تعذر بدء الوردية",
            description: message,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card border border-border rounded-3xl shadow-xl p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Receipt className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">
            نقطة البيع — تسجيل الكاشير
          </h1>
          <p className="text-sm text-muted-foreground">
            أدخل اسمك للبدء في استلام الطلبات
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-bold text-foreground/80 text-right">
            اسم الكاشير
          </label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleStart();
              }}
              placeholder="اكتب اسمك هنا"
              className="h-14 pr-10 text-lg rounded-2xl bg-muted/50"
              autoFocus
            />
          </div>
        </div>

        <Button
          className="w-full h-14 rounded-2xl text-lg font-bold"
          disabled={!name.trim() || startShift.isPending}
          onClick={handleStart}
        >
          {startShift.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5 ml-2" />
              بدء الوردية
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          سيتم ربط جميع الطلبات الجديدة بهذه الوردية حتى يتم إنهاؤها.
        </p>
      </motion.div>
    </div>
  );
}

function CashierDashboard({
  shift,
  onShiftEnded,
}: {
  shift: Shift;
  onShiftEnded: () => void;
}) {
  const { toast } = useToast();
  const [now, setNow] = useState<number>(Date.now());
  const [endSummary, setEndSummary] = useState<ShiftSummary | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const { data: orders } = useListOrders(undefined, {
    query: { refetchInterval: 15000 },
  });

  const shiftOrders = useMemo<Order[]>(
    () => (orders ?? []).filter((o) => o.shiftId === shift.id),
    [orders, shift.id],
  );

  const liveStats = useMemo(() => {
    let revenue = 0;
    let served = 0;
    let active = 0;
    let cancelled = 0;
    for (const o of shiftOrders) {
      if (o.status === "cancelled") {
        cancelled += 1;
        continue;
      }
      revenue += Number(o.totalPrice);
      if (o.status === "served") served += 1;
      else active += 1;
    }
    return {
      revenue: Number(revenue.toFixed(2)),
      ordersCount: shiftOrders.length - cancelled,
      served,
      active,
      cancelled,
    };
  }, [shiftOrders]);

  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - new Date(shift.startedAt).getTime()) / 1000),
  );

  const endShift = useEndShift({
    mutation: {
      onSuccess: (summary) => {
        setEndSummary(summary);
        setConfirmEnd(false);
      },
      onError: () => {
        toast({
          title: "خطأ",
          description: "تعذر إنهاء الوردية",
          variant: "destructive",
        });
      },
    },
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header card */}
      <div className="bg-card border border-border rounded-3xl shadow-sm p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
            <User className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">الكاشير المناوب</p>
            <h1 className="text-2xl font-bold font-sans tracking-tight">
              {shift.cashierName}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              بدأت الوردية في {formatTime(shift.startedAt)} • منذ{" "}
              {formatDuration(elapsedSeconds)}
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          className="h-12 rounded-2xl font-bold gap-2 px-5"
          onClick={() => setConfirmEnd(true)}
          disabled={endShift.isPending}
        >
          <LogOut className="w-5 h-5" />
          إنهاء الوردية
        </Button>
      </div>

      {/* Live stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          icon={<DollarSign className="w-6 h-6" />}
          tone="green"
          label="مبيعات الوردية"
          value={`${liveStats.revenue} ج.م`}
        />
        <StatTile
          icon={<Receipt className="w-6 h-6" />}
          tone="primary"
          label="عدد الطلبات"
          value={String(liveStats.ordersCount)}
        />
        <StatTile
          icon={<Coffee className="w-6 h-6" />}
          tone="orange"
          label="قيد التنفيذ"
          value={String(liveStats.active)}
        />
        <StatTile
          icon={<Timer className="w-6 h-6" />}
          tone="muted"
          label="مدة الوردية"
          value={formatDuration(elapsedSeconds)}
        />
      </div>

      {/* Orders table */}
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold font-sans">طلبات الوردية الحالية</h2>
          <span className="text-sm text-muted-foreground">
            {shiftOrders.length} إجمالي
          </span>
        </div>
        {shiftOrders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            لا توجد طلبات بعد في هذه الوردية.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="p-4 font-bold">رقم الطلب</th>
                  <th className="p-4 font-bold">الطاولة</th>
                  <th className="p-4 font-bold">الأصناف</th>
                  <th className="p-4 font-bold">الوقت</th>
                  <th className="p-4 font-bold">الحالة</th>
                  <th className="p-4 font-bold">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {[...shiftOrders]
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime(),
                    )
                    .map((order) => (
                      <motion.tr
                        key={order.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-muted/20"
                      >
                        <td className="p-4 font-bold">#{order.id}</td>
                        <td className="p-4">{order.tableNumber}</td>
                        <td className="p-4 text-sm">
                          {order.items
                            .map((it) => `${it.quantity}× ${it.name}`)
                            .join("، ")}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {formatTime(order.createdAt)}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="p-4 font-bold text-primary">
                          {Number(order.totalPrice).toFixed(2)} ج.م
                        </td>
                      </motion.tr>
                    ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm end shift */}
      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent className="sm:max-w-[420px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنهاء الوردية؟</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            سيتم إغلاق هذه الوردية وعرض ملخصها. سيعود النظام إلى شاشة تسجيل
            الكاشير ليتمكن المناوب التالي من البدء.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setConfirmEnd(false)}
              disabled={endShift.isPending}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl gap-2"
              onClick={() => endShift.mutate({ id: shift.id })}
              disabled={endShift.isPending}
            >
              {endShift.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              تأكيد الإنهاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* End summary */}
      <Dialog
        open={endSummary !== null}
        onOpenChange={(open) => {
          if (!open && endSummary) {
            setEndSummary(null);
            onShiftEnded();
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              ملخص الوردية
            </DialogTitle>
          </DialogHeader>
          {endSummary && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/40 rounded-2xl p-4 space-y-2">
                <Row label="الكاشير" value={endSummary.cashierName} />
                <Row
                  label="بدأت في"
                  value={formatTime(endSummary.startedAt)}
                />
                <Row
                  label="انتهت في"
                  value={
                    endSummary.endedAt ? formatTime(endSummary.endedAt) : "-"
                  }
                />
                <Row
                  label="مدة الوردية"
                  value={formatDuration(endSummary.durationSeconds)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SummaryTile
                  label="إجمالي المبيعات"
                  value={`${endSummary.totalSales.toFixed(2)} ج.م`}
                  highlight
                />
                <SummaryTile
                  label="عدد الطلبات"
                  value={String(endSummary.ordersCount)}
                />
                <SummaryTile
                  label="طلبات مكتملة"
                  value={String(endSummary.servedOrders)}
                />
                <SummaryTile
                  label="طلبات ملغاة"
                  value={String(endSummary.cancelledOrders)}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button
              className="rounded-xl gap-2"
              onClick={() => {
                setEndSummary(null);
                onShiftEnded();
              }}
            >
              العودة لشاشة التسجيل
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "green" | "primary" | "orange" | "muted";
}) {
  const toneClass = {
    green: "bg-green-500/10 text-green-600",
    primary: "bg-primary/10 text-primary",
    orange: "bg-orange-500/10 text-orange-600",
    muted: "bg-muted text-foreground",
  }[tone];

  return (
    <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${toneClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-bold">{label}</p>
        <p className="text-xl font-bold font-sans">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta: Record<string, { label: string; cls: string }> = {
    pending: {
      label: "جديد",
      cls: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    },
    preparing: {
      label: "تحضير",
      cls: "bg-primary/10 text-primary border-primary/20",
    },
    ready: {
      label: "جاهز",
      cls: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    },
    served: {
      label: "تم التقديم",
      cls: "bg-muted text-muted-foreground border-border",
    },
    cancelled: {
      label: "ملغي",
      cls: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    },
  };
  const m = meta[status] ?? meta.pending;
  return (
    <span
      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-2xl border ${
        highlight
          ? "bg-primary/10 border-primary/20"
          : "bg-muted/40 border-border"
      }`}
    >
      <p className="text-xs text-muted-foreground font-bold">{label}</p>
      <p
        className={`text-lg font-bold font-sans mt-1 ${
          highlight ? "text-primary" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
