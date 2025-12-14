import React from 'react';
import { MatchState, ActionType, Team } from '../types';
import PlayerCard from './PlayerCard';

interface GameUIProps {
  state: MatchState;
  onActionSelect: (action: ActionType) => void;
  onRestart: () => void;
  onExit: () => void;
}

export const ScoreBoard: React.FC<{ state: MatchState }> = ({ state }) => {
  return (
    <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-1 rounded shadow-lg z-50 flex items-center gap-3 backdrop-blur-md border border-white/10 origin-top-left scale-90 pointer-events-none select-none">
      <div className="flex flex-col items-center">
        <span className="font-bold text-lg font-sport text-gray-300">{state.homeTeam.shortName}</span>
      </div>
      <div className="bg-yellow-600 px-2 py-0.5 rounded text-xl font-black font-sport leading-none">
          {state.score.home} - {state.score.away}
      </div>
      <div className="flex flex-col items-center">
        <span className="font-bold text-lg font-sport text-gray-300">{state.awayTeam.shortName}</span>
      </div>
      <div className="w-px h-6 bg-gray-600 mx-1"></div>
      <span className="text-sm font-mono text-yellow-400">{state.time}'</span>
    </div>
  );
};

export const ActionMenu: React.FC<{ onSelect: (a: ActionType) => void, position: 'attack' | 'defense' }> = ({ onSelect, position }) => {
  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-50 animate-bounce-in">
       <div className="bg-gradient-to-t from-black/90 to-transparent p-6 rounded-2xl border-t border-white/20 backdrop-blur-sm flex flex-col items-center">
          <h3 className="text-center text-white mb-4 font-sport text-2xl tracking-wider uppercase drop-shadow-md">
            {position === 'attack' ? '¡Balón Controlado!' : '¡Enfréntalo!'}
          </h3>
          <div className="flex gap-3 justify-center w-full">
            {position === 'attack' ? (
              <>
                <ActionButton label="PASAR" icon="🦶" color="bg-blue-600" onClick={() => onSelect('PASS')} />
                <ActionButton label="REGATE" icon="🏃" color="bg-green-600" onClick={() => onSelect('DRIBBLE')} />
                <ActionButton label="TIRAR" icon="⚽" color="bg-red-600" onClick={() => onSelect('SHOOT')} />
              </>
            ) : (
              <>
                <ActionButton label="AGUANTAR" icon="🛡️" color="bg-gray-600" onClick={() => onSelect('DEFEND')} />
                <ActionButton label="ENTRADA" icon="👟" color="bg-red-800" onClick={() => onSelect('DEFEND')} />
              </>
            )}
          </div>
       </div>
    </div>
  );
};

const ActionButton: React.FC<{ label: string; icon: string; color: string; onClick: () => void }> = ({ label, icon, color, onClick }) => (
  <button
    onClick={onClick}
    className={`${color} flex-1 hover:brightness-125 active:scale-95 text-white font-bold py-4 px-2 rounded-xl shadow-lg transition-all transform flex flex-col items-center gap-1 border-b-4 border-black/20`}
  >
    <span className="text-2xl">{icon}</span>
    <span className="font-sport tracking-widest text-lg">{label}</span>
  </button>
);

export const FeedbackOverlay: React.FC<{ message: string, type: 'goal' | 'miss' | 'info' }> = ({ message, type }) => {
  const color = type === 'goal' ? 'text-yellow-400' : type === 'miss' ? 'text-red-500' : 'text-white';
  
  return (
    <div className="absolute inset-0 flex items-center justify-center z-[60] pointer-events-none bg-black/20 backdrop-blur-[2px]">
      <h1 className={`text-5xl md:text-8xl font-black font-sport ${color} text-center px-4 transform transition-all duration-300 drop-shadow-[0_10px_20px_rgba(0,0,0,1)] animate-shake rotate-2`}>
        {message}
      </h1>
    </div>
  );
};