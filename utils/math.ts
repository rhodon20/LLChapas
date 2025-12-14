import { Vector2 } from '../types';

export const getDistance = (p1: Vector2, p2: Vector2): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const getAngle = (p1: Vector2, p2: Vector2): number => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};

export const clamp = (val: number, min: number, max: number): number => {
  return Math.min(Math.max(val, min), max);
};

export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

// Genera un número aleatorio entre min y max (inclusive)
export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Genera ID único simple
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};