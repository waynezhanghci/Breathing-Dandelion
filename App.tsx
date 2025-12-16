import React, { useEffect, useState, useRef } from 'react';
import { DandelionCanvas } from './components/DandelionCanvas';
import { AudioService } from './services/audioService';
import { MotionService } from './services/motionService';
import { GameState, DandelionColor } from './types';
import { Play, Mic, Camera, Info } from 'lucide-react';

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Game Stats
  const [happyCount, setHappyCount] = useState(0);
  const [freeCount, setFreeCount] = useState(0);
  const [currentAction, setCurrentAction] = useState<'IDLE' | 'BLOWING' | 'SWAYING'>('IDLE');
  
  // Customization
  const [selectedColor, setSelectedColor] = useState<DandelionColor>('white');

  // Color Definitions for cycling
  const colorOptions: { key: DandelionColor; hex: string }[] = [
    { key: 'white', hex: '#ffffff' },
    { key: 'deepBlue', hex: '#5D7FE5' },
    { key: 'lavender', hex: '#9899EE' },
    { key: 'periwinkle', hex: '#B7C2ED' },
    { key: 'pale', hex: '#FBE8FD' },
    { key: 'pink', hex: '#FDBBDB' }
  ];

  const cycleColor = () => {
    const currentIndex = colorOptions.findIndex(c => c.key === selectedColor);
    const nextIndex = (currentIndex + 1) % colorOptions.length;
    setSelectedColor(colorOptions[nextIndex].key);
  };

  // Real-time sensor values
  const [swayValue, setSwayValue] = useState(0);
  const [blowStrength, setBlowStrength] = useState(0);

  const audioService = useRef(new AudioService());
  const motionService = useRef(new MotionService());
  const loopRef = useRef<number>();

  const startExperience = async () => {
    try {
      await Promise.all([
        audioService.current.initialize(),
        motionService.current.initialize()
      ]);
      setPermissionsGranted(true);
      setHasStarted(true);
      startSensorLoop();
    } catch (err) {
      setError("Please allow camera and microphone access to play. Refresh to try again.");
      console.error(err);
    }
  };

  const startSensorLoop = () => {
    const loop = () => {
      // Get Mic data
      const vol = audioService.current.getVolume();
      setBlowStrength(vol);

      // Get Camera motion
      const motion = motionService.current.getHorizontalMotion();
      // Smooth the motion value for React state to avoid jittery UI updates if we display it,
      // but passed raw-ish to canvas
      setSwayValue(motion);

      if (vol > 0.5) setCurrentAction('BLOWING');
      else if (Math.abs(motion) > 0.3) setCurrentAction('SWAYING');
      else setCurrentAction('IDLE');

      loopRef.current = requestAnimationFrame(loop);
    };
    loopRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
      audioService.current.cleanup();
      motionService.current.cleanup();
    };
  }, []);

  const handleStateChange = (state: GameState) => {
    // console.log("State changed:", state);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#051021] text-white p-6 text-center">
        <Info className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-xl">{error}</p>
      </div>
    );
  }

  // Refined Gradient: Deep Space -> Atmospheric Blue -> Horizon Glow
  const bgStyle = "bg-[linear-gradient(to_bottom,#0B1026_0%,#2B32B2_60%,#FFD4B2_100%)]";

  if (!hasStarted) {
    return (
      <div className={`relative flex flex-col items-center justify-center h-screen w-screen ${bgStyle} text-white overflow-hidden`}>
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
             {/* Stars or subtle glow */}
             <div className="absolute top-20 right-20 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8)]"></div>
             <div className="absolute top-10 left-10 w-64 h-64 bg-blue-400/20 rounded-full blur-[80px]"></div>
             <div className="absolute bottom-0 right-0 w-full h-1/3 bg-orange-100/10 blur-[100px]"></div>
        </div>

        <div className="z-10 flex flex-col items-center max-w-md p-8 bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl">
          <div className="mb-6 p-4 bg-white/20 rounded-full animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.3)]">
             <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-white to-blue-200 blur-sm"></div>
          </div>
          
          <h1 className="text-4xl font-light mb-2 tracking-wide font-serif text-white drop-shadow-md">Breathing Dandelion</h1>
          <p className="text-slate-100 mb-8 text-center text-sm font-light leading-relaxed drop-shadow-sm">
            An interactive relaxation experience. <br/>
            Use your <span className="text-cyan-200 font-medium">breath</span> to release. <br/>
            Use your <span className="text-cyan-200 font-medium">head</span> to sway.
          </p>

          <div className="flex gap-4 mb-8 text-xs text-slate-200">
             <div className="flex flex-col items-center gap-2">
                <Camera size={20} />
                <span>Head Tracking</span>
             </div>
             <div className="w-px bg-white/30 h-10"></div>
             <div className="flex flex-col items-center gap-2">
                <Mic size={20} />
                <span>Microphone</span>
             </div>
          </div>

          <button 
            onClick={startExperience}
            className="group relative px-8 py-3 bg-white/90 text-slate-900 rounded-full font-medium hover:bg-white transition-all active:scale-95 flex items-center gap-2 shadow-lg"
          >
            <span>Start Experience</span>
            <Play size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-screen ${bgStyle} overflow-hidden font-sans`}>
      {/* 3D Canvas Layer */}
      <DandelionCanvas 
        swayValue={swayValue} 
        blowStrength={blowStrength} 
        colorTheme={selectedColor}
        onStateChange={handleStateChange}
        onBlowSuccess={() => setFreeCount(c => c + 1)}
        onHappySway={() => setHappyCount(c => c + 1)}
        onFlowerClick={cycleColor}
      />

      {/* Foreground UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
        
        {/* Top Header Area */}
        <div className="flex justify-between items-start pointer-events-auto w-full px-2 pt-2 md:px-6 md:pt-6">
           {/* Left: App Title */}
           <div className="flex flex-col gap-3">
             <h1 className="text-3xl md:text-5xl font-bold text-[#F3E1E4] tracking-tight drop-shadow-2xl">
               Breathing Dandelion
             </h1>
             <div className="text-sm md:text-base text-white/50 font-medium leading-relaxed space-y-1">
               <p>允许自己，像蒲公英的种子一样，</p>
               <p>轻柔地降落到想去的地方。</p>
             </div>
           </div>

           {/* Right: Stats Card */}
           <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] min-w-[130px] flex flex-col items-center transform transition-transform hover:scale-105">
             <div className="text-[10px] text-white/40 font-bold tracking-[0.2em] mb-3 uppercase">
               Today
             </div>
             <div className="w-8 h-px bg-white/10 mb-3"></div>
             <div className="text-4xl font-bold text-[#F3E1E4] font-sans mb-1 tabular-nums">
               {freeCount}
             </div>
             <div className="text-xs text-white/50 font-medium tracking-wide flex items-center gap-1.5">
               Released 
               {/* Dandelion Seed Icon */}
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                 <path d="M12 22V10" />
                 <path d="M12 10L7 3" />
                 <path d="M12 10L17 3" />
                 <path d="M12 10L12 2" />
                 <path d="M12 10L9.5 4" />
                 <path d="M12 10L14.5 4" />
               </svg>
             </div>
           </div>
        </div>

        {/* Center Guide (Dynamic) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-80 mix-blend-screen pointer-events-none">
        </div>

        {/* Bottom Instructions */}
        <div className="flex justify-center pb-10">
           <div className="bg-white/5 backdrop-blur-md rounded-full px-8 py-3 border border-white/10 flex gap-8 text-sm text-white/70 shadow-lg tracking-wide">
              <span className={`transition-all duration-300 ${currentAction === 'SWAYING' ? 'text-white font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : ''}`}>
                 ↔ Sway Head
              </span>
              <span className="w-px bg-white/10"></span>
              <span className={`transition-all duration-300 ${currentAction === 'BLOWING' ? 'text-white font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : ''}`}>
                 💨 Blow Mic
              </span>
           </div>
        </div>
      </div>
      
      {/* Debug/Feedback Visualization (Subtle) */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5 pointer-events-none">
        <div 
          className="h-full bg-gradient-to-r from-blue-300 to-white transition-all duration-75 ease-out opacity-40 shadow-[0_0_15px_white]"
          style={{ width: `${Math.min(blowStrength * 100, 100)}%` }}
        />
      </div>

    </div>
  );
};

export default App;