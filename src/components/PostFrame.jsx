import { useState } from "react";
import iconHeartS from "../assets/icons/heart_solid.svg";

const frameAspectRatio = 3 / 4;

function PostFrame({ post, postIndex, likeCount, onOpen, renderImage }) {
  const [fitMode, setFitMode] = useState("height");
  const imageClassName = `profile--posts--frames--frame--img fit-${fitMode}`;
  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    const imageAspectRatio = naturalWidth / naturalHeight || 1;
    setFitMode(imageAspectRatio < frameAspectRatio ? "width" : "height");
  };

  return (
    <button
      className="profile--posts--frames--frame"
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
