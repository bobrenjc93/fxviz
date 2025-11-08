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
  const [draft, setDraft] = useState<string>("");
  const [raw, setRaw] = useState<string>("");
  const [formatted, setFormatted] = useState<string>("");
  const [status, setStatus] = useState<FormatStatus>({ kind: "idle" });
  const [wrap] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(true);
  const MAX_COLS = 120;

  // No localStorage persistence — input starts empty each load

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

  const runFormat = useCallback(async (source?: string) => {
    const src = (source ?? raw) ?? "";
    if (!src.trim()) {
      setFormatted("");
      return;
    }
    try {
      const pyodide = await ensureBlack();
      setStatus({ kind: "loading", step: "Formatting with Black" });
      pyodide.globals.set("__SRC__", src);
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
      setFormatted(src);
    }
  }, [raw, ensureBlack]);

  const onSubmit = useCallback(async () => {
    const toFormat = draft.trim();
    if (!toFormat) return;
    setRaw(toFormat);
    // Close modal immediately for responsiveness and show spinner over page
    setShowModal(false);
    setStatus({ kind: "loading", step: "Loading Python runtime" });
    await runFormat(toFormat);
  }, [draft, runFormat]);

  const copyFormatted = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatted || raw || "");
    } catch (e) {
      // ignore
    }
  }, [formatted, raw]);

  const finalText = useMemo(() => formatted || raw || "", [formatted, raw]);

  return (
    <div className="app">
      {/* Paste Modal */}
      {showModal && (
        <div className="modalOverlay">
          <div className="modal" role="dialog" aria-modal="true" aria-label="Paste Python">
            <div className="modalHeader">
              <div className="title">Paste Python to Format</div>
              <div className="muted">Black line length: {MAX_COLS}</div>
            </div>
            <div className="modalBody">
              <textarea
                className="textarea modalTextarea"
                placeholder="Paste Python here..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modalFooter">
              <button className="btn" onClick={() => { setDraft(""); }}>Clear</button>
              <button className="btn" onClick={onSubmit} disabled={!draft.trim()}>
                Format
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spinner while loading/formatting */}
      {status.kind === "loading" && (
        <div className="spinnerWrap" aria-live="polite" aria-busy="true">
          <div className="spinner" />
        </div>
      )}

      {/* Final code view */}
      {!showModal && (
        <div className="previewWrap">
          <SyntaxHighlighter
            language="python"
            style={oneDark as any}
            wrapLongLines={false}
            customStyle={{
              background: "transparent",
              // Disable soft wrapping; allow horizontal scroll
              whiteSpace: "pre",
              wordBreak: "normal",
              overflowX: "auto",
              width: "100%",
            }}
            codeTagProps={{ className: "codeBlock" }}
            showLineNumbers
          >
            {finalText}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}
