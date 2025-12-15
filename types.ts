
export interface Point {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Particle extends Vector3 {
  vx: number;
  vy: number;
  vz: number;
  origX: number;
  origY: number;
  origZ: number;
  life: number;
  maxLife: number;
  alpha: number;
  size: number;
  isAttached: boolean;
  color: string;
}

export enum GameState {
  IDLE = 'IDLE',
  BLOWN = 'BLOWN',
  REGROWING = 'REGROWING'
}

export type DandelionColor = 'white' | 'deepBlue' | 'lavender' | 'periwinkle' | 'pale' | 'pink';
