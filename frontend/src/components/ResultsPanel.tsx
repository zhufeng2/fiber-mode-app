import { motion } from "framer-motion";
import type { ComputeResponse } from "../api/types";
import TeX from "./TeX";

interface Props {
  result: ComputeResponse | null;
  definitions: string[];
}

export default function ResultsPanel({ result, definitions }: Props) {
  const entries = result ? Object.entries(result.metadata) : [];
  const formulas = result?.formulas ?? [];

  return (
    <div className="panel flex h-full min-h-0 flex-col rounded-2xl p-5">
      <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-dim)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-2)] shadow-[0_0_8px_rgba(91,140,255,0.6)]" />
        Results
      </h3>

      {result ? (
        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto md:grid-cols-2">
          {/* left: metrics, then the definitions beneath them */}
          <div className="flex flex-col gap-4">
            <dl className="grid h-fit grid-cols-[auto_1fr] gap-x-5 gap-y-2">
              {entries.map(([k, v], i) => (
                <motion.div
                  key={k}
                  className="contents"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <dt className="mono text-[12px] text-[var(--text-faint)]">{k}</dt>
                  <dd className="mono text-[13px] font-medium text-[var(--text)]">{String(v)}</dd>
                </motion.div>
              ))}
            </dl>

            {definitions.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">
                  Definitions
                </span>
                <div className="flex flex-col gap-1.5 overflow-x-auto text-[var(--text)]">
                  {definitions.map((d, i) => (
                    <TeX key={i} math={d} block />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* right: superposition / mode relations */}
          {formulas.length > 0 && (
            <div className="flex flex-col gap-2 md:border-l md:border-[var(--border)] md:pl-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">
                Formulation
              </span>
              <div className="flex flex-col gap-2.5 text-[var(--text)]">
                {formulas.map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                    className="overflow-x-auto rounded-lg border border-[var(--border)] bg-black/25 px-3 py-2"
                  >
                    <TeX math={f} block />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-faint)]">No results yet.</p>
      )}
    </div>
  );
}
