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
│       ├── time.js       → 시각/교시 유틸 (toMins, getCurrentPeriodIndex 등)
│       ├── location.js   → 선생님 위치 계산 (localStorage 포함)
│       └── map.js        → Canvas 렌더러 (카메라, 줌, 핀 드로잉)
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
- **AI**: Anthropic Claude API `claude-sonnet-4-6` (시간표 사진 분석)
- **저장**: `localStorage` (시간표, 임시일정, API키)
- **호스팅**: 정적 파일 → GitHub Pages / Netlify 등 무료 호스팅 가능

---

## 데이터 우선순위

```
임시 일정 (localStorage: teacher_overrides)
    ↓ 없으면
AI 분석 시간표 (localStorage: teacher_schedules)
    ↓ 없으면
기본 하드코딩 시간표 (src/data/schedule.js)
```

---

## 주요 기능

| 화면 | 기능 |
|------|------|
| index.html | 선생님 검색 / 2D 평면도 마킹 / 현재+다음 위치 표시 / 동선 타임라인 |
| admin.html | PIN 로그인 / 날짜별 임시 일정 등록·삭제 / 시간표 요약 |
| upload.html | 시간표 사진 업로드 → Claude API 분석 → 결과 수정 → 저장 |

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

5. **localStorage만 사용 → 기기 간 동기화 없음**
   - 선생님이 A 컴퓨터에서 임시일정 등록해도 전자칠판에 미반영
   - Firebase Firestore 또는 Supabase 연동 필요

6. **PIN 보안 취약**
   - `ADMIN_PIN = '1234'` 하드코딩, 클라이언트에 노출
   - 실사용 시 서버사이드 인증 또는 최소 환경변수로 분리 필요

7. **시간표 파싱 정규식 취약**
   - `cls.match(/\((\d+)-(\d+)\)/)` → 과목명에 괄호 있으면 오파싱
   - 데이터 포맷을 `{ subject, grade, class }` 객체로 정규화 권장

8. **주말 처리**
   - `getTodayIndex()`가 토·일을 `0(월)`로 고정 → 의도된 것이지만 주석 부재

### 🟢 다음 작업 목록 (우선순위 순)

- [ ] `src/` 기반으로 index.html 재작성 (ES module import 사용)
- [ ] 동선 화살표 완성 (`_drawTeacherRoute`)
- [ ] Firebase 연동으로 멀티 기기 동기화
- [ ] 선생님별 개별 PIN 또는 구글 로그인
- [ ] 실제 학교 시간표 데이터 입력
- [ ] 반응형 / 전자칠판 풀스크린 최적화
