
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, GameStatus, InputState, PlayerProfile, AntType, Difficulty, GameMode } from './types';
import { initGame, processTurn } from './services/gameService';
import { loadProfile, saveProfile } from './services/storageService';
import { audioService } from './services/audioService';
import StatsPanel from './components/StatsPanel';
import GameDisplay from './components/GameDisplay';
import MainMenu from './components/MainMenu';
import { TutorialOverlay } from './components/TutorialOverlay';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile());
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Use Refs for the game loop to avoid closure staleness without constant re-renders logic
  const gameStateRef = useRef<GameState | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());
  const virtualKeysPressed = useRef<Set<string>>(new Set()); 
  const requestRef = useRef<number>();

  // Sync ref with state for React rendering
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const handleStart = useCallback((level: number, ant: AntType, difficulty: Difficulty, mode: GameMode) => {
    // Resume audio context and start ambience
    audioService.resume();
    audioService.startAmbience();

    // Pass sensitivity from profile
    const newState = initGame(level, ant, difficulty, profile.sensitivity, mode);
    setGameState(newState);
    gameStateRef.current = newState;
    setStatus(GameStatus.PLAYING);
    
    // Check for tutorial on Level 1 if not seen
    if (level === 1 && !profile.hasSeenTutorial && mode === 'CAMPAIGN') {
      setShowTutorial(true);
    }
  }, [profile.hasSeenTutorial, profile.sensitivity]);

  const handleUpdateProfile = (newProfile: PlayerProfile) => {
    setProfile(newProfile);
    saveProfile(newProfile);
  };

  const handleReturnToMenu = () => {
    audioService.stopAmbience();
    setGameState(null);
    setStatus(GameStatus.START);
    gameStateRef.current = null;
    setShowTutorial(false);
  };
  
  const handleTutorialComplete = () => {
    setShowTutorial(false);
    const newProfile = { ...profile, hasSeenTutorial: true };
    setProfile(newProfile);
    saveProfile(newProfile);
  };

  // GAME LOOP
  const tick = useCallback(() => {
    // Stop loop if tutorial is open
    if (showTutorial) {
       requestRef.current = requestAnimationFrame(tick);
       return;
    }

    if (status !== GameStatus.PLAYING || !gameStateRef.current) {
        requestRef.current = requestAnimationFrame(tick);
        return;
    }

    const keys = new Set([...keysPressed.current, ...virtualKeysPressed.current]);
    
    const input: InputState = {
        forward: keys.has('ArrowUp') || keys.has('KeyW') || keys.has('UP'),
        backward: keys.has('ArrowDown') || keys.has('KeyS') || keys.has('DOWN'),
        left: keys.has('ArrowLeft') || keys.has('KeyA') || keys.has('LEFT'),
        right: keys.has('ArrowRight') || keys.has('KeyD') || keys.has('RIGHT'),
        sprint: keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('SPRINT'),
        // Added KeyE and KeyF for Bite
        attack: keys.has('Space') || keys.has('Enter') || keys.has('KeyE') || keys.has('KeyF') || keys.has('ATTACK')
    };

    const nextState = processTurn(gameStateRef.current, input);

    // WIN CONDITION LOGIC (Detected via isGameOver=true but player HP > 0)
    if (nextState.isGameOver) {
       audioService.stopAmbience();
       if ((nextState.player.hp || 0) > 0) {
          // Check for Campaign Win (Level 20) AND GameMode is Campaign
          if (nextState.gameMode === 'CAMPAIGN' && nextState.level >= 20) {
              setStatus(GameStatus.CAMPAIGN_WIN);
              const nextProfile = {
                  ...profile,
                  gold: profile.gold + nextState.gold
              };
              handleUpdateProfile(nextProfile);
          } else {
              // Standard Level VICTORY (Used for Campaign < 20 or Endless)
              setStatus(GameStatus.VICTORY);
              
              if (nextState.gameMode === 'CAMPAIGN') {
                   // Unlock next level if currently at max and not endless
                  if (nextState.level === profile.unlockedLevels) {
                    const nextProfile = {
                        ...profile,
                        unlockedLevels: profile.unlockedLevels + 1,
                        gold: profile.gold + nextState.gold
                    };
                    handleUpdateProfile(nextProfile);
                  } else {
                     handleUpdateProfile({...profile, gold: profile.gold + nextState.gold});
                  }
              } else {
                   // Endless Mode just saves gold
                   handleUpdateProfile({...profile, gold: profile.gold + nextState.gold});
              }
          }
       } else {
          // DEFEAT
          setStatus(GameStatus.GAME_OVER);
       }
    }

    setGameState(nextState); 
    gameStateRef.current = nextState;

    requestRef.current = requestAnimationFrame(tick);
  }, [status, profile, showTutorial]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [tick, profile]);

  // Virtual Control Handlers
  const handleControlDown = useCallback((key: string) => {
    virtualKeysPressed.current.add(key);
  }, []);

  const handleControlUp = useCallback((key: string) => {
    virtualKeysPressed.current.delete(key);
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    const handleBlur = () => {
        keysPressed.current.clear();
        virtualKeysPressed.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#271c19] overflow-hidden select-none">
      {/* Left Panel (Stats) - Contains Controls as well now */}
      {gameState && status !== GameStatus.START && (
        <StatsPanel 
            state={gameState} 
            onControlDown={handleControlDown} 
            onControlUp={handleControlUp} 
        />
      )}
      
      {/* Main Game Area */}
      <div className="flex-grow flex flex-col h-full relative">
        
        {status === GameStatus.START ? (
          <div className="absolute inset-0 bg-[#271c19]">
             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%235d4037\\' fill-opacity=\\'0.4\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
             <MainMenu 
                profile={profile} 
                onStartGame={handleStart} 
                onUpdateProfile={handleUpdateProfile}
                onDebugWin={() => {}} // Disabled but kept in interface for now
             />
          </div>
        ) : (
           gameState && <GameDisplay gameState={gameState} />
        )}

        {/* Tutorial Overlay */}
        {showTutorial && (
            <TutorialOverlay onComplete={handleTutorialComplete} />
        )}

        {/* Level Complete / Game Over / Campaign Win Overlay UI */}
        {(status === GameStatus.GAME_OVER || status === GameStatus.VICTORY || status === GameStatus.CAMPAIGN_WIN) && !showTutorial && (
            <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center animate-in fade-in duration-1000 text-center p-8 overflow-y-auto">
                <h1 className={`text-5xl md:text-6xl retro-font mb-4 ${
                    status === GameStatus.GAME_OVER ? 'text-[#d84315]' : 
                    status === GameStatus.CAMPAIGN_WIN ? 'text-[#ffd700] drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]' :
                    'text-[#7cb342]'
                }`}>
                    {status === GameStatus.GAME_OVER ? 'FALLEN SURVIVOR' : 
                     status === GameStatus.CAMPAIGN_WIN ? 'SURFACE REACHED' :
                     'SECTOR CLEARED'}
                </h1>

                {/* Campaign Win Photo - Pixel Art SVG */}
                {status === GameStatus.CAMPAIGN_WIN && (
                     <div className="relative mb-6 p-2 bg-[#e0e0e0] shadow-[0_0_30px_rgba(255,215,0,0.3)] rotate-1 max-w-md w-full animate-in zoom-in duration-700">
                        <svg viewBox="0 0 64 48" className="w-full h-auto block bg-[#4fa4f4]" shapeRendering="crispEdges">
                            {/* Sky */}
                            <rect x="0" y="0" width="64" height="48" fill="#4fa4f4" />
                            
                            {/* Sun */}
                            <rect x="52" y="4" width="8" height="8" fill="#ffd700" />
                            <rect x="50" y="6" width="12" height="4" fill="#ffd700" />
                            <rect x="54" y="2" width="4" height="12" fill="#ffd700" />

                            {/* Clouds */}
                            <rect x="10" y="8" width="10" height="4" fill="#ffffff" fillOpacity="0.8" />
                            <rect x="14" y="6" width="6" height="8" fill="#ffffff" fillOpacity="0.8" />
                            <rect x="35" y="12" width="12" height="3" fill="#ffffff" fillOpacity="0.7" />

                            {/* Grass/Ground */}
                            <rect x="0" y="32" width="64" height="16" fill="#7cb342" />
                            <rect x="0" y="32" width="64" height="2" fill="#558b2f" /> {/* Grass shadow */}
                            
                            {/* Flower */}
                            <rect x="50" y="28" width="1" height="4" fill="#33691e" />
                            <rect x="49" y="26" width="3" height="3" fill="#e91e63" />
                            <rect x="50" y="27" width="1" height="1" fill="#fff" />

                            {/* THE ANT (Black/Dark Brown) */}
                            {/* Back Leg */}
                            <rect x="18" y="30" width="1" height="4" fill="#212121" />
                            <rect x="19" y="29" width="2" height="1" fill="#212121" />
                            {/* Middle Leg */}
                            <rect x="24" y="30" width="1" height="4" fill="#212121" />
                            {/* Front Leg */}
                            <rect x="30" y="30" width="1" height="4" fill="#212121" />
                            <rect x="31" y="29" width="2" height="1" fill="#212121" />

                            {/* Abdomen */}
                            <rect x="16" y="24" width="6" height="5" fill="#3e2723" />
                            <rect x="17" y="23" width="4" height="7" fill="#3e2723" />
                            
                            {/* Thorax */}
                            <rect x="23" y="25" width="5" height="4" fill="#3e2723" />
                            
                            {/* Head */}
                            <rect x="29" y="23" width="4" height="5" fill="#3e2723" />
                            {/* Eye */}
                            <rect x="31" y="24" width="1" height="1" fill="#fff" />
                            
                            {/* Antennae */}
                            <rect x="32" y="22" width="2" height="1" fill="#212121" />
                            <rect x="34" y="20" width="1" height="2" fill="#212121" />
                        </svg>
                        <div className="h-10 bg-white flex items-center justify-center border-t border-gray-200">
                             <div className="text-black font-mono text-xs uppercase tracking-[0.2em] opacity-80">Sector 0: Surface</div>
                        </div>
                    </div>
                )}
                
                <p className="text-[#a1887f] font-mono mb-8 tracking-widest text-sm uppercase max-w-lg">
                    {status === GameStatus.GAME_OVER ? 'The invasion is complete. You were the last hope.' : 
                     status === GameStatus.CAMPAIGN_WIN ? 'You have reached the surface. You are the only one who made it out alive.' :
                     'Sector cleared. The swarm is close behind.'}
                </p>

                {status === GameStatus.CAMPAIGN_WIN && (
                     <div className="mb-10 text-[#ffb300] font-mono border-2 border-[#ffb300] p-6 rounded bg-[#ffb300]/10 max-w-md">
                        <div className="text-2xl font-bold retro-font mb-2">SURVIVED</div>
                        <div className="text-sm">You escaped all 20 sectors of the infested colony.</div>
                     </div>
                )}

                <div className="flex gap-4">
                    <button 
                        onClick={handleReturnToMenu}
                        className="px-6 py-3 border border-[#8d6e63] text-[#d7ccc8] hover:bg-[#3e2723] font-mono uppercase"
                    >
                        {status === GameStatus.CAMPAIGN_WIN ? 'Return to Title' : 'Return to Menu'}
                    </button>
                    
                    {status === GameStatus.VICTORY && (
                        <button 
                            onClick={() => handleStart(gameState!.level + 1, profile.selectedAnt, gameState!.difficulty, gameState!.gameMode)}
                            className="px-6 py-3 bg-[#33691e] text-white border border-[#558b2f] font-bold font-mono hover:bg-[#558b2f] uppercase"
                        >
                            Next Sector
                        </button>
                    )}
                    
                     {status === GameStatus.GAME_OVER && (
                        <button 
                            onClick={() => handleStart(gameState!.level, profile.selectedAnt, gameState!.difficulty, gameState!.gameMode)}
                            className="px-6 py-3 bg-[#bf360c] text-white border border-[#d84315] font-bold font-mono hover:bg-[#d84315] uppercase"
                        >
                            Retry
                        </button>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
