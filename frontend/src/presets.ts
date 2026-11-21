/** Pistas de ejemplo para dibujar (metros, z = altura). */
export const DRAW_PRESETS: Record<string, { label: string; points: number[][]; closed: boolean; v0: number }> = {
  clasica: {
    label: "Clasica (gran caida)",
    closed: true,
    v0: 3,
    points: [
      [0, 0, 6], [30, 0, 28], [52, 0, 30], [74, 1, 18], [94, 4, 6], [116, 10, 5], [134, 24, 11],
      [138, 50, 8], [115, 72, 13], [80, 80, 6], [42, 74, 10], [8, 58, 5], [-12, 30, 6],
    ],
  },
  loop: {
    label: "Con loop vertical (intensa)",
    closed: true,
    v0: 3,
    points: [
      [0, 0, 40], [30, 0, 22], [52, 0, 6], [76, 0, 3], [100, 1, 8], [112, 2, 22], [100, 3, 34], [84, 4, 26],
      [82, 5, 14], [92, 6, 5], [118, 7, 3], [146, 32, 8], [120, 62, 6], [66, 64, 12], [22, 52, 20], [-12, 26, 32],
    ],
  },
  camellos: {
    label: "Colinas de camello (suave)",
    closed: true,
    v0: 3,
    points: [
      [0, 0, 28], [24, 0, 14], [42, 0, 5], [60, 0, 5], [80, 0, 17], [100, 0, 5], [118, 0, 5], [136, 0, 12],
      [156, 8, 5], [166, 32, 6], [146, 56, 5], [100, 62, 8], [56, 60, 5], [16, 52, 5], [-10, 30, 14],
    ],
  },
  espiral: {
    label: "Espiral descendente",
    closed: false,
    v0: 2,
    points: Array.from({ length: 14 }, (_, k) => {
      const a = k * 0.9;
      return [30 + 18 * Math.cos(a), 25 + 18 * Math.sin(a), 32 - k * 2.2];
    }),
  },
};

/** Curvas de la guia de ejercicios escritas como r(t). */
export const FORMULA_PRESETS: Record<string, { label: string; x: string; y: string; z: string; t0: number; t1: number; v0: number; t1Point?: number }> = {
  ej13: { label: "Ej. 13 (funciones vectoriales): helice que baja", x: "cos(t)", y: "sin(t)", z: "-3t + 2", t0: 0, t1: 12.566, v0: 1 },
  ej19: { label: "Ej. 19: r = i + 2cos t j + 2sen t k", x: "1", y: "2cos(t)", z: "2sin(t)", t0: 0, t1: 12.566, v0: 7, t1Point: Math.PI },
  ej20: { label: "Ej. 20: r = 5cos t i + 2t j + 5sen t k", x: "5cos(t)", y: "2t", z: "5sin(t)", t0: 0, t1: 12.566, v0: 11, t1Point: Math.PI },
  ej21: { label: "Ej. 21: r = t^2/8 i + 5cos t j + 5sen t k", x: "t^2/8", y: "5cos(t)", z: "5sin(t)", t0: 0, t1: 12.566, v0: 11, t1Point: Math.PI },
  ej22: { label: "Ej. 22: r = t^2/4 i + 2cos t j + 2sen t k", x: "t^2/4", y: "2cos(t)", z: "2sin(t)", t0: 0, t1: 12.566, v0: 7, t1Point: Math.PI },
  trebol: { label: "Nudo trebol (cerrada)", x: "10(sin(t) + 2sin(2t))", y: "10(cos(t) - 2cos(2t))", z: "35 - 10sin(3t)", t0: 0, t1: 6.283185307179586, v0: 3 },
  lissajous: { label: "Curva de Lissajous 3D (cerrada)", x: "30sin(2t)", y: "30sin(3t)", z: "18 + 10cos(5t)", t0: 0, t1: 6.283185307179586, v0: 3 },
};
