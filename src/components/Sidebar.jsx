import iconLogo from "../assets/icons/logo_2.svg";
import iconHomeO from "../assets/icons/home_outline.svg";
import iconHomeS from "../assets/icons/home_solid.svg";
import iconProfile from "../assets/icons/profile.svg";
import { useLocation, useNavigate } from "react-router-dom";
import {
  clearCurrentAudience,
  getCurrentAudience,
} from "../utils/audienceStore.js";
import { bridgeClient } from "../services/bridgeClient.js";
import { logoutCurrentSession } from "../services/sessionLifecycle.js";
import { sessionStore } from "../services/sessionStore.js";

function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const currentAudience = getCurrentAudience();
  const isHomeSelected = pathname === "/jin.d0uble0" || pathname === "/we_r_0";
  const isProfileSelected = pathname === "/my-profile";
  const isProfileSetting = pathname === "/profile-setting";

  const navigateToProfile = () => {
    const currentAudience = getCurrentAudience();

    if (currentAudience?.gender === "female") {
      navigate("/we_r_0");
      return;
    }

    if (currentAudience?.gender === "male") {
      navigate("/jin.d0uble0");
      return;
    }

    navigate("/jin.d0uble0");
  };

  const logBridgeResetError = (message, error) => {
    console.warn(`[BI] ${message}`, {
      code: error?.code,
      message: error?.message,
      status: error?.status,
      retryable: error?.retryable,
      requestId: error?.requestId,
    });
  };

  const returnToStart = async () => {
    try {
      await logoutCurrentSession();
    } catch (error) {
      logBridgeResetError("Return-to-start logout failed", error);
      sessionStore.clear();

      try {
        await bridgeClient.resetActiveSessions();
      } catch (resetError) {
        logBridgeResetError(
          "Return-to-start active session reset failed",
          resetError,
        );
      }
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
              <img
                src={currentAudience?.profileImage ?? iconProfile}
                alt="Profile"
                style={{ height: "100%", objectFit: "cover", width: "100%" }}
              />
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
