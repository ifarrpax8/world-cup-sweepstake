import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface Props {
  trigger: boolean;
}

export function Confetti({ trigger }: Props) {
  useEffect(() => {
    if (!trigger) return;

    const end = Date.now() + 6000;

    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'],
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'],
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    };

    frame();
  }, [trigger]);

  return null;
}