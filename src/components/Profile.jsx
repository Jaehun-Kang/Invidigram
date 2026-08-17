import { useState } from "react";
import iconProfile from "../assets/icons/profile.svg";
import iconSimilarO from "../assets/icons/similar_outline.svg";
import iconSimilarS from "../assets/icons/similar_solid.svg";
import iconPostsO from "../assets/icons/posts_outline.svg";
import iconPostsS from "../assets/icons/posts_solid.svg";
import iconPostsTaggedO from "../assets/icons/posts_tagged_outline.svg";
import iconPostsTaggedS from "../assets/icons/posts_tagged_solid.svg";

function Profile() {
  const [isProfileFollowing, setIsProfileFollowing] = useState(true);
  const [isRecommendedFollowing, setIsRecommendedFollowing] = useState(false);
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
  });
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [selectedPostsTab, setSelectedPostsTab] = useState("posts");

  const toggleProfileFollow = () => {
    setIsProfileFollowing((isFollowing) => {
      setStats((currentStats) => ({
        ...currentStats,
        followers: Math.max(0, currentStats.followers + (isFollowing ? -1 : 1)),
      }));

      return !isFollowing;
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
                src={iconProfile}
                alt="Profile image placeholder"
              />
              <div className="profile--header--details--info">
                <div className="profile--header--details--info--username">
                  username
                </div>
                <div className="profile--header--details--info--name">name</div>
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
                      팔로우
                    </div>
                    <div className="profile--header--details--info--datas--data--datavalue">
                      {stats.following}
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
                        <img src={iconProfile} />
                      </div>
                      <div className="profile--header--recommend--profiles--profile--info--username">
                        username
                      </div>
                      <div className="profile--header--recommend--profiles--profile--info--name">
                        name
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
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
              </div>
            )}
            {selectedPostsTab === "tagged_posts" && (
              <div className="profile--posts--frames" id="tagged_posts">
                <div className="profile--posts--frames--frame">
                  <img src="" alt="" />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default Profile;
