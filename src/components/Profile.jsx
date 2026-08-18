import { useEffect, useState } from "react";
import iconSimilarO from "../assets/icons/similar_outline.svg";
import iconSimilarS from "../assets/icons/similar_solid.svg";
import iconPostsO from "../assets/icons/posts_outline.svg";
import iconPostsS from "../assets/icons/posts_solid.svg";
import iconPostsTaggedO from "../assets/icons/posts_tagged_outline.svg";
import iconPostsTaggedS from "../assets/icons/posts_tagged_solid.svg";
import iconClose from "../assets/icons/close.svg";
import iconHeartO from "../assets/icons/heart_outline.svg";
import iconHeartS from "../assets/icons/heart_solid.svg";
import PostFrame from "./PostFrame";
import { useProfileTransforms } from "../hooks/useProfileTransforms.js";
import {
  getAudienceIdentity,
  getAudienceProfileState,
  getCurrentAudience,
  saveAudienceProfileStateByIdentity,
} from "../utils/audienceStore.js";

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

  if (elapsedDays < 30) {
    return `${Math.floor(elapsedDays / 7)}주`;
  }

  if (elapsedDays < 365) {
    return `${Math.floor(elapsedDays / 30)}개월`;
  }

  return `${Math.floor(elapsedDays / 365)}년`;
};

const getPostOverlayImageWidth = (imageRatio) => {
  const maxImageHeight = window.innerHeight - postOverlayVerticalGap;
  const maxImageWidth =
    window.innerWidth - postOverlayHorizontalGap - postOverlayCommentWidth;
  const imageWidth = Math.min(imageRatio, 1) * maxImageHeight;

  return `${Math.max(0, Math.min(imageWidth, maxImageWidth))}px`;
};

function Profile({ profileGender, profileData, taggedUsername }) {
  const transforms = useProfileTransforms(profileGender);
  const currentAudience = getCurrentAudience();
  const currentAudienceIdentity = getAudienceIdentity(currentAudience);
  const viewerState = getAudienceProfileState(currentAudience, profileGender);
  const isOwnGenderProfile = currentAudience?.gender === profileGender;
  const initialIsProfileFollowing =
    viewerState?.isFollowing ?? isOwnGenderProfile;
  const profileAsset = transforms.jobs.find(
    (job) => job.role === "profile-avatar",
  );
  const profileUser = {
    ...profileData.user,
    profileImage:
      transforms.urls[profileAsset?.assetId] ??
      profileAsset?.originalPath ??
      resolveAssetUrl(profileData.user.profileImage),
  };
  const profilePosts = [...profileData.posts]
    .sort((firstPost, secondPost) => secondPost.timestamp - firstPost.timestamp)
    .map((post, index) => {
      const frameAsset = transforms.jobs.find(
        (job) =>
          job.assetId === post.assetId ||
          (job.role === "frame" &&
            (job.postId === post.id || job.slot === post.id || job.slot === index)),
      );
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
  const [isProfileFollowing, setIsProfileFollowing] = useState(
    initialIsProfileFollowing,
  );
  const [isRecommendedFollowing, setIsRecommendedFollowing] = useState(false);
  const stats = getInitialStats(profileData);
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [selectedPostsTab, setSelectedPostsTab] = useState("posts");
  const [selectedPostIndex, setSelectedPostIndex] = useState(null);
  const [likedPostIndexes, setLikedPostIndexes] = useState(
    () => new Set(viewerState?.likedPostIds ?? []),
  );
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
  const displayStats = {
    ...stats,
    followers: stats.followers + (isProfileFollowing ? 1 : 0),
  };

  useEffect(() => {
    saveAudienceProfileStateByIdentity(currentAudienceIdentity, profileGender, {
      isFollowing: isProfileFollowing,
      likedPostIds: Array.from(likedPostIndexes),
    });
  }, [
    currentAudienceIdentity,
    isProfileFollowing,
    likedPostIndexes,
    profileGender,
  ]);

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

  const toggleProfileFollow = () => {
    setIsProfileFollowing((isFollowing) => !isFollowing);
  };

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
              <img
                className="profile--header--details--img"
                src={profileUser.profileImage}
                alt="프로필 이미지"
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
                      {displayStats.posts}
                    </div>
                  </div>
                  <div className="profile--header--details--info--datas--data">
                    <div className="profile--header--details--info--datas--data--dataname">
                      팔로워
                    </div>
                    <div className="profile--header--details--info--datas--data--datavalue">
                      {displayStats.followers}
                    </div>
                  </div>
                  <div className="profile--header--details--info--datas--data">
                    <div className="profile--header--details--info--datas--data--dataname">
                      팔로우
                    </div>
                    <div className="profile--header--details--info--datas--data--datavalue">
                      {displayStats.following}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="profile--header--btns">
              <button
                className={`profile--header--btns--btn${isProfileFollowing ? " selected" : ""}`}
                aria-pressed={isProfileFollowing}
                onClick={toggleProfileFollow}
              >
                {isProfileFollowing ? "팔로잉" : "팔로우"}
              </button>
              <button className="profile--header--btns--btn">
                메시지 보내기
              </button>
              <button
                className={`profile--header--btns--btn${isRecommendOpen ? " selected" : ""}`}
                onClick={() => setIsRecommendOpen((isOpen) => !isOpen)}
              >
                <img src={iconSimilarO} />
                <img src={iconSimilarS} />
              </button>
            </div>
            <div className="profile--header--highlights">
              <button className="profile--header--highlights--highlight">
                <div className="profile--header--highlights--highlight--thumbnail">
                  <img src="" />
                </div>
                <div className="profile--header--highlights--highlight--title">
                  title
                </div>
              </button>
              <button className="profile--header--highlights--highlight">
                <div className="profile--header--highlights--highlight--thumbnail">
                  <img src="" />
                </div>
                <div className="profile--header--highlights--highlight--title">
                  title
                </div>
              </button>
            </div>
            {isRecommendOpen && (
              <div className="profile--header--recommend">
                <div className="profile--header--recommend--text">
                  회원님을 위한 추천
                </div>
                <div className="profile--header--recommend--profiles">
                  <div className="profile--header--recommend--profiles--profile">
                    <button className="profile--header--recommend--profiles--profile--info">
                      <div className="profile--header--recommend--profiles--profile--info--img">
                        <img src={profileUser.profileImage} />
                      </div>
                      <div className="profile--header--recommend--profiles--profile--info--username">
                        {profileUser.username}
                      </div>
                      <div className="profile--header--recommend--profiles--profile--info--name">
                        {profileUser.name}
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
            )}
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
                    >
                      <img src="" alt="" />
                    </div>
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
                    <img src={selectedPost.profileImage} alt="" />
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
                          <img src={selectedPost.profileImage} alt="" />
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
