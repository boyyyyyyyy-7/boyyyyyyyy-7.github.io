
import React, { useRef, useEffect } from 'react';
import { GameState } from '../types';
import Controls from './Controls';

interface StatsPanelProps {
  state: GameState;
  onControlDown: (key: string) => void;
  onControlUp: (key: string) => void;
}

const MiniMap = ({ state }: { state: GameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#1a120b'; // Dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cellW = canvas.width / state.width;
    const cellH = canvas.height / state.height;

    // Draw Map
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const tile = state.map[y][x];
        if (tile.seen) {
            if (tile.type === 'FLOOR') {
                ctx.fillStyle = tile.visible ? '#4e342e' : '#3e2723';
                ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
            } else if (tile.type === 'WALL') {
                ctx.fillStyle = tile.visible ? '#5d4037' : '#271c19';
                 ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
            }
        }
      }
    }

    // Draw Entities
    state.entities.forEach(e => {
        // Simple visibility check
        const gx = Math.floor(e.pos.x);
        const gy = Math.floor(e.pos.y);
        if (state.map[gy] && state.map[gy][gx] && state.map[gy][gx].visible) {
             if (e.type === 'ENEMY') {
                 // Calculate angle to player to point the triangle
                 const dx = state.player.pos.x - e.pos.x;
                 const dy = state.player.pos.y - e.pos.y;
                 const angle = Math.atan2(dy, dx);
                 
                 ctx.save();
                 ctx.translate(e.pos.x * cellW, e.pos.y * cellH);
                 
                 if (e.isBoss) {
                     // Draw Boss Icon (Skull/X shape)
                     ctx.fillStyle = '#ff1744'; // Red-Accented
                     ctx.strokeStyle = '#b71c1c';
                     ctx.lineWidth = 1;
                     
                     ctx.beginPath();
                     // Draw a diamond/star shape for boss
                     ctx.moveTo(0, -cellW * 0.7);
                     ctx.lineTo(cellW * 0.5, 0);
                     ctx.lineTo(0, cellW * 0.7);
                     ctx.lineTo(-cellW * 0.5, 0);
                     ctx.closePath();
                     ctx.fill();
                     
                     // X mark
                     ctx.beginPath();
                     ctx.moveTo(-cellW * 0.3, -cellW * 0.3);
                     ctx.lineTo(cellW * 0.3, cellW * 0.3);
                     ctx.moveTo(cellW * 0.3, -cellW * 0.3);
                     ctx.lineTo(-cellW * 0.3, cellW * 0.3);
                     ctx.strokeStyle = '#fff';
                     ctx.stroke();

                 } else {
                     // Draw Enemy Triangle pointing to player
                     ctx.rotate(angle);
                     ctx.fillStyle = '#e53935';
                     ctx.beginPath();
                     // Triangle pointing right (which is 0 rads in canvas)
                     ctx.moveTo(cellW * 0.6, 0);
                     ctx.lineTo(-cellW * 0.4, cellW * 0.4);
                     ctx.lineTo(-cellW * 0.4, -cellW * 0.4);
                     ctx.closePath();
                     ctx.fill();
                 }
                 ctx.restore();

             } else if (e.type === 'ITEM') {
                 // Draw Item as small diamond
                 ctx.fillStyle = '#ffd54f';
                 ctx.beginPath();
                 ctx.moveTo(e.pos.x * cellW, (e.pos.y - 0.4) * cellH);
                 ctx.lineTo((e.pos.x + 0.4) * cellW, e.pos.y * cellH);
                 ctx.lineTo(e.pos.x * cellW, (e.pos.y + 0.4) * cellH);
                 ctx.lineTo((e.pos.x - 0.4) * cellW, e.pos.y * cellH);
                 ctx.fill();

             } else if (e.type === 'EXIT') {
                 ctx.fillStyle = '#fff176';
                 ctx.fillRect(e.pos.x * cellW - cellW/2, e.pos.y * cellH - cellH/2, cellW, cellH);
                 // Border
                 ctx.strokeStyle = '#f57f17';
                 ctx.lineWidth = 1;
                 ctx.strokeRect(e.pos.x * cellW - cellW/2, e.pos.y * cellH - cellH/2, cellW, cellH);
             }
        }
    });

    // Draw Player Arrow
    const pX = state.player.pos.x * cellW;
    const pY = state.player.pos.y * cellH;
    const pAngle = state.player.angle || 0;

    ctx.save();
    ctx.translate(pX, pY);
    ctx.rotate(pAngle);
    
    ctx.fillStyle = '#7cb342'; // Green
    ctx.beginPath();
    ctx.moveTo(cellW * 0.7, 0);
    ctx.lineTo(-cellW * 0.5, cellW * 0.5);
    ctx.lineTo(-cellW * 0.2, 0); // Indent
    ctx.lineTo(-cellW * 0.5, -cellW * 0.5);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();

  }, [state]);

  return (
    <div className="w-full aspect-[4/3] bg-[#000] border border-[#5d4037] rounded-sm relative mt-4 shadow-inner shrink-0">
        <canvas 
            ref={canvasRef} 
            width={state.width * 8} 
            height={state.height * 8} 
            className="w-full h-full object-contain pixelated" 
        />
        <div className="absolute bottom-1 right-1 text-[8px] text-[#a1887f] font-mono opacity-50">RADAR</div>
    </div>
  );
}

const StatsPanel: React.FC<StatsPanelProps> = ({ state, onControlDown, onControlUp }) => {
  const hpPercent = Math.max(0, Math.min(100, (state.player.hp! / state.player.maxHp!) * 100));
  const staminaPercent = Math.max(0, Math.min(100, (state.player.stamina! / state.player.maxStamina!) * 100));
  
  // Logic for display: Campaign counts down from 20 (Deepest) to 1 (Surface). Endless counts up.
  const displayLevelLabel = state.gameMode === 'ENDLESS' ? "Wave" : "Distance";
  const displayLevelValue = state.gameMode === 'ENDLESS' ? state.level : Math.max(0, 21 - state.level);

  return (
    <div className="bg-[#3e2723] border-b border-[#5d4037] md:border-b-0 md:border-r md:w-72 p-6 flex flex-col gap-6 shrink-0 relative overflow-y-auto text-[#d7ccc8] h-full">
      
      <div className="z-10 shrink-0">
        <h1 className="text-4xl text-[#7cb342] retro-font mb-1 tracking-widest drop-shadow-sm">
          ANT ESCAPE
        </h1>
        <p className="text-sm text-[#8d6e63] font-mono uppercase tracking-widest">Colony {state.gameMode === 'ENDLESS' ? 'Deep Zone' : 'Sector 7'}</p>
      </div>

      {/* BARS */}
      <div className="z-10 flex flex-col gap-3 shrink-0">
        {/* HEALTH */}
        <div>
          <div className="flex justify-between text-xs text-[#a1887f] mb-1 font-mono uppercase tracking-widest">
            <span>Exoskeleton</span>
            <span>{state.player.hp}</span>
          </div>
          <div className="h-4 w-full bg-[#271c19] rounded-sm overflow-hidden border border-[#5d4037]">
            <div 
              className="h-full bg-gradient-to-r from-[#33691e] via-[#558b2f] to-[#7cb342] transition-all duration-500"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* STAMINA */}
        <div>
          <div className="flex justify-between text-xs text-[#a1887f] mb-1 font-mono uppercase tracking-widest">
            <span>Stamina (Sprint)</span>
            <span>{state.player.stamina && Math.round(state.player.stamina)}</span>
          </div>
          <div className="h-4 w-full bg-[#271c19] rounded-sm overflow-hidden border border-[#5d4037]">
            <div 
              className={`h-full transition-all duration-300 ${state.player.stamina! < 15 ? 'bg-red-900' : 'bg-[#ffca28]'}`}
              style={{ width: `${staminaPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 gap-3 font-mono text-sm z-10 shrink-0">
        <div className="bg-[#4e342e] p-3 border border-[#5d4037] rounded-sm">
           <div className="text-[10px] text-[#a1887f] uppercase mb-1">{displayLevelLabel}</div>
           <div className="text-[#ffb74d] font-bold text-xl">{displayLevelValue}</div>
        </div>
        <div className="bg-[#4e342e] p-3 border border-[#5d4037] rounded-sm">
           <div className="text-[10px] text-[#a1887f] uppercase mb-1">Sugar</div>
           <div className="text-[#ffffff] font-bold text-xl">{state.gold}</div>
        </div>
      </div>

      {/* MINI MAP */}
      <MiniMap state={state} />

      {/* CONTROLS (Moved under MiniMap) */}
      <Controls onControlDown={onControlDown} onControlUp={onControlUp} />

    </div>
  );
};

export default StatsPanel;
