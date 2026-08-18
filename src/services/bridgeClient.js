export class BridgeApiError extends Error {
  constructor(status, error) {
    super(error?.message ?? `Bridge request failed with status ${status}`);
    this.name = "BridgeApiError";
    this.status = status;
    this.code = error?.code ?? "UNKNOWN_ERROR";
    this.retryable = error?.retryable === true;
    this.requestId = error?.requestId ?? null;
  }
}

export class BridgeClient {
  constructor({
    baseUrl = "",
    fetchImpl = (...args) => globalThis.fetch(...args),
  } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetchImpl = fetchImpl;
  }

  getHealth() {
    return this.#request("/v2/health");
  }

  createSession(kioskInstanceId, idempotencyKey) {
    return this.#request("/v2/sessions", {
      method: "POST",
      headers: { "idempotency-key": idempotencyKey },
      body: { kioskInstanceId },
    });
  }

  getSession(session) {
    return this.#sessionRequest(session, "");
  }

  updateProfile(session, profile) {
    return this.#sessionRequest(session, "/profile", {
      method: "PATCH",
      body: profile,
    });
  }

  startCapture(session) {
    return this.#sessionRequest(session, "/capture/start", { method: "POST" });
  }

  retryCapture(session) {
    return this.#sessionRequest(session, "/capture/retry", { method: "POST" });
  }

  cancelCapture(session) {
    return this.#sessionRequest(session, "/capture/cancel", { method: "POST" });
  }

  getCaptureStatus(session) {
    return this.#sessionRequest(session, "/capture/status");
  }

  finalizeSession(session) {
    return this.#sessionRequest(session, "/finalize", { method: "POST" });
  }

  scheduleTransforms(session) {
    return this.#sessionRequest(session, "/transforms/schedule", {
      method: "POST",
    });
  }

  getTransforms(session) {
    return this.#sessionRequest(session, "/transforms");
  }

  retryTransform(session, assetId) {
    return this.#sessionRequest(
      session,
      `/transforms/${encodeURIComponent(assetId)}/retry`,
      { method: "POST" },
    );
  }

  async getTransformResultBlob(session, resultUrl) {
    return this.#getSessionBlob(session, resultUrl);
  }

  async getTransformAnimationBlob(session, animationUrl) {
    return this.#getSessionBlob(session, animationUrl);
  }

  async #getSessionBlob(session, url) {
    const response = await this.fetchImpl(`${this.baseUrl}${url}`, {
      headers: { authorization: `Bearer ${session.sessionToken}` },
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new BridgeApiError(response.status, payload.error);
    }
    return response.blob();
  }

  logout(session) {
    return this.#sessionRequest(session, "/logout", { method: "POST" });
  }

  #sessionRequest(session, suffix, options = {}) {
    return this.#request(`/v2/sessions/${session.sessionId}${suffix}`, {
      ...options,
      token: session.sessionToken,
    });
  }

  async #request(path, { method = "GET", headers = {}, body, token } = {}) {
    const requestHeaders = { ...headers };

    if (body !== undefined) {
      requestHeaders["content-type"] = "application/json";
    }

    if (token) {
      requestHeaders.authorization = `Bearer ${token}`;
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new BridgeApiError(response.status, payload.error);
    }

    return payload;
  }
}

export const bridgeClient = new BridgeClient();
