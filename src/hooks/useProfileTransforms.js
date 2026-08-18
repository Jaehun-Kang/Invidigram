import { useEffect, useState } from "react";
import { bridgeClient } from "../services/bridgeClient.js";
import { sessionStore } from "../services/sessionStore.js";

export const useProfileTransforms = (profileGender) => {
  const [resultUrl, setResultUrl] = useState(null);

  useEffect(() => {
    const session = sessionStore.load();
    if (!session) return undefined;

    let cancelled = false;
    let pollTimer;
    let objectUrl;
    const assetId = `lora-${profileGender}`;

    const poll = async () => {
      try {
        const jobs = await bridgeClient.getTransforms(session);
        const job = jobs.find((candidate) => candidate.assetId === assetId);
        if (job?.status === "READY" && job.resultUrl) {
          const blob = await bridgeClient.getTransformResultBlob(
            session,
            job.resultUrl,
          );
          if (!cancelled) {
            objectUrl = URL.createObjectURL(blob);
            setResultUrl(objectUrl);
          }
          return;
        }
        if (job?.status === "FAILED") return;
        if (!job) {
          await bridgeClient.scheduleTransforms(session);
        }
        pollTimer = setTimeout(poll, 300);
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
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profileGender]);

  return resultUrl;
};
