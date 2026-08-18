import iconLogo from "../assets/icons/logo_2.svg";
import iconHomeO from "../assets/icons/home_outline.svg";
import iconHomeS from "../assets/icons/home_solid.svg";
import iconHeartO from "../assets/icons/heart_outline.svg";
import iconHeartS from "../assets/icons/heart_solid.svg";
import iconUpload from "../assets/icons/upload.svg";
import iconProfile from "../assets/icons/profile.svg";
import iconLogout from "../assets/icons/logout.svg";
import { useLocation, useNavigate } from "react-router-dom";
import { clearCurrentAudience } from "../utils/audienceStore.js";
import { logoutCurrentSession } from "../services/sessionLifecycle.js";

function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHomeSelected = pathname === "/profile_a" || pathname === "/profile_b";
  const isProfileSelected = pathname === "/profile-setting";

  return (
    <>
      <nav>
        <div className="nav--section">
          <button className="nav--section--btn" id="logo">
            <div className="nav--section--btn--icon">
              <img src={iconLogo} alt="Logo" />
            </div>
          </button>
        </div>
        <div className="nav--section">
          <button
            className={`nav--section--btn${isHomeSelected ? " selected" : ""}`}
            id="home"
          >
            <div className="nav--section--btn--icon">
              <img src={iconHomeO} alt="Home" />
              <img src={iconHomeS} alt="Home" />
            </div>
            <div className="nav--section--btn--text">홈</div>
          </button>
          <button className="nav--section--btn" id="notification">
            <div className="nav--section--btn--icon">
              <img src={iconHeartO} alt="Notification" />
              <img src={iconHeartS} alt="Notification" />
            </div>
            <div className="nav--section--btn--text">알림</div>
          </button>
          <button className="nav--section--btn" id="upload">
            <div className="nav--section--btn--icon">
              <img src={iconUpload} alt="Upload" />
            </div>
            <div className="nav--section--btn--text">만들기</div>
          </button>
          <button
            className={`nav--section--btn${isProfileSelected ? " selected" : ""}`}
            id="profile"
          >
            <div className="nav--section--btn--icon">
              <img src={iconProfile} alt="Profile" />
            </div>
            <div className="nav--section--btn--text">프로필</div>
          </button>
        </div>
        <div className="nav--section">
          <button
            className={`nav--section--btn${isProfileSelected ? " hidden" : ""}`}
            id="more"
            type="button"
            disabled={isProfileSelected}
            aria-hidden={isProfileSelected}
            onClick={async () => {
              try {
                await logoutCurrentSession();
                clearCurrentAudience();
                navigate("/profile-setting", { replace: true });
              } catch {
                return;
              }
            }}
          >
            <div className="nav--section--btn--icon">
              <img src={iconLogout} alt="Logout" />
            </div>
            <div className="nav--section--btn--text">로그아웃</div>
          </button>
        </div>
      </nav>
    </>
  );
}

export default Sidebar;
