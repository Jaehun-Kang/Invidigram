const loginDataKey = "loginData";
const storage = globalThis.sessionStorage;

const readJson = (key) => {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
};

const writeJson = (key, value) => {
  storage.setItem(key, JSON.stringify(value));
};

export const getCurrentAudience = () => readJson(loginDataKey);

export const saveCurrentAudience = (audience) => {
  writeJson(loginDataKey, audience);
};

export const clearCurrentAudience = () => {
  storage.removeItem(loginDataKey);
};

export const getAudienceProfileStateKey = (audience, profileGender) => {
  const audienceKey = audience
    ? `${audience.gender}:${audience.username}`
    : "anonymous";

  return `profileState:${audienceKey}:${profileGender}`;
};

export const getAudienceIdentity = (audience) =>
  audience ? `${audience.gender}:${audience.username}` : "anonymous";

export const saveAudienceProfileStateByIdentity = (
  audienceIdentity,
  profileGender,
  profileState,
) => {
  writeJson(`profileState:${audienceIdentity}:${profileGender}`, profileState);
};

export const getAudienceProfileState = (audience, profileGender) =>
  readJson(getAudienceProfileStateKey(audience, profileGender));

export const saveAudienceProfileState = (
  audience,
  profileGender,
  profileState,
) => {
  writeJson(getAudienceProfileStateKey(audience, profileGender), profileState);
};
