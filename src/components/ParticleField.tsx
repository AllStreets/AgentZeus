"use client";

import { useRef, useEffect } from "react";

interface ParticleFieldProps {
  isActive: boolean;
  color?: string;
  size?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  life: number;
}

export default function ParticleField({ isActive, color = "#3b82f6", size = 128 }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const center = size / 2;

    function spawn(): Particle {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 15;
      return {
        x: center + Math.cos(angle) * dist,
        y: center + Math.sin(angle) * dist,
        vx: Math.cos(angle) * (0.2 + Math.random() * 0.5),
        vy: Math.sin(angle) * (0.2 + Math.random() * 0.5),
        radius: 0.5 + Math.random() * 1.5,
        opacity: 0.8,
        life: 1,
      };
    }

    function draw() {
      ctx.clearRect(0, 0, size, size);
      const particles = particlesRef.current;

      if (isActive && particles.length < 50) {
        particles.push(spawn(), spawn());
      }

      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 40) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = color;
            ctx.globalAlpha = (1 - dist / 40) * 0.15 * Math.min(particles[i].life, particles[j].life);
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.006;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = p.life * 0.5;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      particlesRef.current = particles.filter((p) => p.life > 0);
      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [isActive, color, size]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: size, height: size }}
    />
  );
}
