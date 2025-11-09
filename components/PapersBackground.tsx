import React, { useEffect, useRef } from 'react';

interface Paper {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  vx: number;
  vy: number;
  vr: number;
  opacity: number;
}

export default function PapersBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const papersRef = useRef<Paper[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize papers
    const numPapers = 15;
    papersRef.current = Array.from({ length: numPapers }, (_, i) => ({
      id: i,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      width: 60 + Math.random() * 80,
      height: 80 + Math.random() * 100,
      rotation: Math.random() * Math.PI * 2,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      vr: (Math.random() - 0.5) * 0.02,
      opacity: 0.1 + Math.random() * 0.15,
    }));

    let frameTime = 0;

    const drawPaper = (paper: Paper, frameTime: number) => {
      ctx.save();
      ctx.translate(paper.x + paper.width / 2, paper.y + paper.height / 2);
      ctx.rotate(paper.rotation + frameTime * 0.0001);

      // Paper body - use subtle white/gray tones for dark background
      const paperColors = [
        'rgba(255, 255, 255, 0.08)',
        'rgba(255, 255, 255, 0.06)',
        'rgba(255, 255, 255, 0.1)',
        'rgba(255, 255, 255, 0.05)',
        'rgba(255, 255, 255, 0.07)',
      ];
      const paperColor = paperColors[paper.id % paperColors.length];

      ctx.fillStyle = paperColor;
      ctx.strokeStyle = paper.id % 3 === 0
        ? 'rgba(255, 255, 255, 0.15)'
        : paper.id % 5 === 0
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      // Draw paper shape
      ctx.beginPath();
      ctx.rect(-paper.width / 2, -paper.height / 2, paper.width, paper.height);
      ctx.fill();
      ctx.stroke();

      // Add subtle corner fold effect
      if (paper.id % 4 === 0) {
        ctx.globalAlpha = paper.opacity * 0.4;
        ctx.fillStyle = paper.id % 2 === 0
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(-paper.width / 2, -paper.height / 2);
        ctx.lineTo(-paper.width / 2 + 15, -paper.height / 2);
        ctx.lineTo(-paper.width / 2, -paper.height / 2 + 15);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    };

    const animate = (currentTime: number) => {
      frameTime = currentTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      papersRef.current.forEach((paper) => {
        // Update position
        paper.x += paper.vx;
        paper.y += paper.vy;
        paper.rotation += paper.vr;

        // Wrap around edges
        if (paper.x < -paper.width) paper.x = canvas.width;
        if (paper.x > canvas.width) paper.x = -paper.width;
        if (paper.y < -paper.height) paper.y = canvas.height;
        if (paper.y > canvas.height) paper.y = -paper.height;

        // Draw paper
        drawPaper(paper, frameTime);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
}

