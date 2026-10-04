"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import { AnimatePresence, motion } from "framer-motion";
import QueryProvider from "@/components/integrations/QueryProvider";

const InteractiveNetwork = dynamic(() => import("@/components/ui/InteractiveNetwork"), {
  ssr: false,
});

const SupportChatbot = dynamic(() => import("@/components/support/SupportChatbot"), {
  ssr: false,
});

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [canLoadExtras, setCanLoadExtras] = useState(false);

  useEffect(() => {
    // Defer heavy canvas background and support chatbot until initial page paint & hydration are complete
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(
        () => setCanLoadExtras(true),
        { timeout: 1500 }
      );
      return () => (window as any).cancelIdleCallback(id);
    } else {
      const timer = setTimeout(() => setCanLoadExtras(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <QueryProvider>
      {canLoadExtras && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <InteractiveNetwork />
        </div>
      )}
      <Navbar />
      <AnimatePresence initial={false}>
        <motion.main
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          className="flex-1 flex flex-col items-center w-full"
        >
          {children}
        </motion.main>
      </AnimatePresence>
      <Footer />
      {canLoadExtras && <SupportChatbot />}
      <ScrollToTop />
    </QueryProvider>
  );
}
