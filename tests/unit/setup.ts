import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// "server-only" throws outside a React Server environment; neutralise it for unit tests.
vi.mock("server-only", () => ({}));

afterEach(() => cleanup());
