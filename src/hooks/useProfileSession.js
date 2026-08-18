import { useEffect, useRef, useState } from "react";
import { bridgeClient } from "../services/bridgeClient.js";
import { extensionClient } from "../services/extensionClient.js";
import { sessionStore } from "../services/sessionStore.js";

const kioskInstanceId = "invidigram-windows-dev";

const toCredentials = (session) => ({
  sessionId: session.sessionId,
  sessionToken: session.sessionToken,
});

export const useProfileSession = () => {
  const [session, setSession] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Bridge 연결 확인 중");
  const [isBusy, setIsBusy] = useState(true);
  const pollTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      try {
        const [extensionHealth, bridgeHealth] = await Promise.all([
          extensionClient.checkBridgeHealth(),
          bridgeClient.getHealth(),
        ]);

        if (
          extensionHealth.contractVersion !== bridgeHealth.contractVersion ||
          bridgeHealth.resources?.modelsReady !== true
        ) {
          throw new Error(
            "Extension/Bridge 버전 또는 모델 상태가 올바르지 않습니다",
          );
        }

        const stored = sessionStore.load();
        let current;

        if (stored) {
          try {
            current = { ...(await bridgeClient.getSession(stored)), ...stored };
          } catch {
            sessionStore.clear();
          }
        }

        if (!current) {
          current = await bridgeClient.createSession(
            kioskInstanceId,
            crypto.randomUUID(),
          );
          sessionStore.save(current);
        }

        if (!cancelled) {
          setSession(current);
          setStatusMessage(
            current.capture.state === "COMPLETE"
              ? "프로필 촬영 완료"
              : "프로필 촬영을 진행해주세요",
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(`연결 오류: ${error.code ?? error.message}`);
        }
      } finally {
        if (!cancelled) setIsBusy(false);
      }
    };

    void connect();
    return () => {
      cancelled = true;
      clearTimeout(pollTimer.current);
    };
  }, []);

  const refreshSession = async () => {
    const credentials = toCredentials(session);
    const next = {
      ...(await bridgeClient.getSession(credentials)),
      ...credentials,
    };
    setSession(next);
    return next;
  };

  const pollCapture = async () => {
    try {
      const status = await bridgeClient.getCaptureStatus(
        toCredentials(session),
      );

      if (status.state === "COMPLETE") {
        await refreshSession();
        setStatusMessage("프로필 촬영 완료");
        setIsBusy(false);
        return;
      }

      if (status.state === "FAILED") {
        setStatusMessage("촬영에 실패했습니다. 다시 시도해주세요");
        setIsBusy(false);
        return;
      }

      setStatusMessage(`촬영 진행 중 ${status.completedSlots.length}/3`);
      pollTimer.current = setTimeout(pollCapture, 500);
    } catch (error) {
      setStatusMessage(`촬영 상태 오류: ${error.code ?? error.message}`);
      setIsBusy(false);
    }
  };

  const startCapture = async () => {
    if (!session || isBusy) return;
    setIsBusy(true);
    setStatusMessage("카메라를 준비하는 중");

    try {
      const credentials = toCredentials(session);
      const next =
        session.capture.state === "COMPLETE"
          ? await bridgeClient.retryCapture(credentials)
          : await bridgeClient.startCapture(credentials);
      setSession({ ...next, ...credentials });
      setStatusMessage("정면부터 순서대로 촬영해주세요");
      pollTimer.current = setTimeout(pollCapture, 500);
    } catch (error) {
      setStatusMessage(`촬영 시작 오류: ${error.code ?? error.message}`);
      setIsBusy(false);
    }
  };

  const finalize = async (profile) => {
    if (!session || isBusy) return null;
    setIsBusy(true);
    setStatusMessage("프로필을 저장하는 중");

    try {
      const credentials = toCredentials(session);
      await bridgeClient.updateProfile(credentials, profile);
      const finalized = await bridgeClient.finalizeSession(credentials);
      setSession({ ...finalized, ...credentials });
      setStatusMessage("프로필 저장 완료");
      return finalized;
    } catch (error) {
      setStatusMessage(`저장 오류: ${error.code ?? error.message}`);
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  return {
    canStartCapture:
      [
        "CREATED",
        "MODEL_READY",
        "PROFILE_READY",
        "CAPTURE_FAILED",
        "MODEL_FAILED",
      ].includes(session?.state) && !isBusy,
    finalize,
    isBusy,
    isCaptureComplete: session?.capture.state === "COMPLETE",
    session,
    startCapture,
    statusMessage,
  };
};
