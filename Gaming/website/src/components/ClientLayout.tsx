'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'
import ScrollToTop from './ScrollToTop'
import SupportChatbot from './SupportChatbot'
import { AnimatePresence, motion } from 'framer-motion'
import InteractiveNetwork from './InteractiveNetwork'
import QueryProvider from './QueryProvider'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudio = pathname?.startsWith('/studio');

  if (isStudio) {
    return <QueryProvider>{children}</QueryProvider>;
  }

  return (
    <QueryProvider>
      <div className="fixed inset-0 pointer-events-none z-0">
        <InteractiveNetwork />
      </div>
      <Navbar />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex-1 flex flex-col items-center w-full"
        >
          {children}
        </motion.main>
      </AnimatePresence>
      <Footer />
      <SupportChatbot />
      <ScrollToTop />
    </QueryProvider>
  );
}
