import { useRoute, useLocation } from "wouter";
import {
  useListOrdersByTable,
  getListOrdersByTableQueryKey,
} from "@workspace/api-client-react";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Loader2, Clock, CheckCircle2, Coffee, Check, ArrowRight, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useOrderEvents } from "@/hooks/use-order-events";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "pending": return <Clock className="w-5 h-5 text-yellow-500" />;
    case "preparing": return <Coffee className="w-5 h-5 text-primary" />;
    case "ready": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case "served": return <Check className="w-5 h-5 text-blue-500" />;
    default: return <Clock className="w-5 h-5" />;
  }
};

const StatusText = ({ status }: { status: string }) => {
  switch (status) {
    case "pending": return "في الانتظار";
    case "preparing": return "جاري التحضير";
    case "ready": return "جاهز للتقديم";
    case "served": return "تم التقديم";
    case "cancelled": return "ملغي";
    default: return status;
  }
};

export default function OrderTracking() {
  const [, params] = useRoute("/order/:tableNumber");
  const tableNumber = params?.tableNumber;
  const tableNum = tableNumber ? parseInt(tableNumber) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const lastStatusByOrder = useRef<Record<number, string>>({});

  const { data: orders, isLoading } = useListOrdersByTable(
    tableNum,
    {
      query: {
        queryKey: getListOrdersByTableQueryKey(tableNum),
        enabled: !!tableNumber,
      },
    },
  );

  useOrderEvents({
    tableNumber: tableNum,
    onEvent: (event) => {
      if (event.tableNumber !== tableNum) return;
      if (event.type !== "updated") return;
      const previous = lastStatusByOrder.current[event.orderId];
      if (previous === event.status) return;
      lastStatusByOrder.current[event.orderId] = event.status;
      if (event.status === "preparing") {
        toast({ title: "بدأ تحضير طلبك", description: `طلب #${event.orderId} الآن قيد التحضير` });
      } else if (event.status === "ready") {
        toast({ title: "طلبك جاهز!", description: `طلب #${event.orderId} جاهز للتقديم` });
      } else if (event.status === "served") {
        toast({ title: "تم تقديم طلبك", description: `بالهنا والشفا!` });
      }
    },
  });

  const activeOrders = orders?.filter(o => o.status !== "served" && o.status !== "cancelled") || [];

  if (isLoading) {
    return (
      <CustomerLayout tableNumber={tableNumber}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout tableNumber={tableNumber}>
      <div className="flex-1 p-4 bg-muted/30">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-sans tracking-tight">طلباتك الحالية</h2>
            <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
              <Radio className="w-3 h-3 animate-pulse" />
              مباشر
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLocation(`/menu/${tableNumber}`)} className="rounded-xl font-bold gap-2">
            إضافة طلب جديد
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {activeOrders.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="text-center p-12 bg-card rounded-3xl border border-border shadow-sm"
              >
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Coffee className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-2">لا توجد طلبات قيد التحضير</h3>
                <p className="text-muted-foreground mb-6">استمتع بقهوتك، أو اطلب المزيد.</p>
                <Button onClick={() => setLocation(`/menu/${tableNumber}`)} className="rounded-xl">تصفح المنيو</Button>
              </motion.div>
            ) : (
              activeOrders.map(order => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden"
                >
                  <div className={`p-4 border-b border-border flex items-center justify-between ${
                    order.status === "ready" ? "bg-green-500/10" : 
                    order.status === "preparing" ? "bg-primary/10" : "bg-card"
                  } transition-colors duration-500`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm">
                        <StatusIcon status={order.status} />
                      </div>
                      <div>
                        <div className="font-bold text-lg"><StatusText status={order.status} /></div>
                        <div className="text-xs text-muted-foreground">طلب #{order.id}</div>
                      </div>
                    </div>
                    <div className="font-bold text-lg text-primary">{order.totalPrice} ج.م</div>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div className="flex gap-2 items-center">
                          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {item.quantity}x
                          </div>
                          <div>
                            <div className="font-bold text-sm">{item.name}</div>
                            {item.notes && <div className="text-xs text-muted-foreground mt-0.5">{item.notes}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {order.notes && (
                      <div className="mt-4 pt-3 border-t border-dashed border-border">
                        <div className="text-xs font-bold text-muted-foreground mb-1">ملاحظات الطلب:</div>
                        <div className="text-sm">{order.notes}</div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </CustomerLayout>
  );
}
