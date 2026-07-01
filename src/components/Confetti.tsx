import React, { useEffect, useState } from 'react';

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

const COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'];
const EMOJIS = ['🎉', '🎊', '✨', '⭐', '🚀', '💬'];

const Confetti: React.FC<ConfettiProps> = ({ active, duration = 3000 }) => {
  const [pieces, setPieces] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }

    const newPieces: React.ReactNode[] = [];
    for (let i = 0; i < 40; i++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const size = 8 + Math.random() * 16;
      const isEmoji = Math.random() > 0.5;
      const rotation = Math.random() * 360;

      newPieces.push(
        <div
          key={i}
          style={{
            position: 'fixed',
            left: `${left}%`,
            top: -20,
            fontSize: isEmoji ? size : size / 2,
            width: isEmoji ? size : size / 2,
            height: size,
            background: isEmoji ? 'transparent' : color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${rotation}deg)`,
            animation: `confetti-fall ${1.5 + Math.random() * 2}s ease-out ${delay}s forwards`,
            pointerEvents: 'none',
            zIndex: 99999,
          }}
        >
          {isEmoji ? emoji : null}
        </div>
      );
    }
    setPieces(newPieces);

    const timer = setTimeout(() => setPieces([]), duration + 1000);
    return () => clearTimeout(timer);
  }, [active, duration]);

  if (!active && pieces.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg);
          }
        }
      `}</style>
      {pieces}
    </>
  );
};

export default Confetti;
