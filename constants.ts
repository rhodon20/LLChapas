import { Team, Player, Stats } from './types';
import { generateId, randomInt } from './utils/math';

export const FIELD_WIDTH = 100; // Porcentaje relativo
export const FIELD_HEIGHT = 100; // Porcentaje relativo

export const TOTAL_TURNS = 18;
export const MINUTES_PER_TURN = 5;

// Generador de jugadores aleatorios
const firstNames = ['Juan', 'Pedro', 'Luis', 'Carlos', 'Dani', 'Leo', 'Cristiano', 'Kylian', 'Lamine', 'Vinicius', 'Nico', 'Zinedine', 'Iker', 'Xavi', 'Andres'];
const lastNames = ['Garcia', 'Lopez', 'Martinez', 'Messi', 'Ronaldo', 'Mbappe', 'Yamal', 'Junior', 'Williams', 'Pedri', 'Gavi', 'Zidane', 'Casillas', 'Iniesta'];

export const generateRandomPlayer = (teamId: string, position: 'POR'|'DEF'|'DEL', minRating: number, maxRating: number): Player => {
  const rating = randomInt(minRating, maxRating);
  
  // Base stats based on rating
  const base = Math.floor(rating * 0.8);
  const variation = () => randomInt(0, 20);

  const stats: Stats = {
    VEL: position === 'DEL' ? base + variation() : base + variation() - 10,
    PAS: position === 'DEF' ? base + variation() + 5 : base + variation(),
    TIR: position === 'DEL' ? base + variation() + 10 : base + variation() - 15,
    REG: position === 'DEL' ? base + variation() + 5 : base + variation() - 5,
    VIS: base + variation(),
    PAR: position === 'POR' ? base + variation() + 20 : 10,
    CEN: base + variation(),
    PRE: base + variation(),
  };

  // Clamping stats 1-99
  (Object.keys(stats) as Array<keyof Stats>).forEach(key => {
    stats[key] = Math.min(99, Math.max(1, stats[key]));
  });

  return {
    id: generateId(),
    name: `${firstNames[randomInt(0, firstNames.length - 1)]} ${lastNames[randomInt(0, lastNames.length - 1)]}`,
    position,
    stats,
    rating,
    teamId,
    imageUrl: `https://picsum.photos/seed/${randomInt(0, 1000)}/200/300`
  };
};

// Generación de jugador de sobre con probabilidad ponderada
export const generatePackPlayer = (teamId: string): Player => {
  const roll = Math.random() * 100;
  let minR, maxR;

  // Tabla de probabilidades (Inversamente proporcional a la calidad)
  if (roll < 60) {
      // COMÚN (60%)
      minR = 65; maxR = 74;
  } else if (roll < 85) {
      // RARO (25%)
      minR = 75; maxR = 82;
  } else if (roll < 97) {
      // ÉPICO (12%)
      minR = 83; maxR = 89;
  } else {
      // LEGENDARIO (3%)
      minR = 90; maxR = 99;
  }

  const positions: ('POR'|'DEF'|'DEL')[] = ['POR', 'DEF', 'DEL'];
  const pos = positions[randomInt(0, 2)];

  return generateRandomPlayer(teamId, pos, minR, maxR);
};

export const createTeam = (name: string, shortName: string, color1: string, color2: string, avgRating: number): Team => {
  const teamId = generateId();
  return {
    id: teamId,
    name,
    shortName,
    primaryColor: color1,
    secondaryColor: color2,
    players: [
      generateRandomPlayer(teamId, 'POR', avgRating - 5, avgRating + 5),
      generateRandomPlayer(teamId, 'DEF', avgRating - 5, avgRating + 5),
      generateRandomPlayer(teamId, 'DEF', avgRating - 5, avgRating + 5),
      generateRandomPlayer(teamId, 'DEL', avgRating - 5, avgRating + 5),
      generateRandomPlayer(teamId, 'DEL', avgRating - 5, avgRating + 5),
    ]
  };
};

// Datos iniciales de la liga
export const INITIAL_TEAMS: Team[] = [
  createTeam('Real Madrid', 'RMA', '#FFFFFF', '#1F2937', 88),
  createTeam('FC Barcelona', 'BAR', '#1E3A8A', '#B91C1C', 87),
  createTeam('Atlético Madrid', 'ATM', '#B91C1C', '#FFFFFF', 84),
  createTeam('Valencia CF', 'VAL', '#FFFFFF', '#000000', 78),
  createTeam('Sevilla FC', 'SEV', '#FFFFFF', '#DC2626', 79),
  createTeam('Real Betis', 'BET', '#047857', '#FFFFFF', 78),
  createTeam('Real Sociedad', 'RSO', '#1D4ED8', '#FFFFFF', 80),
  createTeam('Athletic Club', 'ATH', '#DC2626', '#FFFFFF', 81),
];