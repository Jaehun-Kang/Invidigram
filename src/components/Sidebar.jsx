import iconLogo from "../assets/icons/logo_2.svg";
import iconHomeO from "../assets/icons/home_outline.svg";
import iconHomeS from "../assets/icons/home_solid.svg";
import iconProfile from "../assets/icons/profile.svg";
import { useLocation, useNavigate } from "react-router-dom";
import {
  clearCurrentAudience,
  getCurrentAudience,
} from "../utils/audienceStore.js";
import { logoutCurrentSession } from "../services/sessionLifecycle.js";

function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHomeSelected = pathname === "/profile_a" || pathname === "/profile_b";
  const isProfileSelected = pathname === "/my-profile";
  const isProfileSetting = pathname === "/profile-setting";

  const navigateToProfile = () => {
    const currentAudience = getCurrentAudience();

    if (currentAudience?.gender === "female") {
      navigate("/profile_b");
      return;
    }

    if (currentAudience?.gender === "male") {
      navigate("/profile_a");
      return;
    }

    navigate("/profile_a");
  };

  const returnToStart = async () => {
    try {
      await logoutCurrentSession();
    } catch {
      return;
    }

    clearCurrentAudience();
    navigate("/profile-setting", { replace: true });
  };

  return (
    <>
      <nav>
        <div className="nav--section">
          <button
            className="nav--section--btn"
            id="logo"
            type="button"
            onClick={navigateToProfile}
          >
            <div className="nav--section--btn--icon">
              <img src={iconLogo} alt="Logo" />
            </div>
          </button>
        </div>
        <div className="nav--section">
          <button
            className={`nav--section--btn${isHomeSelected ? " selected" : ""}`}
            id="home"
            type="button"
            onClick={navigateToProfile}
          >
            <div className="nav--section--btn--icon">
              <img src={iconHomeO} alt="Home" />
              <img src={iconHomeS} alt="Home" />
            </div>
            <div className="nav--section--btn--text">홈</div>
          </button>
          <button
            className={`nav--section--btn${isProfileSelected ? " selected" : ""}`}
            id="profile"
            type="button"
            onClick={() => navigate("/my-profile")}
          >
            <div className="nav--section--btn--icon">
              <img src={iconProfile} alt="Profile" />
            </div>
            <div className="nav--section--btn--text">프로필</div>
          </button>
        </div>
      </nav>
      {!isProfileSetting && (
        <button
          className="return_home_button"
          id="more"
          type="button"
          onClick={returnToStart}
        >
          처음으로
        </button>
      )}
    </>
  );
}

export default Sidebar;
