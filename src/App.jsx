import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Profile from "./components/Profile.jsx";
import ProfileSetting from "./components/ProfileSetting.jsx";
import FinalizedSessionRoute from "./components/FinalizedSessionRoute.jsx";
import profileMale from "./data/profile_male.json";
import profileFemale from "./data/profile_female.json";
import { getCurrentAudience } from "./utils/audienceStore.js";
import "./styles/App.css";

const getInitialProfilePath = () => {
  const loginData = getCurrentAudience();

  if (loginData?.gender === "male") {
    return "/profile_a";
  }

  if (loginData?.gender === "female") {
    return "/profile_b";
  }

  return "/profile-setting";
};

const pages = [
  {
    path: "/",
    element: <Navigate to={getInitialProfilePath()} replace />,
  },
  {
    path: "/profile-setting",
    aliases: ["/profile setting"],
    element: <ProfileSetting />,
  },
  {
    path: "/profile_a",
    element: (
      <FinalizedSessionRoute profileGender="male">
        <Profile
          key="profile_male"
          profileGender="male"
          profileData={profileMale}
          taggedUsername="username_female"
        />
      </FinalizedSessionRoute>
    ),
  },
  {
    path: "/profile_b",
    element: (
      <FinalizedSessionRoute profileGender="female">
        <Profile
          key="profile_female"
          profileGender="female"
          profileData={profileFemale}
          taggedUsername="username_male"
        />
      </FinalizedSessionRoute>
    ),
  },
];

function App() {
  return (
    <>
      <Sidebar />
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
