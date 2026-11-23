"use client";

import { useMemo, useState, useTransition } from "react";
import { FileUp } from "lucide-react";
import { importEntries } from "@/lib/trackers/actions";
import { autoMap, fingerprint, parseCSV } from "@/lib/trackers/analytics";
import { validateEntry } from "@/lib/trackers/properties";
import type { TrackerFull } from "@/lib/trackers/data";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { cn, count } from "@/lib/utils";

type Sheet = { headers: string[]; rows: string[][] };

async function readFile(file: File): Promise<Sheet> {
  if (file.size > 5 * 1024 * 1024) throw new Error("El archivo supera 5 MB.");
  let matrix: string[][];
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    const data = await readSheet(file);
    matrix = data.map((row) =>
      row.map((c) =>
        c === null || c === undefined
          ? ""
          : c instanceof Date
            ? c.toISOString().slice(0, 10)
            : String(c),
      ),
    );
  } else {
    matrix = parseCSV(await file.text());
  }
  if (matrix.length < 2)
    throw new Error("El archivo necesita una fila de cabeceras y al menos una fila de datos.");
  return { headers: matrix[0].map((h) => h.trim()), rows: matrix.slice(1) };
}

/** CSV / Excel import: column mapping → validated preview → duplicates → confirm. */
export function ImportDialog({
  tracker,
  open,
  onClose,
}: {
  tracker: TrackerFull;
  open: boolean;
  onClose: () => void;
}) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<Record<number, string | null>>({});
  const [fileError, setFileError] = useState<string>();
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [pending, start] = useTransition();
  const toast = useToast();
  const importable = tracker.properties.filter(
    (p) => p.type !== "formula" && p.type !== "relation",
  );

  const analysis = useMemo(() => {
    if (!sheet) return null;
    const mappedIds = Object.values(mapping).filter((v): v is string => Boolean(v));
    const existing = new Set(tracker.entries.map((e) => fingerprint(e.values, mappedIds)));
    const seen = new Set<string>();
    return sheet.rows.map((cells) => {
      const raw: Record<string, unknown> = {};
      cells.forEach((c, i) => {
        const pid = mapping[i];
        if (pid) raw[pid] = c;
      });
      const res = validateEntry(tracker.properties, raw);
      const fp = fingerprint(res.values, mappedIds);
      const duplicate = res.ok && (existing.has(fp) || seen.has(fp));
      seen.add(fp);
      return { raw, error: res.ok ? null : Object.values(res.errors)[0], duplicate };
    });
  }, [sheet, mapping, tracker.entries, tracker.properties]);

  const invalid = analysis?.filter((r) => r.error).length ?? 0;
  const dupes = analysis?.filter((r) => r.duplicate).length ?? 0;
  const toImport =
    analysis?.filter((r) => (!r.error || !skipInvalid) && !(skipDuplicates && r.duplicate)) ?? [];

  function reset() {
    setSheet(null);
    setMapping({});
    setFileError(undefined);
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Importar registros"
      description="Desde un CSV o un Excel (.xlsx). La primera fila debe tener los nombres de las columnas."
      variant="sheet"
    >
      <div className="flex flex-col gap-4 pb-2">
        {!sheet ? (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border-strong p-8 text-center hover:bg-surface">
            <FileUp className="size-6 text-accent" aria-hidden />
            <span className="font-medium">Elegir archivo</span>
            <span className="text-[13px] text-fg-muted">
              .csv o .xlsx · máximo 5 MB y 5000 filas
            </span>
            <input
              type="file"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const s = await readFile(f);
                  if (s.rows.length > 5000) throw new Error("Máximo 5000 filas por importación.");
                  setSheet(s);
                  setMapping(autoMap(s.headers, tracker.properties));
                  setFileError(undefined);
                } catch (err) {
                  setFileError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
                }
              }}
            />
          </label>
        ) : (
          <>
            <section aria-labelledby="map-title">
              <h3 id="map-title" className="mb-2 text-[15px] font-medium">
                1. Columnas
              </h3>
              <div className="flex flex-col gap-2">
                {sheet.headers.map((h, i) => (
                  <div key={i} className="grid grid-cols-2 items-center gap-3">
                    <span className="truncate text-[14px]">{h || `Columna ${i + 1}`}</span>
                    <label className="sr-only" htmlFor={`map-${i}`}>
                      Propiedad para {h}
                    </label>
                    <select
                      id={`map-${i}`}
                      value={mapping[i] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value || null }))}
                      className="h-10 rounded-[var(--radius-field)] border border-border bg-surface px-2 text-[14px] [&>option]:bg-surface-solid"
                    >
                      <option value="">No importar</option>
                      {importable.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="preview-title">
              <h3 id="preview-title" className="mb-2 text-[15px] font-medium">
                2. Revisión
              </h3>
              <p className="text-[14px] text-fg-muted">
                {analysis!.length} filas ·{" "}
                <span className={cn(invalid && "font-medium text-danger-text")}>
                  {invalid} con errores
                </span>{" "}
                · {dupes} duplicadas
              </p>
              <ul className="mt-2 max-h-48 overflow-auto rounded-xl border border-border text-[13px]">
                {analysis!.slice(0, 50).map((r, i) => (
                  <li
                    key={i}
                    className="flex gap-2 border-b border-border px-3 py-1.5 last:border-0"
                  >
                    <span className="w-10 shrink-0 text-fg-subtle tabular-nums">#{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {Object.values(r.raw).join(" · ") || "(vacía)"}
                    </span>
                    {r.error ? (
                      <span className="shrink-0 text-danger-text">{r.error}</span>
                    ) : r.duplicate ? (
                      <span className="shrink-0 text-fg-subtle">Duplicada</span>
                    ) : (
                      <span className="shrink-0 text-success-text">OK</span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-col gap-2 text-[14px]">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={skipInvalid}
                    onChange={(e) => setSkipInvalid(e.target.checked)}
                    className="size-4 accent-[var(--accent)]"
                  />
                  Omitir filas con errores
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="size-4 accent-[var(--accent)]"
                  />
                  Omitir duplicadas
                </label>
              </div>
            </section>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={pending || !toImport.length || (!skipInvalid && invalid > 0)}
                onClick={() =>
                  start(async () => {
                    const res = await importEntries(
                      tracker.id,
                      toImport.map((r) => r.raw),
                      skipInvalid,
                    );
                    if (!res.ok) return toast(res.error, "error");
                    if (res.data.inserted === 0 && res.data.errors.length)
                      return toast(
                        `Fila ${res.data.errors[0].row}: ${res.data.errors[0].message}`,
                        "error",
                      );
                    toast(`Importados ${count(res.data.inserted, "registro")}`);
                    reset();
                    onClose();
                  })
                }
              >
                Importar {count(toImport.length, "registro")}
              </Button>
              <Button variant="ghost" onClick={reset}>
                Elegir otro archivo
              </Button>
            </div>
            {!skipInvalid && invalid > 0 ? (
              <Alert tone="error">
                Corrige las filas con errores o marca «Omitir filas con errores».
              </Alert>
            ) : null}
          </>
        )}
        {fileError ? <Alert tone="error">{fileError}</Alert> : null}
      </div>
    </Dialog>
  );
}
