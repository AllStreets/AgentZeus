"use client";

import { useRef, useEffect } from "react";

interface ParticleFieldProps {
  isActive: boolean;
  color?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
}

export default function ParticleField({ isActive, color = "#3b82f6" }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;
    const cx = () => w() / 2;
    const cy = () => h() / 2;

    function spawnParticle(): Particle {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 20;
      return {
        x: cx() + Math.cos(angle) * distance,
        y: cy() + Math.sin(angle) * distance,
        vx: Math.cos(angle) * (0.3 + Math.random() * 0.7),
        vy: Math.sin(angle) * (0.3 + Math.random() * 0.7),
        size: 1 + Math.random() * 2,
        opacity: 0.6 + Math.random() * 0.4,
        life: 1,
      };
    }

    function animate() {
      ctx.clearRect(0, 0, w(), h());

      if (isActive && particlesRef.current.length < 60) {
        particlesRef.current.push(spawnParticle());
        particlesRef.current.push(spawnParticle());
      }

      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.008;
        p.opacity = p.life * 0.6;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [isActive, color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
