'use client';

import { ReactNode, useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';

interface RotatingRedShadowProps {
  children: ReactNode;
  isActive: boolean;
  className?: string;
}

export default function RotatingRedShadow({
  children,
  isActive,
  className = ''
}: RotatingRedShadowProps) {
  const controls = useAnimationControls();

  // Animation pour l'ombre tournante
  useEffect(() => {
    if (isActive) {
      controls.start({
        boxShadow: [
          '0px -10px 10px 2px rgba(255,0,0,0.5), 0px -5px 5px 1px rgba(255,0,0,0.3)',
          '10px -7px 10px 2px rgba(255,0,0,0.5), 5px -3px 5px 1px rgba(255,0,0,0.3)',
          '10px 0px 10px 2px rgba(255,0,0,0.5), 5px 0px 5px 1px rgba(255,0,0,0.3)',
          '10px 7px 10px 2px rgba(255,0,0,0.5), 5px 3px 5px 1px rgba(255,0,0,0.3)',
          '0px 10px 10px 2px rgba(255,0,0,0.5), 0px 5px 5px 1px rgba(255,0,0,0.3)',
          '-10px 7px 10px 2px rgba(255,0,0,0.5), -5px 3px 5px 1px rgba(255,0,0,0.3)',
          '-10px 0px 10px 2px rgba(255,0,0,0.5), -5px 0px 5px 1px rgba(255,0,0,0.3)',
          '-10px -7px 10px 2px rgba(255,0,0,0.5), -5px -3px 5px 1px rgba(255,0,0,0.3)',
          '0px -10px 10px 2px rgba(255,0,0,0.5), 0px -5px 5px 1px rgba(255,0,0,0.3)',
        ],
        transition: {
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }
      });
    } else {
      controls.stop();
    }
  }, [isActive, controls]);

  return (
    <motion.div
      animate={controls}
      className={`${className}`}
      style={{
        border: isActive ? '2px solid rgba(255, 0, 0, 0.7)' : 'none',
        borderRadius: '0.75rem',  // Ajout d'un border-radius explicite
        position: 'relative',
        zIndex: 1,
        overflow: 'visible'
      }}
    >
      {children}
    </motion.div>
  );
}
