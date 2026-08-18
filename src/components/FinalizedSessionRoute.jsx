import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { bridgeClient } from "../services/bridgeClient.js";
import { sessionStore } from "../services/sessionStore.js";

function FinalizedSessionRoute({ children, profileGender }) {
  const [credentials] = useState(() => sessionStore.load());
  const [result, setResult] = useState(() =>
    credentials ? null : { allowed: false },
  );

  useEffect(() => {
    let cancelled = false;

    if (!credentials) {
      return undefined;
    }

    bridgeClient
      .getSession(credentials)
      .then((session) => {
        if (!cancelled) {
          setResult({
            allowed:
              ["FINALIZED", "ACTIVE_PROFILE"].includes(session.state) &&
              session.profile?.gender === profileGender,
          });
        }
      })
      .catch(() => {
        sessionStore.clear();
        if (!cancelled) setResult({ allowed: false });
      });

    return () => {
      cancelled = true;
    };
  }, [credentials, profileGender]);

  if (result === null) return null;
  return result.allowed ? children : <Navigate to="/profile-setting" replace />;
}

export default FinalizedSessionRoute;
