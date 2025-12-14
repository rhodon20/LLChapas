import React, { useRef, useState, useEffect } from 'react';
import { Player, Vector2, MatchState } from '../types';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../constants';
import PlayerCard from './PlayerCard';

interface PitchProps {
  state: MatchState;
  onPlayerSelect: (playerId: string) => void;
  onDragEnd: (start: Vector2, end: Vector2) => void;
  onFieldClick: (pos: Vector2) => void;
  isInteractive: boolean;
}

const Pitch: React.FC<PitchProps> = ({ state, onPlayerSelect, onDragEnd, onFieldClick, isInteractive }) => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<Vector2 | null>(null);
  const [currentDrag, setCurrentDrag] = useState<Vector2 | null>(null);
  const [sparks, setSparks] = useState<{id: number, x: number, y: number}[]>([]);

  // Effect to sync impacts from state to visual sparks
  useEffect(() => {
    if (state.impacts.length > 0) {
      const newSparks = state.impacts.map((imp, i) => ({
        id: Date.now() + i,
        x: imp.x,
        y: imp.y
      }));
      setSparks(prev => [...prev, ...newSparks]);
      
      // Cleanup sparks
      setTimeout(() => {
        setSparks(prev => prev.filter(s => !newSparks.find(ns => ns.id === s.id)));
      }, 500);
    }
  }, [state.impacts]);

  const handlePointerDown = (e: React.PointerEvent, targetId?: string, isBall: boolean = false) => {
    if (!isInteractive) return;
    
    // Logic for initializing drag based on phase
    let shouldStartDrag = false;

    // 1. Turn Start: Must click specific player
    if (state.phase === 'TURN_START') {
        if (targetId) {
            const isHomePlayer = state.homeTeam.players.some(p => p.id === targetId);
            if (isHomePlayer && !isBall) {
                 if (state.activePlayerId !== targetId) onPlayerSelect(targetId);
                 shouldStartDrag = true;
            }
        }
    } 
    // 2. Aiming Pass/Shoot: Click ANYWHERE to drag
    else if (state.phase === 'AIMING_PASS' || state.phase === 'AIMING_SHOT') {
        shouldStartDrag = true;
    } 
    // 3. Extra Move: Click ANYWHERE to drag (controls interacting player)
    else if (state.phase === 'AIMING_EXTRA_MOVE') {
        shouldStartDrag = true;
    }
    // 4. Defend Shot: Click ANYWHERE (controls GK)
    else if (state.phase === 'DEFEND_SHOT') {
         shouldStartDrag = true;
    }

    if (shouldStartDrag) {
        e.preventDefault();
        e.stopPropagation(); 
        const rect = pitchRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setDragStart({ x, y });
        setCurrentDrag({ x, y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart) return;
    const rect = pitchRef.current!.getBoundingClientRect();
    setCurrentDrag({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handlePointerUp = () => {
    if (!dragStart || !currentDrag || !pitchRef.current) {
      setDragStart(null);
      setCurrentDrag(null);
      return;
    }

    const { width, height } = pitchRef.current.getBoundingClientRect();
    // Invert X because pulling back shoots forward
    const vector = {
      x: (dragStart.x - currentDrag.x) / (width / 5), 
      y: (dragStart.y - currentDrag.y) / (height / 7),
    };

    if (Math.abs(vector.x) > 0.05 || Math.abs(vector.y) > 0.05) {
        onDragEnd(dragStart, vector);
    }
    
    setDragStart(null);
    setCurrentDrag(null);
  };

  // Render tokens
  const renderPlayerToken = (player: Player, isHome: boolean) => {
    const physics = state.physicsEntities[player.id];
    if (!physics) return null;

    const isSelected = state.activePlayerId === player.id;
    const isInteracting = state.interactingPlayerId === player.id;
    const isGK = player.position === 'POR';
    const isDefendingShot = state.phase === 'DEFEND_SHOT' && isGK && isHome;

    const ringColor = isHome ? 'border-blue-500' : 'border-red-600';
    
    // Visual hint only
    const canInteract = (state.phase === 'TURN_START' && isHome);

    return (
      <div
        key={player.id}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 will-change-transform ${canInteract ? 'cursor-pointer' : ''}`}
        style={{ left: `${physics.position.x}%`, top: `${physics.position.y}%` }}
        onPointerDown={(e) => handlePointerDown(e, player.id, false)}
      >
        <div className={`relative w-12 h-12 md:w-16 md:h-16 rounded-full border-4 ${isSelected || isDefendingShot ? 'border-yellow-400 scale-110' : ringColor} shadow-[0_4px_6px_rgba(0,0,0,0.5)] bg-gray-800 overflow-hidden transition-transform duration-100`}>
           <img src={player.imageUrl} className="w-full h-full object-cover" />
           {/* Highlight Pulse */}
           {( (isInteracting && state.phase === 'AIMING_EXTRA_MOVE') || isDefendingShot ) && 
             <div className="absolute inset-0 border-4 border-yellow-300 rounded-full animate-pulse"></div>
           }
        </div>
        
        {/* Indicators */}
        {isSelected && state.phase === 'TURN_START' && (
             <div className="absolute -top-8 animate-bounce text-yellow-400 text-2xl drop-shadow-md">▼</div>
        )}
        {isDefendingShot && (
             <div className="absolute -top-10 animate-bounce text-red-500 font-bold text-xs bg-black px-1 rounded border border-red-500">¡MUEVE PORTERO!</div>
        )}

        {/* Name Tag (Added) */}
        {(isSelected || isInteracting) && (
             <div className="absolute -bottom-8 bg-black/80 text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap z-50 pointer-events-none border border-white/20 shadow-md">
                 {player.name}
             </div>
        )}
      </div>
    );
  };

  // Ball
  const renderBall = () => {
    const physics = state.physicsEntities['ball'];
    if (!physics) return null;

    const isAimingBall = state.phase === 'AIMING_PASS' || state.phase === 'AIMING_SHOT';

    return (
      <div
        className={`absolute w-5 h-5 md:w-6 md:h-6 bg-white rounded-full border border-gray-400 shadow-md transform -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center will-change-transform ${isAimingBall ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
        style={{ left: `${physics.position.x}%`, top: `${physics.position.y}%` }}
        onPointerDown={(e) => handlePointerDown(e, 'ball', true)}
      >
        <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff,#999,#000)]"></div>
      </div>
    );
  };

  return (
    <div 
      ref={pitchRef}
      className={`relative w-full h-full bg-[#2d6934] overflow-hidden select-none touch-none shadow-inner border-x-4 border-black/30 perspective-field`}
      onPointerDown={(e) => handlePointerDown(e)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
        {/* Grass Pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 10%, #000 10%, #000 20%)` }}>
        </div>

      {/* Field Lines */}
      <div className="absolute inset-4 border-2 border-white/50 rounded-lg pointer-events-none"></div>
      <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/50 transform -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 w-32 h-32 border-2 border-white/50 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

      {/* Areas & Goals (EXPANDED WIDTH x2.5) */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-1/2 h-32 border-2 border-t-0 border-white/50 pointer-events-none"></div>
      {/* CPU Goal */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[30%] h-4 bg-white/20 border-x-2 border-b-2 border-white/60 pointer-events-none rounded-b-lg">
          <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#fff_5px,#fff_6px)] opacity-20"></div>
      </div> 
      
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-1/2 h-32 border-2 border-b-0 border-white/50 pointer-events-none"></div>
      {/* User Goal */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[30%] h-4 bg-white/20 border-x-2 border-t-2 border-white/60 pointer-events-none rounded-t-lg">
          <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#fff_5px,#fff_6px)] opacity-20"></div>
      </div>

      {/* Visual Helpers */}
      {(state.phase === 'AIMING_PASS' || state.phase === 'AIMING_SHOT') && (
          <div className="absolute inset-0 pointer-events-none z-0">
             <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 text-white/30 font-black text-2xl uppercase animate-bounce text-center w-full">
                ARRASTRA EN CUALQUIER LADO PARA LANZAR
             </div>
          </div>
      )}
      
      {state.phase === 'AIMING_EXTRA_MOVE' && (
          <div className="absolute inset-0 pointer-events-none z-0">
             <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 text-white/30 font-black text-2xl uppercase animate-bounce text-center w-full">
                ARRASTRA PARA REGATEAR
             </div>
          </div>
      )}
      
      {state.phase === 'DEFEND_SHOT' && (
          <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center">
             <div className="text-red-500 font-black text-4xl uppercase animate-pulse drop-shadow-xl bg-black/40 px-4 py-2 rounded text-center">
                ¡MUEVE AL PORTERO!<br/><span className="text-sm text-white">Arrastra pantalla</span>
             </div>
          </div>
      )}

      {/* Entities */}
      {state.homeTeam.players.map(p => renderPlayerToken(p, true))}
      {state.awayTeam.players.map(p => renderPlayerToken(p, false))}
      {renderBall()}
      
      {/* Sparks FX */}
      {sparks.map(spark => (
        <div 
            key={spark.id}
            className="absolute w-12 h-12 bg-yellow-300 rounded-full blur-md animate-ping pointer-events-none z-30 opacity-80"
            style={{ left: `${spark.x}%`, top: `${spark.y}%` }}
        />
      ))}

      {/* Drag Arrow */}
      {dragStart && currentDrag && (
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-30 filter drop-shadow-lg">
           <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
            </marker>
          </defs>
          <line
            x1={dragStart.x}
            y1={dragStart.y}
            x2={currentDrag.x}
            y2={currentDrag.y}
            stroke="#fbbf24"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="10, 10"
            opacity="0.8"
          />
           <line
            x1={dragStart.x}
            y1={dragStart.y}
            x2={dragStart.x + (dragStart.x - currentDrag.x)}
            y2={dragStart.y + (dragStart.y - currentDrag.y)}
            stroke="white"
            strokeWidth="4"
            opacity="0.4"
            markerEnd="url(#arrowhead)"
          />
        </svg>
      )}
    </div>
  );
};

export default Pitch;