
import React, { useState } from 'react';

interface TutorialOverlayProps {
  onComplete: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "COLONY FALLEN",
      content: "The colony has been invaded by a ruthless bug swarm. You are the last survivor. You must escape to the surface.",
      icon: "🚨"
    },
    {
      title: "NAVIGATION",
      content: "Use W, A, S, D or Arrow Keys to move. Your flashlight will reveal the path ahead. Find the Tunnel Up (🔆) to escape the sector.",
      icon: "🔦"
    },
    {
      title: "COMBAT",
      content: "Invaders lurk in the darkness. Press SPACE, E, or F to BITE enemies in front of you. You can also sprint with SHIFT to escape.",
      icon: "⚔️"
    },
    {
      title: "SURVIVAL",
      content: "Collect Sugar Crystals (🧊) to gather wealth. Eat Royal Jelly (🍯) to restore your integrity. Don't let them catch you.",
      icon: "🍯"
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#271c19] border-2 border-[#7cb342] max-w-lg w-full p-6 relative shadow-[0_0_20px_rgba(124,179,66,0.2)]">
        <div className="absolute -top-3 -left-3 bg-[#33691e] text-[#dcedc8] px-2 py-1 font-mono text-xs border border-[#7cb342]">
          TUTORIAL {step + 1}/{steps.length}
        </div>
        
        <div className="flex flex-col items-center text-center gap-6 mt-4">
          <div className="text-6xl animate-bounce">{steps[step].icon}</div>
          
          <div>
            <h2 className="text-3xl text-[#7cb342] retro-font mb-2 tracking-widest">{steps[step].title}</h2>
            <p className="text-[#d7ccc8] font-mono text-lg leading-relaxed">{steps[step].content}</p>
          </div>

          <button 
            onClick={handleNext}
            className="mt-4 px-8 py-3 bg-[#7cb342] hover:bg-[#558b2f] text-[#1a120b] font-bold font-mono text-xl rounded shadow-lg transition-transform active:scale-95"
          >
            {step === steps.length - 1 ? "DEPLOY" : "NEXT >>"}
          </button>
        </div>
      </div>
    </div>
  );
};
