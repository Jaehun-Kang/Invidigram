import { test } from "node:test";
import assert from "node:assert/strict";
import { createTransitionQueue } from "../src/services/transitionQueue.js";

test("visible B starts before offscreen A; A starts only after entering", async () => {
  const enqueue = createTransitionQueue(2);
  const controller = new AbortController();
  let aVisible = false;
  const order = [];
  const a = enqueue(() => order.push("A"), {
    ready: () => aVisible, signal: controller.signal,
  });
  try {
    await enqueue(() => order.push("B"));
    assert.deepEqual(order, ["B"]);
    aVisible = true;
    await a;
    assert.deepEqual(order, ["B", "A"]);
  } finally {
    controller.abort();
    await a;
  }
});

test("runs at most two transitions and releases capacity after completion", async () => {
  const enqueue = createTransitionQueue(2);
  const releases = [];
  let running = 0;
  let peak = 0;
  const jobs = Array.from({ length: 4 }, () => enqueue(async () => {
    peak = Math.max(peak, ++running);
    await new Promise((resolve) => releases.push(resolve));
    running--;
  }));
  await new Promise(setImmediate);
  assert.equal(releases.length, 2);
  releases.shift()();
  await new Promise(setImmediate);
  assert.equal(releases.length, 2);
  releases.shift()();
  await new Promise(setImmediate);
  for (const release of releases) release();
  await Promise.all(jobs);
  assert.equal(peak, 2);
});

test("does not run an ineligible or cancelled transition", async () => {
  const enqueue = createTransitionQueue(2);
  const controller = new AbortController();
  let started = false;
  const waiting = enqueue(() => { started = true; }, { ready: () => false, signal: controller.signal });
  controller.abort();
  await waiting;
  assert.equal(started, false);
});
