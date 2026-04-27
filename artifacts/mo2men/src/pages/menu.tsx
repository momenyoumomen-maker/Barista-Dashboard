import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useListMenu, useListCategories, useCreateOrder } from "@workspace/api-client-react";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { useCart } from "@/components/cart-context";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ShoppingBag, Loader2, ArrowRight, Coffee } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function Menu() {
  const [, params] = useRoute("/menu/:tableNumber");
  const tableNumber = params?.tableNumber;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");

  const { data: menuItems, isLoading: isLoadingMenu } = useListMenu({ availableOnly: true });
  const { data: categories, isLoading: isLoadingCategories } = useListCategories();
  
  const { items, addItem, updateQuantity, totalPrice, clearCart } = useCart();
  const createOrder = useCreateOrder();

  const handleCheckout = () => {
    if (items.length === 0 || !tableNumber) return;

    createOrder.mutate(
      {
        data: {
          tableNumber: parseInt(tableNumber),
          items: items.map(item => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            notes: item.notes
          })),
          notes: orderNotes
        }
      },
      {
        onSuccess: () => {
          clearCart();
          toast({
            title: "تم استلام طلبك!",
            description: "جارٍ التحضير بكل حب.",
          });
          setLocation(`/order/${tableNumber}`);
        },
        onError: () => {
          toast({
            title: "عذراً",
            description: "حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.",
            variant: "destructive"
          });
        }
      }
    );
  };

  const filteredItems = menuItems?.filter(
    item => activeCategory === "all" || item.category === activeCategory
  );

  return (
    <CustomerLayout tableNumber={tableNumber}>
      {/* Categories */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-md z-20 border-b border-border">
        <div className="overflow-x-auto no-scrollbar flex gap-2 p-4">
          <button
            onClick={() => setActiveCategory("all")}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full font-bold text-sm transition-colors ${
              activeCategory === "all" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            الكل
          </button>
          {categories?.map(cat => (
            <button
              key={cat.category}
              onClick={() => setActiveCategory(cat.category)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full font-bold text-sm transition-colors ${
                activeCategory === cat.category ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}
            >
              {cat.category}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="flex-1 p-4 pb-32">
        {isLoadingMenu || isLoadingCategories ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredItems?.map(item => {
              const cartItem = items.find(i => i.menuItem.id === item.id);
              
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={item.id} 
                  className="bg-card border border-border rounded-3xl overflow-hidden flex flex-col shadow-sm"
                >
                  <div className="aspect-square bg-muted relative">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary/20 text-secondary">
                        <Coffee className="w-10 h-10 opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-xl text-xs font-bold">
                      {item.price} ج.م
                    </div>
                  </div>
                  
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="font-bold text-foreground mb-1 leading-tight">{item.name}</h3>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.description}</p>}
                    
                    <div className="mt-auto pt-3">
                      {cartItem ? (
                        <div className="flex items-center justify-between bg-primary/10 rounded-xl p-1">
                          <button 
                            onClick={() => updateQuantity(item.id, cartItem.quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <span className="font-bold w-6 text-center">{cartItem.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-background text-foreground flex items-center justify-center shadow-sm"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Button 
                          variant="secondary" 
                          className="w-full rounded-xl font-bold"
                          onClick={() => addItem(item, 1)}
                        >
                          إضافة
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Cart Summary */}
      <AnimatePresence>
        {items.length > 0 && !isCartOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 max-w-md mx-auto z-30"
          >
            <button 
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-foreground text-background p-4 rounded-3xl flex items-center justify-between shadow-2xl hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-background/20 rounded-full flex items-center justify-center relative">
                  <ShoppingBag className="w-5 h-5" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs font-bold flex items-center justify-center border-2 border-foreground">
                    {items.reduce((acc, item) => acc + item.quantity, 0)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">عرض الطلب</p>
                  <p className="text-xs opacity-80">{totalPrice} ج.م</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 max-w-md mx-auto"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-2xl z-50 max-w-md mx-auto max-h-[85vh] flex flex-col"
            >
              <div className="p-4 text-center border-b border-border">
                <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />
                <h2 className="text-xl font-bold">طلبك</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.map(item => (
                  <div key={item.menuItem.id} className="flex gap-4">
                    {item.menuItem.imageUrl ? (
                      <img src={item.menuItem.imageUrl} className="w-16 h-16 rounded-2xl object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center">
                        <Coffee className="w-6 h-6 text-secondary/50" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between font-bold mb-1">
                        <span>{item.menuItem.name}</span>
                        <span>{item.menuItem.price * item.quantity} ج.م</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 bg-muted rounded-xl p-1">
                          <button 
                            onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-background shadow-sm flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-background shadow-sm flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-border">
                  <h3 className="font-bold text-sm mb-2 text-muted-foreground">ملاحظات إضافية</h3>
                  <Input 
                    placeholder="بدون سكر، حليب شوفان..." 
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="bg-muted border-none rounded-xl"
                  />
                </div>
              </div>
              
              <div className="p-4 bg-background border-t border-border space-y-4">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>الإجمالي</span>
                  <span className="text-primary">{totalPrice} ج.م</span>
                </div>
                <Button 
                  className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20"
                  onClick={handleCheckout}
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "تأكيد الطلب"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </CustomerLayout>
  );
}
