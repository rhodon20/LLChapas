import { Player, Stats, ActionType, Vector2 } from '../types';
import { getDistance, randomInt } from '../utils/math';

// Calcular probabilidad de éxito de una acción (0-100)
export const calculateSuccessChance = (
  attacker: Player,
  defender: Player | null,
  action: ActionType,
  distanceToGoal: number, // 0-100 (percentage of field)
  inputAccuracy: number // 0-1 (from UI drag)
): { chance: number; factors: string[] } => {
  
  let baseChance = 50;
  const factors: string[] = [];

  // 1. Estadísticas del Jugador
  if (action === 'SHOOT') {
    baseChance += (attacker.stats.TIR - 50) * 0.5; // +25% si tiene 99, -25% si tiene 0
    baseChance += (attacker.stats.PRE - 50) * 0.2;
    factors.push(`Tiro: ${attacker.stats.TIR}`);
    
    // Distancia
    if (distanceToGoal > 40) {
      baseChance -= (distanceToGoal - 40);
      factors.push('Distancia (Lejos)');
    } else {
      baseChance += 10;
      factors.push('Distancia (Cerca)');
    }

    // Opositor (Portero)
    if (defender) {
      const saveSkill = defender.stats.PAR;
      baseChance -= (saveSkill - 50) * 0.6;
      factors.push(`Portero Rival: ${saveSkill}`);
    }

  } else if (action === 'PASS') {
    baseChance += (attacker.stats.PAS - 50) * 0.6;
    baseChance += (attacker.stats.VIS - 50) * 0.3;
    factors.push(`Pase: ${attacker.stats.PAS}`);

    if (defender) {
      // Intercepción
      baseChance -= (defender.stats.VIS - 50) * 0.3;
      factors.push(`Intercepción Rival`);
    }

  } else if (action === 'DRIBBLE') {
    baseChance += (attacker.stats.REG - 50) * 0.7;
    baseChance += (attacker.stats.VEL - 50) * 0.3;
    factors.push(`Regate: ${attacker.stats.REG}`);

    if (defender) {
      baseChance -= (defender.stats.CEN - 50) * 0.5; // Usamos CEN como capacidad defensiva
      baseChance -= (defender.stats.PRE - 50) * 0.3; // Físico
      factors.push(`Defensa Rival`);
    }
  }

  // 2. Factor Input (Puntería de la chapa)
  // inputAccuracy es 1.0 si es perfecto, 0.0 si es desastroso
  const inputBonus = (inputAccuracy - 0.5) * 40; // +/- 20%
  baseChance += inputBonus;
  if(inputAccuracy < 0.3) factors.push('Mal Lanzamiento');
  if(inputAccuracy > 0.8) factors.push('Lanzamiento Perfecto');

  // 3. RNG (Aleatoriedad)
  const rng = randomInt(-10, 10);
  baseChance += rng;

  // Clamping
  return {
    chance: Math.min(95, Math.max(5, Math.floor(baseChance))),
    factors
  };
};

// Determina el resultado final
export const resolveAction = (chance: number): boolean => {
  const roll = randomInt(0, 100);
  return roll <= chance;
};

// Simple AI decision
export const getAiAction = (distanceToGoal: number): ActionType => {
  if (distanceToGoal < 30) return 'SHOOT';
  if (distanceToGoal < 60) return 'DRIBBLE';
  return 'PASS';
};