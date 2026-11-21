import type { TrackData } from "./types";

async function post(url: string, body: unknown): Promise<TrackData> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("No se pudo conectar con Python. ¿Esta prendido el backend (uvicorn)?");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(typeof json?.detail === "string" ? json.detail : "Error en el backend");
  return json as TrackData;
}

export const fetchTrack = (points: number[][], closed: boolean) => post("/api/track", { points, closed });

export const fetchFormula = (f: { x: string; y: string; z: string; t0: number; t1: number }) => post("/api/formula", f);
