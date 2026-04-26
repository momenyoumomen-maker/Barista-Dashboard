import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  const tables = Array.from({ length: 20 }, (_, i) => i + 1);

  const handleStart = () => {
    if (selectedTable) {
      setLocation(`/menu/${selectedTable}`);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden sm:border-x sm:border-border max-w-md mx-auto shadow-2xl">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full flex flex-col items-center text-center z-10 space-y-8"
      >
        <BrandLogo size={104} className="shadow-lg shadow-primary/20 rounded-3xl" />

        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground font-sans tracking-tight">مرحباً بك في ألسن كوفي</h1>
          <p className="text-sm uppercase tracking-[0.3em] text-primary font-bold">Alson Coffee</p>
          <p className="text-lg text-muted-foreground font-medium pt-2">القهوة تُصنع بحب. اختر طاولتك للبدء.</p>
        </div>

        <div className="w-full space-y-4 bg-card p-6 rounded-3xl border border-border shadow-sm">
          <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-wider text-right w-full">رقم الطاولة</h2>
          
          <div className="grid grid-cols-5 gap-3" dir="ltr">
            {tables.map((num) => (
              <button
                key={num}
                onClick={() => setSelectedTable(num)}
                className={`
                  h-14 rounded-2xl text-lg font-bold transition-all duration-200 flex items-center justify-center
                  ${selectedTable === num 
                    ? "bg-primary text-primary-foreground shadow-md scale-110 -translate-y-1" 
                    : "bg-muted text-foreground hover:bg-muted/80 hover:scale-105 active:scale-95"
                  }
                `}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <Button 
          size="lg" 
          className="w-full h-16 rounded-2xl text-xl font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          disabled={!selectedTable}
          onClick={handleStart}
        >
          {selectedTable ? `ابدأ الطلب لطاولة ${selectedTable}` : "الرجاء اختيار الطاولة"}
        </Button>
      </motion.div>
    </div>
  );
}
