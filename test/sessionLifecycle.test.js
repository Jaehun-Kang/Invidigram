import assert from "node:assert/strict";
import test from "node:test";
import { logoutCurrentSession } from "../src/services/sessionLifecycle.js";

test("revokes the Bridge session before clearing browser credentials", async () => {
  const calls = [];
  const credentials = { sessionId: "session-1", sessionToken: "token-1" };
  const result = await logoutCurrentSession({
    client: {
      logout: async (value) => {
        calls.push(["logout", value]);
        return { state: "LOGGED_OUT" };
      },
    },
    store: {
      load: () => credentials,
      clear: () => calls.push(["clear"]),
    },
  });

  assert.equal(result.state, "LOGGED_OUT");
  assert.deepEqual(calls, [["logout", credentials], ["clear"]]);
});

test("does not clear a recoverable session when Bridge is unavailable", async () => {
  let cleared = false;
  await assert.rejects(
    logoutCurrentSession({
      client: {
        logout: async () => {
          throw new Error("offline");
        },
      },
      store: {
        load: () => ({ sessionId: "session-1", sessionToken: "token-1" }),
        clear: () => {
          cleared = true;
        },
      },
    }),
    /offline/,
  );
  assert.equal(cleared, false);
});
