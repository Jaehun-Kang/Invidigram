"use strict";

const BRIDGE_ORIGIN = "http://127.0.0.1:3000";
const FRAME_POLL_INTERVAL_MS = 120;
const SLOT_POLL_INTERVAL_MS = 500;
const PREVIEW_FRAME_PATH = "/preview-frame";
const REQUIRED_SLOTS = ["front", "left", "right"];
const GUIDE_LABELS = {
  front: "정면을 보세요",
  left: "좌측을 보세요",
  right: "우측을 보세요",
};

const elements = {
  profileScreen: document.getElementById("profileScreen"),
  feedScreen: document.getElementById("feedScreen"),
  bridgeStatus: document.getElementById("bridgeStatus"),
  setProfilePhotoButton: document.getElementById("setProfilePhotoButton"),
  statusText: document.getElementById("statusText"),
  cameraSheet: document.getElementById("cameraSheet"),
  bridgeFrame: document.getElementById("bridgeFrame"),
  cameraPlaceholder: document.getElementById("cameraPlaceholder"),
  guideText: document.getElementById("guideText"),
  avatarPreview: document.getElementById("avatarPreview"),
};

const state = {
  framePolling: false,
  slotPolling: false,
  frameTimer: null,
  slotTimer: null,
  frameRequestInFlight: false,
  slotRequestInFlight: false,
  captureStartedAt: 0,
  latestFrameDataUrl: null,
  completedSlots: new Set(),
};

elements.setProfilePhotoButton.addEventListener("click", () => {
  void startGuidedProfileCapture();
});

void refreshBridgeHealth();
window.setInterval(() => void refreshBridgeHealth(false), 3000);

async function refreshBridgeHealth(showStatus = true) {
  try {
    const health = await fetchBridgeJson("/health");
    if (!health?.ok) {
      throw new Error("브릿지 응답이 올바르지 않습니다.");
    }

    setBridgeStatus("브릿지 연결됨", true);
    if (showStatus && !state.slotPolling) {
      setStatus("프로필 사진 설정을 누르면 브릿지에서 정면, 좌측, 우측 캡처를 시작합니다.");
    }
  } catch (error) {
    setBridgeStatus("브릿지 꺼짐", false);
    if (showStatus) {
      setStatus(`브릿지를 먼저 실행하세요. ${formatError(error)}`, true);
    }
  }
}

async function startGuidedProfileCapture() {
  resetCaptureState();
  elements.setProfilePhotoButton.disabled = true;
  elements.cameraSheet.hidden = false;
  elements.guideText.textContent = GUIDE_LABELS.front;
  setStatus("브릿지 캡처를 시작하는 중입니다.");

  try {
    const started = await fetchBridgeJson("/guided-capture/start", {
      method: "POST",
    });
    state.captureStartedAt =
      typeof started?.startedAt === "number" ? started.startedAt : Date.now();
    state.framePolling = true;
    state.slotPolling = true;
    setStatus("브릿지에서 정면, 좌측, 우측을 순서대로 촬영합니다.");
    void pollBridgeFrame();
    void pollGuidedSlots();
  } catch (error) {
    elements.setProfilePhotoButton.disabled = false;
    setStatus(`브릿지 캡처 시작 실패: ${formatError(error)}`, true);
  }
}

function resetCaptureState() {
  window.clearTimeout(state.frameTimer);
  window.clearTimeout(state.slotTimer);
  state.framePolling = false;
  state.slotPolling = false;
  state.frameRequestInFlight = false;
  state.slotRequestInFlight = false;
  state.captureStartedAt = 0;
  state.latestFrameDataUrl = null;
  state.completedSlots.clear();
  elements.cameraPlaceholder.hidden = false;
}

async function pollBridgeFrame() {
  if (!state.framePolling || state.frameRequestInFlight) {
    scheduleFramePoll();
    return;
  }

  state.frameRequestInFlight = true;
  try {
    const frame = await fetchBridgeJson(PREVIEW_FRAME_PATH);
    const dataUrl = typeof frame?.dataUrl === "string" ? frame.dataUrl : "";
    if (!dataUrl.startsWith("data:image/")) {
      throw new Error("브릿지에 최신 카메라 프레임이 없습니다.");
    }

    state.latestFrameDataUrl = dataUrl;
    elements.bridgeFrame.src = dataUrl;
    renderAvatarPreview(dataUrl);
    elements.cameraPlaceholder.hidden = true;
  } catch {
    elements.cameraPlaceholder.hidden = false;
  } finally {
    state.frameRequestInFlight = false;
    scheduleFramePoll();
  }
}

function scheduleFramePoll() {
  if (!state.framePolling) {
    return;
  }

  window.clearTimeout(state.frameTimer);
  state.frameTimer = window.setTimeout(() => {
    void pollBridgeFrame();
  }, FRAME_POLL_INTERVAL_MS);
}

async function pollGuidedSlots() {
  if (!state.slotPolling || state.slotRequestInFlight) {
    scheduleSlotPoll();
    return;
  }

  state.slotRequestInFlight = true;
  try {
    const [payload, guidedStatus] = await Promise.all([
      fetchBridgeJson("/face-slots"),
      fetchBridgeJson("/guided-capture/status").catch(() => null),
    ]);
    updateCompletedSlots(payload?.slots || {});
    updateGuideText(guidedStatus);

    if (isGuidedCaptureComplete()) {
      await ensureCompletedModelReady();
      finishGuidedCapture();
      return;
    }
  } catch (error) {
    setStatus(`캡처 진행 상태를 확인하지 못했습니다: ${formatError(error)}`, true);
  } finally {
    state.slotRequestInFlight = false;
    scheduleSlotPoll();
  }
}

function updateCompletedSlots(slots) {
  for (const slotId of REQUIRED_SLOTS) {
    const slot = slots?.[slotId];
    const updatedAt = typeof slot?.updatedAt === "number" ? slot.updatedAt : 0;
    if (
      updatedAt >= state.captureStartedAt &&
      typeof slot?.dataUrl === "string" &&
      slot.dataUrl.startsWith("data:image/") &&
      slot?.analysis
    ) {
      state.completedSlots.add(slotId);
    }
  }
}

function updateGuideText(guidedStatus = null) {
  const nextSlot = REQUIRED_SLOTS.find((slotId) => !state.completedSlots.has(slotId));
  if (!nextSlot) {
    elements.guideText.textContent = "모델 생성 중입니다";
  } else if (guidedStatus?.isPersistingSlot) {
    elements.guideText.textContent = "저장 중입니다";
  } else if (guidedStatus?.holding) {
    elements.guideText.textContent = `${GUIDE_LABELS[nextSlot]}\n유지해주세요`;
  } else {
    elements.guideText.textContent = GUIDE_LABELS[nextSlot];
  }
  setStatus(`브릿지 캡처 진행 중 ${state.completedSlots.size}/${REQUIRED_SLOTS.length}`);
}

function isGuidedCaptureComplete() {
  return REQUIRED_SLOTS.every((slotId) => state.completedSlots.has(slotId));
}

async function ensureCompletedModelReady() {
  const completedModel = await fetchBridgeJson("/completed-face-model");
  if (!isCompletedFaceModelPayload(completedModel?.model)) {
    throw new Error("completed face model 생성 결과가 비어 있습니다.");
  }
}

function scheduleSlotPoll() {
  if (!state.slotPolling) {
    return;
  }

  window.clearTimeout(state.slotTimer);
  state.slotTimer = window.setTimeout(() => {
    void pollGuidedSlots();
  }, SLOT_POLL_INTERVAL_MS);
}

function finishGuidedCapture() {
  state.framePolling = false;
  state.slotPolling = false;
  window.clearTimeout(state.frameTimer);
  window.clearTimeout(state.slotTimer);
  elements.profileScreen.hidden = true;
  elements.feedScreen.hidden = false;
  requestObamifyResultRescan();
}

function requestObamifyResultRescan() {
  const delays = [120, 700, 1600];
  for (const delay of delays) {
    window.setTimeout(() => {
      if (typeof window.__obamifyForceRescan === "function") {
        window.__obamifyForceRescan();
      }
    }, delay);
  }
}

function renderAvatarPreview(dataUrl) {
  elements.avatarPreview.innerHTML = "";
  const image = document.createElement("img");
  image.alt = "프로필 사진 미리보기";
  image.src = dataUrl;
  image.dataset.obamifySkip = "1";
  elements.avatarPreview.append(image);
}

async function fetchBridgeJson(path, options = {}) {
  const response = await fetch(`${BRIDGE_ORIGIN}${path}`, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }
  return payload;
}

function isCompletedFaceModelPayload(model) {
  return (
    model &&
    typeof model.textureDataUrl === "string" &&
    model.textureDataUrl.startsWith("data:image/") &&
    Array.isArray(model.textureLandmarks) &&
    model.textureLandmarks.length > 0 &&
    Array.isArray(model.modelLandmarks) &&
    model.modelLandmarks.length > 0
  );
}

function setBridgeStatus(message, isOk) {
  elements.bridgeStatus.textContent = message;
  elements.bridgeStatus.classList.toggle("ok", isOk);
  elements.bridgeStatus.classList.toggle("error", !isOk);
}

function setStatus(message, isError = false) {
  elements.statusText.textContent = message;
  elements.statusText.classList.toggle("error", isError);
}

function formatError(error) {
  return error?.message || String(error);
}
