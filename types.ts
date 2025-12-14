export type Position = 'POR' | 'DEF' | 'DEL';

export interface Stats {
  VEL: number; // Velocidad (Fuerza de impacto)
  PAS: number; // Pase
  TIR: number; // Tiro
  REG: number; // Regate (Resistencia al choque)
  VIS: number; // Visión
  PAR: number; // Parada
  CEN: number; // Centro
  PRE: number; // Precisión
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  stats: Stats;
  rating: number;
  teamId: string;
  imageUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  players: Player[];
  isPlayerControlled?: boolean;
}

export interface Vector2 {
  x: number;
  y: number;
}

// Physics Entity
export interface PhysicsEntity {
  id: string;
  position: Vector2;
  velocity: Vector2;
  mass: number;
  radius: number;
  isBall: boolean;
}

export interface LeagueRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export type GamePhase = 'MENU' | 'TEAM_SELECT' | 'CAREER_HUB' | 'LEAGUE_TABLE' | 'MATCH' | 'PACK_OPENING';

export type MatchPhase = 
  | 'KICKOFF' 
  | 'TURN_START'          // Usuario elige chapa y dirección. CPU calcula la suya.
  | 'SIMULATION'          // Física en movimiento
  | 'CONTACT_RESOLUTION'  // Choque con balón detectado -> Elegir acción
  | 'AIMING_PASS'         // Ganador de Pase apunta bola
  | 'AIMING_SHOT'         // Ganador de Tiro apunta bola (Usuario vs CPU GK)
  | 'DEFEND_SHOT'         // CPU va a tirar, Usuario mueve GK
  | 'AIMING_EXTRA_MOVE'   // Ganador de Regate apunta desde su JUGADOR
  | 'GOAL' 
  | 'END_GAME';

export type ActionType = 'SHOOT' | 'PASS' | 'DRIBBLE' | 'DEFEND' | 'SAVE' | 'MOVE';

export interface MatchState {
  homeTeam: Team;
  awayTeam: Team;
  score: { home: number; away: number };
  time: number;
  turn: number;
  possession: 'HOME' | 'AWAY' | 'NEUTRAL';
  
  // Physics State maps ID (player/ball) to entity data
  physicsEntities: Record<string, PhysicsEntity>;
  
  activePlayerId: string | null; // El jugador seleccionado por el usuario
  interactingPlayerId: string | null; // El jugador que tocó el balón
  
  phase: MatchPhase;
  isPostAction: boolean; // Flag para indicar que estamos resolviendo la física de un tiro/regate y el turno debe acabar
  
  lastActionLog: string[];
  
  // FX
  impacts: { x: number; y: number; id: string }[];
}