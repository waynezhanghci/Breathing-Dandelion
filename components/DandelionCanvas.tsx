import React, { useRef, useEffect } from 'react';
import { Particle, GameState, DandelionColor } from '../types';

interface DandelionCanvasProps {
  swayValue: number; // -1 to 1
  blowStrength: number; // 0 to 1
  colorTheme: DandelionColor;
  onStateChange: (state: GameState) => void;
  onBlowSuccess: () => void;
  onHappySway: () => void;
}

// Visual Constants
const PARTICLE_COUNT = 1500; 
const SPARKLE_COUNT = 600; 
const SPHERE_RADIUS = 160;   
const BLOW_THRESHOLD = 0.75; 
const REGROW_TIME = 4500;

// Motion Logic Constants
const MOTION_DEADZONE = 0.15; 
const SWAY_COUNT_THRESHOLD = 0.25; 

// Theme Colors Configuration
// Enhanced RGB values for 'screen' blending mode on dark background
const THEMES: Record<DandelionColor, { tip: string, mid: string, core: string, sparkle: string }> = {
  white: {
    tip: '255, 255, 255',      
    mid: '220, 220, 230',      
    core: '200, 200, 210',     
    sparkle: '255, 255, 255'
  },
  deepBlue: { // #5D7FE5
    tip: '93, 127, 229',
    mid: '73, 107, 209', 
    core: '53, 87, 189', 
    sparkle: '163, 197, 255'
  },
  lavender: { // #9899EE
    tip: '152, 153, 238',
    mid: '132, 133, 218',
    core: '112, 113, 198',
    sparkle: '202, 203, 255'
  },
  periwinkle: { // #B7C2ED
    tip: '183, 194, 237',
    mid: '163, 174, 217',
    core: '143, 154, 197',
    sparkle: '213, 224, 255'
  },
  pale: { // #FBE8FD
    tip: '251, 232, 253',
    mid: '231, 212, 233',
    core: '211, 192, 213',
    sparkle: '255, 255, 255'
  },
  pink: { // #FDBBDB
    tip: '253, 187, 219',
    mid: '233, 167, 199',
    core: '213, 147, 179',
    sparkle: '255, 217, 239'
  }
};

interface Sparkle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
}

interface FluffParticle {
  x: number;
  y: number;
  angle: number;
  length: number;
  alpha: number;
}

export const DandelionCanvas: React.FC<DandelionCanvasProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Refs for State/Particles (Mutable)
  const particlesRef = useRef<Particle[]>([]);
  const sparklesRef = useRef<Sparkle[]>([]); 
  const fluffRef = useRef<FluffParticle[]>([]);
  const animationRef = useRef<number>();
  const gameStateRef = useRef<GameState>(GameState.IDLE);
  
  // Physics State for Sway
  const swayPhysics = useRef({
    angle: 0,
    velocity: 0
  });

  // Happy Count Logic State
  const swayStateRef = useRef<'CENTER' | 'LEFT' | 'RIGHT'>('CENTER');
  const lastExtremeRef = useRef<'LEFT' | 'RIGHT' | null>(null);

  // Store latest props in a ref to access them in the loop without re-triggering effects
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  }, [props]);
  
  const initParticles = () => {
    const particles: Particle[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); 

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2; 
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      particles.push({
        x: x * SPHERE_RADIUS,
        y: y * SPHERE_RADIUS,
        z: z * SPHERE_RADIUS,
        origX: x * SPHERE_RADIUS,
        origY: y * SPHERE_RADIUS,
        origZ: z * SPHERE_RADIUS,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 1,
        maxLife: 100 + Math.random() * 100,
        alpha: 0.4 + Math.random() * 0.6,
        size: 0.8 + Math.random() * 1.2,
        isAttached: true,
        color: '' 
      });
    }
    particlesRef.current = particles;
  };

  const initSparkles = () => {
    const sparkles: Sparkle[] = [];
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      sparkles.push({
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        life: 0,
        maxLife: 0,
        size: Math.random() * 2,
        alpha: 0
      });
    }
    sparklesRef.current = sparkles;
  };

  const initFluff = () => {
    const fluff: FluffParticle[] = [];
    const radius = 28;
    for(let i = 0; i < 1200; i++) {
      const r = Math.pow(Math.random(), 0.5) * radius;
      const theta = Math.random() * Math.PI * 2;
      const isEdge = r > radius * 0.85;
      const angle = isEdge ? theta : Math.random() * Math.PI * 2;
      
      fluff.push({
        x: Math.cos(theta) * r,
        y: Math.sin(theta) * r,
        angle: angle,
        length: isEdge ? 4 + Math.random() * 5 : 2 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.5
      });
    }
    fluffRef.current = fluff;
  };

  const triggerSparkles = (centerX: number, centerY: number, strength: number) => {
    sparklesRef.current.forEach(s => {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * SPHERE_RADIUS * 0.8;
      s.x = centerX + Math.cos(theta) * r;
      s.y = centerY + Math.sin(theta) * r;
      s.z = (Math.random() - 0.5) * SPHERE_RADIUS;
      
      const speed = 4 + Math.random() * 12 * strength; 
      const angle = Math.random() * Math.PI * 2;
      
      s.vx = Math.cos(angle) * speed; 
      s.vy = Math.sin(angle) * speed; 
      s.vz = (Math.random() - 0.5) * speed * 2;
      
      s.life = 100;
      s.maxLife = 50 + Math.random() * 100;
      s.alpha = 1;
      s.size = 0.5 + Math.random() * 3.0;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (particlesRef.current.length === 0) {
      initParticles();
      initSparkles();
      initFluff();
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let lastTime = 0;

    const render = (time: number) => {
      lastTime = time;
      
      // Responsive Scaling
      const isMobile = canvas.width < 768; // Mobile breakpoint
      // 20% reduction from standard size (1.0)
      const displayScale = isMobile ? 0.8 : 1.0;

      // Access current props from ref to ensure instant color updates
      const { swayValue, blowStrength, colorTheme, onStateChange, onBlowSuccess, onHappySway } = propsRef.current;
      const theme = THEMES[colorTheme];

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 + 50; 
      
      // --- Physics: Spring Sway ---
      let activeTarget = swayValue;
      if (Math.abs(activeTarget) < MOTION_DEADZONE) {
        activeTarget = 0;
      }

      // Add gentle, micro-turbulence for "living" feel when idle (Wind)
      // Combines two slow sine waves for non-monotonic movement
      const idleWind = Math.sin(time * 0.0006) * 0.02 + Math.cos(time * 0.0017) * 0.015;
      
      // Integrate idle wind into target for physics
      const targetAngle = (activeTarget * 0.6) + idleWind; 
      
      const k = 0.008; 
      const d = 0.95;  
      
      const force = (targetAngle - swayPhysics.current.angle) * k;
      swayPhysics.current.velocity += force;
      swayPhysics.current.velocity *= d;
      swayPhysics.current.angle += swayPhysics.current.velocity;

      const currentSway = swayPhysics.current.angle;

      // --- Happy Count Logic ---
      if (currentSway < -SWAY_COUNT_THRESHOLD) {
        if (swayStateRef.current !== 'LEFT') {
           swayStateRef.current = 'LEFT';
           if (lastExtremeRef.current === 'RIGHT') {
             onHappySway();
             lastExtremeRef.current = null; 
           } else {
             lastExtremeRef.current = 'LEFT';
           }
        }
      } else if (currentSway > SWAY_COUNT_THRESHOLD) {
        if (swayStateRef.current !== 'RIGHT') {
           swayStateRef.current = 'RIGHT';
           if (lastExtremeRef.current === 'LEFT') {
             onHappySway();
             lastExtremeRef.current = null; 
           } else {
             lastExtremeRef.current = 'RIGHT';
           }
        }
      } else if (Math.abs(currentSway) < 0.1) {
        swayStateRef.current = 'CENTER';
      }

      // --- Blow Detection ---
      if (gameStateRef.current === GameState.IDLE && blowStrength > BLOW_THRESHOLD) {
        gameStateRef.current = GameState.BLOWN;
        onStateChange(GameState.BLOWN);
        onBlowSuccess();
        
        triggerSparkles(centerX + Math.sin(currentSway) * 200, centerY - Math.cos(currentSway) * 200, blowStrength);

        particlesRef.current.forEach(p => {
          p.isAttached = false;
          const radialX = p.origX / SPHERE_RADIUS;
          const radialY = p.origY / SPHERE_RADIUS;
          const radialZ = p.origZ / SPHERE_RADIUS;
          
          const explosionForce = 5 + Math.random() * 10;
          const windX = 8 * blowStrength; 
          const windY = -2 * blowStrength;

          p.vx = radialX * explosionForce * 0.5 + windX + (Math.random() - 0.5) * 5;
          p.vy = radialY * explosionForce * 0.5 + windY + (Math.random() - 0.5) * 5; 
          p.vz = radialZ * explosionForce * 0.5 + (Math.random() - 0.5) * 5;
        });

        setTimeout(() => {
          gameStateRef.current = GameState.REGROWING;
          onStateChange(GameState.REGROWING);
          
          particlesRef.current.forEach(p => {
             p.x = p.origX; p.y = p.origY; p.z = p.origZ;
             p.vx = 0; p.vy = 0; p.vz = 0;
             p.isAttached = true;
             p.alpha = 0; 
          });
          
          setTimeout(() => {
             gameStateRef.current = GameState.IDLE;
             onStateChange(GameState.IDLE);
          }, 2000); 
        }, REGROW_TIME);
      }

      // --- Draw Stem ---
      const stemLength = canvas.height * 0.5;
      const startX = centerX;
      const startY = canvas.height;
      
      const headX = startX + Math.sin(currentSway) * stemLength;
      const headY = startY - Math.cos(currentSway) * stemLength;
      const midX = startX + Math.sin(currentSway * 0.4) * (stemLength * 0.6);
      const midY = startY - Math.cos(currentSway * 0.4) * (stemLength * 0.6);

      ctx.lineCap = 'round';
      
      // Stem Body (Now adapts to theme color at the top)
      const stemGradient = ctx.createLinearGradient(startX, startY, headX, headY);
      stemGradient.addColorStop(0, '#3b6e3b'); // Fresh leafy green base
      stemGradient.addColorStop(0.5, '#8cd66f'); // Tender, vibrant green mid-section
      stemGradient.addColorStop(1, `rgba(${theme.mid}, 1)`); // Syncs with flower color
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(midX, midY, headX, headY);
      ctx.strokeStyle = stemGradient;
      ctx.lineWidth = 8 * displayScale;
      ctx.stroke();

      // Stem Highlight
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(midX, midY, headX, headY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Matrix rotation helper
      const cosR = Math.cos(currentSway);
      const sinR = Math.sin(currentSway);
      const rotate = (x: number, y: number) => ({
        x: x * cosR - y * sinR,
        y: x * sinR + y * cosR
      });

      // --- Draw Round Receptacle (The Core) ---
      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(currentSway); 

      const radius = 28 * displayScale; 

      // 1. Draw Base Sphere 
      ctx.beginPath();
      ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
      
      // Enhanced core gradient with theme color
      const rGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, radius);
      rGrad.addColorStop(0, `rgba(${theme.core}, 1)`);
      rGrad.addColorStop(1, `rgba(${theme.mid}, 1)`); 
      ctx.fillStyle = rGrad;
      ctx.fill();

      // 2. Draw Fuzzy Hair Texture on the core
      fluffRef.current.forEach(f => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${theme.mid}, ${f.alpha})`; 
        ctx.lineWidth = 1.5;
        
        // Removed dynamic microwave effect to stop shaking
        const drawAngle = f.angle;

        // Apply displayScale to local coordinates
        const fx = f.x * displayScale;
        const fy = f.y * displayScale;
        const flength = f.length * displayScale;

        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + Math.cos(drawAngle) * flength, fy + Math.sin(drawAngle) * flength);
        ctx.stroke();
      });

      // 3. Soft Glow around core
      ctx.shadowColor = `rgba(${theme.tip}, 0.8)`; 
      ctx.shadowBlur = 20 * displayScale;
      ctx.strokeStyle = `rgba(${theme.mid}, 0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore(); 

      // --- Draw Sparkles (Screen Mode for Glow) ---
      ctx.globalCompositeOperation = 'screen';
      sparklesRef.current.forEach(s => {
        if (s.life > 0) {
          s.x += s.vx;
          s.y += s.vy;
          s.z += s.vz;
          s.vx *= 0.94; 
          s.vy *= 0.94;
          s.vz *= 0.94;
          s.vy -= 0.08; 
          s.life--;
          
          const sScale = 500 / (500 + s.z);
          if (sScale > 0) {
            ctx.beginPath();
            const alpha = (s.life / s.maxLife) * s.alpha;
            ctx.fillStyle = `rgba(${theme.sparkle}, ${alpha})`;
            ctx.arc(s.x, s.y, s.size * sScale, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
      
      // --- Draw Dandelion Seeds (Particles) ---
      // Using screen blend mode ensures the colors pop on dark background
      // and overlap nicely
      particlesRef.current.sort((a, b) => b.z - a.z); 

      const activityFactor = Math.min(1, Math.abs(currentSway) * 3 + blowStrength * 2);
      
      // Removed idle breathing animation to stop shaking
      // Active Breath: Reacts to input only
      const activeBreath = Math.sin(time * 0.0015) * 5 * activityFactor;
      
      const breath = activeBreath;

      particlesRef.current.forEach(p => {
        if (!p.isAttached) {
          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;
          p.vx *= 0.99; 
          p.vy *= 0.99;
          p.vz *= 0.99;
          p.vy += 0.01; 
          p.alpha -= 0.001; 
          if (p.alpha < 0) p.alpha = 0;
        } else {
          // Scale orig coordinates for position calculation if attached
          const scaledOrigX = p.origX * displayScale;
          const scaledOrigY = p.origY * displayScale;
          const scaledOrigZ = p.origZ * displayScale; // Need to scale Z too for correct perspective

          const rot = rotate(scaledOrigX, scaledOrigY);
          const dist = Math.sqrt(scaledOrigX*scaledOrigX + scaledOrigY*scaledOrigY);
          const normX = p.origX / dist;
          const normY = p.origY / dist;
          
          const breathX = normX * breath;
          const breathY = normY * breath;

          const rotBreath = rotate(breathX, breathY);

          p.x = headX + rot.x + rotBreath.x;
          p.y = headY + rot.y + rotBreath.y;
          p.z = scaledOrigZ;

          if (gameStateRef.current === GameState.REGROWING) {
             p.alpha += 0.01;
             if (p.alpha > 1) p.alpha = 1;
          }
        }

        const focalLength = 500;
        const scale = focalLength / (focalLength + p.z);
        
        if (p.alpha > 0.05 && scale > 0.1) {
          // Adjust alpha based on depth to create volume
          const zAlpha = p.alpha * (p.z > 0 ? 1 : 0.6); 
          
          let baseX, baseY, tipX, tipY;
          let rotationAngle = 0;

          if (p.isAttached) {
              const px = p.x;
              const py = p.y;
              const relX = px - headX;
              const relY = py - headY;
              
              tipX = headX + relX * scale;
              tipY = headY + relY * scale;

              const innerRatio = 0.15; 
              baseX = headX + relX * scale * innerRatio;
              baseY = headY + relY * scale * innerRatio;
          } else {
             const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
             const dirX = speed > 0.1 ? p.vx / speed : 1;
             const dirY = speed > 0.1 ? p.vy / speed : 0;
             rotationAngle = Math.atan2(dirY, dirX);
             const centerX = p.x;
             const centerY = p.y;
             const relX = centerX - headX;
             const relY = centerY - headY;
             const projCX = headX + relX * scale;
             const projCY = headY + relY * scale;
             
             // Scale seed length for mobile
             const seedLen = 20 * scale * displayScale; 
             
             baseX = projCX + Math.cos(rotationAngle) * (seedLen * 0.5);
             baseY = projCY + Math.sin(rotationAngle) * (seedLen * 0.5);
             tipX = projCX - Math.cos(rotationAngle) * (seedLen * 0.8);
             tipY = projCY - Math.sin(rotationAngle) * (seedLen * 0.8);
          }

          // 1. Draw Stalk (Inner Part)
          // Uses 'mid' color - slightly stronger for visibility
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${theme.mid}, ${zAlpha * 0.8})`; 
          ctx.lineWidth = 0.6 * scale;
          ctx.moveTo(baseX, baseY);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();

          // Seed Body
          ctx.beginPath();
          ctx.fillStyle = `rgba(${theme.mid}, ${zAlpha})`;
          ctx.ellipse(baseX, baseY, 1.5 * scale, 1 * scale, p.isAttached ? Math.atan2(tipY-baseY, tipX-baseX) : rotationAngle, 0, Math.PI * 2);
          ctx.fill();

          // 2. Draw Pappus/Fluff (Outer Part)
          // Uses 'tip' color - Vibrant
          // Scale pappus size for mobile
          const pappusSize = 10 * scale * p.size * displayScale;
          const stalkAngle = Math.atan2(tipY - baseY, tipX - baseX);
          
          ctx.strokeStyle = `rgba(${theme.tip}, ${zAlpha * 0.6})`;
          ctx.lineWidth = 0.5 * scale;
          ctx.beginPath();
          
          const fanCount = 6;
          for(let k=0; k<=fanCount; k++) {
              const range = (k / fanCount - 0.5) * 2; 
              const hairAngle = stalkAngle + range * 0.8;
              // REPLACED Math.random() with deterministic logic to prevent shaking
              const deterministicVariation = 0.8 + ((k % 3) * 0.1) + (p.size * 0.2); 
              const fluffLen = pappusSize * deterministicVariation;
              const hx = tipX + Math.cos(hairAngle) * fluffLen;
              const hy = tipY + Math.sin(hairAngle) * fluffLen;
              ctx.moveTo(tipX, tipY);
              ctx.lineTo(hx, hy);
          }
          ctx.stroke();

          // Tip Dot
          ctx.beginPath();
          ctx.fillStyle = `rgba(${theme.tip}, ${zAlpha * 0.8})`; 
          ctx.arc(tipX, tipY, 1.5 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />;
};