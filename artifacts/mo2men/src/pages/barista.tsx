import { useEffect, useRef, useState } from "react";
import {
  useListOrders,
  useGetQueueSummary,
  useUpdateOrderStatus,
  getListOrdersQueryKey,
  getGetQueueSummaryQueryKey,
} from "@workspace/api-client-react";
import { StaffLayout } from "@/components/layout/staff-layout";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Coffee,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Radio,
  Inbox,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrderEvents } from "@/hooks/use-order-events";

type ActiveStatus = "pending" | "preparing" | "ready";

const statusMeta: Record<
  ActiveStatus,
  { label: string; chipClass: string; barClass: string }
> = {
  pending: {
    label: "جديد",
    chipClass:
      "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    barClass: "bg-orange-500",
  },
  preparing: {
    label: "قيد التحضير",
    chipClass: "bg-primary/10 text-primary border-primary/20",
    barClass: "bg-primary",
  },
  ready: {
    label: "جاهز للتقديم",
    chipClass:
      "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    barClass: "bg-green-500",
  },
};

const nextStatus: Record<ActiveStatus, "preparing" | "ready" | "served"> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
};

const actionLabel: Record<ActiveStatus, string> = {
  pending: "بدء التحضير",
  preparing: "تم التحضير",
  ready: "تم التقديم",
};

function formatElapsed(createdAt: string, now: number): string {
  const diffSec = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
  if (diffSec < 60) return `منذ ${diffSec} ثانية`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHr = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  return remMin === 0
    ? `منذ ${diffHr} ساعة`
    : `منذ ${diffHr} س ${remMin} د`;
}

export default function BaristaDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    audioRef.current = new Audio(
      "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU",
    );
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const { data: orders, isLoading: isLoadingOrders } = useListOrders(
    { activeOnly: true },
    { query: { refetchInterval: 15000 } },
  );

  const { data: summary } = useGetQueueSummary({
    query: { refetchInterval: 15000 },
  });

  useOrderEvents({
    onEvent: (event) => {
      if (event.type === "created") {
        audioRef.current?.play().catch(() => undefined);
        toast({
          title: "طلب جديد!",
          description: `طاولة #${event.tableNumber} — طلب #${event.orderId}`,
        });
      }
    },
  });

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListOrdersQueryKey({ activeOnly: true }),
        });
        queryClient.invalidateQueries({ queryKey: getGetQueueSummaryQueryKey() });
      },
      onError: () => {
        toast({
          title: "خطأ",
          description: "لم نتمكن من تحديث حالة الطلب",
          variant: "destructive",
        });
      },
    },
  });

  const handleAdvance = (orderId: number, currentStatus: ActiveStatus) => {
    updateStatus.mutate({
      id: orderId,
      data: { status: nextStatus[currentStatus] },
    });
  };

  if (isLoadingOrders) {
    return (
      <StaffLayout>
        <div className="flex-1 flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StaffLayout>
    );
  }

  const activeOrders = (orders ?? [])
    .filter((o): o is typeof o & { status: ActiveStatus } =>
      ["pending", "preparing", "ready"].includes(o.status),
    )
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  return (
    <StaffLayout>
      <div className="flex flex-col h-full space-y-6">
        {/* Top Summary Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-bold">جديد</p>
              <p className="text-2xl font-bold font-sans">
                {summary?.pending ?? 0}
              </p>
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-bold">تحضير</p>
              <p className="text-2xl font-bold font-sans">
                {summary?.preparing ?? 0}
              </p>
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-bold">جاهز</p>
              <p className="text-2xl font-bold font-sans">
                {summary?.ready ?? 0}
              </p>
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-foreground">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-bold">
                أقدم انتظار
              </p>
              <p className="text-2xl font-bold font-sans">
                {summary?.oldestWaitingSeconds
                  ? `${Math.floor(summary.oldestWaitingSeconds / 60)} دقيقة`
                  : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Active Orders List */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold font-sans tracking-tight">
                قائمة الطلبات النشطة
              </h2>
              <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                <Radio className="w-3 h-3 animate-pulse" />
                مباشر
              </span>
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              {activeOrders.length} طلب نشط
            </span>
          </div>

          <div className="flex-1 overflow-y-auto -mx-2 px-2">
            <AnimatePresence mode="popLayout">
              {activeOrders.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[300px] flex flex-col items-center justify-center text-center bg-muted/30 rounded-3xl border border-dashed border-border p-12"
                >
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Inbox className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-lg mb-1">
                    لا توجد طلبات حالياً
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    سيتم عرض الطلبات الجديدة هنا فور وصولها.
                  </p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
                  {activeOrders.map((order) => {
                    const meta = statusMeta[order.status];
                    return (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col"
                      >
                        <div className={`h-1.5 ${meta.barClass}`} />
                        <div className="p-5 flex flex-col gap-4 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex flex-col items-center justify-center font-bold font-sans leading-tight shadow-sm">
                                <span className="text-[10px] opacity-80">
                                  طاولة
                                </span>
                                <span className="text-xl">
                                  {order.tableNumber}
                                </span>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  طلب #{order.id}
                                </div>
                                <div className="text-sm font-medium flex items-center gap-1.5 mt-1 text-foreground">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatElapsed(order.createdAt, now)}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`text-xs font-bold px-3 py-1.5 rounded-full border ${meta.chipClass}`}
                            >
                              {meta.label}
                            </span>
                          </div>

                          <div className="space-y-2 bg-muted/50 p-3 rounded-2xl">
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex gap-2 items-start"
                              >
                                <span className="font-bold text-primary text-sm min-w-[28px]">
                                  {item.quantity}x
                                </span>
                                <div className="flex-1">
                                  <span className="font-bold text-sm">
                                    {item.name}
                                  </span>
                                  {item.notes && (
                                    <p className="text-xs text-destructive mt-0.5 pr-2 border-r-2 border-destructive/30">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {order.notes && (
                            <div className="text-sm bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 p-2.5 rounded-xl border border-yellow-500/20">
                              <span className="font-bold block mb-1 text-xs uppercase">
                                ملاحظة عامة:
                              </span>
                              {order.notes}
                            </div>
                          )}

                          <Button
                            className={`w-full font-bold h-12 rounded-xl text-md mt-auto ${
                              order.status === "ready"
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : ""
                            }`}
                            onClick={() =>
                              handleAdvance(order.id, order.status)
                            }
                            disabled={updateStatus.isPending}
                          >
                            {actionLabel[order.status]}
                            <ChevronLeft className="w-5 h-5 ml-2 mr-[-8px]" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}
