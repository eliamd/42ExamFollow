'use client';

import { useEffect, useRef, useState } from 'react';
import ReactCanvasConfetti from 'react-canvas-confetti';
import type { CreateTypes } from 'canvas-confetti';

interface ConfettiProps {
  active: boolean;
}

export default function Confetti({ active }: ConfettiProps) {
  const refAnimationInstance = useRef<CreateTypes | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const getInstance = (instance: CreateTypes | null) => {
    refAnimationInstance.current = instance;
  };

  const makeShot = (angle: number, originX: number) => {
    if (refAnimationInstance.current) {
      refAnimationInstance.current({
        particleCount: 80,
        angle,
        spread: 60,
        origin: { x: originX, y: 0.9 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'],
      });
    }
  };

  const fireConfetti = () => {
    if (!refAnimationInstance.current || isAnimating) return;

    setIsAnimating(true);

    const animationId = setInterval(() => {
      makeShot(60, 0.1);
      makeShot(120, 0.9);
      makeShot(90, 0.5);
      makeShot(75, 0.3);
      makeShot(105, 0.7);
    }, 200);

    // Arrêter après 2 secondes
    setTimeout(() => {
      clearInterval(animationId);
      setIsAnimating(false);
    }, 2000);
  };

  useEffect(() => {
    if (active) {
      fireConfetti();
    }
  }, [active]);

  return (
    <ReactCanvasConfetti
      refConfetti={getInstance}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        zIndex: 999,
      }}
    />
  );
}
