import assert from "node:assert/strict";
import { test } from "node:test";
import { createTransformResultCache, getTransformCacheKey, loadReadyTransformResults } from "../src/services/transformResultCache.js";

const credentials = { sessionId: "one" };
const job = (assetId) => ({ assetId, status: "READY", resultUrl: assetId, modelRevision: 1, pipelineVersion: 31 });

test("downloads are shared across consumers and isolated by model/session/pipeline", async () => {
  let count = 0;
  const cache = createTransformResultCache(async () => ++count, (value) => `blob:${value}`);
  const first = job("a");
  await Promise.all([cache.load(credentials, first), cache.load(credentials, first)]);
  await cache.load(credentials, first);
  assert.equal(count, 1);
  assert.equal(cache.urls.get(getTransformCacheKey(credentials, first)), "blob:1");
  await cache.load(credentials, { ...first, modelRevision: 2 });
  await cache.load(credentials, { ...first, pipelineVersion: 32 });
  await cache.load({ sessionId: "two" }, first);
  assert.equal(count, 4);
});

test("a fast visible result is published while an earlier download remains pending", async () => {
  const resolvers = new Map();
  const started = [];
  const cache = createTransformResultCache((_, url) => {
    started.push(url);
    return new Promise((resolve) => resolvers.set(url, resolve));
  }, (value) => value);
  const snapshots = [];
  const pending = loadReadyTransformResults({
    jobs: [job("slow"), job("fast"), job("third"), job("fourth")], credentials,
    priorityAssetIds: ["fast"], cache, cancelled: () => false,
    publish: () => snapshots.push([...cache.urls.values()]), onError: (error) => { throw error; },
  });
  await new Promise(setImmediate);
  assert.deepEqual(started, ["fast", "slow", "third"]);
  resolvers.get("fast")("fast");
  await new Promise(setImmediate);
  assert.deepEqual(snapshots, [["fast"]]);
  assert.equal(started.at(-1), "fourth");
  for (const id of ["slow", "third", "fourth"]) resolvers.get(id)(id);
  await pending;
  assert.equal(snapshots.length, 4);
});

test("failed downloads can retry; cancelled consumers do not publish", async () => {
  let attempts = 0;
  const cache = createTransformResultCache(async () => {
    if (++attempts === 1) throw new Error("temporary");
    return "result";
  }, (value) => value);
  await assert.rejects(cache.load(credentials, job("a")));
  await cache.load(credentials, job("a"));
  let published = false;
  await loadReadyTransformResults({ jobs: [job("b")], credentials, priorityAssetIds: [], cache,
    cancelled: () => true, publish: () => { published = true; }, onError: assert.fail });
  assert.equal(published, false);
  assert.equal(attempts, 2);
});
