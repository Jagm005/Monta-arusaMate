import type { Physics, TrackData } from "./types";

async function post(url: string, body: unknown): Promise<TrackData> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("No hay conexion con el backend de Python (¿esta corriendo uvicorn en el puerto 8000?).");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = json?.detail;
    throw new Error(typeof detail === "string" ? detail : `Error ${res.status} del backend`);
  }
  return json as TrackData;
}

export const fetchTrack = (points: number[][], closed: boolean, p: Physics) =>
  post("/api/track", { points, closed, ...p });

export const fetchFormula = (f: { x: string; y: string; z: string; t0: number; t1: number }, p: Physics) =>
  post("/api/formula", { ...f, ...p });
