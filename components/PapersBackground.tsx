import React, { useEffect, useRef } from 'react';

interface Paper {
  id: number;
  x: number;
  y: number;
  rotation: number;
  size: number;
  speedX: number;
  speedY: number;
  speedRotation: number;
  opacity: number;
  delay: number;
}

export default function PapersBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
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

    // Create papers
    const createPapers = (): Paper[] => {
      const papers: Paper[] = [];
      const paperCount = 12; // Number of floating papers (reduced for better performance)

      for (let i = 0; i < paperCount; i++) {
        papers.push({
          id: i,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          rotation: Math.random() * Math.PI * 2,
          size: 50 + Math.random() * 70, // 50-120px
          speedX: (Math.random() - 0.5) * 0.25,
          speedY: (Math.random() - 0.5) * 0.25 - 0.15, // Slight upward bias
          speedRotation: (Math.random() - 0.5) * 0.015,
          opacity: 0.12 + Math.random() * 0.18, // 0.12-0.3 opacity (more subtle)
          delay: Math.random() * 80, // Stagger animation start
        });
      }
      return papers;
    };

    papersRef.current = createPapers();

    let time = 0;

    const drawPaper = (paper: Paper, frameTime: number) => {
      if (frameTime < paper.delay) return; // Delay start

      ctx.save();
      ctx.translate(paper.x, paper.y);
      ctx.rotate(paper.rotation);

      // Draw paper with subtle shadow
      ctx.globalAlpha = paper.opacity;
      
      // Paper shadow
      ctx.shadowColor = 'rgba(255, 255, 255, 0.1)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Paper body - use white with red/orange accents matching the color scheme
      const paperColors = [
        'rgba(255, 255, 255, 0.9)',
        'rgba(255, 255, 255, 0.85)',
        'rgba(255, 255, 255, 0.8)', // Orange accent
        'rgba(255, 255, 255, 0.75)', // Red accent
        'rgba(255, 255, 255, 0.8)',
      ];
      const paperColor = paperColors[paper.id % paperColors.length];

      ctx.fillStyle = paperColor;
      ctx.strokeStyle = paper.id % 3 === 0 
        ? 'rgba(255, 255, 255, 0.5)' // Red border for some papers
        : paper.id % 5 === 0
        ? 'rgba(255, 255, 255, 0.4)' // Orange border for some papers
        : 'rgba(255, 255, 255, 0.5)'; // White border for others
      ctx.lineWidth = 1;

      // Draw paper shape (slightly rotated rectangle)
      const width = paper.size;
      const height = paper.size * 1.4;

      ctx.beginPath();
      // Slightly irregular edges for realism
      ctx.moveTo(-width / 2 + Math.sin(time * 0.5 + paper.id) * 2, -height / 2);
      ctx.lineTo(width / 2 + Math.cos(time * 0.3 + paper.id) * 2, -height / 2 + Math.sin(time * 0.4 + paper.id) * 2);
      ctx.lineTo(width / 2 + Math.sin(time * 0.6 + paper.id) * 2, height / 2);
      ctx.lineTo(-width / 2 + Math.cos(time * 0.5 + paper.id) * 2, height / 2 + Math.cos(time * 0.3 + paper.id) * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Add subtle texture lines (like ruled paper)
      if (paper.id % 3 === 0) {
        ctx.strokeStyle = 'rgba(220, 220, 220, 0.2)';
        ctx.lineWidth = 0.5;
        for (let i = -height / 2 + 10; i < height / 2; i += 12) {
          ctx.beginPath();
          ctx.moveTo(-width / 2 + 5, i);
          ctx.lineTo(width / 2 - 5, i + Math.sin(time * 0.2) * 1);
          ctx.stroke();
        }
      }

      // Add corner fold effect on some papers with color scheme colors
      if (paper.id % 4 === 0) {
        ctx.globalAlpha = paper.opacity * 0.6;
        ctx.fillStyle = paper.id % 2 === 0 
          ? 'rgba(255, 255, 255, 0.5)' // Red fold
          : 'rgba(255, 255, 255, 0.4)'; // Orange fold
        ctx.beginPath();
        ctx.moveTo(width / 2 - 8, -height / 2);
        ctx.lineTo(width / 2, -height / 2);
        ctx.lineTo(width / 2, -height / 2 + 8);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    };

    const animate = () => {
      time += 0.016; // ~60fps

      // Clear canvas with subtle fade effect for trailing
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw papers
      papersRef.current.forEach((paper) => {
        // Update position
        paper.x += paper.speedX;
        paper.y += paper.speedY;
        paper.rotation += paper.speedRotation;

        // Wrap around edges
        if (paper.x < -100) paper.x = canvas.width + 100;
        if (paper.x > canvas.width + 100) paper.x = -100;
        if (paper.y < -100) paper.y = canvas.height + 100;
        if (paper.y > canvas.height + 100) paper.y = -100;

        // Subtle floating motion (sin wave) - removed to reduce complexity
        // The natural drift from speedX/speedY is enough

        // Draw paper
        drawPaper(paper, time * 60); // Convert to frame time
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

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
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
      aria-hidden="true"
    />
  );
}

