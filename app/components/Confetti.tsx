'use client';

import { useEffect, useRef, useCallback } from 'react';
import ReactCanvasConfetti from 'react-canvas-confetti';
import type { CreateTypes } from 'canvas-confetti';

interface ConfettiProps {
  active: boolean;
}

export default function Confetti({ active }: ConfettiProps) {
  const refAnimationInstance = useRef<CreateTypes | null>(null);
  // Supprimer l'état isAnimating qui cause la boucle infinie

  const getInstance = (instance: CreateTypes | null) => {
    refAnimationInstance.current = instance;
  };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const makeShot = (angle: number, originX: number) => {
    if (refAnimationInstance.current) {
      refAnimationInstance.current({
        particleCount: 40,
        angle,
        spread: 70,
        origin: { x: originX, y: originX > 0.5 ? 0.2 : 0.7 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'],
        startVelocity: randomInRange(25, 40),
        gravity: 0.8,
        scalar: randomInRange(0.8, 1.2),
        ticks: 350,
        decay: 0.93,
      });
    }
  };

  // Utilisation de useCallback pour la fonction fireConfetti
  const fireConfetti = useCallback(() => {
    if (!refAnimationInstance.current) return;

    // Animation initiale
    makeShot(randomInRange(50, 70), 0.1);
    makeShot(randomInRange(110, 130), 0.9);
    makeShot(90, 0.5);

    // Séquence d'animations sur plusieurs secondes
    const sequence = [
      () => {
        makeShot(randomInRange(60, 80), 0.2);
        makeShot(randomInRange(100, 120), 0.8);
      },
      () => {
        makeShot(randomInRange(50, 70), 0.3);
        makeShot(randomInRange(110, 130), 0.7);
      },
      () => {
        makeShot(80, 0.4);
        makeShot(100, 0.6);
        makeShot(90, 0.5);
      },
      () => {
        makeShot(randomInRange(60, 80), 0.1);
        makeShot(randomInRange(100, 120), 0.9);
      },
      () => {
        makeShot(randomInRange(50, 70), 0.2);
        makeShot(randomInRange(110, 130), 0.8);
        makeShot(90, 0.5);
      }
    ];

    // Exécuter la séquence à intervalles
    sequence.forEach((shot, index) => {
      setTimeout(() => { shot(); }, 700 * (index + 1));
    });
  }, []);

  // Utiliser une référence pour suivre la valeur précédente de `active`
  const prevActiveRef = useRef(false);

  useEffect(() => {
    // Ne déclencher les confettis que lors du changement de false à true
    if (active && !prevActiveRef.current) {
      fireConfetti();
    }
    // Mettre à jour la référence de la valeur précédente
    prevActiveRef.current = active;
  }, [active, fireConfetti]);

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
