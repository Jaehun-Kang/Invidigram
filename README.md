# Invidigram Judge Preview

React 없이 HTML, CSS, JavaScript만으로 만든 심사용 임시 페이지입니다.

## 실행 순서

1. 원래 프로젝트의 companion 브릿지를 먼저 실행합니다.

```powershell
Set-Location "d:\Desktop\SMU\Gr4-S1\FDS\test"
npm start
```

2. 새 PowerShell에서 Invidigram 미리보기 서버를 실행합니다.

```powershell
Set-Location "d:\Desktop\SMU\Gr4-S1\FDS\Invidigram"
node server.js
```

3. 브라우저에서 아래 주소를 엽니다.

```text
http://127.0.0.1:5177
```

## 사용 방법

1. `프로필 사진 설정`을 누릅니다.
2. 페이지가 웹 카메라를 직접 열지 않고 companion 브릿지에 정면, 좌측, 우측 guided capture 시작을 요청합니다.
3. companion이 게시하는 고화질 `/preview-frame` 화면을 가져와 보여줍니다.
4. 화면 아래의 `정면을 보세요`, `좌측을 보세요`, `우측을 보세요` 지침에 맞춰 얼굴을 둡니다.
5. companion이 `front`, `left`, `right` 슬롯을 모두 저장하고 `/completed-face-model` 응답이 유효해지면 빈 페이지로 이동합니다.

## 주의

1. companion 브릿지가 꺼져 있으면 카메라 화면, 얼굴 분석, 3D 모델 생성 확인이 되지 않습니다.
2. 이 페이지는 심사용 임시 구현이라 추가 설정 UI 없이 기본 브릿지 주소 `http://127.0.0.1:3000`만 사용합니다.
3. 캡처 완료 판정은 `front`, `left`, `right` 슬롯이 현재 세션 시작 이후 모두 갱신되었는지를 기준으로 합니다.
