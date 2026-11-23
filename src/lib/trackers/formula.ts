/**
 * Safe formula engine for tracker properties. NEVER uses eval/Function.
 *
 * Grammar (precedence low → high):
 *   expr     := or
 *   or       := and ("or" and)*
 *   and      := cmp ("and" cmp)*
 *   cmp      := add (("=" | "!=" | "<" | "<=" | ">" | ">=") add)?
 *   add      := mul (("+" | "-") mul)*
 *   mul      := unary (("*" | "/" | "%") unary)*
 *   unary    := ("-" | "not") unary | pow
 *   pow      := primary ("^" unary)?
 *   primary  := number | string | true | false | {Property name} | fn "(" args ")" | "(" expr ")"
 *
 * Values: number | string | boolean | null. Dates are ISO strings (YYYY-MM-DD).
 * Limits: formula length, AST nodes, nesting depth and evaluation steps.
 */

export type Value = number | string | boolean | null;
type Node =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "bool"; v: boolean }
  | { k: "prop"; name: string }
  | { k: "un"; op: "-" | "not"; a: Node }
  | { k: "bin"; op: string; a: Node; b: Node }
  | { k: "call"; fn: string; args: Node[] };

export class FormulaError extends Error {}

const MAX_LENGTH = 1000;
const MAX_NODES = 300;
const MAX_DEPTH = 40;
const MAX_STEPS = 5000;

type Tok = { t: "num" | "str" | "id" | "prop" | "op" | "(" | ")" | ","; v: string; pos: number };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i));
      if (!m) throw new FormulaError(`Número no válido en la posición ${i + 1}`);
      out.push({ t: "num", v: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== c) {
        if (src[j] === "\\" && j + 1 < src.length) j++;
        s += src[j++];
      }
      if (src[j] !== c) throw new FormulaError("Falta cerrar un texto entre comillas");
      out.push({ t: "str", v: s, pos: i });
      i = j + 1;
      continue;
    }
    if (c === "{") {
      const j = src.indexOf("}", i);
      if (j < 0) throw new FormulaError("Falta cerrar una propiedad con }");
      const name = src.slice(i + 1, j).trim();
      if (!name) throw new FormulaError("Propiedad vacía {}");
      out.push({ t: "prop", v: name, pos: i });
      i = j + 1;
      continue;
    }
    if (/[A-Za-zÀ-ÿ_]/.test(c)) {
      const m = /^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ_0-9]*/.exec(src.slice(i))!;
      out.push({ t: "id", v: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (["<=", ">=", "!=", "=="].includes(two)) {
      out.push({ t: "op", v: two === "==" ? "=" : two, pos: i });
      i += 2;
      continue;
    }
    if ("+-*/%^<>=".includes(c)) {
      out.push({ t: "op", v: c, pos: i });
      i++;
      continue;
    }
    if (c === "(" || c === ")" || c === ",") {
      out.push({ t: c, v: c, pos: i });
      i++;
      continue;
    }
    throw new FormulaError(`Carácter no permitido «${c}»`);
  }
  return out;
}

function parse(src: string): Node {
  if (src.length > MAX_LENGTH) throw new FormulaError("La fórmula es demasiado larga");
  const toks = tokenize(src);
  let p = 0;
  let nodes = 0;
  const node = <T extends Node>(n: T, depth: number): T => {
    if (++nodes > MAX_NODES) throw new FormulaError("La fórmula es demasiado compleja");
    if (depth > MAX_DEPTH) throw new FormulaError("Demasiados niveles de paréntesis");
    return n;
  };
  const peek = () => toks[p];
  const isKw = (w: string) => peek()?.t === "id" && peek().v.toLowerCase() === w;
  const expect = (t: Tok["t"]) => {
    if (peek()?.t !== t) throw new FormulaError(`Se esperaba «${t}»`);
    return toks[p++];
  };

  const binary =
    (next: (d: number) => Node, ops: string[] | ((d: number) => string | null)) =>
    (d: number): Node => {
      let a = next(d + 1);
      for (;;) {
        const op =
          typeof ops === "function"
            ? ops(d)
            : peek()?.t === "op" && ops.includes(peek().v)
              ? peek().v
              : null;
        if (!op) return a;
        p++;
        a = node({ k: "bin", op, a, b: next(d + 1) }, d);
      }
    };

  const primary = (d: number): Node => {
    const tk = peek();
    if (!tk) throw new FormulaError("La fórmula está incompleta");
    if (tk.t === "num") return (p++, node({ k: "num", v: Number(tk.v) }, d));
    if (tk.t === "str") return (p++, node({ k: "str", v: tk.v }, d));
    if (tk.t === "prop") return (p++, node({ k: "prop", name: tk.v }, d));
    if (tk.t === "(") {
      p++;
      const e = or(d + 1);
      expect(")");
      return e;
    }
    if (tk.t === "id") {
      const w = tk.v.toLowerCase();
      if (w === "true" || w === "verdadero") return (p++, node({ k: "bool", v: true }, d));
      if (w === "false" || w === "falso") return (p++, node({ k: "bool", v: false }, d));
      p++;
      expect("(");
      const args: Node[] = [];
      if (peek()?.t !== ")") {
        args.push(or(d + 1));
        while (peek()?.t === ",") {
          p++;
          args.push(or(d + 1));
        }
      }
      expect(")");
      if (!(w in FUNCTIONS)) throw new FormulaError(`Función desconocida: ${tk.v}`);
      return node({ k: "call", fn: w, args }, d);
    }
    throw new FormulaError(`No se esperaba «${tk.v}»`);
  };
  const pow = (d: number): Node => {
    const a = primary(d);
    if (peek()?.t === "op" && peek().v === "^") {
      p++;
      return node({ k: "bin", op: "^", a, b: unary(d + 1) }, d);
    }
    return a;
  };
  const unary = (d: number): Node => {
    if (peek()?.t === "op" && peek().v === "-") {
      p++;
      return node({ k: "un", op: "-", a: unary(d + 1) }, d);
    }
    if (isKw("not") || isKw("no")) {
      p++;
      return node({ k: "un", op: "not", a: unary(d + 1) }, d);
    }
    return pow(d);
  };
  const mul = binary(unary, ["*", "/", "%"]);
  const add = binary(mul, ["+", "-"]);
  const cmp = (d: number): Node => {
    const a = add(d + 1);
    const tk = peek();
    if (tk?.t === "op" && ["=", "!=", "<", "<=", ">", ">="].includes(tk.v)) {
      p++;
      return node({ k: "bin", op: tk.v, a, b: add(d + 1) }, d);
    }
    return a;
  };
  const kw = (word: string, alt: string) => () => (isKw(word) || isKw(alt) ? word : null);
  const and = binary(cmp, kw("and", "y"));
  const or = binary(and, kw("or", "o"));

  const ast = or(0);
  if (p < toks.length) throw new FormulaError(`Sobra «${toks[p].v}» al final`);
  return ast;
}

// ── Functions ────────────────────────────────────────────────────────────────
const num = (v: Value, fn: string): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  throw new FormulaError(`${fn}: se esperaba un número`);
};
const isDate = (v: Value): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
const toDay = (v: Value, fn: string) => {
  if (!isDate(v)) throw new FormulaError(`${fn}: se esperaba una fecha`);
  return Date.UTC(Number(v.slice(0, 4)), Number(v.slice(5, 7)) - 1, Number(v.slice(8, 10)));
};
const nums = (args: Value[], fn: string) =>
  args.filter((a) => a !== null && a !== "").map((a) => num(a, fn));

type Fn = { min: number; max: number; run: (args: Value[], ctx: EvalContext) => Value };
const FUNCTIONS: Record<string, Fn> = {
  round: {
    min: 1,
    max: 2,
    run: ([v, d]) => {
      const f = 10 ** (d === undefined ? 0 : Math.max(0, Math.min(10, num(d, "round"))));
      return Math.round(num(v, "round") * f) / f;
    },
  },
  abs: { min: 1, max: 1, run: ([v]) => Math.abs(num(v, "abs")) },
  floor: { min: 1, max: 1, run: ([v]) => Math.floor(num(v, "floor")) },
  ceil: { min: 1, max: 1, run: ([v]) => Math.ceil(num(v, "ceil")) },
  sqrt: {
    min: 1,
    max: 1,
    run: ([v]) => {
      const n = num(v, "sqrt");
      if (n < 0) throw new FormulaError("sqrt: número negativo");
      return Math.sqrt(n);
    },
  },
  min: {
    min: 1,
    max: 50,
    run: (a) => {
      const n = nums(a, "min");
      return n.length ? Math.min(...n) : null;
    },
  },
  max: {
    min: 1,
    max: 50,
    run: (a) => {
      const n = nums(a, "max");
      return n.length ? Math.max(...n) : null;
    },
  },
  sum: { min: 1, max: 50, run: (a) => nums(a, "sum").reduce((x, y) => x + y, 0) },
  avg: {
    min: 1,
    max: 50,
    run: (a) => {
      const n = nums(a, "avg");
      return n.length ? n.reduce((x, y) => x + y, 0) / n.length : null;
    },
  },
  if: { min: 2, max: 3, run: ([c, a, b]) => (truthy(c) ? a : (b ?? null)) },
  empty: { min: 1, max: 1, run: ([v]) => v === null || v === "" },
  concat: { min: 1, max: 20, run: (a) => a.map((v) => (v === null ? "" : String(v))).join("") },
  length: { min: 1, max: 1, run: ([v]) => (v === null ? 0 : String(v).length) },
  lower: { min: 1, max: 1, run: ([v]) => (v === null ? null : String(v).toLowerCase()) },
  upper: { min: 1, max: 1, run: ([v]) => (v === null ? null : String(v).toUpperCase()) },
  percent: {
    min: 2,
    max: 2,
    run: ([part, total]) => {
      const t = num(total, "percent");
      return t === 0 ? null : (num(part, "percent") / t) * 100;
    },
  },
  progress: {
    min: 3,
    max: 3,
    run: ([start, current, target]) => {
      const s = num(start, "progress"),
        c = num(current, "progress"),
        t = num(target, "progress");
      if (t === s) return c === t ? 100 : 0;
      return Math.max(0, Math.min(100, ((c - s) / (t - s)) * 100));
    },
  },
  datediff: {
    min: 2,
    max: 3,
    run: ([a, b, unit]) => {
      const days = (toDay(b, "datediff") - toDay(a, "datediff")) / 86_400_000;
      const u = unit === null || unit === undefined ? "days" : String(unit).toLowerCase();
      if (u === "weeks" || u === "semanas") return Math.trunc(days / 7);
      if (u === "months" || u === "meses") return Math.trunc(days / 30.4375);
      return days;
    },
  },
  today: { min: 0, max: 0, run: (_a, ctx) => ctx.today },
  year: { min: 1, max: 1, run: ([v]) => (toDay(v, "year"), Number((v as string).slice(0, 4))) },
  month: { min: 1, max: 1, run: ([v]) => (toDay(v, "month"), Number((v as string).slice(5, 7))) },
};
// Spanish aliases
const ALIASES: Record<string, string> = {
  redondear: "round",
  suma: "sum",
  promedio: "avg",
  media: "avg",
  minimo: "min",
  maximo: "max",
  si: "if",
  vacio: "empty",
  concatenar: "concat",
  longitud: "length",
  porcentaje: "percent",
  progreso: "progress",
  diasentre: "datediff",
  hoy: "today",
};
for (const [alias, target] of Object.entries(ALIASES)) FUNCTIONS[alias] = FUNCTIONS[target];

export const FORMULA_FUNCTIONS = Object.keys(FUNCTIONS).filter((f) => !(f in ALIASES));

const truthy = (v: Value) => v !== null && v !== false && v !== 0 && v !== "";

export type EvalContext = {
  /** property values by property NAME (case-insensitive) */
  props: Record<string, Value>;
  today: string;
};

function evaluateNode(n: Node, ctx: EvalContext, budget: { steps: number }): Value {
  if (++budget.steps > MAX_STEPS)
    throw new FormulaError("La fórmula tarda demasiado en calcularse");
  switch (n.k) {
    case "num":
      return n.v;
    case "str":
      return n.v;
    case "bool":
      return n.v;
    case "prop": {
      const key = Object.keys(ctx.props).find((k) => k.toLowerCase() === n.name.toLowerCase());
      if (key === undefined) throw new FormulaError(`No existe la propiedad {${n.name}}`);
      return ctx.props[key];
    }
    case "un": {
      const a = evaluateNode(n.a, ctx, budget);
      return n.op === "-" ? -num(a, "-") : !truthy(a);
    }
    case "call": {
      const fn = FUNCTIONS[n.fn];
      if (n.args.length < fn.min || n.args.length > fn.max)
        throw new FormulaError(`${n.fn}: número de argumentos incorrecto`);
      if (n.fn === "if" || n.fn === "si") {
        const c = evaluateNode(n.args[0], ctx, budget);
        return truthy(c)
          ? evaluateNode(n.args[1], ctx, budget)
          : n.args[2]
            ? evaluateNode(n.args[2], ctx, budget)
            : null;
      }
      return fn.run(
        n.args.map((a) => evaluateNode(a, ctx, budget)),
        ctx,
      );
    }
    case "bin": {
      if (n.op === "and")
        return truthy(evaluateNode(n.a, ctx, budget)) && truthy(evaluateNode(n.b, ctx, budget));
      if (n.op === "or")
        return truthy(evaluateNode(n.a, ctx, budget)) || truthy(evaluateNode(n.b, ctx, budget));
      const a = evaluateNode(n.a, ctx, budget);
      const b = evaluateNode(n.b, ctx, budget);
      switch (n.op) {
        case "+":
          if (typeof a === "string" && !isFinite(Number(a))) return a + (b ?? "");
          if (a === null || b === null) return null;
          return num(a, "+") + num(b, "+");
        case "-":
          if (a === null || b === null) return null;
          return num(a, "-") - num(b, "-");
        case "*":
          if (a === null || b === null) return null;
          return num(a, "*") * num(b, "*");
        case "/": {
          if (a === null || b === null) return null;
          const d = num(b, "/");
          return d === 0 ? null : num(a, "/") / d;
        }
        case "%": {
          if (a === null || b === null) return null;
          const d = num(b, "%");
          return d === 0 ? null : num(a, "%") % d;
        }
        case "^":
          return a === null || b === null ? null : num(a, "^") ** num(b, "^");
        case "=":
          return a === b || (a !== null && b !== null && String(a) === String(b));
        case "!=":
          return !(a === b || (a !== null && b !== null && String(a) === String(b)));
        default: {
          if (a === null || b === null) return false;
          const x = typeof a === "number" || typeof b === "number" ? num(a, n.op) : String(a);
          const y = typeof a === "number" || typeof b === "number" ? num(b, n.op) : String(b);
          return n.op === "<" ? x < y : n.op === "<=" ? x <= y : n.op === ">" ? x > y : x >= y;
        }
      }
    }
  }
}

const cache = new Map<string, Node>();
/** Parse once (cached) and evaluate; throws FormulaError with a Spanish message. */
export function evaluateFormula(src: string, ctx: EvalContext): Value {
  let ast = cache.get(src);
  if (!ast) {
    ast = parse(src);
    if (cache.size > 500) cache.clear();
    cache.set(src, ast);
  }
  const out = evaluateNode(ast, ctx, { steps: 0 });
  if (typeof out === "number" && !Number.isFinite(out)) return null;
  return out;
}

/** Validate syntax and property references without data. */
export function checkFormula(src: string, propertyNames: string[]): string | null {
  try {
    const ast = parse(src);
    const missing: string[] = [];
    const walk = (n: Node) => {
      if (n.k === "prop" && !propertyNames.some((p) => p.toLowerCase() === n.name.toLowerCase()))
        missing.push(n.name);
      if (n.k === "un") walk(n.a);
      if (n.k === "bin") (walk(n.a), walk(n.b));
      if (n.k === "call") n.args.forEach(walk);
    };
    walk(ast);
    return missing.length ? `No existe la propiedad {${missing[0]}}` : null;
  } catch (e) {
    return e instanceof FormulaError ? e.message : "Fórmula no válida";
  }
}
