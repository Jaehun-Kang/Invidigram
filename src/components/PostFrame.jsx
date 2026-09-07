import { useEffect, useRef, useState } from "react";
import iconHeartS from "../assets/icons/heart_solid.svg";

const frameAspectRatio = 3 / 4;

function PostFrame({
  post,
  postIndex,
  likeCount,
  onOpen,
  onVisibleAsset,
  renderImage,
}) {
  const frameRef = useRef(null);
  const [fitMode, setFitMode] = useState("height");
  const imageClassName = `profile--posts--frames--frame--img fit-${fitMode}`;
  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    const imageAspectRatio = naturalWidth / naturalHeight || 1;
    setFitMode(imageAspectRatio < frameAspectRatio ? "width" : "height");
  };

  useEffect(() => {
    const assetId = post.transformAssetId ?? post.assetId;
    const frame = frameRef.current;
    if (!assetId || !frame || !onVisibleAsset) return undefined;

    let notified = false;
    const notify = () => {
      if (notified) return;
      notified = true;
      onVisibleAsset(assetId);
    };
    const rect = frame.getBoundingClientRect();
    if (
      rect.bottom > 0 &&
      rect.top < window.innerHeight &&
      rect.right > 0 &&
      rect.left < window.innerWidth
    ) {
      notify();
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          notify();
          observer.disconnect();
        }
      },
      { root: null, rootMargin: "240px", threshold: 0 },
    );
    observer.observe(frame);

    return () => observer.disconnect();
  }, [onVisibleAsset, post.assetId, post.transformAssetId]);

  return (
    <button
      className="profile--posts--frames--frame"
      ref={frameRef}
      type="button"
      onClick={() => onOpen(postIndex)}
    >
      {renderImage ? (
        renderImage({ className: imageClassName, onLoad: handleImageLoad })
      ) : (
        <img
          className={imageClassName}
          src={post.image}
          alt=""
          onLoad={handleImageLoad}
        />
      )}
      <div className="profile--posts--frames--frame--data">
        <img src={iconHeartS} alt="" />
        <span>{likeCount}</span>
      </div>
    </button>
  );
}

export default PostFrame;
