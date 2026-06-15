import { motion } from "framer-motion";
import type { ModuleSpec, ParamValues } from "../api/types";
import Control from "./Control";

interface Props {
  module: ModuleSpec;
  values: ParamValues;
  onChange: (name: string, value: number | string | boolean) => void;
  onGenerate: () => void;
  busy: boolean;
}

/** Schema-driven form rendered as ONE full-height panel (aligns with the
 *  viewport column). Groups become titled sections separated by dividers;
 *  the Generate button is pinned to the bottom. */
export default function ControlPanel({
  module,
  values,
  onChange,
  onGenerate,
  busy,
}: Props) {
  const groups: string[] = [];
  for (const p of module.schema) {
    if (!groups.includes(p.group)) groups.push(p.group);
  }

  return (
    <div className="panel flex h-full min-h-0 flex-col rounded-2xl">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
        {groups.map((g, i) => (
          <motion.section
            key={module.id + g}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-dim)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]" />
              {g}
            </h3>
            <div className="flex flex-col gap-3.5">
              {module.schema
                .filter((p) => p.group === g)
                .map((p) => (
                  <Control
                    key={p.name}
                    spec={p}
                    value={values[p.name]}
                    onChange={onChange}
                    disabled={
                      !!p.disabled_when &&
                      values[p.disabled_when.param] === p.disabled_when.equals
                    }
                  />
                ))}
            </div>
            {i < groups.length - 1 && (
              <div className="mt-5 h-px bg-[var(--border)]" />
            )}
          </motion.section>
        ))}
      </div>

      <div className="border-t border-[var(--border)] p-4">
        <motion.button
          onClick={onGenerate}
          disabled={busy}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.97 }}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-4 py-3 text-sm font-bold text-[#04121a] shadow-[0_6px_24px_-6px_var(--accent-glow)] transition disabled:opacity-60"
        >
          <span className="relative z-10">{busy ? "Computing…" : "Generate"}</span>
          <span className="absolute inset-0 -translate-x-full bg-white/25 transition-transform duration-500 group-hover:translate-x-full" />
        </motion.button>
      </div>
    </div>
  );
}
