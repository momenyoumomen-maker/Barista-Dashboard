import { useEffect, useRef } from "react";
import { useListOrders, useGetQueueSummary, useUpdateOrderStatus, getListOrdersQueryKey, getGetQueueSummaryQueryKey } from "@workspace/api-client-react";
import { StaffLayout } from "@/components/layout/staff-layout";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Clock, Coffee, CheckCircle2, ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrderEvents } from "@/hooks/use-order-events";

const StatusColumns = ["pending", "preparing", "ready"] as const;
type Status = typeof StatusColumns[number];

const statusTitles: Record<Status, string> = {
  pending: "الطلبات الجديدة",
  preparing: "قيد التحضير",
  ready: "جاهز للتقديم"
};

const statusColors: Record<Status, string> = {
  pending: "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400",
  preparing: "bg-primary/10 border-primary/20 text-primary",
  ready: "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
};

const nextStatus: Record<Status, "preparing" | "ready" | "served"> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served"
};

const nextStatusText: Record<Status, string> = {
  pending: "بدء التحضير",
  preparing: "مكتمل",
  ready: "تم التقديم"
};

export default function BaristaDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Audio for notifications
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevPendingCountRef = useRef<number>(0);

  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"); // simple placeholder base64
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
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ activeOnly: true }) });
        queryClient.invalidateQueries({ queryKey: getGetQueueSummaryQueryKey() });
      },
      onError: () => {
        toast({ title: "خطأ", description: "لم نتمكن من تحديث حالة الطلب", variant: "destructive" });
      }
    }
  });


  if (isLoadingOrders) {
    return (
      <StaffLayout>
        <div className="flex-1 flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StaffLayout>
    );
  }

  // Group orders by status
  const groupedOrders = StatusColumns.reduce((acc, status) => {
    acc[status] = orders?.filter(o => o.status === status) || [];
    return acc;
  }, {} as Record<Status, typeof orders>);

  const handleAdvanceStatus = (orderId: number, currentStatus: Status) => {
    updateStatus.mutate({
      id: orderId,
      data: { status: nextStatus[currentStatus] }
    });
  };

  return (
    <StaffLayout>
      <div className="flex flex-col h-full space-y-6">
        {/* Top Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-bold">جديد</p>
              <p className="text-2xl font-bold font-sans">{summary?.pending || 0}</p>
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-bold">تحضير</p>
              <p className="text-2xl font-bold font-sans">{summary?.preparing || 0}</p>
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-bold">جاهز</p>
              <p className="text-2xl font-bold font-sans">{summary?.ready || 0}</p>
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-foreground">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-bold">أقدم انتظار</p>
              <p className="text-2xl font-bold font-sans">
                {summary?.oldestWaitingSeconds 
                  ? `${Math.floor(summary.oldestWaitingSeconds / 60)} دقيقة` 
                  : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0 overflow-hidden">
          {StatusColumns.map(status => (
            <div key={status} className="flex flex-col h-full bg-muted/30 rounded-3xl overflow-hidden border border-border/50">
              <div className={`p-4 border-b font-bold text-lg flex justify-between items-center ${statusColors[status]}`}>
                <span>{statusTitles[status]}</span>
                <span className="bg-background/50 px-2.5 py-0.5 rounded-full text-sm">
                  {groupedOrders[status]?.length || 0}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                  {groupedOrders[status]?.map(order => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={order.id}
                      className="bg-card rounded-2xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex flex-col items-center justify-center font-bold font-sans leading-tight">
                            <span className="text-[10px] opacity-80">طاولة</span>
                            <span className="text-lg">{order.tableNumber}</span>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">طلب #{order.id}</div>
                            <div className="text-sm font-medium flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4 bg-muted/50 p-3 rounded-xl">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="font-bold text-primary">{item.quantity}x</span>
                            <div className="flex-1">
                              <span className="font-bold text-sm">{item.name}</span>
                              {item.notes && <p className="text-xs text-destructive mt-0.5 pr-2 border-r-2 border-destructive/30">{item.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div className="mb-4 text-sm bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 p-2.5 rounded-xl border border-yellow-500/20">
                          <span className="font-bold block mb-1 text-xs uppercase">ملاحظة عامة:</span>
                          {order.notes}
                        </div>
                      )}

                      <Button 
                        className={`w-full font-bold h-12 rounded-xl text-md ${status === 'ready' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                        onClick={() => handleAdvanceStatus(order.id, status)}
                        disabled={updateStatus.isPending}
                      >
                        {nextStatusText[status]}
                        <ChevronLeft className="w-5 h-5 ml-2 mr-[-8px]" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {groupedOrders[status]?.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-10">
                    <Coffee className="w-12 h-12 mb-2" />
                    <p>لا يوجد طلبات</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </StaffLayout>
  );
}
