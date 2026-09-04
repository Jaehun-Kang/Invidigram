import { useEffect, useRef, useState } from "react";
import iconPostsO from "../assets/icons/posts_outline.svg";
import iconPostsS from "../assets/icons/posts_solid.svg";
import iconPostsTaggedO from "../assets/icons/posts_tagged_outline.svg";
import iconPostsTaggedS from "../assets/icons/posts_tagged_solid.svg";
import iconClose from "../assets/icons/close.svg";
import iconHeartO from "../assets/icons/heart_outline.svg";
import iconHeartS from "../assets/icons/heart_solid.svg";
import PostFrame from "./PostFrame";
import { useProfileTransforms } from "../hooks/useProfileTransforms.js";
import { useNavigate } from "react-router-dom";

const profileAssetUrls = import.meta.glob("../assets/**/*", {
  eager: true,
  import: "default",
  query: "?url",
});
const postFrameCount = 80;
const postOverlayVerticalGap = 48;
const postOverlayHorizontalGap = 40;
const postOverlayCommentWidth = 500;

const resolveAssetUrl = (path) => profileAssetUrls[path] ?? path;

const getInitialStats = (profileData) => ({
  posts: profileData.posts.length,
  followers: profileData.stats?.followers ?? 0,
  following: profileData.stats?.following ?? 0,
});

const getPostDate = (timestamp) => {
  const timestampText = String(timestamp);
  const year = Number(timestampText.slice(0, 4));
  const month = Number(timestampText.slice(4, 6)) - 1;
  const date = Number(timestampText.slice(6, 8));

  return new Date(year, month, date);
};

const formatPostTimestamp = (timestamp) => {
  const postDate = getPostDate(timestamp);
  const year = postDate.getFullYear();
  const month = String(postDate.getMonth() + 1).padStart(2, "0");
  const date = String(postDate.getDate()).padStart(2, "0");

  return `${year}년 ${month}월 ${date}일`;
};

const getRelativePostTimestamp = (timestamp) => {
  const currentDate = new Date();
  const postDate = getPostDate(timestamp);
  const elapsedDays = Math.max(
    0,
    Math.floor((currentDate - postDate) / (1000 * 60 * 60 * 24)),
  );

  if (elapsedDays === 0) {
    return "오늘";
  }

  if (elapsedDays < 7) {
    return `${elapsedDays}일`;
  }

  return `${Math.floor(elapsedDays / 7)}주`;
};

const getPostOverlayImageWidth = (imageRatio) => {
  const maxImageHeight = window.innerHeight - postOverlayVerticalGap;
  const maxImageWidth =
    window.innerWidth - postOverlayHorizontalGap - postOverlayCommentWidth;
  const imageWidth = Math.min(imageRatio, 1) * maxImageHeight;

  return `${Math.max(0, Math.min(imageWidth, maxImageWidth))}px`;
};

const avatarImageStyle = {
  height: "100%",
  objectFit: "cover",
  width: "100%",
};
const profileAvatarStyle = {
  height: "150px",
  objectFit: "cover",
  width: "150px",
};
const profileFaceBoxes = {
  female: {
    x: 0.1705223673582077,
    y: 0.10062859058380126,
    width: 0.6642894339561463,
    height: 0.5984634637832642,
  },
  male: {
    x: 0.16394871473312378,
    y: 0.1559463620185852,
    width: 0.6768743991851807,
    height: 0.6345608770847321,
  },
};
const profileTransitionSidelen = 128;
const faceOutlineIndices = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
  378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
  162, 21, 54, 103, 67, 109,
];
const faceHoleIndices = [
  [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  [
    362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385,
    384, 398,
  ],
  [
    78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317,
    14, 87, 178, 88, 95,
  ],
];

const getProfileAssetId = (profileGender) =>
  profileGender === "female" ? "lora-female" : "lora-male";

const profileAnalysisUrls = {
  female: "/targets/female/lora-female/analysis/face-landmarks.json",
  male: "/targets/male/lora-male/analysis/face-landmarks.json",
};

const useTargetFaceAnalysis = (profileGender) => {
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    const analysisUrl = profileAnalysisUrls[profileGender];
    if (!analysisUrl) {
      setAnalysis(null);
      return undefined;
    }

    let cancelled = false;
    fetch(analysisUrl)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setAnalysis(data);
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("[BI] Profile face analysis load failed", error);
          setAnalysis(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profileGender]);

  return analysis;
};

const loadCanvasImage = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`Profile image load failed: ${source}`));
    image.src = source;
  });

const getPixelBox = (box, width, height) => {
  const x = Math.max(0, Math.floor(box.x * width));
  const y = Math.max(0, Math.floor(box.y * height));
  const right = Math.min(width, Math.ceil((box.x + box.width) * width));
  const bottom = Math.min(height, Math.ceil((box.y + box.height) * height));
  return { x, y, width: right - x, height: bottom - y };
};

const traceLandmarkPath = (
  context,
  indexes,
  landmarks,
  coverMetrics,
  sourceWidth,
  sourceHeight,
) => {
  const points = indexes
    .map((index) => landmarks[index])
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    .map((point) => ({
      x: coverMetrics.x + point.x * coverMetrics.width,
      y: coverMetrics.y + point.y * coverMetrics.height,
    }));

  if (points.length < 3 || !sourceWidth || !sourceHeight) {
    return false;
  }

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) context.lineTo(point.x, point.y);
  context.closePath();
  return true;
};

const drawFallbackFaceMask = (context, viewportX, viewportY, viewportW, viewportH) => {
  context.beginPath();
  context.ellipse(
    viewportX + viewportW / 2,
    viewportY + viewportH / 2,
    viewportW / 2,
    viewportH / 2,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
};

const drawLandmarkFaceMask = ({
  context,
  coverMetrics,
  faceLandmarks,
  sourceWidth,
  sourceHeight,
  viewportH,
  viewportW,
  viewportX,
  viewportY,
}) => {
  if (
    !Array.isArray(faceLandmarks) ||
    !traceLandmarkPath(
      context,
      faceOutlineIndices,
      faceLandmarks,
      coverMetrics,
      sourceWidth,
      sourceHeight,
    )
  ) {
    drawFallbackFaceMask(context, viewportX, viewportY, viewportW, viewportH);
    return;
  }

  context.fill();
  context.globalCompositeOperation = "destination-out";
  for (const hole of faceHoleIndices) {
    if (
      traceLandmarkPath(
        context,
        hole,
        faceLandmarks,
        coverMetrics,
        sourceWidth,
        sourceHeight,
      )
    ) {
      context.fill();
    }
  }
  context.globalCompositeOperation = "source-over";
};

const parseCssPixelValue = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeObjectFit = (value) => {
  const normalized = String(value || "fill")
    .trim()
    .toLowerCase();
  if (
    normalized === "contain" ||
    normalized === "cover" ||
    normalized === "none" ||
    normalized === "scale-down"
  ) {
    return normalized;
  }
  return "fill";
};

const isHorizontalPositionKeyword = (token) =>
  token === "left" || token === "center" || token === "right";

const isVerticalPositionKeyword = (token) =>
  token === "top" || token === "center" || token === "bottom";

const parseObjectPosition = (value) => {
  const tokens = String(value || "50% 50%")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) {
    return { x: "50%", y: "50%" };
  }

  if (tokens.length === 1) {
    return isVerticalPositionKeyword(tokens[0])
      ? { x: "50%", y: tokens[0] }
      : { x: tokens[0], y: "50%" };
  }

  if (
    isVerticalPositionKeyword(tokens[0]) &&
    isHorizontalPositionKeyword(tokens[1])
  ) {
    return { x: tokens[1], y: tokens[0] };
  }

  return { x: tokens[0], y: tokens[1] };
};

const resolveObjectPositionOffset = (token, freeSpace) => {
  const normalized = String(token || "50%")
    .trim()
    .toLowerCase();
  if (normalized === "left" || normalized === "top") return 0;
  if (normalized === "right" || normalized === "bottom") return freeSpace;
  if (normalized === "center") return freeSpace * 0.5;
  if (normalized.endsWith("%")) {
    const percent = Number.parseFloat(normalized);
    return Number.isFinite(percent)
      ? (freeSpace * percent) / 100
      : freeSpace * 0.5;
  }

  const px = Number.parseFloat(normalized);
  return Number.isFinite(px) ? px : freeSpace * 0.5;
};

const resolveConcreteObjectSize = (
  objectFit,
  sourceWidth,
  sourceHeight,
  contentWidth,
  contentHeight,
) => {
  const safeSourceWidth = Math.max(1, sourceWidth || contentWidth);
  const safeSourceHeight = Math.max(1, sourceHeight || contentHeight);
  const sourceAspect = safeSourceWidth / safeSourceHeight;
  const contentAspect = contentWidth / Math.max(1, contentHeight);

  if (objectFit === "none") {
    return { width: safeSourceWidth, height: safeSourceHeight };
  }

  if (objectFit === "contain") {
    if (sourceAspect > contentAspect) {
      return {
        width: contentWidth,
        height: contentWidth / Math.max(sourceAspect, 1e-6),
      };
    }
    return {
      width: contentHeight * sourceAspect,
      height: contentHeight,
    };
  }

  if (objectFit === "cover") {
    if (sourceAspect > contentAspect) {
      return {
        width: contentHeight * sourceAspect,
        height: contentHeight,
      };
    }
    return {
      width: contentWidth,
      height: contentWidth / Math.max(sourceAspect, 1e-6),
    };
  }

  if (objectFit === "scale-down") {
    const containSize = resolveConcreteObjectSize(
      "contain",
      safeSourceWidth,
      safeSourceHeight,
      contentWidth,
      contentHeight,
    );
    if (
      containSize.width < safeSourceWidth ||
      containSize.height < safeSourceHeight
    ) {
      return containSize;
    }
    return { width: safeSourceWidth, height: safeSourceHeight };
  }

  return { width: contentWidth, height: contentHeight };
};

const getDisplayedImageMetrics = (
  imageElement,
  pixelBox,
  sourceWidth,
  sourceHeight,
  fallbackDisplayWidth,
  fallbackDisplayHeight,
) => {
  const rect = imageElement.getBoundingClientRect();
  const computedStyle = getComputedStyle(imageElement);
  const borderLeft = parseCssPixelValue(computedStyle.borderLeftWidth);
  const borderRight = parseCssPixelValue(computedStyle.borderRightWidth);
  const borderTop = parseCssPixelValue(computedStyle.borderTopWidth);
  const borderBottom = parseCssPixelValue(computedStyle.borderBottomWidth);
  const paddingLeft = parseCssPixelValue(computedStyle.paddingLeft);
  const paddingRight = parseCssPixelValue(computedStyle.paddingRight);
  const paddingTop = parseCssPixelValue(computedStyle.paddingTop);
  const paddingBottom = parseCssPixelValue(computedStyle.paddingBottom);
  const renderWidth = Math.max(
    1,
    Math.round(rect.width || imageElement.clientWidth || fallbackDisplayWidth),
  );
  const renderHeight = Math.max(
    1,
    Math.round(
      rect.height || imageElement.clientHeight || fallbackDisplayHeight,
    ),
  );
  const contentWidth = Math.max(
    1,
    renderWidth - borderLeft - borderRight - paddingLeft - paddingRight,
  );
  const contentHeight = Math.max(
    1,
    renderHeight - borderTop - borderBottom - paddingTop - paddingBottom,
  );
  const objectFit = normalizeObjectFit(computedStyle.objectFit);
  const objectPosition = parseObjectPosition(computedStyle.objectPosition);
  const concreteSize = resolveConcreteObjectSize(
    objectFit,
    sourceWidth,
    sourceHeight,
    contentWidth,
    contentHeight,
  );
  const freeX = contentWidth - concreteSize.width;
  const freeY = contentHeight - concreteSize.height;
  const drawLeft =
    borderLeft +
    paddingLeft +
    resolveObjectPositionOffset(objectPosition.x, freeX);
  const drawTop =
    borderTop +
    paddingTop +
    resolveObjectPositionOffset(objectPosition.y, freeY);
  const scaleX = concreteSize.width / Math.max(1, sourceWidth);
  const scaleY = concreteSize.height / Math.max(1, sourceHeight);

  return {
    renderWidth,
    renderHeight,
    drawLeft,
    drawTop,
    scaleX,
    scaleY,
    faceX: drawLeft + pixelBox.x * scaleX,
    faceY: drawTop + pixelBox.y * scaleY,
    faceWidth: Math.max(1, pixelBox.width * scaleX),
    faceHeight: Math.max(1, pixelBox.height * scaleY),
  };
};

const drawImageCoverForAspect = (context, image, width, height, aspect) => {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const sourceAspect = imageWidth / imageHeight;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = imageWidth;
  let sourceHeight = imageHeight;

  if (sourceAspect > aspect) {
    sourceWidth = sourceHeight * aspect;
    sourceX = (imageWidth - sourceWidth) / 2;
  } else {
    sourceHeight = sourceWidth / aspect;
    sourceY = (imageHeight - sourceHeight) / 2;
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  );
};

const cropImage = (image, box) => {
  const canvas = new OffscreenCanvas(box.width, box.height);
  canvas
    .getContext("2d")
    .drawImage(
      image,
      box.x,
      box.y,
      box.width,
      box.height,
      0,
      0,
      box.width,
      box.height,
    );
  return canvas;
};

const imageRgb = (canvas, aspect) => {
  const output = new OffscreenCanvas(
    profileTransitionSidelen,
    profileTransitionSidelen,
  );
  const context = output.getContext("2d");
  drawImageCoverForAspect(
    context,
    canvas,
    profileTransitionSidelen,
    profileTransitionSidelen,
    aspect,
  );
  const rgba = context.getImageData(
    0,
    0,
    profileTransitionSidelen,
    profileTransitionSidelen,
  ).data;
  const rgb = new Uint8Array(
    profileTransitionSidelen * profileTransitionSidelen * 3,
  );
  for (let index = 0; index < profileTransitionSidelen ** 2; index += 1) {
    rgb[index * 3] = rgba[index * 4];
    rgb[index * 3 + 1] = rgba[index * 4 + 1];
    rgb[index * 3 + 2] = rgba[index * 4 + 2];
  }
  return rgb;
};

const imageGray = (image, aspect) => {
  const canvas = new OffscreenCanvas(
    profileTransitionSidelen,
    profileTransitionSidelen,
  );
  const context = canvas.getContext("2d");
  drawImageCoverForAspect(
    context,
    image,
    profileTransitionSidelen,
    profileTransitionSidelen,
    aspect,
  );
  const rgba = context.getImageData(
    0,
    0,
    profileTransitionSidelen,
    profileTransitionSidelen,
  ).data;
  return Uint8Array.from(
    { length: profileTransitionSidelen ** 2 },
    (_, index) => rgba[index * 4],
  );
};

const buildPreviewPremultipliedRgba = (srcRgba) => {
  const rgba = srcRgba.slice();
  for (let index = 0; index < rgba.length; index += 4) {
    const alpha = rgba[index + 3] / 255;
    rgba[index] = Math.round(rgba[index] * alpha);
    rgba[index + 1] = Math.round(rgba[index + 1] * alpha);
    rgba[index + 2] = Math.round(rgba[index + 2] * alpha);
  }
  return rgba;
};

const buildMaskedFaceSourceRgba = (
  sourceImage,
  pixelBox,
  renderW,
  renderH,
  processingSidelen,
  aspect,
  targetMaskCanvas,
) => {
  const sourceCanvas = new OffscreenCanvas(renderW, renderH);
  const sourceContext = sourceCanvas.getContext("2d");
  if (!sourceContext) {
    return null;
  }

  sourceContext.drawImage(
    sourceImage,
    pixelBox.x,
    pixelBox.y,
    pixelBox.width,
    pixelBox.height,
    0,
    0,
    renderW,
    renderH,
  );
  sourceContext.globalCompositeOperation = "destination-in";
  sourceContext.drawImage(targetMaskCanvas, 0, 0, renderW, renderH);
  sourceContext.globalCompositeOperation = "source-over";

  const output = new OffscreenCanvas(processingSidelen, processingSidelen);
  const context = output.getContext("2d");
  drawImageCoverForAspect(
    context,
    sourceCanvas,
    processingSidelen,
    processingSidelen,
    aspect,
  );
  return new Uint8Array(
    context.getImageData(0, 0, processingSidelen, processingSidelen).data.buffer,
  );
};

let profileWorkerPromise;
const getProfileTransitionWorker = () => {
  profileWorkerPromise ??= (async () => {
    const worker = new Worker("/v2/resources/transform/obamify-worker.js?v=profile-transition-6");
    const [wasmJsSource, wasmBytes, weightsImage, seed, jfa, shade] =
      await Promise.all([
        fetch("/v2/resources/transform/pkg/obamify_wasm.js").then((response) =>
          response.text(),
        ),
        fetch("/v2/resources/transform/pkg/obamify_wasm_bg.wasm").then(
          (response) => response.arrayBuffer(),
        ),
        loadCanvasImage("/v2/resources/transform/weights256.png"),
        fetch("/v2/resources/transform/seed.wgsl").then((response) =>
          response.text(),
        ),
        fetch("/v2/resources/transform/jfa.wgsl").then((response) =>
          response.text(),
        ),
        fetch("/v2/resources/transform/shade.wgsl").then((response) =>
          response.text(),
        ),
      ]);

    await new Promise((resolve, reject) => {
      const onMessage = (event) => {
        if (event.data.type === "READY") {
          worker.removeEventListener("message", onMessage);
          resolve();
        } else if (event.data.type === "ERROR") {
          reject(new Error(event.data.error));
        }
      };

      worker.addEventListener("message", onMessage);
      worker.postMessage({
        type: "INIT",
        wasmJsSource,
        wasmBytes,
        targetRgb: new Uint8Array(profileTransitionSidelen ** 2 * 3),
        weightsGray: new Uint8Array(profileTransitionSidelen ** 2),
        shaderSources: { seed, jfa, shade },
      });
    });

    return { worker, weightsImage };
  })();

  return profileWorkerPromise;
};

let nextProfileTransitionJobId = 1;

const runProfilePixelTransition = async ({
  baseSrc,
  container,
  faceBox,
  faceLandmarks,
  imageElement,
  src,
}) => {
  console.info("[BI] Profile pixel transition start", {
    hasFaceBox: Boolean(faceBox),
    hasFaceLandmarks: Array.isArray(faceLandmarks),
  });
  const [{ worker, weightsImage }, fromImage, toImage] = await Promise.all([
    getProfileTransitionWorker(),
    loadCanvasImage(baseSrc),
    loadCanvasImage(src),
  ]);
  const sourceBox = getPixelBox(
    faceBox,
    fromImage.naturalWidth,
    fromImage.naturalHeight,
  );
  const displayMetrics = getDisplayedImageMetrics(
    imageElement,
    sourceBox,
    fromImage.naturalWidth,
    fromImage.naturalHeight,
    container.clientWidth,
    container.clientHeight,
  );
  const displayRenderWidth = displayMetrics.renderWidth;
  const displayRenderHeight = displayMetrics.renderHeight;
  const targetCrop = cropImage(toImage, sourceBox);
  const aspect = sourceBox.width / sourceBox.height;
  const backingScale = Math.max(
    1,
    Math.min(
      4,
      Math.ceil(
        Math.max(
          sourceBox.width / Math.max(1, displayRenderWidth),
          sourceBox.height / Math.max(1, displayRenderHeight),
          window.devicePixelRatio || 1,
        ),
      ),
    ),
  );
  const renderWidth = Math.max(1, Math.round(displayRenderWidth * backingScale));
  const renderHeight = Math.max(
    1,
    Math.round(displayRenderHeight * backingScale),
  );
  const sourceRgba = buildMaskedFaceSourceRgba(
    fromImage,
    sourceBox,
    sourceBox.width,
    sourceBox.height,
    profileTransitionSidelen,
    aspect,
    targetCrop,
  );
  if (!sourceRgba) {
    throw new Error("Profile masked source canvas unavailable");
  }
  const renderSrcRgba = buildPreviewPremultipliedRgba(sourceRgba);
  const targetRgb = imageRgb(targetCrop, aspect);
  const weightsGray = imageGray(weightsImage, aspect);
  const viewportX = displayMetrics.faceX * backingScale;
  const viewportY = displayMetrics.faceY * backingScale;
  const viewportW = Math.max(1, displayMetrics.faceWidth * backingScale);
  const viewportH = Math.max(1, displayMetrics.faceHeight * backingScale);
  const canvas = document.createElement("canvas");
  canvas.width = renderWidth;
  canvas.height = renderHeight;
  canvas.style.cssText = [
    "position:absolute",
    "inset:0",
    "width:100%",
    "height:100%",
    "display:block",
    "pointer-events:none",
    "opacity:1",
    "transition:opacity 140ms ease",
    "visibility:hidden",
  ].join(";");
  container.appendChild(canvas);
  console.info("[BI] Profile pixel transition canvas mounted", {
    renderWidth,
    renderHeight,
    backingScale,
    viewportX,
    viewportY,
    viewportW,
    viewportH,
  });

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = renderWidth;
  maskCanvas.height = renderHeight;
  const maskContext = maskCanvas.getContext("2d");
  maskContext.fillStyle = "white";
  const coverMetrics = {
    x: displayMetrics.drawLeft * backingScale,
    y: displayMetrics.drawTop * backingScale,
    width: fromImage.naturalWidth * displayMetrics.scaleX * backingScale,
    height: fromImage.naturalHeight * displayMetrics.scaleY * backingScale,
  };
  drawLandmarkFaceMask({
    context: maskContext,
    coverMetrics,
    faceLandmarks,
    sourceWidth: fromImage.naturalWidth,
    sourceHeight: fromImage.naturalHeight,
    viewportX,
    viewportY,
    viewportW,
    viewportH,
  });
  const maskUrl = maskCanvas.toDataURL("image/png");
  canvas.style.maskImage = `url(${maskUrl})`;
  canvas.style.maskMode = "alpha";
  canvas.style.maskSize = "100% 100%";
  canvas.style.maskRepeat = "no-repeat";
  canvas.style.webkitMaskImage = `url(${maskUrl})`;
  canvas.style.webkitMaskMode = "alpha";
  canvas.style.webkitMaskSize = "100% 100%";
  canvas.style.webkitMaskRepeat = "no-repeat";

  const offscreen = canvas.transferControlToOffscreen();
  const imgId = nextProfileTransitionJobId++;

  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      if (event.data.imgId !== imgId) return;

      if (event.data.type === "FIRST_FRAME") {
        canvas.style.visibility = "visible";
      }

      if (event.data.type === "ANIMATION_DONE") {
        worker.removeEventListener("message", onMessage);
        console.info("[BI] Profile pixel transition complete");
        resolve({
          cleanup: () => {
            canvas.style.opacity = "0";
            window.setTimeout(() => canvas.remove(), 160);
          },
        });
      }

      if (event.data.type === "ERROR") {
        worker.removeEventListener("message", onMessage);
        canvas.remove();
        reject(new Error(event.data.error || "Profile transition failed"));
      }
    };

    worker.addEventListener("message", onMessage);
    worker.postMessage(
      {
        type: "PROCESS",
        imgId,
        sourceType: "img",
        directFinalize: false,
        sidelen: profileTransitionSidelen,
        srcRgba: sourceRgba.buffer,
        renderSrcRgba: renderSrcRgba.buffer,
        targetRgb: targetRgb.buffer,
        weightsGray: weightsGray.buffer,
        renderW: renderWidth,
        renderH: renderHeight,
        viewportX,
        viewportY,
        viewportW,
        viewportH,
        motionScale: 1.8,
        renderFps: 60,
        offscreen,
      },
      [
        sourceRgba.buffer,
        renderSrcRgba.buffer,
        targetRgb.buffer,
        weightsGray.buffer,
        offscreen,
      ],
    );
  });
};

function ProfileTransformAvatar({
  alt,
  baseSrc,
  className,
  faceBox,
  faceLandmarks,
  src,
  style,
}) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const transitionKeyRef = useRef(null);
  const [displaySrc, setDisplaySrc] = useState(baseSrc);

  useEffect(() => {
    transitionKeyRef.current = null;
    setDisplaySrc(baseSrc);
  }, [baseSrc]);

  useEffect(() => {
    const container = containerRef.current;
    const imageElement = imageRef.current;
    const transitionKey = `${baseSrc}::${src || ""}`;

    if (
      !container ||
      !imageElement ||
      !src ||
      !faceBox ||
      !Array.isArray(faceLandmarks) ||
      displaySrc === src ||
      transitionKeyRef.current === transitionKey
    ) {
      return undefined;
    }

    let cancelled = false;
    let cleanupOverlay = null;
    transitionKeyRef.current = transitionKey;

    const render = async () =>
      runProfilePixelTransition({
        baseSrc,
        container,
        faceBox,
        faceLandmarks,
        imageElement,
        src,
      });

    render()
      .then(async (result) => {
        cleanupOverlay = result?.cleanup || null;
        if (cancelled) return;
        setDisplaySrc(src);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!cancelled) cleanupOverlay?.();
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("[BI] Profile canvas transition failed", error);
        setDisplaySrc(src);
      });

    return () => {
      cancelled = true;
      cleanupOverlay?.();
      try {
        container
          .querySelectorAll("canvas")
          .forEach((canvas) => canvas.remove());
      } catch {
        // The transition canvas is best-effort visual state.
      }
    };
  }, [baseSrc, faceBox, faceLandmarks, src]);

  return (
    <div
      className={className}
      ref={containerRef}
      style={{
        ...style,
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <img
        ref={imageRef}
        src={displaySrc}
        alt={alt}
        style={{
          height: "100%",
          inset: 0,
          objectFit: "cover",
          position: "absolute",
          width: "100%",
        }}
      />
    </div>
  );
}

function Profile({
  profileGender,
  profileData,
  recommendedProfileData,
  recommendedProfilePath,
  taggedUsername,
}) {
  const navigate = useNavigate();
  const transforms = useProfileTransforms(profileGender);
  const targetFaceAnalysis = useTargetFaceAnalysis(profileGender);
  const canUseProfileTransforms = transforms.canApply;
  const profileAsset = transforms.jobs.find(
    (job) =>
      job.role === "profile-avatar" ||
      job.assetId === getProfileAssetId(profileGender),
  );
  const baseProfileImage = resolveAssetUrl(profileData.user.profileImage);
  const profileUser = {
    ...profileData.user,
    profileImage:
      (canUseProfileTransforms && transforms.urls[profileAsset?.assetId]) ||
      (canUseProfileTransforms && profileAsset?.originalPath) ||
      baseProfileImage,
  };
  const recommendedUser = recommendedProfileData
    ? {
        ...recommendedProfileData.user,
        profileImage: resolveAssetUrl(recommendedProfileData.user.profileImage),
      }
    : profileUser;
  const profilePosts = [...profileData.posts]
    .sort((firstPost, secondPost) => secondPost.timestamp - firstPost.timestamp)
    .map((post, index) => {
      const frameAsset = canUseProfileTransforms
        ? transforms.jobs.find(
            (job) =>
              job.assetId === post.assetId ||
              (job.role === "frame" &&
                (job.postId === post.id ||
                  job.slot === post.id ||
                  job.slot === index)),
          )
        : null;
      return {
        ...post,
        postIndex: index,
        image:
          transforms.urls[frameAsset?.assetId] ??
          frameAsset?.originalPath ??
          resolveAssetUrl(post.image),
        profileImage: profileUser.profileImage,
        username: profileUser.username,
        caption: post.caption ?? "",
        commentTimestamp: getRelativePostTimestamp(post.timestamp),
        displayTimestamp: formatPostTimestamp(post.timestamp),
        taggedUsernames: post.taggedUsernames ?? [],
      };
    });
  const profilePostFrames = Array.from(
    { length: postFrameCount },
    (_, index) => profilePosts[index] ?? null,
  );
  const taggedPosts = profilePosts.filter((post) =>
    post.taggedUsernames.includes(taggedUsername),
  );
  const [isRecommendedFollowing, setIsRecommendedFollowing] = useState(false);
  const stats = getInitialStats(profileData);
  const [selectedPostsTab, setSelectedPostsTab] = useState("posts");
  const [selectedPostIndex, setSelectedPostIndex] = useState(null);
  const [likedPostIndexes, setLikedPostIndexes] = useState(() => new Set());
  const [poppingLikeIndex, setPoppingLikeIndex] = useState(null);
  const [postOverlayImageRatio, setPostOverlayImageRatio] = useState(1);
  const [postOverlayImageWidth, setPostOverlayImageWidth] = useState(
    `calc(100vh - ${postOverlayVerticalGap}px)`,
  );
  const selectedPost =
    selectedPostIndex === null ? null : profilePosts[selectedPostIndex];
  const selectedPostDataIndex =
    selectedPostIndex === null ? null : selectedPostIndex;
  const isSelectedPostLiked =
    selectedPost !== null && likedPostIndexes.has(selectedPost.id);
  const getPostLikeCount = (post) =>
    post.likes + (likedPostIndexes.has(post.id) ? 1 : 0);

  useEffect(() => {
    const updatePostOverlayImageWidth = () => {
      setPostOverlayImageWidth(getPostOverlayImageWidth(postOverlayImageRatio));
    };

    updatePostOverlayImageWidth();
    window.addEventListener("resize", updatePostOverlayImageWidth);

    return () => {
      window.removeEventListener("resize", updatePostOverlayImageWidth);
    };
  }, [postOverlayImageRatio]);

  const openPostOverlay = (postIndex) => {
    setSelectedPostIndex(postIndex);
  };

  const toggleSelectedPostLike = () => {
    if (selectedPostDataIndex === null || !selectedPost) {
      return;
    }

    setLikedPostIndexes((currentLikedPostIndexes) => {
      const nextLikedPostIndexes = new Set(currentLikedPostIndexes);

      if (nextLikedPostIndexes.has(selectedPost.id)) {
        nextLikedPostIndexes.delete(selectedPost.id);
      } else {
        nextLikedPostIndexes.add(selectedPost.id);
        setPoppingLikeIndex(selectedPostDataIndex);
      }

      return nextLikedPostIndexes;
    });
  };

  return (
    <>
      <main>
        <div className="profile">
          <div className="profile--header">
            <div className="profile--header--details">
              <ProfileTransformAvatar
                className="profile--header--details--img"
                src={profileUser.profileImage}
                baseSrc={baseProfileImage}
                faceBox={
                  profileAsset?.faceBox ??
                  targetFaceAnalysis?.box ??
                  profileFaceBoxes[profileGender]
                }
                faceLandmarks={
                  profileAsset?.faceLandmarks ?? targetFaceAnalysis?.landmarks
                }
                alt="프로필 이미지"
                style={profileAvatarStyle}
              />
              <div className="profile--header--details--info">
                <div className="profile--header--details--info--username">
                  {profileUser.username}
                </div>
                <div className="profile--header--details--info--name">
                  {profileUser.name}
                </div>
                <div className="profile--header--details--info--datas">
                  <div className="profile--header--details--info--datas--data">
                    <div className="profile--header--details--info--datas--data--dataname">
                      게시물
                    </div>
                    <div className="profile--header--details--info--datas--data--datavalue">
                      {stats.posts}
                    </div>
                  </div>
                  <div className="profile--header--details--info--datas--data">
                    <div className="profile--header--details--info--datas--data--dataname">
                      팔로워
                    </div>
                    <div className="profile--header--details--info--datas--data--datavalue">
                      {stats.followers}
                    </div>
                  </div>
                  <div className="profile--header--details--info--datas--data">
                    <div className="profile--header--details--info--datas--data--dataname">
                      팔로잉
                    </div>
                    <div className="profile--header--details--info--datas--data--datavalue">
                      {stats.following}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="profile--header--highlights">
              <button className="profile--header--highlights--highlight">
                <div className="profile--header--highlights--highlight--thumbnail" />
                <div className="profile--header--highlights--highlight--title">
                  title
                </div>
              </button>
              <button className="profile--header--highlights--highlight">
                <div className="profile--header--highlights--highlight--thumbnail" />
                <div className="profile--header--highlights--highlight--title">
                  title
                </div>
              </button>
            </div>
            <div className="profile--header--recommend">
              <div className="profile--header--recommend--text">
                회원님을 위한 추천
              </div>
              <div className="profile--header--recommend--profiles">
                <div className="profile--header--recommend--profiles--profile">
                  <button
                    className="profile--header--recommend--profiles--profile--info"
                    type="button"
                    onClick={() => {
                      if (recommendedProfilePath) {
                        navigate(recommendedProfilePath);
                      }
                    }}
                  >
                    <div className="profile--header--recommend--profiles--profile--info--img">
                      <img
                        src={recommendedUser.profileImage}
                        style={avatarImageStyle}
                      />
                    </div>
                    <div className="profile--header--recommend--profiles--profile--info--username">
                      {recommendedUser.username}
                    </div>
                    <div className="profile--header--recommend--profiles--profile--info--name">
                      {recommendedUser.name}
                    </div>
                  </button>
                  <button
                    className={`profile--header--recommend--profiles--profile--btn${isRecommendedFollowing ? " selected" : ""}`}
                    aria-pressed={isRecommendedFollowing}
                    onClick={() =>
                      setIsRecommendedFollowing((isFollowing) => !isFollowing)
                    }
                  >
                    {isRecommendedFollowing ? "팔로잉" : "팔로우"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="profile--posts">
            <div className="profile--posts--selector">
              <button
                className={`profile--posts--selector--tab${selectedPostsTab === "posts" ? " selected" : ""}`}
                onClick={() => setSelectedPostsTab("posts")}
              >
                <img src={iconPostsO} />
                <img src={iconPostsS} />
              </button>
              <button
                className={`profile--posts--selector--tab${selectedPostsTab === "tagged_posts" ? " selected" : ""}`}
                onClick={() => setSelectedPostsTab("tagged_posts")}
              >
                <img src={iconPostsTaggedO} />
                <img src={iconPostsTaggedS} />
              </button>
            </div>
            {selectedPostsTab === "posts" && (
              <div className="profile--posts--frames" id="posts">
                {profilePostFrames.map((post, index) =>
                  post ? (
                    <PostFrame
                      key={post.id}
                      post={post}
                      postIndex={post.postIndex}
                      likeCount={getPostLikeCount(post)}
                      onOpen={openPostOverlay}
                    />
                  ) : (
                    <div
                      className="profile--posts--frames--frame"
                      key={`empty-${index}`}
                    />
                  ),
                )}
              </div>
            )}
            {selectedPostsTab === "tagged_posts" && (
              <div className="profile--posts--frames" id="tagged_posts">
                {taggedPosts.map((post) => (
                  <PostFrame
                    key={post.id}
                    post={post}
                    postIndex={post.postIndex}
                    likeCount={getPostLikeCount(post)}
                    onOpen={openPostOverlay}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        {selectedPost && (
          <div
            className="post_overlay"
            onClick={() => setSelectedPostIndex(null)}
          >
            <button
              className="post_overlay--close"
              type="button"
              onClick={() => setSelectedPostIndex(null)}
            >
              <img src={iconClose} alt="닫기" />
            </button>
            <div
              className="post_overlay--content"
              style={{ "--post-image-width": postOverlayImageWidth }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="post_overlay--content--img_section">
                <div className="post_overlay--content--img_section--img">
                  <img
                    src={selectedPost.image}
                    alt="게시물 이미지"
                    onLoad={(event) => {
                      const { naturalWidth, naturalHeight } =
                        event.currentTarget;

                      setPostOverlayImageRatio(
                        naturalWidth / naturalHeight || 1,
                      );
                    }}
                  />
                </div>
              </div>
              <div className="post_overlay--content--comment_section">
                <div className="post_overlay--content--comment_section--profile">
                  <div className="post_overlay--content--comment_section--profile--img">
                    <img
                      src={selectedPost.profileImage}
                      alt=""
                      style={avatarImageStyle}
                    />
                  </div>
                  <div className="post_overlay--content--comment_section--profile--username">
                    {selectedPost.username}
                  </div>
                </div>
                <div className="post_overlay--content--comment_section--comment">
                  <div
                    className={`post_overlay--content--comment_section--comment--main${selectedPost.caption ? "" : " hidden"}`}
                  >
                    {selectedPost.caption && (
                      <>
                        <div className="post_overlay--content--comment_section--comment--main--img">
                          <img
                            src={selectedPost.profileImage}
                            alt=""
                            style={avatarImageStyle}
                          />
                        </div>
                        <div className="post_overlay--content--comment_section--comment--main--text">
                          <div className="post_overlay--content--comment_section--comment--main--text--upper">
                            <span className="post_overlay--content--comment_section--comment--main--text--upper--username">
                              {selectedPost.username}
                            </span>
                            <span className="post_overlay--content--comment_section--comment--main--text--upper--caption">
                              {selectedPost.caption}
                            </span>
                          </div>
                          <div className="post_overlay--content--comment_section--comment--main--text--timestamp">
                            {selectedPost.commentTimestamp}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="post_overlay--content--comment_section--like">
                  <button
                    className={`post_overlay--content--comment_section--like--btn${isSelectedPostLiked ? " selected" : ""}${poppingLikeIndex === selectedPostDataIndex ? " pop" : ""}`}
                    type="button"
                    aria-pressed={isSelectedPostLiked}
                    onClick={toggleSelectedPostLike}
                    onAnimationEnd={() => setPoppingLikeIndex(null)}
                  >
                    <img src={iconHeartO} alt="" />
                    <img src={iconHeartS} alt="" />
                  </button>
                </div>
                <div className="post_overlay--content--comment_section--like_data">
                  좋아요 {getPostLikeCount(selectedPost)}개
                </div>
                <div className="post_overlay--content--comment_section--timestamp">
                  {selectedPost.displayTimestamp}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default Profile;
