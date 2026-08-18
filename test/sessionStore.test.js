import assert from "node:assert/strict";
import test from "node:test";
import { createSessionStore } from "../src/services/sessionStore.js";

const createMemoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
};

test("stores only the current opaque session credentials", () => {
  const store = createSessionStore(createMemoryStorage());

  store.save({
    sessionId: "session-1",
    sessionToken: "token-1",
    username: "must-not-be-persisted",
  });

  assert.deepEqual(store.load(), {
    sessionId: "session-1",
    sessionToken: "token-1",
  });
  store.clear();
  assert.equal(store.load(), null);
});
