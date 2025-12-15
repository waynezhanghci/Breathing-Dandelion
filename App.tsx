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

  // Color selection button component
  const ColorBtn = ({ color, active, onClick }: { color: string, active: boolean, onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={`w-10 h-10 rounded-full transition-all duration-300 ease-out border-2 shadow-lg hover:scale-110 active:scale-95
        ${active ? 'border-white scale-110 ring-2 ring-white/30' : 'border-transparent opacity-80 hover:opacity-100'}
      `}
      style={{ backgroundColor: color }}
      aria-label="Change color"
    />
  );

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
      />

      {/* Foreground UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
        
        {/* Top Info Panel */}
        <div className="flex justify-end items-start pointer-events-auto">
           <div className="flex flex-col gap-4">
             {/* Free Count */}
             <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-right shadow-sm">
               <div className="text-xs text-white/70 uppercase tracking-widest mb-1">Free Count</div>
               <div className="text-3xl font-light text-white font-mono">
                 {freeCount.toString().padStart(2, '0')}
               </div>
             </div>
           </div>
        </div>

        {/* Right Side: Color Picker */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-auto flex flex-col gap-4 bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 shadow-xl z-20">
            <ColorBtn color="#ffffff" active={selectedColor === 'white'} onClick={() => setSelectedColor('white')} />
            <ColorBtn color="#5D7FE5" active={selectedColor === 'deepBlue'} onClick={() => setSelectedColor('deepBlue')} />
            <ColorBtn color="#9899EE" active={selectedColor === 'lavender'} onClick={() => setSelectedColor('lavender')} />
            <ColorBtn color="#B7C2ED" active={selectedColor === 'periwinkle'} onClick={() => setSelectedColor('periwinkle')} />
            <ColorBtn color="#FBE8FD" active={selectedColor === 'pale'} onClick={() => setSelectedColor('pale')} />
            <ColorBtn color="#FDBBDB" active={selectedColor === 'pink'} onClick={() => setSelectedColor('pink')} />
        </div>

        {/* Center Guide (Dynamic) - REMOVED RELEASE TEXT */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-80 mix-blend-screen pointer-events-none">
        </div>

        {/* Bottom Instructions */}
        <div className="flex justify-center pb-8">
           <div className="bg-black/10 backdrop-blur-md rounded-full px-6 py-2 border border-white/20 flex gap-8 text-sm text-white/80 shadow-sm">
              <span className={`transition-colors duration-300 ${currentAction === 'SWAYING' ? 'text-white font-bold drop-shadow-md' : ''}`}>
                 ↔ Sway Head gently
              </span>
              <span className="w-px bg-white/20"></span>
              <span className={`transition-colors duration-300 ${currentAction === 'BLOWING' ? 'text-white font-bold drop-shadow-md' : ''}`}>
                 💨 Blow into mic
              </span>
           </div>
        </div>
      </div>
      
      {/* Debug/Feedback Visualization (Subtle) */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
        <div 
          className="h-full bg-white transition-all duration-75 ease-out opacity-60 shadow-[0_0_10px_white]"
          style={{ width: `${Math.min(blowStrength * 100, 100)}%` }}
        />
      </div>

    </div>
  );
};

export default App;