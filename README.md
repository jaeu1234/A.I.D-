# 선생님 위치 안내 시스템

학생들이 선생님의 현재 위치와 이동 동선을 확인할 수 있는 학교 내부 서비스.

---

## 현재 파일 구조

```
teacher-map-v2/
├── src/
│   ├── data/
│   │   ├── schedule.js   → 교시 정의, 선생님 목록 및 기본 시간표
│   │   └── floors.js     → 층별 평면도 좌표 데이터, OFFICE_IDS, ADMIN_PIN
│   └── lib/
│       ├── time.js            → 시각/교시 유틸 (toMins, getCurrentPeriodIndex 등)
│       ├── location.js        → 선생님 위치 계산 (Supabase 캐시 읽기)
│       ├── route.js           → 복도·계단 따라가는 이동 경로 계산 (순수, floors.js만 의존)
│       ├── map.js             → Canvas 렌더러 (카메라, 줌, 핀, 이동 경로·이동 점)
│       ├── supabaseClient.js  → Supabase 클라이언트 초기화
│       └── sync.js            → 임시일정·AI 시간표 Supabase 동기화 (캐시·CRUD·Realtime)
│
├── public/               → (TODO) 빌드 결과물 또는 정적 에셋
│
├── index.html            → 학생용 공개 화면 (현재는 모노리식 단일 파일)
├── admin.html            → 임시 일정 관리 (PIN 인증)
├── upload.html           → 시간표 사진 AI 분석 등록
└── schedule.js           → admin.html, upload.html이 참조하는 공유 데이터
                            (index.html에는 인라인으로 포함됨)
```

---

## 기술 스택

- **언어**: 바닐라 HTML/CSS/JavaScript (빌드 도구 없음)
- **렌더링**: Canvas 2D API (평면도, 핀, 동선 화살표)
- **AI**: Anthropic Claude API `claude-sonnet-4-6` (시간표 사진 분석). API 키는 브라우저에 두지 않고
  서버리스 함수(`api/analyze.js`)가 환경변수(`ANTHROPIC_API_KEY`)로 보관·호출을 대신함
- **저장**: Supabase(Postgres + Realtime) — 임시일정·AI 시간표
- **호스팅**: Vercel — 프로덕션 **https://teacher-map.vercel.app/** (빌드 없이 정적 파일 그대로 서빙,
  `api/` 폴더만 서버리스 함수로 자동 인식됨). 배포 시 프로젝트 환경변수에 `ANTHROPIC_API_KEY` 등록 필요

---

## 데이터 우선순위

```
임시 일정 (Supabase: overrides 테이블, 기기 간 Realtime 동기화)
    ↓ 없으면
AI 분석 시간표 (Supabase: ai_schedules 테이블, 기기 간 Realtime 동기화)
    ↓ 없으면
기본 하드코딩 시간표 (src/data/schedule.js)
```

---

## 주요 기능

### index.html (학생용)
- 선생님/반 모드 전환, 이름·과목 검색(선생님) / "1-7" 형식 검색(반)
- 층 탭으로 평면도 전환, 선생님 선택 시 위치한 층·교실로 자동 이동+줌
- 정보 패널(모바일은 하단 바텀시트): 현재 위치, 다음 이동(교시·장소·계단 경유·이동 진행률%), 임시일정 메모, 오늘 요일 시간표 타임라인
- 반 모드: 학급 주간 시간표 표
- 캔버스 인터랙션: 휠 줌, 드래그 패닝, 두 손가락 핀치 줌(모바일), 핀 클릭 선택, 확대/축소/전체보기 버튼
- 쉬는 시간 이동 경로 시각화: 복도·계단을 따라가는 실제 동선 애니메이션, 층이 바뀌면 지도도 자동 전환
- 모바일 반응형: 좌측 목록 슬라이드 드로어, 정보 패널 바텀시트, 햄버거 메뉴
- 실시간 시계·현재 교시 뱃지 (주말엔 월요일 시간표 기준)
- Supabase Realtime으로 다른 기기(관리자 임시일정, AI 업로드)의 변경사항 자동 반영

### admin.html (관리자용)
- PIN 로그인
- 선생님·날짜·교시·층·방 선택으로 임시일정 등록/삭제 (Supabase 연동)
- 등록된 임시일정 목록 확인
- 선생님별 주간 시간표 요약 (AI 시간표 우선 적용 결과 확인)

### upload.html (시간표 업로드)
- 선생님/반 시간표 모드 전환, 시간표 사진 업로드·미리보기
- 사진을 서버리스 함수(`api/analyze.js`)로 전송 → 그 함수가 Claude API를 호출해 요일×교시 표로 자동 파싱
  (API 키는 서버 환경변수에만 있고 브라우저에는 노출되지 않음)
- 파싱 결과 셀 단위 수정 후 Supabase 저장

---

## 알려진 문제 및 리팩토링 필요 항목

### 🔴 버그 / 불안정

1. **index.html 모노리식 구조**
   - `schedule.js` 인라인 내장 + 자체 로직 2,700줄 → 분리 필요
   - VS Code에서 작업 시 `src/` 폴더 파일 기준으로 재작성 권장

2. **FLOORS 데이터 중복**
   - `schedule.js`와 `index_merged.html` 두 곳에 FLOORS가 존재
   - 수정 시 한쪽만 반영되는 싱크 문제 발생 가능

3. **canvas 히트테스트 부정확**
   - 여러 선생님이 같은 방에 있을 때 핀이 겹쳐서 클릭 판정 오류
   - `map.js`의 `hitTestPin`에서 분산 배치 후 개별 히트테스트 필요

4. **쉬는 시간 동선 미완성**
   - `map.js` `_drawTeacherRoute`에서 현재→다음 화살표 미구현

### 🟡 개선 필요

5. ~~localStorage만 사용 → 기기 간 동기화 없음~~ ✅ 완료 (2026-07-08)
   - Supabase(`overrides`/`ai_schedules` 테이블) + Realtime으로 임시일정·AI 시간표를 기기 간 동기화
   - 연동 코드: `src/lib/supabaseClient.js`, `src/lib/sync.js`. 스키마: `supabase_schema.sql`
   - 단, 기본 시간표(`TEACHERS`, `src/data/schedule.js`)는 여전히 코드 배포로만 갱신됨

6. **PIN 보안 취약**
   - `ADMIN_PIN = '1234'` 하드코딩, 클라이언트에 노출
   - 실사용 시 서버사이드 인증 또는 최소 환경변수로 분리 필요

7. ~~시간표 파싱 정규식 취약~~ ✅ 완료
   - 선생님 시간표(`schedule.js` `parseClassLabel`)와 반 AI 시간표(`location.js`
     `_parseClassScheduleCell`) 모두 문자열 끝의 괄호만 학년-반/선생님이름으로 인식하도록
     앵커링해, 과목명에 괄호가 섞여도(예: `국어(문학)(홍길동)`) 오파싱되지 않음

8. **주말 처리**
   - `getTodayIndex()`가 토·일을 `0(월)`로 고정 → 의도된 것이지만 주석 부재

### 🟢 다음 작업 목록 (우선순위 순)

- [ ] `src/` 기반으로 index.html 재작성 (ES module import 사용)
- [x] 이동 경로 시각화 (2026-07-15): 복도·계단을 따라가는 실제 동선 + 쉬는 시간 진행률 기반 이동 점 + 다른 층이면 계단 경유·자동 층 전환. `src/lib/route.js`(순수 경로 계산) + `map.js`(`_drawTeacherRoute`/`_drawRoutePath`). 설계: `docs/research/07-15-teacher-route/`
- [x] Supabase 연동으로 멀티 기기 동기화 (2026-07-08)
- [ ] 선생님별 개별 PIN 또는 구글 로그인
- [x] 실제 학교 시간표 데이터 입력 (2026-07-08, 1학년 1~10반)
- [ ] 반응형 / 전자칠판 풀스크린 최적화
