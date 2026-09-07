import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Profile from "./components/Profile.jsx";
import ProfileSetting from "./components/ProfileSetting.jsx";
import MyProfile from "./components/MyProfile.jsx";
import profileMale from "./data/profile_male.json";
import profileFemale from "./data/profile_female.json";
import { bridgeClient } from "./services/bridgeClient.js";
import { getCurrentAudience } from "./utils/audienceStore.js";
import { useInactivitySessionReset } from "./hooks/useInactivitySessionReset.js";
import "./styles/App.css";

const getInitialProfilePath = () => {
  const loginData = getCurrentAudience();

  if (loginData?.gender === "male") {
    return "/jin.d0uble0";
  }

  if (loginData?.gender === "female") {
    return "/we_r_0";
  }

  return "/profile-setting";
};

const createPages = (profileSettingResetKey) => [
  {
    path: "/",
    element: <Navigate to={getInitialProfilePath()} replace />,
  },
  {
    path: "/profile-setting",
    aliases: ["/profile setting"],
    element: <ProfileSetting key={profileSettingResetKey} />,
  },
  {
    path: "/my-profile",
    element: <MyProfile />,
  },
  {
    path: "/jin.d0uble0",
    //활성화 방법: FinalizedSessionRoute를 import하고 이 Profile을 profileGender="male" wrapper로 감싸세요.
    element: (
      <Profile
        key="profile_male"
        profileGender="male"
        profileData={profileMale}
        recommendedProfileData={profileFemale}
        recommendedProfilePath="/we_r_0"
        taggedUsername="we_r_0"
      />
    ),
  },
  {
    path: "/we_r_0",
    //활성화 방법: FinalizedSessionRoute를 import하고 이 Profile을 profileGender="female" wrapper로 감싸세요.
    element: (
      <Profile
        key="profile_female"
        profileGender="female"
        profileData={profileFemale}
        recommendedProfileData={profileMale}
        recommendedProfilePath="/jin.d0uble0"
        taggedUsername="jin.d0uble0"
      />
    ),
  },
  {
    path: "/:username",
    element: <MyProfile />,
  },
];

function App() {
  const navigate = useNavigate();
  const [profileSettingResetKey, setProfileSettingResetKey] = useState(0);
  const handleInactivityReset = useCallback(() => {
    setProfileSettingResetKey((resetKey) => resetKey + 1);
    navigate("/profile-setting", { replace: true });
  }, [navigate]);
  const pages = useMemo(
    () => createPages(profileSettingResetKey),
    [profileSettingResetKey],
  );

  useEffect(() => bridgeClient.startLogForwarding(), []);
  const { remainingSeconds } = useInactivitySessionReset({
    onReset: handleInactivityReset,
  });

  return (
    <>
      <Sidebar inactivityRemainingSeconds={remainingSeconds} />
      <Routes>
        {pages.flatMap((page) => {
          const routePaths = [page.path, ...(page.aliases ?? [])];

          return routePaths.map((path) => (
            <Route key={path} path={path} element={page.element} />
          ));
        })}
      </Routes>
    </>
  );
}

export default App;
