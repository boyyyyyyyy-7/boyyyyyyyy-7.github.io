
import React, { useState } from 'react';
import { PlayerProfile, AntType, Difficulty, GameMode } from '../types';
import { ANT_CONFIGS } from '../services/gameService';
import { DEFAULT_PROFILE } from '../services/storageService';

interface MainMenuProps {
  profile: PlayerProfile;
  onStartGame: (level: number, ant: AntType, difficulty: Difficulty, mode: GameMode) => void;
  onUpdateProfile: (p: PlayerProfile) => void;
  onDebugWin: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ profile, onStartGame, onUpdateProfile, onDebugWin }) => {
  const [view, setView] = useState<'MAIN' | 'LEVELS' | 'ANTS' | 'DIFFICULTY' | 'SETTINGS'>('MAIN');
  const [selectedLevel, setSelectedLevel] = useState<number>(profile.unlockedLevels);
  const [selectedAnt, setSelectedAnt] = useState<AntType>(profile.selectedAnt);
  const [selectedMode, setSelectedMode] = useState<GameMode>('CAMPAIGN');

  const handleLevelSelect = (lvl: number) => {
    if (lvl <= profile.unlockedLevels) {
      setSelectedLevel(lvl);
      setView('ANTS');
    }
  };

  const handleModeSelect = (mode: GameMode) => {
      setSelectedMode(mode);
      if (mode === 'ENDLESS') {
          // Endless starts at level 1 difficulty-wise
          setSelectedLevel(1);
          setView('ANTS');
      } else {
          setView('LEVELS');
      }
  }

  const handleAntSelect = (type: AntType) => {
    setSelectedAnt(type);
    setView('DIFFICULTY');
  };

  const handleDifficultySelect = (diff: Difficulty) => {
    // Save preferences
    onUpdateProfile({ 
        ...profile, 
        selectedAnt: selectedAnt,
        lastDifficulty: diff 
    });
    onStartGame(selectedLevel, selectedAnt, diff, selectedMode);
  };

  if (view === 'LEVELS') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-8 z-20 relative">
        <h2 className="text-3xl text-[#7cb342] retro-font mb-6 tracking-widest bg-black/50 px-4 py-1">SELECT SECTOR</h2>
        <div className="grid grid-cols-5 gap-3 max-w-2xl overflow-y-auto max-h-[60vh] p-2">
          {Array.from({ length: 20 }).map((_, i) => {
            const lvl = i + 1;
            const locked = lvl > profile.unlockedLevels;
            const isBoss = lvl % 5 === 0;
            // Invert the display level so 1 is 20 (Deepest) and 20 is 1 (Surface)
            const displayDepth = 21 - lvl;
            
            return (
              <button
                key={lvl}
                onClick={() => handleLevelSelect(lvl)}
                disabled={locked}
                className={`w-14 h-14 border-2 font-mono font-bold flex flex-col items-center justify-center transition-all shrink-0
                  ${locked 
                    ? 'border-[#3e2723] text-[#4e342e] bg-[#271c19]' 
                    : 'border-[#7cb342] text-[#dcedc8] bg-[#33691e] hover:scale-110 active:scale-95 cursor-pointer shadow-lg'
                  }
                  ${isBoss && !locked ? 'border-red-500 text-red-100 animate-pulse' : ''}
                `}
              >
                <span>{displayDepth}</span>
                {isBoss && <span className="text-[8px] leading-none">BOSS</span>}
                {locked && <span className="text-[8px]">LOCK</span>}
              </button>
            );
          })}
        </div>
        <div className="text-[#a1887f] text-xs font-mono mt-2 mb-4">HIGHER NUMBER = DEEPER</div>
        <button 
          onClick={() => setView('MAIN')}
          className="mt-8 text-[#8d6e63] hover:text-[#d7ccc8] font-mono"
        >
          [ BACK ]
        </button>
      </div>
    );
  }

  if (view === 'ANTS') {
     return (
      <div className="flex flex-col items-center justify-center h-full w-full p-8 z-20 relative overflow-y-auto">
        <h2 className="text-3xl text-[#7cb342] retro-font mb-6 tracking-widest bg-black/50 px-4 py-1">HATCH LARVA</h2>
        <div className="flex flex-col gap-4 w-full max-w-md">
          {(Object.keys(ANT_CONFIGS) as AntType[]).map((type) => {
            const ant = ANT_CONFIGS[type];
            return (
              <button
                key={type}
                onClick={() => handleAntSelect(type)}
                className="flex items-center gap-4 bg-[#3e2723] border border-[#5d4037] p-4 rounded hover:bg-[#4e342e] transition-all hover:translate-x-2 text-left group"
              >
                <div className="text-4xl group-hover:scale-125 transition-transform">{ant.char}</div>
                <div>
                  <div className={`font-bold retro-font text-xl ${ant.color}`}>{ant.name}</div>
                  <div className="text-xs text-[#a1887f] font-mono">{ant.description}</div>
                  <div className="flex gap-2 mt-1 text-[10px] font-mono text-[#d7ccc8]">
                     <span>HP: {Math.round(ant.hpMod * 100)}%</span>
                     <span>SPD: {Math.round(ant.speedMod * 100)}%</span>
                     <span>ATK: {Math.round(ant.attackMod * 100)}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
         <button 
          onClick={() => selectedMode === 'ENDLESS' ? setView('MAIN') : setView('LEVELS')}
          className="mt-8 text-[#8d6e63] hover:text-[#d7ccc8] font-mono"
        >
          [ BACK ]
        </button>
      </div>
     );
  }

  if (view === 'DIFFICULTY') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-8 z-20 relative">
        <h2 className="text-3xl text-[#7cb342] retro-font mb-6 tracking-widest bg-black/50 px-4 py-1">THREAT LEVEL</h2>
        <div className="flex flex-col gap-4 w-full max-w-sm">
            <button
              onClick={() => handleDifficultySelect('EASY')}
              className="py-4 bg-[#33691e] hover:bg-[#558b2f] text-[#dcedc8] border border-[#7cb342] rounded font-bold font-mono text-xl transition-all shadow-lg hover:translate-x-1 flex justify-between px-6"
            >
               <span>LARVA</span>
               <span className="text-xs opacity-70 self-center">EASY</span>
            </button>
            <button
              onClick={() => handleDifficultySelect('NORMAL')}
              className="py-4 bg-[#e65100] hover:bg-[#ef6c00] text-[#fff3e0] border border-[#ffb74d] rounded font-bold font-mono text-xl transition-all shadow-lg hover:translate-x-1 flex justify-between px-6"
            >
               <span>WARRIOR</span>
               <span className="text-xs opacity-70 self-center">NORMAL</span>
            </button>
            <button
              onClick={() => handleDifficultySelect('HARD')}
              className="py-4 bg-[#b71c1c] hover:bg-[#c62828] text-[#ffebee] border border-[#ef5350] rounded font-bold font-mono text-xl transition-all shadow-lg hover:translate-x-1 flex justify-between px-6"
            >
               <span>NIGHTMARE</span>
               <span className="text-xs opacity-70 self-center">HARD</span>
            </button>
        </div>
        <button 
          onClick={() => setView('ANTS')}
          className="mt-8 text-[#8d6e63] hover:text-[#d7ccc8] font-mono"
        >
          [ BACK ]
        </button>
      </div>
    );
  }

  if (view === 'SETTINGS') {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full p-8 z-20 relative">
            <h2 className="text-3xl text-[#7cb342] retro-font mb-6 tracking-widest bg-black/50 px-4 py-1">SETTINGS</h2>
            
            <div className="w-full max-w-md bg-[#3e2723] border border-[#5d4037] p-6 rounded flex flex-col gap-8">
                {/* Sensitivity Slider */}
                <div>
                    <label className="flex justify-between text-[#dcedc8] font-mono mb-2">
                        <span>Turn Sensitivity</span>
                        <span className="text-[#7cb342]">{profile.sensitivity.toFixed(1)}x</span>
                    </label>
                    <input 
                        type="range" 
                        min="0.5" 
                        max="2.0" 
                        step="0.1" 
                        value={profile.sensitivity}
                        onChange={(e) => onUpdateProfile({...profile, sensitivity: parseFloat(e.target.value)})}
                        className="w-full accent-[#7cb342] h-2 bg-[#271c19] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#a1887f] mt-1 font-mono">
                        <span>Sluggish</span>
                        <span>Twitchy</span>
                    </div>
                </div>

                <div className="border-t border-[#5d4037] pt-6 flex flex-col gap-3">
                    <button 
                        onClick={() => {
                            if (window.confirm("Are you sure you want to reset all progress? This cannot be undone.")) {
                                onUpdateProfile(DEFAULT_PROFILE);
                                alert("Data reset.");
                                setView('MAIN');
                            }
                        }}
                        className="w-full py-2 bg-[#b71c1c] text-white font-mono text-sm border border-red-500 hover:bg-red-700"
                    >
                        RESET ALL DATA
                    </button>
                </div>
            </div>

            <button 
                onClick={() => setView('MAIN')}
                className="mt-8 text-[#8d6e63] hover:text-[#d7ccc8] font-mono"
            >
            [ BACK ]
            </button>
        </div>
      );
  }

  // MAIN VIEW
  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative z-20">
      <div className="mb-12 text-center">
        <h1 className="text-8xl retro-font text-[#7cb342] mb-2 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">ANT ESCAPE</h1>
        <div className="text-[#a1887f] font-mono tracking-[0.5em] text-sm animate-pulse">INVADED COLONY RUINS</div>
      </div>

      <div className="flex flex-col gap-4 w-64">
        <button
          onClick={() => handleModeSelect('CAMPAIGN')}
          className="py-3 bg-[#33691e] hover:bg-[#558b2f] text-[#dcedc8] border-2 border-[#7cb342] font-bold rounded retro-font text-2xl tracking-widest shadow-lg transition-all active:scale-95 uppercase"
        >
          DEPLOY
        </button>

        <button
          onClick={() => handleModeSelect('ENDLESS')}
          className="py-3 bg-[#e65100] hover:bg-[#ef6c00] text-[#fff3e0] border-2 border-[#ffb74d] font-bold rounded retro-font text-xl tracking-widest shadow-lg transition-all active:scale-95 uppercase"
        >
          SURVIVAL MODE
        </button>
        
        <button 
            onClick={() => setView('SETTINGS')}
            className="py-2 bg-[#3e2723] hover:bg-[#4e342e] text-[#a1887f] hover:text-[#d7ccc8] border border-[#5d4037] font-mono uppercase text-sm"
        >
            SETTINGS
        </button>

        <div className="bg-[#3e2723] p-4 rounded border border-[#5d4037] text-center mt-4">
            <div className="text-xs text-[#a1887f] font-mono uppercase">Current Wealth</div>
            <div className="text-[#ffeb3b] font-bold text-xl">{profile.gold} Sugar</div>
        </div>
      </div>

      <div className="absolute bottom-4 text-[10px] text-[#5d4037] font-mono">
        v2.3 // SYSTEM READY
      </div>
    </div>
  );
};

export default MainMenu;
