import { describe, expect, it } from "vitest";
import { checkFormula, evaluateFormula, FormulaError } from "@/lib/trackers/formula";

const ctx = (props: Record<string, number | string | boolean | null>) => ({
  props,
  today: "2026-11-23",
});

describe("formula engine", () => {
  it("does arithmetic with precedence and parentheses", () => {
    expect(evaluateFormula("1 + 2 * 3", ctx({}))).toBe(7);
    expect(evaluateFormula("(1 + 2) * 3", ctx({}))).toBe(9);
    expect(evaluateFormula("2 ^ 3 ^ 2", ctx({}))).toBe(512);
    expect(evaluateFormula("-{a} + 10", ctx({ a: 4 }))).toBe(6);
  });

  it("reads properties case-insensitively, including names with spaces", () => {
    expect(evaluateFormula("{Peso} / ({Altura} ^ 2)", ctx({ peso: 81, altura: 1.8 }))).toBeCloseTo(
      25,
      5,
    );
    expect(evaluateFormula("{Horas de sueño} >= 8", ctx({ "Horas de sueño": 7.5 }))).toBe(false);
  });

  it("supports functions and Spanish aliases", () => {
    expect(evaluateFormula("round({x}, 1)", ctx({ x: 2.345 }))).toBe(2.3);
    expect(evaluateFormula("redondear(promedio(1, 2, 4), 2)", ctx({}))).toBe(2.33);
    expect(evaluateFormula('si({x} > 5, "alto", "bajo")', ctx({ x: 9 }))).toBe("alto");
    expect(evaluateFormula("progreso(90, {peso}, 75)", ctx({ peso: 84 }))).toBeCloseTo(40);
    expect(evaluateFormula("percent(3, 4)", ctx({}))).toBe(75);
    expect(evaluateFormula('datediff("2026-11-01", today())', ctx({}))).toBe(22);
    expect(evaluateFormula('concat("Total: ", 3)', ctx({}))).toBe("Total: 3");
  });

  it("handles nulls and division by zero without crashing", () => {
    expect(evaluateFormula("{x} * 2", ctx({ x: null }))).toBeNull();
    expect(evaluateFormula("10 / 0", ctx({}))).toBeNull();
    expect(evaluateFormula("empty({x})", ctx({ x: "" }))).toBe(true);
  });

  it("rejects code injection and unknown identifiers", () => {
    for (const evil of [
      "constructor.constructor('return process')()",
      "process.exit()",
      "{a}; alert(1)",
      "`x`",
      "a.b",
    ]) {
      expect(() => evaluateFormula(evil, ctx({ a: 1 }))).toThrow(FormulaError);
    }
    expect(() => evaluateFormula("eval(1)", ctx({}))).toThrow(/desconocida/);
  });

  it("enforces size and complexity limits", () => {
    expect(() => evaluateFormula("1+".repeat(600) + "1", ctx({}))).toThrow(FormulaError);
    expect(() => evaluateFormula("(".repeat(60) + "1" + ")".repeat(60), ctx({}))).toThrow(
      /niveles/,
    );
  });

  it("checkFormula reports syntax errors and missing properties", () => {
    expect(checkFormula("{Peso} * 2", ["Peso"])).toBeNull();
    expect(checkFormula("{Altura} * 2", ["Peso"])).toMatch(/Altura/);
    expect(checkFormula("1 +", [])).toMatch(/incompleta/);
  });
});
