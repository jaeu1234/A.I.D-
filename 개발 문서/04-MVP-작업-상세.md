# 04 · MVP 작업 상세 (admin.html · upload.html)

두 화면 모두 `index.html`과 동일하게 `<script type="module">`로 `src/` 모듈을 import해 재사용한다.
데이터 계약은 `02-현재-구조.md` 참조.

---

## admin.html — 관리자 임시일정 관리

### import
- `src/data/schedule.js` → `TEACHERS`, `PERIODS`, `DAYS`
- `src/data/floors.js` → `FLOORS`, `OFFICE_IDS`, `ADMIN_PIN`
- `src/lib/location.js` → `loadOverrides`, `saveOverrides`, `getEffectiveSchedule`

### 구성
1. **PIN 게이트**: 진입 시 PIN 입력 → `ADMIN_PIN`과 비교. 통과 시 관리 UI 노출.
   - 한계: PIN이 클라이언트에 노출됨(README #6). Phase C에서 서버 인증으로 대체.
2. **임시일정 등록 폼**:
   - 선생님(select ← TEACHERS) · 날짜(date input) · 교시(select ← PERIODS) ·
     층(select ← FLOORS 키) → 방(select ← 해당 층 rooms) · 메모(note, optional)
   - 저장 시 override 조립:
     ```js
     { teacherId, date, periodIdx, label: room.label, room: room.id, floor: Number(층), note }
     ```
   - `loadOverrides()`에 push → `saveOverrides()`
3. **등록 목록**: `loadOverrides()`를 표로 렌더. 각 행 삭제 버튼 → 배열에서 제거 후 저장.
4. **시간표 요약**: 선생님 선택 시 `getEffectiveSchedule(id)`를 요일×교시 표로 표시.

### 검증
PIN 1234 → 오늘 날짜 임시일정 1건 등록 → 목록 표시 →
`index.html` 새로고침 시 해당 선생님이 등록 위치로 표시(override 우선) → 삭제 동작 확인.

---

## upload.html — 시간표 사진 AI 분석 등록

### import
- `src/data/schedule.js` → `TEACHERS`, `PERIODS`, `DAYS`
- `src/lib/location.js` → `saveAiSchedule`

### 흐름
1. **API 키 입력** → localStorage 키 `anthropic_api_key`에 저장. 보안 경고 노출.
2. **선생님 선택 + 사진 업로드**: `<input type="file" accept="image/*">` → FileReader로
   base64 인코딩(dataURL에서 콤마 뒤만 사용), media_type은 파일 MIME.
3. **Claude API 호출** (`fetch` `POST https://api.anthropic.com/v1/messages`):
   - **헤더**:
     ```
     x-api-key: <키>
     anthropic-version: 2023-06-01
     content-type: application/json
     anthropic-dangerous-direct-browser-access: true   ← 브라우저 직접 호출 필수
     ```
   - **모델**: `claude-sonnet-5` (README의 `claude-sonnet-4-6`은 구버전 → 갱신함)
   - **messages[0].content**:
     ```js
     [
       { type: 'image', source: { type:'base64', media_type, data: b64 } },
       { type: 'text', text: '<지시문>' }
     ]
     ```
     지시문: 시간표 사진을 `schedule[요일 0=월..4=금][교시 0..7]` 2차원 배열로 추출.
     값은 `'과목(학년-반)'` 문자열 또는 null. 8열 중 index 4(점심)은 null.
   - **output_config.format** = json_schema로 5×8 배열 형태 강제(Sonnet 5 지원).
     json_schema는 문자열 길이/개수 제약 미지원 → 형태만 강제, 값 검증은 클라이언트.
   - `max_tokens` ~4096, 단일 요청이라 스트리밍 불필요.
   - 응답: `response.content`에서 첫 text 블록의 JSON을 파싱.
4. **결과 편집 UI**: 파싱된 배열을 요일×교시 편집 가능한 표(셀당 text input)로 렌더.
   오파싱 수정 가능.
5. **저장**: `saveAiSchedule(teacherId, 편집된 schedule)` → localStorage `teacher_schedules`.
   이후 index/admin에서 데이터 우선순위에 따라 자동 반영.

### 한계 (문서화 대상)
- **API 키 노출**: 브라우저 직접 호출은 키가 클라이언트에 저장/전송됨. 실운영은 서버 프록시(Phase C).
- **파싱 취약**: 편집 UI가 1차 방어. 포맷 정규화는 Phase B.

### 검증
- 키 있으면 실제 사진 1장으로 호출 → 편집 표 채워짐 → 저장 → index 반영.
- 키 없으면 폼 렌더·base64 인코딩·잘못된 키 에러 처리까지 확인(실호출 미검증 명시).

---

## Claude API 응답 파싱 참고
- 성공 응답 구조: `{ content: [{ type:'text', text:'...' }, ...], stop_reason, ... }`
- `output_config.format`(json_schema) 사용 시 첫 text 블록이 유효 JSON 보장.
- 에러 시 HTTP 4xx/5xx + `{ error: { type, message } }`. 401=키 오류, 429=레이트리밋.
