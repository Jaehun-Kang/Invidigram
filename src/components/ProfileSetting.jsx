import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import iconProfile from "../assets/icons/profile.svg";
import iconRefresh from "../assets/icons/refresh.svg";
import iconCheck from "../assets/icons/check.svg";
import usernameWords from "../data/usernameWords.json";
import { saveCurrentAudience } from "../utils/audienceStore.js";
import convertKoreanToQwerty from "../utils/convertKoreanToQwerty.js";
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

function ProfileSetting() {
  const navigate = useNavigate();
  const genderRef = useRef(null);
  const lastUsernameWordRef = useRef("");
  const [username, setUsername] = useState("");
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [selectedGender, setSelectedGender] = useState("");
  const {
    canStartCapture,
    finalize,
    isBusy,
    isCaptureComplete,
    startCapture,
    statusMessage,
  } = useProfileSession();
  const selectedGenderLabel =
    genderOptions.find((option) => option.value === selectedGender)?.label ??
    "성별";

  const saveLoginData = async () => {
    const finalized = await finalize({ username, gender: selectedGender });

    if (!finalized) return;
    saveCurrentAudience({
      username,
      gender: selectedGender,
      profileImage: iconProfile,
    });
    navigate(finalized.profileRoute, { replace: true });
  };

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
            <img src={iconProfile} alt="Profile image placeholder" />
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
                        }}
                      >
                        {option.label}
                        <div className="profile_setting--profile--info--box--gender--list--option--radio">
                          <img src={iconCheck} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="profile_setting--profile--info--message">
              {statusMessage}
            </div>
          </div>
        </div>
        <div className="profile_setting--btns">
          <button
            className="profile_setting--btns--capture"
            disabled={!canStartCapture}
            onClick={startCapture}
          >
            프로필 촬영
          </button>
          <button
            className="profile_setting--btns--save"
            disabled={
              isBusy || !isCaptureComplete || !username || !selectedGender
            }
            onClick={saveLoginData}
          >
            저장
          </button>
        </div>
      </div>
    </main>
  );
}

export default ProfileSetting;
