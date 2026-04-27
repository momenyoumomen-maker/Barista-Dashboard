import { useMemo, useState } from "react";
import {
  useListMenu,
  useCreateOrder,
  getListMenuQueryKey,
  getListOrdersQueryKey,
  getGetActiveShiftQueryKey,
  getListOrdersByTableQueryKey,
} from "@workspace/api-client-react";
import type { MenuItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Banknote,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react";

type PaymentMethod = "cash" | "visa";

interface CartLine {
  item: MenuItem;
  quantity: number;
}

export function CashierNewOrderDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: menu, isLoading: isLoadingMenu } = useListMenu(
    { availableOnly: true },
    {
      query: {
        queryKey: getListMenuQueryKey({ availableOnly: true }),
        enabled: open,
      },
    },
  );

  const [tableNumber, setTableNumber] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [cart, setCart] = useState<Record<number, CartLine>>({});
  const [payment, setPayment] = useState<PaymentMethod | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    (menu ?? []).forEach((m) => set.add(m.category));
    return ["all", ...Array.from(set)];
  }, [menu]);

  const filteredMenu = useMemo(() => {
    const q = search.trim();
    return (menu ?? []).filter((m) => {
      if (activeCategory !== "all" && m.category !== activeCategory)
        return false;
      if (q && !m.name.includes(q)) return false;
      return true;
    });
  }, [menu, activeCategory, search]);

  const cartLines = Object.values(cart);
  const total = cartLines.reduce(
    (s, l) => s + Number(l.item.price) * l.quantity,
    0,
  );

  const reset = () => {
    setTableNumber(1);
    setSearch("");
    setActiveCategory("all");
    setCart({});
    setPayment(null);
  };

  const adjust = (item: MenuItem, delta: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const existing = next[item.id]?.quantity ?? 0;
      const q = Math.max(0, existing + delta);
      if (q === 0) delete next[item.id];
      else next[item.id] = { item, quantity: q };
      return next;
    });
  };

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: (order) => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getGetActiveShiftQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListOrdersByTableQueryKey(order.tableNumber),
        });
        toast({
          title: "تم تأكيد الطلب",
          description: `طلب #${order.id} • طاولة ${order.tableNumber}`,
        });
        reset();
        onOpenChange(false);
        onCreated();
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : "خطأ غير متوقع";
        toast({
          title: "تعذر إنشاء الطلب",
          description: message,
          variant: "destructive",
        });
      },
    },
  });

  const canConfirm = cartLines.length > 0 && payment !== null && tableNumber > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    createOrder.mutate({
      data: {
        tableNumber,
        items: cartLines.map((l) => ({
          menuItemId: l.item.id,
          quantity: l.quantity,
        })),
        paymentMethod: payment ?? undefined,
      },
    });
  };

  const tables = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent
        className="sm:max-w-[860px] max-h-[92vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            طلب جديد
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[1.4fr_1fr] gap-5 pt-2">
          {/* Left: items */}
          <div className="space-y-4">
            {/* Table picker */}
            <div className="space-y-2">
              <label className="text-sm font-bold">رقم الطاولة</label>
              <div className="grid grid-cols-10 gap-1.5" dir="ltr">
                {tables.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTableNumber(n)}
                    className={`h-9 rounded-lg text-sm font-bold transition-all ${
                      tableNumber === n
                        ? "bg-primary text-primary-foreground shadow"
                        : "bg-muted text-foreground hover:bg-muted/70"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Search + categories */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث في المنيو…"
                  className="h-10 pr-9 rounded-xl bg-muted/40"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setActiveCategory(c)}
                    className={`px-3 h-8 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                      activeCategory === c
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {c === "all" ? "الكل" : c}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu list */}
            <div className="border border-border rounded-2xl bg-card max-h-[44vh] overflow-y-auto">
              {isLoadingMenu ? (
                <div className="p-10 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : filteredMenu.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  لا توجد أصناف.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredMenu.map((item) => {
                    const q = cart[item.id]?.quantity ?? 0;
                    return (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.category} • {item.price} ج.م
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => adjust(item, -1)}
                            disabled={q === 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-6 text-center font-bold">{q}</span>
                          <Button
                            type="button"
                            variant="default"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => adjust(item, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right: cart + payment */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="font-bold">سلّة الطلب</div>
              {cartLines.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  لم تتم إضافة أصناف بعد.
                </div>
              ) : (
                <ul className="space-y-2 max-h-[28vh] overflow-y-auto pr-1">
                  {cartLines.map((l) => (
                    <li
                      key={l.item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{l.item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {l.quantity}× {l.item.price} ج.م
                        </div>
                      </div>
                      <div className="font-bold text-primary tabular-nums">
                        {(Number(l.item.price) * l.quantity).toFixed(2)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">الإجمالي</span>
                <span className="text-xl font-bold text-primary tabular-nums">
                  {total.toFixed(2)} ج.م
                </span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="font-bold">طريقة الدفع</div>
              <div className="grid grid-cols-2 gap-3">
                <PaymentChoice
                  selected={payment === "cash"}
                  onClick={() => setPayment("cash")}
                  icon={<Banknote className="w-5 h-5" />}
                  label="كاش"
                />
                <PaymentChoice
                  selected={payment === "visa"}
                  onClick={() => setPayment("visa")}
                  icon={<CreditCard className="w-5 h-5" />}
                  label="فيزا"
                />
              </div>
            </div>

            <Button
              className="w-full h-12 rounded-xl text-base font-bold gap-2"
              disabled={!canConfirm || createOrder.isPending}
              onClick={handleConfirm}
            >
              {createOrder.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  تأكيد الطلب
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentChoice({
  selected,
  onClick,
  icon,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 h-20 rounded-xl border-2 transition-all ${
        selected
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
      }`}
    >
      {icon}
      <span className="text-sm font-bold">{label}</span>
    </button>
  );
}
