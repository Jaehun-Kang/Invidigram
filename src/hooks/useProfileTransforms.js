import { useEffect, useState } from "react";
import { bridgeClient } from "../services/bridgeClient.js";
import { sessionStore } from "../services/sessionStore.js";

const transformReadyStates = new Set(["FINALIZED", "ACTIVE_PROFILE"]);
const transformBlobUrlCache = new Map();
const transformStateCache = new Map();
const terminalAuthErrorCodes = new Set(["AUTH_INVALID", "SESSION_EXPIRED"]);

const getTransformCacheKey = (credentials, job) =>
  `${credentials.sessionId}:${job.assetId}:${job.pipelineVersion}`;

const getTransformStateCacheKey = (credentials, profileGender) =>
  `${credentials.sessionId}:${profileGender}`;

const buildUrlState = (credentials, jobs) => {
  const urls = {};

  for (const job of jobs) {
    const url = transformBlobUrlCache.get(getTransformCacheKey(credentials, job));
    if (url) urls[job.assetId] = url;
  }

  return urls;
};

const hasPendingTransformWork = (jobs) =>
  jobs.some((job) => ["PENDING", "RUNNING"].includes(job.status));

const hasReadyResultWithoutBlob = (credentials, jobs) =>
  jobs.some(
    (job) =>
      job.status === "READY" &&
      job.resultUrl &&
      !transformBlobUrlCache.has(getTransformCacheKey(credentials, job)),
  );

const emptyTransformState = { canApply: false, jobs: [], urls: {} };

const getInitialTransformState = (profileGender) => {
  const credentials = sessionStore.load();

  if (!credentials) return emptyTransformState;

  return (
    transformStateCache.get(getTransformStateCacheKey(credentials, profileGender)) ??
    emptyTransformState
  );
};

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

const isTerminalAuthError = (error) => terminalAuthErrorCodes.has(error?.code);

export const useProfileTransforms = (profileGender, priorityAssetIds = []) => {
  const [state, setState] = useState(() =>
    getInitialTransformState(profileGender),
  );
  const priorityKey = priorityAssetIds.join("|");

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
          const key = getTransformCacheKey(credentials, job);
          if (job.status !== "READY" || transformBlobUrlCache.has(key)) continue;
          const blob = await bridgeClient.getTransformResultBlob(
            credentials,
            job.resultUrl,
          );
          const objectUrl = URL.createObjectURL(blob);
          transformBlobUrlCache.set(key, objectUrl);
          logTransformInfo("Profile transform result loaded", {
            assetId: job.assetId,
            role: job.role,
            pipelineVersion: job.pipelineVersion,
          });
        }
        const urls = buildUrlState(credentials, jobs);
        if (!cancelled) {
          const nextState = {
            canApply: true,
            jobs,
            urls,
          };
          transformStateCache.set(
            getTransformStateCacheKey(credentials, profileGender),
            nextState,
          );
          setState(nextState);
        }
        const scheduledFromEmptyList = !jobs.length;
        if (scheduledFromEmptyList) {
          logTransformInfo("Profile transform schedule requested", {
            reason: "NO_JOBS",
            routeProfileGender: profileGender,
            priorityAssetIds,
          });
          await bridgeClient.scheduleTransforms(credentials, priorityAssetIds);
        }
        if (
          scheduledFromEmptyList ||
          hasPendingTransformWork(jobs) ||
          hasReadyResultWithoutBlob(credentials, jobs)
        ) {
          pollTimer = setTimeout(poll, 300);
        }
      } catch (error) {
        logTransformError("Profile transform polling failed", error);
        if (isTerminalAuthError(error)) {
          sessionStore.clear();
          transformStateCache.delete(
            getTransformStateCacheKey(credentials, profileGender),
          );
          if (!cancelled) {
            setState({ canApply: false, jobs: [], urls: {} });
          }
          return;
        }
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

      const jobs = await bridgeClient.scheduleTransforms(
        credentials,
        priorityAssetIds,
      );
      logTransformInfo("Profile transform scheduled", {
        routeProfileGender: profileGender,
        priorityAssetIds,
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
      if (isTerminalAuthError(error)) {
        sessionStore.clear();
        transformStateCache.delete(
          getTransformStateCacheKey(credentials, profileGender),
        );
        setState({ canApply: false, jobs: [], urls: {} });
        return;
      }
      pollTimer = setTimeout(poll, 1000);
    });

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [profileGender, priorityKey]);

  return state;
};
