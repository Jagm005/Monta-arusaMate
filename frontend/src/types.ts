export type Vec3 = [number, number, number];

// Lo que nos devuelve Python (una posicion por cada valor de t)
export interface TrackData {
  t: number[];
  s: number[]; // longitud recorrida desde el inicio
  pos: Vec3[]; // r(t)
  d1: Vec3[]; // r'(t) = velocidad
  d2: Vec3[]; // r''(t) = aceleracion
  T: Vec3[]; // vector tangente unitario
  kappa: number[]; // curvatura
  speed: number[]; // rapidez |r'(t)|
  g: number[]; // fuerza G que siente el pasajero
  angle: (number | null)[]; // angulo entre v y a (grados)
  summary: {
    closed: boolean;
    length: number;
    maxKappa: number;
    maxG: number;
    minRadius: number | null;
    t0: number;
    t1: number;
  };
  latex?: Record<"r" | "d1" | "d2" | "speed" | "kappa", string>;
}

// Valores en el punto donde va el carrito
export interface RideState {
  t: number;
  s: number;
  pos: Vec3;
  d1: Vec3;
  d2: Vec3;
  T: Vec3;
  up: Vec3;
  kappa: number;
  speed: number;
  g: number;
  angle: number | null;
}
