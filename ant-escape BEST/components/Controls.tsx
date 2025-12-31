
import React from 'react';

interface ControlsProps {
  onControlDown: (key: string) => void;
  onControlUp: (key: string) => void;
}

const ControlButton: React.FC<{
  controlKey: string;
  label: React.ReactNode;
  onDown: (k: string) => void;
  onUp: (k: string) => void;
  className?: string;
  title?: string;
}> = ({ controlKey, label, onDown, onUp, className, title }) => {
  
  const handleStart = (e: React.PointerEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    onDown(controlKey);
  };

  const handleEnd = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
    }
    onUp(controlKey);
  };

  return (
    <button 
      onPointerDown={handleStart}
      onPointerUp={handleEnd}
      onPointerLeave={handleEnd}
      onPointerCancel={handleEnd}
      onContextMenu={(e) => e.preventDefault()} // Prevent long-press context menu
      className={`touch-none select-none active:bg-[#3e2723] active:scale-95 transition-transform ${className}`}
      title={title}
      style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }} // Disable iOS callouts and selection
    >
      {label}
    </button>
  );
};

const Controls: React.FC<ControlsProps> = ({ onControlDown, onControlUp }) => {
  // Styles for D-Pad buttons
  const btnClass = "bg-[#4e342e] hover:bg-[#5d4037] rounded-lg flex items-center justify-center border-b-4 border-[#3e2723] active:border-b-0 active:translate-y-1 text-[#d7ccc8] shadow-md w-10 h-10 text-lg font-bold";
  
  // Styles for Action buttons
  const actionBtnClass = "rounded-full flex items-center justify-center border-b-4 active:border-b-0 active:translate-y-1 shadow-md text-sm font-bold transition-all";

  return (
    <div className="flex flex-col items-center gap-4 mt-2 w-full select-none touch-none bg-[#271c19]/50 p-4 rounded-lg border border-[#3e2723]">
      
      {/* D-PAD */}
      <div className="grid grid-cols-3 gap-2">
        <div />
        <ControlButton 
          controlKey="UP" 
          label="▲" 
          onDown={onControlDown} 
          onUp={onControlUp} 
          className={btnClass}
          title="Forward"
        />
        <div />
        
        <ControlButton 
          controlKey="LEFT" 
          label="↺" 
          onDown={onControlDown} 
          onUp={onControlUp} 
          className={btnClass}
          title="Turn Left"
        />
        <div className="flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#3e2723] opacity-50" />
        </div>
        <ControlButton 
          controlKey="RIGHT" 
          label="↻" 
          onDown={onControlDown} 
          onUp={onControlUp} 
          className={btnClass}
          title="Turn Right"
        />

        <div />
        <ControlButton 
          controlKey="DOWN" 
          label="▼" 
          onDown={onControlDown} 
          onUp={onControlUp} 
          className={btnClass}
          title="Backward"
        />
        <div />
      </div>

      <div className="w-full h-px bg-[#3e2723] my-1" />

      {/* ACTION BUTTONS (Placed Under D-Pad) */}
      <div className="flex flex-row gap-6 items-end justify-center">
          {/* SHIFT / SPRINT BUTTON */}
          <div className="flex flex-col items-center gap-1">
             <ControlButton 
                controlKey="SPRINT" 
                label="SHIFT" 
                onDown={onControlDown} 
                onUp={onControlUp} 
                className={`${actionBtnClass} w-14 h-14 bg-[#ffb300] hover:bg-[#ffca28] text-black border-[#ff6f00]`}
                title="Sprint"
              />
          </div>

          {/* BITE BUTTON */}
          <div className="flex flex-col items-center gap-1 group">
            <ControlButton 
                controlKey="ATTACK" 
                label="BITE" 
                onDown={onControlDown} 
                onUp={onControlUp} 
                className={`${actionBtnClass} w-16 h-16 bg-[#d84315] hover:bg-[#ff5722] text-white border-[#bf360c]`}
                title="Bite / Attack"
            />
             <span className="text-[10px] font-bold tracking-widest text-[#a1887f] font-mono bg-black/20 px-1 rounded">
                [SPACE]
            </span>
          </div>
      </div>
      
    </div>
  );
};

export default Controls;
