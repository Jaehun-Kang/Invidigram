import assert from "node:assert/strict";
import test from "node:test";
import { BridgeApiError, BridgeClient } from "../src/services/bridgeClient.js";

test("sends profile updates with only the current session token", async () => {
  let request;
  const client = new BridgeClient({
    baseUrl: "http://127.0.0.1:3100",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({ state: "CREATED" }),
      };
    },
  });

  await client.updateProfile(
    { sessionId: "session-1", sessionToken: "token-1" },
    { username: "visitor.00000001", gender: "female" },
  );

  assert.equal(
    request.url,
    "http://127.0.0.1:3100/v2/sessions/session-1/profile",
  );
  assert.equal(request.options.method, "PATCH");
  assert.equal(request.options.headers.authorization, "Bearer token-1");
  assert.deepEqual(JSON.parse(request.options.body), {
    username: "visitor.00000001",
    gender: "female",
  });
});

test("normalizes Bridge error envelopes", async () => {
  const client = new BridgeClient({
    fetchImpl: async () => ({
      ok: false,
      status: 409,
      json: async () => ({
        error: {
          code: "MODEL_NOT_READY",
          message: "The face model is not ready",
          retryable: false,
          requestId: "request-1",
        },
      }),
    }),
  });

  await assert.rejects(
    client.finalizeSession({ sessionId: "session-1", sessionToken: "token-1" }),
    (error) =>
      error instanceof BridgeApiError &&
      error.status === 409 &&
      error.code === "MODEL_NOT_READY" &&
      error.requestId === "request-1",
  );
});

test("uses browser fetch without changing its receiver", async () => {
  const originalFetch = globalThis.fetch;
  let receiver;
  globalThis.fetch = function fetchWithReceiver() {
    receiver = this;
    return Promise.resolve({
      ok: true,
      json: async () => ({ status: "ready" }),
    });
  };

  try {
    await new BridgeClient().getHealth();
    assert.equal(receiver, globalThis);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetches transform results with the current session token", async () => {
  let request;
  const expectedBlob = new Blob(["png"], { type: "image/png" });
  const client = new BridgeClient({
    baseUrl: "http://127.0.0.1:3100",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, blob: async () => expectedBlob };
    },
  });

  const blob = await client.getTransformResultBlob(
    { sessionId: "session-1", sessionToken: "token-1" },
    "/v2/sessions/session-1/assets/lora-male/result?revision=1",
  );

  assert.equal(blob, expectedBlob);
  assert.equal(
    request.url,
    "http://127.0.0.1:3100/v2/sessions/session-1/assets/lora-male/result?revision=1",
  );
  assert.equal(request.options.headers.authorization, "Bearer token-1");
});

test("retries one transform with the current session token", async () => {
  let request;
  const client = new BridgeClient({
    baseUrl: "http://127.0.0.1:3100",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ status: "PENDING" }) };
    },
  });

  await client.retryTransform(
    { sessionId: "session-1", sessionToken: "token-1" },
    "male-avatar",
  );
  assert.equal(
    request.url,
    "http://127.0.0.1:3100/v2/sessions/session-1/transforms/male-avatar/retry",
  );
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.authorization, "Bearer token-1");
});
