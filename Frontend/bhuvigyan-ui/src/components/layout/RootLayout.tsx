import React from 'react';
import { motion } from 'framer-motion';
import PageBackground from './PageBackground';
import GovStrip from './GovStrip';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <PageBackground />
      <GovStrip />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex-1 flex flex-col"
      >
        {children}
      </motion.div>
    </div>
  );
}