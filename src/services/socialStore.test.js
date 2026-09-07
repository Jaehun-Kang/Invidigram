import assert from "node:assert/strict";
import test from "node:test";
import {
  addLoginFollower,
  getFollowerDelta,
  getFollowingDelta,
  getPostLikeDelta,
  hasLikedPost,
  isFollowingProfile,
  toggleFollow,
  togglePostLike,
} from "./socialStore.js";

const createStorage = () => {
  const data = new Map();

  return {
    getItem: (key) => data.get(key) ?? null,
    removeItem: (key) => data.delete(key),
    setItem: (key, value) => data.set(key, String(value)),
  };
};

test("persists post likes as an audience-specific aggregate", () => {
  const storage = createStorage();
  const firstAudience = { gender: "male", username: "first.user" };
  const secondAudience = { gender: "female", username: "second.user" };

  let state = togglePostLike(firstAudience, "jin.d0uble0", 1, storage);
  assert.equal(getPostLikeDelta(state, "jin.d0uble0", 1), 1);
  assert.equal(hasLikedPost(state, firstAudience, "jin.d0uble0", 1), true);

  state = togglePostLike(secondAudience, "jin.d0uble0", 1, storage);
  assert.equal(getPostLikeDelta(state, "jin.d0uble0", 1), 2);

  state = togglePostLike(firstAudience, "jin.d0uble0", 1, storage);
  assert.equal(getPostLikeDelta(state, "jin.d0uble0", 1), 1);
  assert.equal(hasLikedPost(state, firstAudience, "jin.d0uble0", 1), false);
});

test("counts one login follower per audience for the matching persona", () => {
  const storage = createStorage();
  const audience = { gender: "male", username: "first.user" };

  addLoginFollower(audience, storage);
  const state = addLoginFollower(audience, storage);

  assert.equal(getFollowerDelta(state, "jin.d0uble0"), 1);
  assert.equal(getFollowerDelta(state, "we_r_0"), 0);
});

test("toggles recommended follows into follower and following aggregates", () => {
  const storage = createStorage();
  const audience = { gender: "male", username: "first.user" };

  let state = toggleFollow(audience, "we_r_0", storage);
  assert.equal(isFollowingProfile(state, audience, "we_r_0"), true);
  assert.equal(getFollowerDelta(state, "we_r_0"), 1);
  assert.equal(getFollowingDelta(state, audience), 1);

  state = toggleFollow(audience, "we_r_0", storage);
  assert.equal(isFollowingProfile(state, audience, "we_r_0"), false);
  assert.equal(getFollowerDelta(state, "we_r_0"), 0);
  assert.equal(getFollowingDelta(state, audience), 0);
});
