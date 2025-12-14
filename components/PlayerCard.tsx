import React from 'react';
import { Player } from '../types';

interface PlayerCardProps {
  player: Player;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  isSelected?: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, size = 'md', onClick, isSelected }) => {
  const sizeClasses = {
    sm: 'w-16 h-24 text-[8px]',
    md: 'w-24 h-36 text-[10px]',
    lg: 'w-48 h-72 text-sm',
  };

  const ratingColor = player.rating >= 85 ? 'bg-yellow-500' : player.rating >= 75 ? 'bg-gray-300' : 'bg-orange-700';
  const borderClass = isSelected ? 'ring-4 ring-yellow-400 scale-105' : '';

  return (
    <div 
      onClick={onClick}
      className={`relative ${sizeClasses[size]} ${borderClass} transition-all duration-300 cursor-pointer select-none`}
    >
      {/* Card Shape */}
      <div className={`absolute inset-0 ${ratingColor} rounded-t-lg rounded-b-xl shadow-lg border-2 border-yellow-200 overflow-hidden`}>
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        
        {/* Shine Effect */}
        <div className="absolute inset-0 card-shine pointer-events-none z-10"></div>

        {/* Content */}
        <div className="relative z-0 h-full flex flex-col p-1 text-black font-bold">
          
          {/* Top Info */}
          <div className="flex justify-between items-start leading-tight">
            <div className="flex flex-col items-center">
              <span className="text-lg md:text-xl font-black">{player.rating}</span>
              <span className="opacity-80">{player.position}</span>
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 flex justify-center items-center overflow-hidden my-1">
             <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover rounded-full border-2 border-white/50" />
          </div>

          {/* Name */}
          <div className="text-center border-b border-black/20 mb-1 truncate font-sport uppercase tracking-tighter">
            {player.name}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-x-1 opacity-90">
            <div className="flex justify-between"><span>PAC</span><span>{player.stats.VEL}</span></div>
            <div className="flex justify-between"><span>DRI</span><span>{player.stats.REG}</span></div>
            <div className="flex justify-between"><span>SHO</span><span>{player.stats.TIR}</span></div>
            <div className="flex justify-between"><span>DEF</span><span>{player.stats.CEN}</span></div>
            <div className="flex justify-between"><span>PAS</span><span>{player.stats.PAS}</span></div>
            <div className="flex justify-between"><span>PHY</span><span>{player.stats.PRE}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;