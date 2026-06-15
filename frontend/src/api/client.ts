import type { ComputeResponse, ModuleSpec, ParamValues } from "./types";

export async function fetchModules(): Promise<ModuleSpec[]> {
  const res = await fetch("/api/modules");
  if (!res.ok) throw new Error(`Failed to load modules (${res.status})`);
  const data = await res.json();
  return data.modules as ModuleSpec[];
}

export async function compute(
  moduleId: string,
  params: ParamValues
): Promise<ComputeResponse> {
  const res = await fetch(`/api/compute/${moduleId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  if (!res.ok) {
    let detail = `Compute failed (${res.status})`;
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as ComputeResponse;
}

/** Decode the base64 uint8 field into a flat Uint8Array (length = w*h). */
export function decodeField(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
