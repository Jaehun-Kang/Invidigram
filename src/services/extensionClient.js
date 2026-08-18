const WEB_APP_SOURCE = "invidigram-web-app";
const EXTENSION_SOURCE = "invidigram-extension-v2";

export class ExtensionClient {
  constructor({
    windowObject = globalThis.window,
    createRequestId = () => globalThis.crypto.randomUUID(),
    timeoutMs = 3000,
  } = {}) {
    this.window = windowObject;
    this.createRequestId = createRequestId;
    this.timeoutMs = timeoutMs;
  }

  checkBridgeHealth() {
    const requestId = this.createRequestId();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.window.removeEventListener("message", onMessage);
        reject(new Error("Extension v2 handshake timed out"));
      }, this.timeoutMs);

      const onMessage = (event) => {
        if (
          event.source !== this.window ||
          event.origin !== this.window.location.origin ||
          event.data?.source !== EXTENSION_SOURCE ||
          event.data?.type !== "BRIDGE_HEALTH_RESULT" ||
          event.data?.requestId !== requestId
        ) {
          return;
        }

        clearTimeout(timeout);
        this.window.removeEventListener("message", onMessage);

        if (event.data.error) {
          reject(
            Object.assign(new Error(event.data.error.code), event.data.error),
          );
          return;
        }

        resolve(event.data.bridgeHealth);
      };

      this.window.addEventListener("message", onMessage);
      this.window.postMessage(
        {
          source: WEB_APP_SOURCE,
          type: "BRIDGE_HEALTH_REQUEST",
          requestId,
        },
        this.window.location.origin,
      );
    });
  }
}

export const extensionClient = new ExtensionClient();
