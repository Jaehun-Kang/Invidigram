import { useEffect, useState } from "react";
import { bridgeClient } from "../services/bridgeClient.js";
import { sessionStore } from "../services/sessionStore.js";

const transformReadyStates = new Set(["FINALIZED", "ACTIVE_PROFILE"]);

const formatSessionForLog = (session) => ({
  sessionId: session?.sessionId,
  state: session?.state,
  profileGender: session?.profile?.gender ?? null,
  modelRevision: session?.modelRevision,
});

const logTransformInfo = (message, detail = {}) => {
  console.info(`[BI] ${message}`, detail);
};

const logTransformError = (message, error) => {
  console.warn(`[BI] ${message}`, {
    code: error?.code,
    message: error?.message,
    status: error?.status,
    retryable: error?.retryable,
    requestId: error?.requestId,
  });
};

export const useProfileTransforms = (profileGender) => {
  const [state, setState] = useState({
    canApply: false,
    jobs: [],
    urls: {},
  });

  useEffect(() => {
    const credentials = sessionStore.load();
    if (!credentials) {
      logTransformInfo("Profile transform skipped", {
        reason: "NO_SESSION",
        routeProfileGender: profileGender,
      });
      setState({ canApply: false, jobs: [], urls: {} });
      return undefined;
    }

    let cancelled = false;
    let pollTimer;
    const objectUrls = new Set();
    const loaded = new Map();

    const poll = async () => {
      try {
        const jobs = await bridgeClient.getTransforms(credentials);
        const snapshot = jobs
          .map(
            (job) =>
              `${job.assetId}:${job.status}:model-${job.modelRevision}:pipeline-${job.pipelineVersion}`,
          )
          .join("|");
        if (snapshot && poll.lastSnapshot !== snapshot) {
          poll.lastSnapshot = snapshot;
          logTransformInfo("Profile transform status", {
            routeProfileGender: profileGender,
            jobs: jobs.map((job) => ({
              assetId: job.assetId,
              role: job.role,
              status: job.status,
              modelRevision: job.modelRevision,
              pipelineVersion: job.pipelineVersion,
              errorCode: job.errorCode,
            })),
          });
        }
        for (const job of jobs) {
          const key = `${job.assetId}:${job.pipelineVersion}`;
          if (job.status !== "READY" || loaded.has(key)) continue;
          const blob = await bridgeClient.getTransformResultBlob(
            credentials,
            job.resultUrl,
          );
          const objectUrl = URL.createObjectURL(blob);
          objectUrls.add(objectUrl);
          loaded.set(key, objectUrl);
          logTransformInfo("Profile transform result loaded", {
            assetId: job.assetId,
            role: job.role,
            pipelineVersion: job.pipelineVersion,
          });
        }
        if (!cancelled) {
          const urls = {};
          for (const job of jobs) {
            const url = loaded.get(`${job.assetId}:${job.pipelineVersion}`);
            if (url) urls[job.assetId] = url;
          }
          setState({ canApply: true, jobs, urls });
        }
        if (!jobs.length) {
          logTransformInfo("Profile transform schedule requested", {
            reason: "NO_JOBS",
            routeProfileGender: profileGender,
          });
          await bridgeClient.scheduleTransforms(credentials);
        }
        if (jobs.some((job) => ["PENDING", "RUNNING"].includes(job.status))) {
          pollTimer = setTimeout(poll, 300);
        }
      } catch (error) {
        logTransformError("Profile transform polling failed", error);
        pollTimer = setTimeout(poll, 1000);
      }
    };

    const schedule = async () => {
      const bridgeSession = await bridgeClient.getSession(credentials);
      if (cancelled) return;
      logTransformInfo("Profile transform session checked", {
        routeProfileGender: profileGender,
        session: formatSessionForLog(bridgeSession),
      });

      const bridgeProfileGender = bridgeSession.profile?.gender ?? null;
      if (bridgeProfileGender !== profileGender) {
        logTransformInfo("Profile transform skipped", {
          reason: "PROFILE_GENDER_MISMATCH",
          routeProfileGender: profileGender,
          bridgeProfileGender,
          session: formatSessionForLog(bridgeSession),
        });
        setState({ canApply: false, jobs: [], urls: {} });
        return;
      }

      if (!transformReadyStates.has(bridgeSession.state)) {
        logTransformInfo("Profile transform skipped", {
          reason: "SESSION_NOT_FINALIZED",
          routeProfileGender: profileGender,
          session: formatSessionForLog(bridgeSession),
        });
        setState({ canApply: false, jobs: [], urls: {} });
        return;
      }

      const jobs = await bridgeClient.scheduleTransforms(credentials);
      logTransformInfo("Profile transform scheduled", {
        routeProfileGender: profileGender,
        jobCount: jobs.length,
        jobs: jobs.map((job) => ({
          assetId: job.assetId,
          role: job.role,
          status: job.status,
        })),
      });
      await poll();
    };

    schedule().catch((error) => {
      logTransformError("Profile transform scheduling failed", error);
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
