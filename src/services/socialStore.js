const SOCIAL_STATE_KEY = "invidigram:social-state:v1";

const profileUsernames = {
  female: "we_r_0",
  male: "jin.d0uble0",
};

const createInitialState = () => ({
  follows: {},
  loginFollowers: {},
  postLikes: {},
});

const readJson = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
};

const getStorage = () => globalThis.localStorage;

const normalizeState = (state) => ({
  ...createInitialState(),
  ...(state && typeof state === "object" ? state : {}),
});

const readState = (storage = getStorage()) =>
  normalizeState(readJson(storage, SOCIAL_STATE_KEY));

const writeState = (state, storage = getStorage()) => {
  storage.setItem(SOCIAL_STATE_KEY, JSON.stringify(normalizeState(state)));
};

const updateState = (updater, storage = getStorage()) => {
  const state = readState(storage);
  const nextState = normalizeState(updater(state));
  writeState(nextState, storage);
  return nextState;
};

export const getPersonaUsername = (gender) => profileUsernames[gender] ?? null;

export const getAudienceIdentity = (audience) =>
  audience?.username && audience?.gender
    ? `${audience.gender}:${audience.username}`
    : null;

export const getPostLikeKey = (profileUsername, postId) =>
  `${profileUsername}:${postId}`;

export const addLoginFollower = (audience, storage = getStorage()) => {
  const audienceIdentity = getAudienceIdentity(audience);
  const profileUsername = getPersonaUsername(audience?.gender);

  if (!audienceIdentity || !profileUsername) {
    return readState(storage);
  }

  return updateState((state) => ({
    ...state,
    loginFollowers: {
      ...state.loginFollowers,
      [profileUsername]: {
        ...(state.loginFollowers[profileUsername] ?? {}),
        [audienceIdentity]: true,
      },
    },
  }), storage);
};

export const togglePostLike = (
  audience,
  profileUsername,
  postId,
  storage = getStorage(),
) => {
  const audienceIdentity = getAudienceIdentity(audience);
  const postLikeKey = getPostLikeKey(profileUsername, postId);

  if (!audienceIdentity || !profileUsername || postId === undefined) {
    return readState(storage);
  }

  return updateState((state) => {
    const nextPostLikes = { ...(state.postLikes[postLikeKey] ?? {}) };

    if (nextPostLikes[audienceIdentity]) {
      delete nextPostLikes[audienceIdentity];
    } else {
      nextPostLikes[audienceIdentity] = true;
    }

    return {
      ...state,
      postLikes: {
        ...state.postLikes,
        [postLikeKey]: nextPostLikes,
      },
    };
  }, storage);
};

export const toggleFollow = (
  audience,
  targetProfileUsername,
  storage = getStorage(),
) => {
  const audienceIdentity = getAudienceIdentity(audience);

  if (!audienceIdentity || !targetProfileUsername) {
    return readState(storage);
  }

  return updateState((state) => {
    const nextFollowers = { ...(state.follows[targetProfileUsername] ?? {}) };

    if (nextFollowers[audienceIdentity]) {
      delete nextFollowers[audienceIdentity];
    } else {
      nextFollowers[audienceIdentity] = true;
    }

    return {
      ...state,
      follows: {
        ...state.follows,
        [targetProfileUsername]: nextFollowers,
      },
    };
  }, storage);
};

export const hasLikedPost = (state, audience, profileUsername, postId) => {
  const audienceIdentity = getAudienceIdentity(audience);
  const postLikeKey = getPostLikeKey(profileUsername, postId);

  return Boolean(
    audienceIdentity && state.postLikes[postLikeKey]?.[audienceIdentity],
  );
};

export const getPostLikeDelta = (state, profileUsername, postId) =>
  Object.keys(state.postLikes[getPostLikeKey(profileUsername, postId)] ?? {})
    .length;

export const isFollowingProfile = (state, audience, targetProfileUsername) => {
  const audienceIdentity = getAudienceIdentity(audience);

  return Boolean(
    audienceIdentity && state.follows[targetProfileUsername]?.[audienceIdentity],
  );
};

export const getFollowerDelta = (state, profileUsername) => {
  const loginFollowerCount = Object.keys(
    state.loginFollowers[profileUsername] ?? {},
  ).length;
  const followCount = Object.keys(state.follows[profileUsername] ?? {}).length;

  return loginFollowerCount + followCount;
};

export const getFollowingDelta = (state, audience) => {
  const audienceIdentity = getAudienceIdentity(audience);

  if (!audienceIdentity) return 0;

  return Object.values(state.follows).filter(
    (followers) => followers?.[audienceIdentity],
  ).length;
};

export const socialStore = {
  addLoginFollower,
  getFollowerDelta,
  getFollowingDelta,
  getPostLikeDelta,
  hasLikedPost,
  isFollowingProfile,
  read: readState,
  toggleFollow,
  togglePostLike,
};
