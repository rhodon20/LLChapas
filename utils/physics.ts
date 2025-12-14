import { Vector2, PhysicsEntity } from '../types';

export const FRICTION = 0.96;
export const WALL_DAMPING = 0.7;

export const applyFriction = (vel: Vector2): Vector2 => {
  return { x: vel.x * FRICTION, y: vel.y * FRICTION };
};

export const checkWallCollision = (entity: PhysicsEntity): Vector2 => {
  let vx = entity.velocity.x;
  let vy = entity.velocity.y;
  let px = entity.position.x;
  let py = entity.position.y;

  // Límites del campo (0-100 en coordenadas de juego)
  // Ajustamos por radio para que no se salga la mitad de la chapa
  const r = entity.radius > 0 ? 2 : 2; 

  // Paredes laterales (Siempre rebotan)
  if (px < r) { px = r; vx = -vx * WALL_DAMPING; }
  if (px > 100 - r) { px = 100 - r; vx = -vx * WALL_DAMPING; }

  // Detección de zona de gol (35% - 65% del ancho)
  // Coincide con la visualización (w-[30%] centrado)
  const inGoalZone = px > 35 && px < 65;

  // Pared Superior (Y=0)
  if (py < r) {
     // Si es la pelota y está en zona de gol, permitimos que entre (no colisión)
     if (entity.isBall && inGoalZone) {
         // Permitir paso hacia el gol
     } else {
         py = r; 
         vy = -vy * WALL_DAMPING;
     }
  }

  // Pared Inferior (Y=100)
  if (py > 100 - r) { 
     if (entity.isBall && inGoalZone) {
         // Permitir paso hacia el gol
     } else {
         py = 100 - r; 
         vy = -vy * WALL_DAMPING;
     }
  }

  entity.position = { x: px, y: py };
  return { x: vx, y: vy };
};

export const checkEntityCollision = (e1: PhysicsEntity, e2: PhysicsEntity): boolean => {
  const dx = e2.position.x - e1.position.x;
  const dy = e2.position.y - e1.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const minDist = 5; 

  if (distance < minDist) {
    return true;
  }
  return false;
};

export const resolveElasticCollision = (e1: PhysicsEntity, e2: PhysicsEntity): { v1: Vector2, v2: Vector2 } => {
  const dx = e2.position.x - e1.position.x;
  const dy = e2.position.y - e1.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) return { v1: e1.velocity, v2: e2.velocity };

  const nx = dx / distance;
  const ny = dy / distance;

  const tx = -ny;
  const ty = nx;

  const v1n = nx * e1.velocity.x + ny * e1.velocity.y;
  const v1t = tx * e1.velocity.x + ty * e1.velocity.y;
  const v2n = nx * e2.velocity.x + ny * e2.velocity.y;
  const v2t = tx * e2.velocity.x + ty * e2.velocity.y;

  const m1 = e1.mass;
  const m2 = e2.mass;

  const v1nFinal = (v1n * (m1 - m2) + 2 * m2 * v2n) / (m1 + m2);
  const v2nFinal = (v2n * (m2 - m1) + 2 * m1 * v1n) / (m1 + m2);

  const v1FinalX = v1nFinal * nx + v1t * tx;
  const v1FinalY = v1nFinal * ny + v1t * ty;
  const v2FinalX = v2nFinal * nx + v2t * tx;
  const v2FinalY = v2nFinal * ny + v2t * ty;

  const overlap = 5 - distance;
  if (overlap > 0) {
     const correction = overlap / 2;
     e1.position.x -= nx * correction;
     e1.position.y -= ny * correction;
     e2.position.x += nx * correction;
     e2.position.y += ny * correction;
  }

  return {
    v1: { x: v1FinalX, y: v1FinalY },
    v2: { x: v2FinalX, y: v2FinalY }
  };
};