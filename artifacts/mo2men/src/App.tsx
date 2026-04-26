import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { CartProvider } from "@/components/cart-context";

// Pages
import Home from "@/pages/home";
import Menu from "@/pages/menu";
import OrderTracking from "@/pages/order";
import BaristaDashboard from "@/pages/barista";
import AdminDashboard from "@/pages/admin";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/menu/:tableNumber" component={Menu} />
      <Route path="/order/:tableNumber" component={OrderTracking} />
      <Route path="/barista" component={BaristaDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
