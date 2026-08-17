import { Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Profile from "./components/Profile.jsx";
import ProfileSetting from "./components/ProfileSetting.jsx";
import "./styles/App.css";

const pages = [
  // {
  //   path: "/",
  //   element: <ProfileSettingPage />,
  // },
  {
    path: "/profile-setting",
    aliases: ["/profile setting"],
    element: <ProfileSetting />,
  },
  {
    path: "/profile_a",
    element: <Profile />,
  },
  {
    path: "/profile_b",
    element: <Profile />,
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
