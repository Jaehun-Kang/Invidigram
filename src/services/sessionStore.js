const SESSION_KEY = "invidigram:v2:session";

const isSession = (value) =>
  value !== null &&
  typeof value === "object" &&
  typeof value.sessionId === "string" &&
  typeof value.sessionToken === "string";

export const createSessionStore = (storage = globalThis.sessionStorage) => ({
  load() {
    try {
      const value = JSON.parse(storage.getItem(SESSION_KEY));
      return isSession(value) ? value : null;
    } catch {
      return null;
    }
  },

  save(session) {
    if (!isSession(session)) {
      throw new TypeError("A sessionId and sessionToken are required");
    }

    storage.setItem(
      SESSION_KEY,
      JSON.stringify({
        sessionId: session.sessionId,
        sessionToken: session.sessionToken,
      }),
    );
  },

  clear() {
    storage.removeItem(SESSION_KEY);
  },
});

export const sessionStore = createSessionStore();
