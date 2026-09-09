export const getTransformCacheKey = (credentials, job) =>
  `${credentials.sessionId}:${job.assetId}:${job.modelRevision}:${job.pipelineVersion}`;

export const createTransformResultCache = (fetchBlob, createUrl) => {
  const urls = new Map();
  const requests = new Map();
  return {
    urls,
    load(credentials, job) {
      const key = getTransformCacheKey(credentials, job);
      if (urls.has(key)) return Promise.resolve();
      if (!requests.has(key)) {
        const request = Promise.resolve()
          .then(() => fetchBlob(credentials, job.resultUrl))
          .then((blob) => urls.set(key, createUrl(blob)))
          .finally(() => requests.delete(key));
        requests.set(key, request);
      }
      return requests.get(key);
    },
  };
};

export const loadReadyTransformResults = async ({ jobs, credentials, priorityAssetIds, cache, cancelled, publish, onError }) => {
  const ready = jobs.filter((job) => job.status === "READY" && job.resultUrl &&
    !cache.urls.has(getTransformCacheKey(credentials, job)));
  const ranks = new Map(priorityAssetIds.map((id, index) => [id, index]));
  ready.sort((a, b) => (ranks.get(a.assetId) ?? Infinity) - (ranks.get(b.assetId) ?? Infinity));
  await Promise.all(Array.from({ length: Math.min(3, ready.length) }, async () => {
    while (ready.length && !cancelled()) {
      const job = ready.shift();
      try {
        await cache.load(credentials, job);
        if (!cancelled()) publish(job);
      } catch (error) {
        onError(error);
      }
    }
  }));
};
