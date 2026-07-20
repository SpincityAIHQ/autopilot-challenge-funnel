// Minimal ambient module so TS can resolve `bun:test` imports.
// Tests are executed with `bun test`, which provides the real implementation.
declare module "bun:test" {
  type TestFn = (name: string, fn: () => void | Promise<void>) => void;
  export const describe: (name: string, fn: () => void) => void;
  export const it: TestFn;
  export const test: TestFn;
  export const beforeAll: (fn: () => void | Promise<void>) => void;
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export const afterAll: (fn: () => void | Promise<void>) => void;
  export const afterEach: (fn: () => void | Promise<void>) => void;
  interface Expectation {
    toBe(v: unknown): void;
    toEqual(v: unknown): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeDefined(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toContain(v: unknown): void;
    toThrow(v?: unknown): void;
    not: Expectation;
  }
  export const expect: (value: unknown) => Expectation;
}
