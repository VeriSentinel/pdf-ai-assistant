import { useEffect, useRef } from 'react';

export default function StarCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Regular stars ──
    const stars = Array.from({ length: 280 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.4 + 0.2,
      opacity: Math.random() * 0.7 + 0.1,
      speed: Math.random() * 0.018 + 0.004,
      dir: Math.random() > 0.5 ? 1 : -1,
      color: Math.random() > 0.85
        ? `rgba(167,139,250,` // purple tint
        : Math.random() > 0.7
          ? `rgba(34,211,238,` // cyan tint
          : `rgba(255,255,255,`, // white
    }));

    // ── Shooting stars ──
    const shooters = [];
    const spawnShooter = () => ({
      x: Math.random() * 0.6 + 0.1,
      y: Math.random() * 0.4,
      len: Math.random() * 120 + 60,
      speed: Math.random() * 8 + 6,
      opacity: 1,
      angle: Math.PI / 5,
      alive: true,
    });

    let shootTimer = 0;
    let animId;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Draw static twinkling stars
      stars.forEach(s => {
        s.opacity += s.speed * s.dir;
        if (s.opacity >= 0.9) { s.opacity = 0.9; s.dir = -1; }
        if (s.opacity <= 0.08) { s.opacity = 0.08; s.dir = 1; }

        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.color + s.opacity + ')';
        ctx.fill();
      });

      // Shooting stars
      shootTimer++;
      if (shootTimer > 180) {
        shooters.push(spawnShooter());
        shootTimer = 0;
      }
      shooters.forEach((sh, i) => {
        if (!sh.alive) return;
        const sx = sh.x * W, sy = sh.y * H;
        const ex = sx + Math.cos(sh.angle) * sh.len;
        const ey = sy + Math.sin(sh.angle) * sh.len;

        const grad = ctx.createLinearGradient(sx, sy, ex, ey);
        grad.addColorStop(0, `rgba(255,255,255,${sh.opacity})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        sh.x += Math.cos(sh.angle) * sh.speed / W;
        sh.y += Math.sin(sh.angle) * sh.speed / H;
        sh.opacity -= 0.018;
        if (sh.opacity <= 0 || sh.x > 1.1 || sh.y > 1.1) sh.alive = false;
      });

      // Remove dead shooters
      for (let i = shooters.length - 1; i >= 0; i--) {
        if (!shooters[i].alive) shooters.splice(i, 1);
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="star-canvas" />;
}
