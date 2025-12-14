import React from 'react';
import { LeagueRow } from '../types';

interface LeagueTableProps {
  standings: LeagueRow[];
  onClose: () => void;
  userTeamId?: string;
}

const LeagueTable: React.FC<LeagueTableProps> = ({ standings, onClose, userTeamId }) => {
  // Ordenar: Puntos > Diferencia de Goles > Goles a favor
  const sorted = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  });

  return (
    <div className="flex flex-col h-screen bg-slate-900 p-4 text-white">
      <h2 className="text-3xl font-sport text-center text-yellow-500 mb-6">Clasificación</h2>
      
      <div className="flex-1 overflow-y-auto bg-black/40 rounded-xl p-2">
        <table className="w-full text-sm md:text-base">
          <thead className="text-gray-400 border-b border-gray-700">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Equipo</th>
              <th className="p-2 text-center">PJ</th>
              <th className="p-2 text-center">DG</th>
              <th className="p-2 text-center font-bold text-white">PTS</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => (
              <tr 
                key={row.teamId} 
                className={`border-b border-gray-800 ${row.teamId === userTeamId ? 'bg-yellow-900/30' : ''}`}
              >
                <td className="p-3 font-bold">{index + 1}</td>
                <td className="p-3 font-bold truncate max-w-[120px]">
                  {row.teamName}
                  {row.teamId === userTeamId && <span className="ml-2 text-[10px] bg-yellow-500 text-black px-1 rounded">TU</span>}
                </td>
                <td className="p-3 text-center">{row.played}</td>
                <td className="p-3 text-center text-gray-400">{(row.gf - row.ga) > 0 ? `+${row.gf-row.ga}` : row.gf-row.ga}</td>
                <td className="p-3 text-center font-black text-yellow-400 text-lg">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button 
        onClick={onClose}
        className="mt-4 w-full bg-white text-black font-bold py-3 rounded-lg uppercase"
      >
        Volver
      </button>
    </div>
  );
};

export default LeagueTable;