import Link from "next/link";
import { Check, Scale } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

/**
 * Public landing. Split hero (unslop "Layout" pass): what TRACKY does today on
 * one side, a product preview drawn in code on the other — example data, no
 * generated imagery. Only modules that exist are named.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="TRACKY, inicio" className="rounded-lg">
          <Logo />
        </Link>
        <Link
          href={ROUTES.login}
          className="rounded-lg px-3 py-2 text-[14px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          Iniciar sesión
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-[1200px] flex-1 animate-rise items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:py-16">
        <div className="max-w-xl">
          <h1 className="text-[40px] leading-[1.05] font-medium tracking-[-0.02em] text-balance sm:text-[56px] sm:tracking-[-0.03em] lg:text-[64px]">
            Tu día, tus tareas y lo que mides
          </h1>
          <p className="mt-6 max-w-[36rem] text-[18px] leading-[1.6] text-fg-muted sm:text-[20px]">
            TRACKY junta tus tareas, tu calendario y trackers de lo que quieras seguir —peso, sueño,
            gastos, lecturas— en un panel que organizas a tu manera
          </p>
          <div className="mt-10">
            <Link href={ROUTES.signUp} className={buttonClasses({ variant: "accent", size: "lg" })}>
              Crear cuenta
            </Link>
          </div>
        </div>

        <ProductPreview />
      </main>
    </div>
  );
}

// ── Product preview: the real app's components, with example data ──────────

const WEIGHTS = [83.1, 82.4, 82.2, 81.6, 81.5, 80.9, 80.6, 80.2];
const LABELS = ["26 oct", "2 nov", "6 nov", "9 nov", "13 nov", "16 nov", "20 nov", "23 nov"];

function PreviewChart() {
  const w = 320;
  const h = 140;
  const pad = { l: 40, r: 8, t: 10, b: 22 };
  const min = 79;
  const max = 84;
  const x = (i: number) => pad.l + (i / (WEIGHTS.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + ((max - v) / (max - min)) * (h - pad.t - pad.b);
  const d = WEIGHTS.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(
    " ",
  );
  const last = WEIGHTS.length - 1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full">
      {[80, 82, 84].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
          <text
            x={pad.l - 8}
            y={y(t)}
            dy="0.32em"
            textAnchor="end"
            className="fill-fg-subtle text-[11px] tabular-nums"
          >
            {t} kg
          </text>
        </g>
      ))}
      {[0, 3, 7].map((i) => (
        <text
          key={i}
          x={x(i)}
          y={h - 6}
          textAnchor={i === last ? "end" : i === 0 ? "start" : "middle"}
          className="fill-fg-subtle text-[11px]"
        >
          {LABELS[i]}
        </text>
      ))}
      <path
        d={d}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={x(last)}
        cy={y(WEIGHTS[last])}
        r={5}
        fill="var(--dot)"
        stroke="var(--card)"
        strokeWidth={2}
      />
      <circle cx={x(last)} cy={y(WEIGHTS[last])} r={4} fill="none" stroke="var(--dot-ring)" />
    </svg>
  );
}

const TASKS = [
  { title: "Revisar presupuesto trimestral", meta: "Hoy · #trabajo", done: false },
  { title: "Llamar al dentista", meta: "Hoy · 10:00", done: false },
  { title: "Comprar fruta", meta: "Hoy · #casa", done: true },
];

function ProductPreview() {
  return (
    <figure className="min-w-0">
      <div
        aria-hidden
        className="rounded-[var(--radius-panel)] border border-border bg-bg-deep p-3 shadow-[var(--shadow-float)] sm:p-4"
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="card rounded-xl p-4">
            <p className="flex items-center gap-2 text-[13px] text-fg-muted">
              <Scale className="size-4" />
              Peso corporal
            </p>
            <p className="mt-3 flex items-center gap-2 text-[28px] leading-none font-medium tabular-nums">
              80,2 kg <span className="now-dot" />
            </p>
            <p className="mt-2 text-[12px] text-fg-subtle tabular-nums">−2,9 kg desde el 26 oct</p>
            <div className="mt-4">
              <PreviewChart />
            </div>
          </div>
          <div className="card hidden rounded-xl p-4 sm:block">
            <p className="text-[13px] font-medium text-fg-muted">Tareas de hoy</p>
            <ul className="mt-3 flex flex-col gap-3">
              {TASKS.map((t) => (
                <li key={t.title} className="flex items-start gap-2.5">
                  <span
                    className={
                      t.done
                        ? "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-primary text-primary-fg"
                        : "mt-0.5 size-4 shrink-0 rounded-full border-[1.5px] border-border-strong"
                    }
                  >
                    {t.done ? <Check className="size-3 [stroke-width:2.5]" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={
                        t.done
                          ? "block truncate text-[13px] text-fg-subtle line-through"
                          : "block truncate text-[13px]"
                      }
                    >
                      {t.title}
                    </span>
                    <span className="block text-[11px] text-fg-subtle">{t.meta}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-[12px] text-fg-subtle">
        Vista previa con datos de ejemplo
      </figcaption>
    </figure>
  );
}
