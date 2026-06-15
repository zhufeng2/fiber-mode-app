// Mirrors the backend ParamSpec / Computation / ComputeResult shapes.

export type ParamType = "int" | "float" | "select" | "bool";

export interface ParamOption {
  value: string | number;
  label: string;
}

export interface ParamSpec {
  name: string;
  label: string;
  type: ParamType;
  default: number | string | boolean;
  group: string;
  min?: number;
  max?: number;
  step?: number;
  options?: ParamOption[];
  help?: string;
  disabled_when?: { param: string; equals: string | number | boolean };
}

export interface ModuleSpec {
  id: string;
  title: string;
  description: string;
  arrows?: boolean;
  schema: ParamSpec[];
}

export interface Overlay {
  kind: "arrows" | "labels" | "vlines" | "hlines";
  items: Record<string, unknown>[];
}

export interface ColorbarTick {
  pos: number; // 0 = field min (bottom), 1 = field max (top)
  label: string;
}

export interface ColorbarSpec {
  label: string;
  ticks: ColorbarTick[];
}

export interface ComputeResponse {
  width: number;
  height: number;
  field: string; // base64 of uint8 bytes, row-major (h × w)
  default_colormap: string;
  colorbar: ColorbarSpec | null;
  formulas: string[];
  definitions: string[];
  metadata: Record<string, unknown>;
  overlays: Overlay[];
}

export type ParamValues = Record<string, number | string | boolean>;
