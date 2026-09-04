import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import iconProfile from "../assets/icons/profile.svg";
import iconRefresh from "../assets/icons/refresh.svg";
import iconCheck from "../assets/icons/check.svg";
import iconLoading from "../assets/icons/loading.svg";
import usernameWords from "../data/usernameWords.json";
import { saveCurrentAudience } from "../utils/audienceStore.js";
import convertKoreanToQwerty from "../utils/convertKoreanToQwerty.js";
import { bridgeClient } from "../services/bridgeClient.js";
import { useProfileSession } from "../hooks/useProfileSession.js";

const genderOptions = [
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
];

const getRandomItem = (items) =>
  items[Math.floor(Math.random() * items.length)];

const normalizeUsername = (value) =>
  convertKoreanToQwerty(value)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._]+/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/_{2,}/g, "_")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 30);

const createUsernameSuggestion = (previousWord) => {
  const availableWords = usernameWords.filter((word) => word !== previousWord);
  const word = getRandomItem(
    availableWords.length ? availableWords : usernameWords,
  );
  const number = Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, "0");

  return {
    username: `${word}.${number}`,
    word,
  };
};

const logPreviewError = (message, error) => {
  console.warn(`[BI] ${message}`, {
    code: error?.code,
    message: error?.message,
    status: error?.status,
    retryable: error?.retryable,
    requestId: error?.requestId,
  });
};

function ProfileSetting() {
  const navigate = useNavigate();
  const autoFinalizeStartedRef = useRef(false);
  const genderRef = useRef(null);
  const lastUsernameWordRef = useRef("");
  const saveLoginDataRef = useRef(null);
  const [username, setUsername] = useState("");
  const [autoFinalizeMessage, setAutoFinalizeMessage] = useState("");
  const [isAutoFinalizing, setIsAutoFinalizing] = useState(false);
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const {
    canStartCapture,
    captureCountdown,
    finalize,
    isBusy,
    isCaptureComplete,
    startCapture,
    statusMessage,
  } = useProfileSession();
  const selectedGenderLabel =
    genderOptions.find((option) => option.value === selectedGender)?.label ??
    "성별";
  const guidanceMessage = !username
    ? "사용자 이름을 설정해주세요"
    : !selectedGender
      ? "성별을 선택해주세요"
      : autoFinalizeMessage || statusMessage;
  const isCaptureRunning = isBusy && !isAutoFinalizing;
  const isPrimaryButtonDisabled =
    isBusy || isAutoFinalizing || !canStartCapture || !username || !selectedGender;

  const saveLoginData = async () => {
    const finalized = await finalize({ username, gender: selectedGender });

    if (!finalized) return false;
    saveCurrentAudience({
      username,
      gender: selectedGender,
      profileImage: finalized.profileImage ?? iconProfile,
    });
    navigate(finalized.profileRoute, { replace: true });
    return true;
  };

  saveLoginDataRef.current = saveLoginData;

  const handlePrimaryButtonClick = async () => {
    autoFinalizeStartedRef.current = false;
    setAutoFinalizeMessage("");
    setPreviewUrl("");

    try {
      await bridgeClient.startCameraPreview();
      setPreviewUrl(bridgeClient.getCameraPreviewStreamUrl());
    } catch (error) {
      logPreviewError("Camera preview start failed", error);
    }

    await startCapture();
  };

  useEffect(() => {
    if (
      !isCaptureComplete ||
      !username ||
      !selectedGender ||
      autoFinalizeStartedRef.current
    ) {
      return undefined;
    }

    autoFinalizeStartedRef.current = true;
    setAutoFinalizeMessage("프로필 촬영 완료");
    setIsAutoFinalizing(true);

    const timer = window.setTimeout(() => {
      setAutoFinalizeMessage("얼굴 데이터 분석중");
      saveLoginDataRef.current()
        .then((saved) => {
          if (!saved) {
            autoFinalizeStartedRef.current = false;
            setAutoFinalizeMessage("프로필 저장을 다시 시도해주세요");
          }
        })
        .catch((error) => logPreviewError("Automatic profile finalize failed", error))
        .finally(() => {
          setIsAutoFinalizing(false);
        });
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isCaptureComplete, selectedGender, username]);

  useEffect(() => {
    if (!isGenderOpen) {
      return;
    }

    const closeOnOutsideClick = (event) => {
      if (!genderRef.current?.contains(event.target)) {
        setIsGenderOpen(false);
      }
    };

    window.addEventListener("pointerdown", closeOnOutsideClick);

    return () => {
      window.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [isGenderOpen]);

  return (
    <main>
      <div className="profile_setting">
        <div className="profile_setting--profile">
          <div className="profile_setting--profile--img">
            <img
              className={previewUrl ? "is-live" : ""}
              src={previewUrl || iconProfile}
              alt="Profile camera preview"
            />
            {captureCountdown !== null && (
              <div
                className="profile_setting--profile--img--countdown"
                aria-live="polite"
                style={{
                  alignItems: "center",
                  color: "rgba(255, 255, 255, 0.82)",
                  display: "flex",
                  fontSize: "clamp(96px, 16vw, 168px)",
                  fontWeight: 800,
                  inset: 0,
                  justifyContent: "center",
                  lineHeight: 1,
                  pointerEvents: "none",
                  position: "absolute",
                  textShadow: "0 2px 24px rgba(0, 0, 0, 0.28)",
                }}
              >
                {captureCountdown}
              </div>
            )}
          </div>
          <div className="profile_setting--profile--info">
            <div className="profile_setting--profile--info--box">
              <div className="profile_setting--profile--info--box--username">
                <input
                  className="profile_setting--profile--info--box--username--input"
                  type="text"
                  value={username}
                  maxLength={30}
                  spellCheck="false"
                  onFocus={(event) => event.target.select()}
                  onChange={(event) =>
                    setUsername(normalizeUsername(event.target.value))
                  }
                  placeholder="사용자 이름"
                />
                <button
                  type="button"
                  aria-label="사용자 이름 새로고침"
                  onClick={() => {
                    const suggestion = createUsernameSuggestion(
                      lastUsernameWordRef.current,
                    );

                    lastUsernameWordRef.current = suggestion.word;
                    setUsername(suggestion.username);
                  }}
                >
                  <img src={iconRefresh} alt="" />
                </button>
              </div>
              <div
                className="profile_setting--profile--info--box--gender"
                ref={genderRef}
              >
                <button
                  className="profile_setting--profile--info--box--gender--button"
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isGenderOpen}
                  onClick={() => setIsGenderOpen((isOpen) => !isOpen)}
                >
                  <span data-placeholder={!selectedGender}>
                    {selectedGenderLabel}
                  </span>
                </button>
                {isGenderOpen && (
                  <div
                    className="profile_setting--profile--info--box--gender--list"
                    role="listbox"
                  >
                    {genderOptions.map((option) => (
                      <button
                        className="profile_setting--profile--info--box--gender--list--option"
                        type="button"
                        role="option"
                        aria-selected={selectedGender === option.value}
                        key={option.value}
                        onClick={() => {
                          setSelectedGender(option.value);
                          setIsGenderOpen(false);
                        }}
                      >
                        {option.label}
                        <div className="profile_setting--profile--info--box--gender--list--option--radio">
                          <img src={iconCheck} alt="" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="profile_setting--profile--info--message">
              {guidanceMessage}
            </div>
            <div className="profile_setting--btns">
              <button
                className="profile_setting--btns--capture"
                disabled={isPrimaryButtonDisabled}
                onClick={handlePrimaryButtonClick}
              >
                {isAutoFinalizing ? (
                  <span
                    style={{
                      alignItems: "center",
                      display: "inline-flex",
                      height: "100%",
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    <img src={iconLoading} alt="" />
                  </span>
                ) : isCaptureRunning ? (
                  "프로필 촬영 중"
                ) : (
                  "프로필 촬영"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ProfileSetting;
