import type { ModuleSpec, ParamValues } from "./types";

/** Read `?mod=...&param=...` from the current URL. */
export function readUrlState(): { mod: string | null; params: Record<string, string> } {
  const sp = new URLSearchParams(window.location.search);
  const mod = sp.get("mod");
  const params: Record<string, string> = {};
  sp.forEach((v, k) => {
    if (k !== "mod") params[k] = v;
  });
  return { mod, params };
}

/** Apply raw string params onto a base, coercing by the module schema. */
export function coerceUrlParams(
  module: ModuleSpec,
  raw: Record<string, string>,
  base: ParamValues
): ParamValues {
  const out: ParamValues = { ...base };
  for (const p of module.schema) {
    const s = raw[p.name];
    if (s === undefined) continue;
    if (p.type === "int") out[p.name] = parseInt(s, 10);
    else if (p.type === "float") out[p.name] = parseFloat(s);
    else if (p.type === "bool") out[p.name] = s === "true";
    else out[p.name] = s;
  }
  return out;
}

/** Write the current module + params into the URL (no navigation). */
export function writeUrlState(moduleId: string, params: ParamValues): string {
  const sp = new URLSearchParams();
  sp.set("mod", moduleId);
  for (const [k, v] of Object.entries(params)) sp.set(k, String(v));
  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, "", url);
  return window.location.href;
}
