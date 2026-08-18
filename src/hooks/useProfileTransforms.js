import { useEffect, useState } from "react";
import { bridgeClient } from "../services/bridgeClient.js";
import { sessionStore } from "../services/sessionStore.js";

export const useProfileTransforms = (profileGender) => {
  const [state, setState] = useState({ jobs: [], urls: {} });

  useEffect(() => {
    const session = sessionStore.load();
    if (!session) return undefined;

    let cancelled = false;
    let pollTimer;
    const objectUrls = new Set();
    const loaded = new Map();

    const poll = async () => {
      try {
        const jobs = await bridgeClient.getTransforms(session);
        for (const job of jobs) {
          const key = `${job.assetId}:${job.pipelineVersion}`;
          if (job.status !== "READY" || loaded.has(key)) continue;
          let blob;
          if (job.animationUrl) {
            try {
              blob = await bridgeClient.getTransformAnimationBlob(
                session,
                job.animationUrl,
              );
            } catch {
              blob = null;
            }
          }
          blob ??= await bridgeClient.getTransformResultBlob(
            session,
            job.resultUrl,
          );
          const objectUrl = URL.createObjectURL(blob);
          objectUrls.add(objectUrl);
          loaded.set(key, objectUrl);
        }
        if (!cancelled) {
          const urls = {};
          for (const job of jobs) {
            const url = loaded.get(`${job.assetId}:${job.pipelineVersion}`);
            if (url) urls[job.assetId] = url;
          }
          setState({ jobs, urls });
        }
        if (!jobs.length) {
          await bridgeClient.scheduleTransforms(session);
        }
        if (jobs.some((job) => ["PENDING", "RUNNING"].includes(job.status))) {
          pollTimer = setTimeout(poll, 300);
        }
      } catch {
        pollTimer = setTimeout(poll, 1000);
      }
    };

    bridgeClient
      .scheduleTransforms(session)
      .then(poll)
      .catch(() => {
        pollTimer = setTimeout(poll, 1000);
      });

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      for (const objectUrl of objectUrls) URL.revokeObjectURL(objectUrl);
    };
  }, [profileGender]);

  return state;
};
