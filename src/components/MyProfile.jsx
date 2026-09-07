import iconProfile from "../assets/icons/profile.svg";
import { getCurrentAudience } from "../utils/audienceStore.js";

const avatarImageStyle = {
  height: "150px",
  objectFit: "cover",
  width: "150px",
};

function MyProfile() {
  const currentAudience = getCurrentAudience();
  const username = currentAudience?.username ?? "username";

  return (
    <main>
      <div className="profile my_profile">
        <div className="profile--header">
          <div className="profile--header--details">
            <img
              className="profile--header--details--img"
              src={currentAudience?.profileImage ?? iconProfile}
              alt="Profile"
              style={avatarImageStyle}
            />
            <div className="profile--header--details--info">
              <div className="profile--header--details--info--username">
                {username}
              </div>
              <div className="profile--header--details--info--name">
                내 프로필
              </div>
              <div className="profile--header--details--info--datas">
                <div className="profile--header--details--info--datas--data">
                  <div className="profile--header--details--info--datas--data--dataname">
                    게시물
                  </div>
                  <div className="profile--header--details--info--datas--data--datavalue">
                    0
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default MyProfile;
