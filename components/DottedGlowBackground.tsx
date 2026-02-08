
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';

export default function KryptonHudBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const ctx = el.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let stopped = false;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      el.width = Math.max(1, Math.floor(width * dpr));
      el.height = Math.max(1, Math.floor(height * dpr));
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const hexSize = 60;
    const hexHeight = Math.sqrt(3) * hexSize;
    const hexWidth = 2 * hexSize;

    const drawHexagon = (x: number, y: number, size: number, alpha: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        ctx.lineTo(x + size * Math.cos(angle), y + size * Math.sin(angle));
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    };

    const drawGrid = (time: number) => {
      const { width, height } = container.getBoundingClientRect();
      const cols = Math.ceil(width / (hexWidth * 0.75)) + 1;
      const rows = Math.ceil(height / hexHeight) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * hexWidth * 0.75;
          const y = j * hexHeight + (i % 2 === 0 ? 0 : hexHeight / 2);
          
          // Distance based pulsing
          const dx = x - width / 2;
          const dy = y - height / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const alpha = (0.05 + 0.05 * Math.sin(time / 2000 - dist / 500)) * (1 - dist / 2000);
          
          if (alpha > 0) drawHexagon(x, y, hexSize, alpha);
        }
      }
    };

    const drawHudElements = (time: number) => {
        const { width, height } = container.getBoundingClientRect();
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.lineWidth = 1;
        
        // Rotating Arcs
        for (let i = 0; i < 3; i++) {
            const radius = 200 + i * 50;
            const speed = (i + 1) * 0.0005;
            const startAngle = time * speed;
            const endAngle = startAngle + Math.PI / 2;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.strokeStyle = `rgba(34, 211, 238, 0.1)`;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle + Math.PI, endAngle + Math.PI);
            ctx.stroke();
        }

        // Scanning line
        const scanY = (time * 0.1) % height;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(width, scanY);
        const grad = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 50);
        grad.addColorStop(0, 'rgba(34, 211, 238, 0)');
        grad.addColorStop(0.5, 'rgba(34, 211, 238, 0.05)');
        grad.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.strokeStyle = grad;
        ctx.stroke();
    };

    const draw = (now: number) => {
      if (stopped) return;
      const { width, height } = container.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      
      drawGrid(now);
      drawHudElements(now);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
