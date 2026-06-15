import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { compute, decodeField, fetchModules } from "./api/client";
import type { ComputeResponse, ModuleSpec, ParamValues } from "./api/types";
import { coerceUrlParams, readUrlState, writeUrlState } from "./api/urlState";
import { paintField } from "./render/canvasRenderer";
import type { ColormapName } from "./render/colormaps";
import ControlPanel from "./components/ControlPanel";
import Viewport from "./components/Viewport";
import ResultsPanel from "./components/ResultsPanel";
import Toolbar from "./components/Toolbar";
import ArrowControls from "./components/ArrowControls";

function defaultsFor(module: ModuleSpec): ParamValues {
  const v: ParamValues = {};
  for (const p of module.schema) v[p.name] = p.default;
  return v;
}

export default function App() {
  const [modules, setModules] = useState<ModuleSpec[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [valuesByModule, setValuesByModule] = useState<Record<string, ParamValues>>({});
  const [result, setResult] = useState<ComputeResponse | null>(null);
  const [colormap, setColormap] = useState<ColormapName>("jet");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [autoRun, setAutoRun] = useState(false);
  const [arrowDensity, setArrowDensity] = useState(0);
  const [arrowScale, setArrowScale] = useState(1);
  // track which module's default colormap we've applied, so regenerating keeps
  // the user's manual choice instead of snapping back to the module default.
  const colormapDefaultFor = useRef<string | null>(null);

  const activeModule = useMemo(
    () => modules.find((m) => m.id === activeId) ?? null,
    [modules, activeId]
  );
  const values = valuesByModule[activeId] ?? {};

  useEffect(() => {
    fetchModules()
      .then((mods) => {
        setModules(mods);
        const init: Record<string, ParamValues> = {};
        for (const m of mods) init[m.id] = defaultsFor(m);

        // restore state from a shared URL, if present
        const { mod, params } = readUrlState();
        let startId = mods[0]?.id ?? "";
        const target = mod ? mods.find((m) => m.id === mod) : undefined;
        if (target) {
          startId = target.id;
          init[target.id] = coerceUrlParams(target, params, init[target.id]);
          if (Object.keys(params).length) setAutoRun(true);
        }
        setValuesByModule(init);
        setActiveId(startId);
      })
      .catch((e) => setLoadError(String(e)));
  }, []);

  // auto-compute once after restoring a shared URL
  useEffect(() => {
    if (autoRun && activeModule) {
      setAutoRun(false);
      runCompute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, activeModule]);

  function setValue(name: string, value: number | string | boolean) {
    setValuesByModule((prev) => ({
      ...prev,
      [activeId]: { ...prev[activeId], [name]: value },
    }));
  }

  async function runCompute() {
    if (!activeModule) return;
    setBusy(true);
    setError(null);
    try {
      const res = await compute(activeModule.id, values);
      setResult(res);
      // apply the module's default colormap only the first time we compute in it
      if (colormapDefaultFor.current !== activeModule.id) {
        setColormap(res.default_colormap as ColormapName);
        colormapDefaultFor.current = activeModule.id;
      }
      writeUrlState(activeModule.id, values); // reflect what's shown in the URL
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  function switchModule(id: string) {
    setActiveId(id);
    setResult(null);
    setError(null);
  }

  function downloadPng() {
    if (!result) return;
    const canvas = document.createElement("canvas");
    paintField(canvas, decodeField(result.field), result.width, result.height, colormap);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${activeId}.png`;
    a.click();
  }

  if (loadError) {
    return (
      <div className="relative z-10 flex h-full items-center justify-center p-8 text-center text-sm text-[var(--err)]">
        <div className="panel rounded-2xl p-6">
          Could not reach the backend API.
          <br />
          Start it with{" "}
          <code className="mono mx-1 rounded bg-black/40 px-1">
            uvicorn backend.main:app --port 8000
          </code>
          <br />
          <span className="text-[var(--text-faint)]">{loadError}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto flex h-full max-w-[1320px] flex-col gap-5 p-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-sm font-extrabold text-[#04121a] shadow-[0_0_22px_-4px_var(--accent-glow)]">
            FMA
            <span className="absolute -inset-0.5 -z-10 rounded-xl bg-[var(--accent)] opacity-30 blur-md" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight tracking-tight text-[var(--text)]">
              Fiber Mode Analyzer
            </h1>
            <p className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
              Optical Fiber Mode Analysis
            </p>
          </div>
        </div>

        {/* Module tabs with animated pill */}
        <nav className="panel flex gap-1 rounded-2xl p-1">
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => switchModule(m.id)}
              className="relative rounded-xl px-4 py-2 text-sm font-semibold transition"
            >
              {m.id === activeId && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-[var(--accent)]/20 to-[var(--accent-2)]/20 ring-1 ring-[var(--accent)]/40"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span
                className="relative z-10"
                style={{ color: m.id === activeId ? "var(--accent)" : "var(--text-dim)" }}
              >
                {m.title}
              </span>
            </button>
          ))}
        </nav>
      </motion.header>

      {/* Body — two aligned columns of equal height */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        {/* Left: controls (single full-height panel) */}
        <aside className="min-h-0">
          {activeModule && (
            <ControlPanel
              module={activeModule}
              values={values}
              onChange={setValue}
              onGenerate={runCompute}
              busy={busy}
            />
          )}
        </aside>

        {/* Right: viewport (top) + results (bottom). Plot gets less height so the
            Results panel is roomy enough for metrics + formulas. */}
        <main className="grid min-h-0 grid-rows-[minmax(0,1.5fr)_minmax(0,1fr)] gap-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="panel flex min-h-0 flex-col gap-3 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-[var(--text)]">
                {activeModule?.title ?? "Visualization"}
              </h2>
              <Toolbar
                colormap={colormap}
                onColormap={setColormap}
                onDownload={downloadPng}
                canDownload={!!result}
                onShare={() => writeUrlState(activeId, values)}
              />
            </div>
            <div className="min-h-0 flex-1">
              <Viewport
                result={result}
                colormap={colormap}
                error={error}
                busy={busy}
                arrowDensity={arrowDensity}
                arrowScale={arrowScale}
              />
            </div>
            {activeModule?.arrows && (
              <ArrowControls
                density={arrowDensity}
                scale={arrowScale}
                onDensity={setArrowDensity}
                onScale={setArrowScale}
              />
            )}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-0"
          >
            <ResultsPanel result={result} definitions={result?.definitions ?? []} />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
