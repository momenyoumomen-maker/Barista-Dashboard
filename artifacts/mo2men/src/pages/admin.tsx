import { useState } from "react";
import { 
  useGetTodayStats, 
  useGetPopularItems, 
  useListMenu, 
  useCreateMenuItem, 
  useUpdateMenuItem, 
  useDeleteMenuItem,
  getListMenuQueryKey
} from "@workspace/api-client-react";
import { StaffLayout } from "@/components/layout/staff-layout";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, DollarSign, Package, Clock, Plus, Edit, Trash2, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: stats, isLoading: isLoadingStats } = useGetTodayStats();
  const { data: popularItems, isLoading: isLoadingPopular } = useGetPopularItems();
  const { data: menuItems, isLoading: isLoadingMenu } = useListMenu();

  const createMenu = useCreateMenuItem({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMenuQueryKey() }) }
  });
  const updateMenu = useUpdateMenuItem({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMenuQueryKey() }) }
  });
  const deleteMenu = useDeleteMenuItem({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMenuQueryKey() }) }
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    prepMinutes: "5",
    imageUrl: "",
    available: true
  });

  const handleOpenDialog = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        price: item.price.toString(),
        description: item.description || "",
        prepMinutes: item.prepMinutes.toString(),
        imageUrl: item.imageUrl || "",
        available: item.available
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        category: "قهوة ساخنة",
        price: "",
        description: "",
        prepMinutes: "5",
        imageUrl: "",
        available: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    const data = {
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price),
      description: formData.description,
      prepMinutes: parseInt(formData.prepMinutes),
      imageUrl: formData.imageUrl,
      available: formData.available
    };

    if (editingItem) {
      updateMenu.mutate({ id: editingItem.id, data }, {
        onSuccess: () => {
          toast({ title: "نجاح", description: "تم تحديث الصنف بنجاح." });
          setIsDialogOpen(false);
        }
      });
    } else {
      createMenu.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "نجاح", description: "تمت إضافة الصنف بنجاح." });
          setIsDialogOpen(false);
        }
      });
    }
  };

  const handleToggleAvailable = (id: number, currentAvailable: boolean) => {
    updateMenu.mutate({ id, data: { available: !currentAvailable } });
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا الصنف؟")) {
      deleteMenu.mutate({ id }, {
        onSuccess: () => toast({ title: "تم الحذف", description: "تم حذف الصنف." })
      });
    }
  };

  return (
    <StaffLayout>
      <div className="space-y-8 pb-10">
        
        {/* Stats Panel */}
        <div>
          <h2 className="text-2xl font-bold mb-4 font-sans tracking-tight">إحصائيات اليوم</h2>
          {isLoadingStats ? (
            <div className="h-32 bg-muted rounded-2xl animate-pulse" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <span className="font-bold">المبيعات</span>
                </div>
                <div className="text-3xl font-bold font-sans">{stats?.revenue || 0} <span className="text-lg">ج.م</span></div>
              </div>
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                  <Package className="w-5 h-5 text-blue-500" />
                  <span className="font-bold">الطلبات المكتملة</span>
                </div>
                <div className="text-3xl font-bold font-sans">{stats?.servedOrders || 0}</div>
              </div>
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <span className="font-bold">إجمالي الطلبات</span>
                </div>
                <div className="text-3xl font-bold font-sans">{stats?.ordersCount || 0}</div>
              </div>
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <span className="font-bold">متوسط وقت التحضير</span>
                </div>
                <div className="text-3xl font-bold font-sans">{Math.round(stats?.averagePrepMinutes || 0)} <span className="text-lg">د</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Popular Items */}
        <div>
          <h2 className="text-2xl font-bold mb-4 font-sans tracking-tight">الأصناف الأكثر مبيعاً اليوم</h2>
          {isLoadingPopular ? (
            <div className="h-24 bg-muted rounded-2xl animate-pulse" />
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {popularItems?.map((item, idx) => (
                <div key={item.menuItemId} className="bg-card border border-border p-4 rounded-2xl shadow-sm min-w-[200px] flex-shrink-0 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.quantitySold} طلب</div>
                  </div>
                </div>
              ))}
              {popularItems?.length === 0 && (
                <div className="text-muted-foreground">لا توجد مبيعات بعد اليوم.</div>
              )}
            </div>
          )}
        </div>

        {/* Menu Management */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold font-sans tracking-tight">إدارة المنيو</h2>
            <Button onClick={() => handleOpenDialog()} className="rounded-xl font-bold gap-2">
              <Plus className="w-4 h-4" />
              إضافة صنف
            </Button>
          </div>
          
          {isLoadingMenu ? (
            <div className="h-64 bg-muted rounded-2xl animate-pulse" />
          ) : (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-muted/50 text-muted-foreground text-sm">
                    <tr>
                      <th className="p-4 font-bold">الصورة</th>
                      <th className="p-4 font-bold">الصنف</th>
                      <th className="p-4 font-bold">الفئة</th>
                      <th className="p-4 font-bold">السعر</th>
                      <th className="p-4 font-bold">الحالة</th>
                      <th className="p-4 font-bold">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {menuItems?.map(item => (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary/50">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-bold">{item.name}</td>
                        <td className="p-4 text-muted-foreground">{item.category}</td>
                        <td className="p-4 font-bold text-primary">{item.price} ج.م</td>
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleAvailable(item.id, item.available)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                              item.available ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                            }`}
                          >
                            {item.available ? "متاح" : "غير متاح"}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenDialog(item)}>
                              <Edit className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "تعديل الصنف" : "إضافة صنف جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">اسم الصنف</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">الفئة</label>
                <Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="مثال: قهوة ساخنة" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">السعر (ج.م)</label>
                <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">الوصف</label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">وقت التحضير (دقائق)</label>
                <Input type="number" value={formData.prepMinutes} onChange={e => setFormData({...formData, prepMinutes: e.target.value})} />
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer h-10">
                  <input 
                    type="checkbox" 
                    checked={formData.available} 
                    onChange={e => setFormData({...formData, available: e.target.checked})}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-bold">متاح للطلب</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">رابط الصورة (اختياري)</label>
              <Input value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="https://..." dir="ltr" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleSave} disabled={createMenu.isPending || updateMenu.isPending} className="rounded-xl">
              {(createMenu.isPending || updateMenu.isPending) && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}
