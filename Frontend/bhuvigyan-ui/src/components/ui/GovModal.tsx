import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface GovModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function GovModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md'
}: GovModalProps) {
  const sizes = {
    sm: 'max-w-[480px]',
    md: 'max-w-[640px]',
    lg: 'max-w-[800px]',
    xl: 'max-w-[1000px]'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`w-full ${sizes[size]} bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-10 overflow-hidden flex flex-col max-h-[90vh]`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] bg-white sticky top-0 z-20">
              <h2 className="text-lg font-bold text-[#1a1a1a]">{title}</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-[#f3f4f6] rounded-full text-[#6b7280] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 bg-white">
              {children}
            </div>

            {footer && (
              <div className="px-6 py-4 border-t border-[#e5e7eb] bg-[#f9fafb] flex justify-end gap-3 sticky bottom-0 z-20">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
