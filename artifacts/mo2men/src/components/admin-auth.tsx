import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, LogIn, Loader2, AlertCircle } from "lucide-react";
import { StaffLayout } from "@/components/layout/staff-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "alson.admin.session";
const ADMIN_USERNAME = "Alalson";
const ADMIN_PASSWORD = "alalson2026";

interface AdminAuthValue {
  isAuthenticated: boolean;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthValue | undefined>(undefined);

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthGate");
  return ctx;
}

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    if (isAuthenticated) {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [isAuthenticated]);

  const value: AdminAuthValue = {
    isAuthenticated,
    logout: () => setIsAuthenticated(false),
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {isAuthenticated ? (
        children
      ) : (
        <AdminLogin onSuccess={() => setIsAuthenticated(true)} />
      )}
    </AdminAuthContext.Provider>
  );
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError(null);
    setTimeout(() => {
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        onSuccess();
      } else {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      }
      setSubmitting(false);
    }, 250);
  };

  return (
    <StaffLayout>
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card border border-border rounded-3xl shadow-xl p-8 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold font-sans tracking-tight">
              تسجيل دخول الإدارة
            </h1>
            <p className="text-sm text-muted-foreground">
              لوحة تحكم ألسن كوفي محمية. الرجاء تسجيل الدخول.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-foreground/80 text-right">
                اسم المستخدم
              </label>
              <Input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="اسم المستخدم"
                className="h-12 rounded-xl bg-muted/50"
                autoFocus
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-foreground/80 text-right">
                كلمة المرور
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className="h-12 rounded-xl bg-muted/50"
                dir="ltr"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-bold gap-2"
            disabled={!username || !password || submitting}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                دخول
              </>
            )}
          </Button>
        </motion.form>
      </div>
    </StaffLayout>
  );
}
