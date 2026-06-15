import { motion } from "framer-motion";
import type { ParamSpec } from "../api/types";

interface Props {
  spec: ParamSpec;
  value: number | string | boolean;
  onChange: (name: string, value: number | string | boolean) => void;
  disabled?: boolean;
}

const labelCls =
  "mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--text-faint)]";
const numCls =
  "mono w-20 rounded-lg border border-[var(--border)] bg-[#0b1120]/80 px-2.5 py-2 text-sm text-[var(--text)] tabular-nums " +
  "outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(52,231,223,0.14)]";

/** Renders a single control based on its schema type. */
export default function Control({ spec, value, onChange, disabled = false }: Props) {
  // disabled controls render dimmed and inert
  if (disabled) {
    if (spec.type === "select") {
      return (
        <div className="opacity-40">
          <span className={labelCls}>{spec.label}</span>
          <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[#0b1120]/40 p-1">
            {spec.options?.map((o) => (
              <span
                key={String(o.value)}
                className="flex-1 rounded-lg px-2 py-1.5 text-center text-[12px] font-semibold text-[var(--text-faint)]"
              >
                {o.label}
              </span>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="opacity-40">
        <span className={labelCls}>{spec.label}</span>
        <span className="mono text-sm text-[var(--text-faint)]">{String(value)}</span>
      </div>
    );
  }

  // ── boolean → toggle switch ───────────────────────────────────────────────
  if (spec.type === "bool") {
    const on = Boolean(value);
    return (
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[var(--text-dim)]">{spec.label}</span>
        <button
          role="switch"
          aria-checked={on}
          onClick={() => onChange(spec.name, !on)}
          className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
            on ? "bg-[var(--accent)]/80" : "bg-[var(--border-strong)]"
          }`}
        >
          <motion.span
            layout
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
            style={{ left: on ? "calc(100% - 1.375rem)" : "0.125rem" }}
          />
        </button>
      </div>
    );
  }

  // ── select → segmented control (no dropdown, no overlap) ───────────────────
  if (spec.type === "select") {
    return (
      <div>
        <span className={labelCls}>{spec.label}</span>
        <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[#0b1120]/60 p-1">
          {spec.options?.map((o) => {
            const active = String(value) === String(o.value);
            return (
              <button
                key={String(o.value)}
                onClick={() => onChange(spec.name, o.value)}
                className="relative flex-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold transition"
              >
                {active && (
                  <motion.span
                    layoutId={`seg-${spec.name}`}
                    className="absolute inset-0 rounded-lg bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/40"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span
                  className="relative z-10"
                  style={{ color: active ? "var(--accent)" : "var(--text-dim)" }}
                >
                  {o.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── int / float → number + range slider ───────────────────────────────────
  const hasRange = spec.min !== undefined && spec.max !== undefined;
  return (
    <div>
      <span className={labelCls}>{spec.label}</span>
      <div className="flex items-center gap-2.5">
        <input
          type="number"
          className={numCls}
          value={value as number}
          min={spec.min}
          max={spec.max}
          step={spec.step ?? (spec.type === "int" ? 1 : "any")}
          onChange={(e) =>
            onChange(spec.name, e.target.value === "" ? "" : Number(e.target.value))
          }
        />
        {hasRange && (
          <input
            type="range"
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--border-strong)] accent-[var(--accent)]"
            value={value as number}
            min={spec.min}
            max={spec.max}
            step={spec.step ?? (spec.type === "int" ? 1 : "any")}
            onChange={(e) => onChange(spec.name, Number(e.target.value))}
          />
        )}
      </div>
    </div>
  );
}
