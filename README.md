# 선생님 위치 안내 시스템

학생들이 선생님의 현재 위치와 이동 동선을 확인할 수 있는 학교 내부 서비스.

---

## 현재 파일 구조

```
teacher-map-v2/
├── src/
│   ├── data/
│   │   ├── schedule.js   → 교시 정의, 선생님 목록·기본 시간표, 셀 파싱(parseClassLabel/parseClassScheduleCell)
│   │   └── floors.js     → 층별 평면도 좌표 데이터, OFFICE_IDS (ADMIN_PIN은 더 이상 여기 없음 — 서버 환경변수로 이동)
│   └── lib/
│       ├── time.js            → 시각/교시 유틸 (toMins, getCurrentPeriodIndex 등, now 인자로 테스트 가능)
│       ├── location.js        → 선생님 위치 계산 (Supabase 캐시 읽기 전용)
│       ├── route.js           → 복도·계단 따라가는 이동 경로 계산 (순수, floors.js만 의존)
│       ├── map.js             → Canvas 렌더러 (카메라, 줌, 핀, 이동 경로·이동 점)
│       ├── html.js            → escapeHtml 공용 유틸
│       ├── supabaseClient.js  → Supabase 클라이언트 초기화 (읽기 전용, anon key)
│       └── sync.js            → 읽기는 Supabase 캐시로, 쓰기는 /api/admin-write 호출로 위임
│
├── api/                  → Vercel 서버리스 함수 (이 폴더만 자동으로 함수 라우트가 됨)
│   ├── _lib/supabaseAdmin.js  → service_role 키로 Supabase REST 직접 호출 (앞에 _가 붙어 라우트 제외)
│   ├── analyze.js             → 시간표 사진 → Claude API 분석 (ANTHROPIC_API_KEY는 여기서만 사용)
│   ├── verify-pin.js          → PIN 게이트 즉시 확인용(그 자체로 쓰기 권한을 주지 않음)
│   └── admin-write.js         → 임시일정·AI 시간표 실제 쓰기 (PIN 서버 검증 + service_role)
│
├── tests/                → node --test로 실행하는 유닛 테스트 (설치 없이 Node 내장 러너 사용)
│
├── index.html            → 학생용 공개 화면 (현재는 모노리식 단일 파일)
├── admin.html            → 임시 일정 관리 (PIN 게이트)
├── upload.html           → 시간표 사진 AI 분석 등록 (PIN 게이트)
├── supabase_schema.sql   → 테이블 정의 + RLS 정책 (Supabase SQL Editor에서 실행)
└── package.json          → npm install 대상 아님, Dependabot이 CDN 고정 버전을 추적하기 위한 문서용
```

---

## 기술 스택

- **언어**: 바닐라 HTML/CSS/JavaScript (프론트엔드는 빌드 과정 없음. `package.json`은 npm install
  대상이 아니라 Dependabot이 CDN 고정 버전을 추적하게 하기 위한 문서용 파일)
- **렌더링**: Canvas 2D API (평면도, 핀, 동선 화살표)
- **AI**: Anthropic Claude API `claude-sonnet-4-6` (시간표 사진 분석). API 키는 브라우저에 두지 않고
  서버리스 함수(`api/analyze.js`)가 환경변수(`ANTHROPIC_API_KEY`)로 보관·호출을 대신함
- **저장**: Supabase(Postgres + Realtime) — 임시일정·AI 시간표. anon key는 **읽기 전용**(RLS)이고,
  실제 쓰기는 `api/admin-write.js`가 PIN을 서버에서 검증한 뒤 service_role 키로만 수행함
- **관리자 인증**: PIN은 클라이언트에 두지 않고 서버 환경변수(`ADMIN_PIN`)로만 존재.
  `api/verify-pin.js`(게이트 UX용 확인)와 `api/admin-write.js`(실제 쓰기, 매 요청마다 재검증)가 검증
- **테스트**: `node --test` (Node 18+ 내장 러너, 별도 설치 없음) — `tests/` 폴더, 순수 로직만 커버
  (Supabase를 거치는 코드는 브라우저 전용 CDN import 때문에 Node에서 직접 테스트하기 어려움)
- **호스팅**: Vercel — 프로덕션 **https://teacher-map.vercel.app/** (프론트는 빌드 없이 정적 파일
  그대로 서빙, `api/` 폴더만 서버리스 함수로 자동 인식됨. `package.json`이 있어 배포 시 `npm install`은
  실행되지만 실제로 쓰이는 곳은 없음). **GitHub Pages 워크플로우는 이 저장소에 남아있을 수 있지만
  사용하지 않음** — 유일한 프로덕션은 Vercel이다. 배포 전 아래 "배포 전 필요한 설정" 참고

### 배포 전 필요한 설정

1. **Vercel 프로젝트 환경변수**에 아래 세 개를 등록:
   - `ANTHROPIC_API_KEY` — 시간표 사진 분석용
   - `ADMIN_PIN` — 관리자 페이지 PIN (기존에 클라이언트에 노출됐던 값은 이미 git 히스토리에 남아있으니
     그대로 쓰지 말고 새 값으로 교체 권장)
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase 프로젝트 설정 → API → service_role 키 (⚠️ anon key와
     다름, RLS를 완전히 우회하므로 절대 브라우저에 노출되면 안 됨)
2. **Supabase SQL Editor**에서 `supabase_schema.sql`의 마이그레이션 블록(anon 쓰기 정책 제거 부분)을
   실행 — 이미 처음부터 전체 스크립트를 실행한 적이 있다면 이 블록만 다시 실행해도 됨

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

6. ~~PIN 보안 취약~~ ✅ 완료
   - PIN이 클라이언트 상수(floors.js `ADMIN_PIN`)로 노출돼 있었고, 실제 Supabase 쓰기는 RLS가
     anon key에 `for all using (true)`를 허용해서, 누구든 devtools 콘솔에서 PIN 확인 없이
     `overrides`/`ai_schedules`/`class_ai_schedules`를 직접 조작할 수 있었다(PIN은 화면 잠금일 뿐
     DB 접근을 막지 못함)
   - PIN을 서버 환경변수(`ADMIN_PIN`)로 옮기고, 쓰기는 `api/admin-write.js`가 PIN을 서버에서
     재검증한 뒤 service_role 키로만 수행하도록 변경. RLS도 anon엔 읽기만 허용하도록 하드닝
     (`supabase_schema.sql`의 마이그레이션 블록). upload.html에도 같은 PIN 게이트 추가(예전엔 없었음)

7. ~~시간표 파싱 정규식 취약~~ ✅ 완료
   - 선생님 시간표(`schedule.js` `parseClassLabel`)와 반 AI 시간표(`schedule.js`
     `parseClassScheduleCell`, 원래 `location.js`에 있던 걸 테스트 가능하도록 이전) 모두
     문자열 끝의 괄호만 학년-반/선생님이름으로 인식하도록 앵커링해, 과목명에 괄호가 섞여도
     (예: `국어(문학)(홍길동)`) 오파싱되지 않음

8. **주말 처리**
   - `getTodayIndex()`가 토·일을 `0(월)`로 고정 → 의도된 것이지만 주석 부재

### 🟢 다음 작업 목록 (우선순위 순)

- [ ] `src/` 기반으로 index.html 재작성 (ES module import 사용)
- [x] 이동 경로 시각화 (2026-07-15): 복도·계단을 따라가는 실제 동선 + 쉬는 시간 진행률 기반 이동 점 + 다른 층이면 계단 경유·자동 층 전환. `src/lib/route.js`(순수 경로 계산) + `map.js`(`_drawTeacherRoute`/`_drawRoutePath`). 설계: `docs/research/07-15-teacher-route/`
- [x] Supabase 연동으로 멀티 기기 동기화 (2026-07-08)
- [ ] 선생님별 개별 PIN 또는 구글 로그인
- [x] 실제 학교 시간표 데이터 입력 (2026-07-08, 1학년 1~10반)
- [ ] 반응형 / 전자칠판 풀스크린 최적화
