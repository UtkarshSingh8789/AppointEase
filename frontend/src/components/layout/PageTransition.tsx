import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/** Wraps page content with a subtle fade-in + slide-up animation */
export const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);
