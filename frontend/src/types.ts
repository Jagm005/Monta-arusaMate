export type Vec3 = [number, number, number];

/** Lo que devuelve el backend de Python: una muestra por cada posicion de la pista. */
export interface TrackData {
  t: number[];
  s: number[];
  pos: Vec3[];
  d1: Vec3[];
  d2: Vec3[];
  T: Vec3[];
  N: Vec3[];
  B: Vec3[];
  kappa: number[];
  v: number[];
  aT: number[];
  aN: number[];
  g: number[];
  time: number[];
  summary: {
    closed: boolean;
    length: number;
    maxKappa: number;
    minRadius: number | null;
    maxG: number;
    maxSpeed: number;
    duration: number;
    stallIndex: number | null;
    startT: number;
  };
  latex?: Record<"r" | "d1" | "d2" | "speed" | "T" | "kappa", string>;
}

export interface Physics {
  v0: number;
  mu: number;
}

/** Estado interpolado del carrito en un instante. */
export interface RideState {
  index: number;
  t: number;
  s: number;
  pos: Vec3;
  d1: Vec3;
  d2: Vec3;
  T: Vec3;
  N: Vec3;
  B: Vec3;
  up: Vec3;
  kappa: number;
  v: number;
  aT: number;
  aN: number;
  g: number;
  stalled: boolean;
}
