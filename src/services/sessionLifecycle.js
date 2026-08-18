import { bridgeClient } from "./bridgeClient.js";
import { sessionStore } from "./sessionStore.js";

export const logoutCurrentSession = async ({
  client = bridgeClient,
  store = sessionStore,
} = {}) => {
  const credentials = store.load();

  if (!credentials) {
    store.clear();
    return { state: "EMPTY" };
  }

  try {
    const result = await client.logout(credentials);
    store.clear();
    return result;
  } catch (error) {
    if (["AUTH_INVALID", "SESSION_EXPIRED"].includes(error.code)) {
      store.clear();
      return { state: "EXPIRED" };
    }

    throw error;
  }
};
