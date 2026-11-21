// Pistas de ejemplo para dibujar (en metros, z es la altura)
export const PISTAS: Record<string, { nombre: string; puntos: number[][]; cerrada: boolean }> = {
  clasica: {
    nombre: "Clásica",
    cerrada: true,
    puntos: [
      [0, 0, 6], [30, 0, 28], [52, 0, 30], [74, 1, 18], [94, 4, 6], [116, 10, 5], [134, 24, 11],
      [138, 50, 8], [115, 72, 13], [80, 80, 6], [42, 74, 10], [8, 58, 5], [-12, 30, 6],
    ],
  },
  colinas: {
    nombre: "Colinas",
    cerrada: true,
    puntos: [
      [0, 0, 28], [24, 0, 14], [42, 0, 5], [60, 0, 5], [80, 0, 17], [100, 0, 5], [118, 0, 5], [136, 0, 12],
      [156, 8, 5], [166, 32, 6], [146, 56, 5], [100, 62, 8], [56, 60, 5], [16, 52, 5], [-10, 30, 14],
    ],
  },
  espiral: {
    nombre: "Espiral que baja",
    cerrada: false,
    puntos: Array.from({ length: 14 }, (_, k) => [30 + 18 * Math.cos(k * 0.9), 25 + 18 * Math.sin(k * 0.9), 32 - k * 2.2]),
  },
};

// Curvas de los ejercicios del taller
export const EJERCICIOS: Record<string, { nombre: string; x: string; y: string; z: string; t0: number; t1: number }> = {
  ej12: { nombre: "Func. vect. 12: circunferencia x²+y²=25, ω = 6", x: "5cos(6t)", y: "5sin(6t)", z: "0", t0: 0, t1: 1.0472 },
  ej13: { nombre: "Func. vect. 13: hélice r = cos t i + sen t j + (−3t+2) k", x: "cos(t)", y: "sin(t)", z: "-3t + 2", t0: 0, t1: 12.566 },
  ej5d: { nombre: "Func. vect. 5d: r = cos t i + sen t j + t k", x: "cos(t)", y: "sin(t)", z: "t", t0: 0, t1: 6.2832 },
  ej19: { nombre: "Curvatura 19: r = i + 2cos t j + 2sen t k", x: "1", y: "2cos(t)", z: "2sin(t)", t0: 0, t1: 12.566 },
  ej20: { nombre: "Curvatura 20: r = 5cos t i + 2t j + 5sen t k", x: "5cos(t)", y: "2t", z: "5sin(t)", t0: 0, t1: 12.566 },
  ej21: { nombre: "Curvatura 21: r = t²/8 i + 5cos t j + 5sen t k", x: "t^2/8", y: "5cos(t)", z: "5sin(t)", t0: 0, t1: 12.566 },
  ej22: { nombre: "Curvatura 22: r = t²/4 i + 2cos t j + 2sen t k", x: "t^2/4", y: "2cos(t)", z: "2sin(t)", t0: 0, t1: 12.566 },
  ej31: { nombre: "Curvatura 31: r = t cos t i + t sen t j", x: "t cos(t)", y: "t sin(t)", z: "0", t0: 0.2, t1: 12.566 },
};
