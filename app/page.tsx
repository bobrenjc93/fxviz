"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";

type FormatStatus =
  | { kind: "idle" }
  | { kind: "loading"; step?: string }
  | { kind: "ready"; engine: "black" }
  | { kind: "error"; message: string };

export default function Home() {

  const [raw, setRaw] = useState<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("fxviz:last") || ""
      : ""
  );

  const [formatted, setFormatted] = useState<string>("");
  const [status, setStatus] = useState<FormatStatus>({ kind: "idle" });
  const [wrap, setWrap] = useState<boolean>(true);
  const MAX_COLS = 120;

  // Split view sizing
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);
  const [split, setSplit] = useState<number>(50); // % width for left pane
  const onResizerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  }, []);
  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const pct = Math.max(20, Math.min(80, (x / rect.width) * 100));
      setSplit(pct);
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);
  const gridStyle = useMemo(() => ({
    gridTemplateColumns: `minmax(200px, ${split}%) 6px minmax(200px, ${100 - split}%)`,
  }), [split]);

  // Persist input
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("fxviz:last", raw);
    }
  }, [raw]);

  // Load Pyodide + Black lazily
  const pyodideRef = useRef<any>(null);
  const ensureBlack = useCallback(async () => {
    if (pyodideRef.current) return pyodideRef.current;
    setStatus({ kind: "loading", step: "Loading Python runtime" });
    try {
      // Load pyodide
      const dynamicImport: any = new Function("u", "return import(u)");
      const pyodideMod = await dynamicImport(
        "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.mjs"
      );
      const pyodide = await (pyodideMod as any).loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
      });
      setStatus({ kind: "loading", step: "Installing Black" });
      await pyodide.loadPackage(["micropip"]);
      await pyodide.runPythonAsync(
        [
          "import micropip",
          // Pin a recent stable version of black
          "await micropip.install('black==24.8.0')",
          "import black",
        ].join("\n")
      );
      pyodideRef.current = pyodide;
      setStatus({ kind: "ready", engine: "black" });
      return pyodide;
    } catch (err: any) {
      console.error(err);
      setStatus({ kind: "error", message: String(err?.message || err) });
      throw err;
    }
  }, []);

  const runFormat = useCallback(async () => {
    if (!raw?.trim()) {
      setFormatted("");
      return;
    }
    try {
      const pyodide = await ensureBlack();
      setStatus({ kind: "loading", step: "Formatting with Black" });
      pyodide.globals.set("__SRC__", raw);
      const out = await pyodide.runPythonAsync(
        [
          "import black",
          // Respect a max line length of 120 characters
          `mode = black.Mode(line_length=${MAX_COLS})`,
          "black.format_str(__SRC__, mode=mode)",
        ].join("\n")
      );
      setFormatted(out as string);
      setStatus({ kind: "ready", engine: "black" });
    } catch (e) {
      // Fall back to trimmed input if formatting fails
      setFormatted(raw);
    }
  }, [raw, ensureBlack]);

  // Auto-format on input changes (debounced)
  useEffect(() => {
    if (!raw?.trim()) {
      setFormatted("");
      return;
    }
    const t = setTimeout(() => {
      runFormat();
    }, 400);
    return () => clearTimeout(t);
  }, [raw, runFormat]);

  // Auto-format when user clicks paste or presses a button. We won’t auto-format every keystroke.
  const onPaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const text = e.clipboardData.getData("text/plain");
      if (text) {
        // Allow the paste to occur and then trigger formatting
        setTimeout(runFormat, 0);
      }
    },
    [runFormat]
  );

  const copyFormatted = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatted || raw || "");
    } catch (e) {
      // ignore
    }
  }, [formatted, raw]);

  const stats = useMemo(() => {
    const src = formatted || raw || "";
    return {
      lines: src ? src.split(/\n/).length : 0,
      chars: src.length,
    };
  }, [formatted, raw]);

  return (
    <div className="app">
      <div className="header">
        <div className="title">PyGraph Formatter</div>
        <div className="status muted">
          {status.kind === "loading" && (
            <span>⏳ {status.step ?? "Working..."}</span>
          )}
          {status.kind === "ready" && <span>✅ Formatter ready</span>}
          {status.kind === "error" && <span>⚠️ Formatter unavailable</span>}
        </div>
      </div>

      <div className="container" ref={containerRef} style={gridStyle}>
        <section className="pane">
          <div className="toolbar">
            <button className="btn" onClick={runFormat} disabled={!raw.trim()}>
              Format with Black
            </button>
            <button className="btn" onClick={() => setRaw("")}>Clear</button>
            <div className="muted" style={{ marginLeft: "auto" }}>
              Paste your Python graph trace here
            </div>
          </div>
          <textarea
            className="textarea"
            placeholder="Paste Python here..."
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onPaste={onPaste}
          />
          <div className="footer">
            <div className="stats">
              Input: {raw.split(/\n/).length || 0} lines, {raw.length} chars
            </div>
          </div>
        </section>

        <div
          className="resizer"
          onPointerDown={onResizerDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
        />

        <section className="pane paneRight">
          <div className="toolbar">
            <button className="btn" onClick={copyFormatted} disabled={!raw.trim()}>
              Copy
            </button>
            <button className="btn" onClick={() => setWrap((w) => !w)}>
              {wrap ? "Disable" : "Enable"} Wrap
            </button>
          </div>
          <div className="content">
            <div className="previewWrap">
              <SyntaxHighlighter
                language="python"
                style={oneDark as any}
                wrapLongLines={wrap}
                customStyle={{
                  background: "transparent",
                  maxWidth: `${MAX_COLS}ch`,
                  whiteSpace: wrap ? "pre-wrap" : undefined,
                  overflowWrap: wrap ? "anywhere" : undefined,
                }}
                codeTagProps={{ className: "codeBlock" }}
                showLineNumbers
              >
                {formatted || raw || ""}
              </SyntaxHighlighter>
            </div>
          </div>
          <div className="footer">
            <div className="stats">
              Output: {stats.lines} lines, {stats.chars} chars
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
