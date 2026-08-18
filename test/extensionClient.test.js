import assert from "node:assert/strict";
import test from "node:test";
import { ExtensionClient } from "../src/services/extensionClient.js";

const createFakeWindow = () => {
  const listeners = new Set();
  return {
    lastMessage: null,
    location: { origin: "http://127.0.0.1:5174" },
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    postMessage(message, origin) {
      this.lastMessage = { message, origin };
    },
    dispatch(data, origin = this.location.origin) {
      for (const listener of listeners) {
        listener({ source: this, origin, data });
      }
    },
  };
};

test("matches an Extension v2 health response to its request", async () => {
  const windowObject = createFakeWindow();
  const client = new ExtensionClient({
    windowObject,
    createRequestId: () => "request-1",
    timeoutMs: 100,
  });
  const healthPromise = client.checkBridgeHealth();

  assert.deepEqual(windowObject.lastMessage, {
    message: {
      source: "invidigram-web-app",
      type: "BRIDGE_HEALTH_REQUEST",
      requestId: "request-1",
    },
    origin: "http://127.0.0.1:5174",
  });

  windowObject.dispatch({
    source: "invidigram-extension-v2",
    type: "BRIDGE_HEALTH_RESULT",
    requestId: "other-request",
    bridgeHealth: { status: "wrong" },
  });
  windowObject.dispatch({
    source: "invidigram-extension-v2",
    type: "BRIDGE_HEALTH_RESULT",
    requestId: "request-1",
    bridgeHealth: { status: "ready", contractVersion: 1 },
    error: null,
  });

  assert.deepEqual(await healthPromise, {
    status: "ready",
    contractVersion: 1,
  });
});
