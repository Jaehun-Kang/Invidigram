import iconHeartS from "../assets/icons/heart_solid.svg";

function PostFrame({ post, postIndex, likeCount, onOpen }) {
  return (
    <button
      className="profile--posts--frames--frame"
      type="button"
      onClick={() => onOpen(postIndex)}
    >
      <img src={post.image} alt="" />
      <div className="profile--posts--frames--frame--data">
        <img src={iconHeartS} alt="" />
        <span>{likeCount}</span>
      </div>
    </button>
  );
}

export default PostFrame;
