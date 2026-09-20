// In-memory state shared across serial tests in the same worker.
// All tests run with workers: 1, so a module-level singleton works.
//
// Use this to pass created entity IDs between flow steps:
//   state.set("orgId", "abc-123");
//   const id = state.get<string>("orgId");

class State {
  private store: Record<string, unknown> = {};

  set<T>(key: string, value: T): T {
    this.store[key] = value;
    return value;
  }

  get<T>(key: string): T | undefined {
    return this.store[key] as T | undefined;
  }

  require<T>(key: string): T {
    const v = this.get<T>(key);
    if (v === undefined) throw new Error(`state.require("${key}") missing`);
    return v;
  }

  clear() {
    this.store = {};
  }
}

export const state = new State();
