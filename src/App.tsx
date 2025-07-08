import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/Header";
import { RecordingProvider } from "@/contexts/RecordingContext";
import RealTime from "./pages/RealTime";
import History from "./pages/History";
import Analysis from "./pages/Analysis";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RecordingProvider>
          <div className="relative min-h-screen">
            <Header />
            <main className="pt-14">
              <Routes>
                <Route path="/" element={<RealTime />} />
                <Route path="/history" element={<History />} />
                <Route path="/analysis" element={<Analysis />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </RecordingProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
