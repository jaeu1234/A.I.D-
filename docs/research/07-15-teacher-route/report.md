# 연구 보고서: 시간 기반 선생님 이동 경로(목적지·동선) 시각화

**작성일**: 2026-07-15 / **상태**: Approved (구현 착수)

## 1. 개요

### 배경·목적
학생용 화면(`index.html`)은 현재 선생님의 "현재 방 강조 + 다음 방으로 향하는 **직선 점선 화살표**"(`map.js` `_drawRouteArrow`)만 그린다. 이 화살표는 벽을 관통하는 두 방 중심 직선이라 실제 이동 동선(복도·계단)을 반영하지 못하고, 층이 다르면 아예 생략된다.

목적: **현재 시각을 기준으로** 선생님의 (1) 목적지(다음 교시 방)와 (2) 복도·계단을 따라가는 실제 경로를, 쉬는 시간에는 **진행률에 따라 이동하는 점**으로 애니메이션한다. 목적지가 다른 층이면 **계단 경유 2단 경로 + 자동 층 전환**으로 이어 보여준다.

### 범위
- **In**: Web(`index.html`) 캔버스 렌더, 경로 계산 모듈 신설, 이동 애니메이션·자동 층 전환.
- **Out**: 백엔드/DB 변경 없음(순수 클라이언트 렌더). admin/upload 화면 무변경. 데이터(`schedule.js`/`floors.js`) 스키마 변경 없음.

## 2. 현황 분석

### 재사용 가능 자산 (그대로 사용)
| 자산 | 위치 | 용도 |
|------|------|------|
| `getNextMove()` | `location.js:216` | 현재→다음 교시 위치(fromLoc/toLoc), `isMovingNow` |
| `getTeacherLocation()` | `location.js:96` | 특별실·교무실·override 반영한 방 id·층 |
| `getBreakAfterIndex()` | `time.js:43` | "지금 쉬는 시간(이동 중)"과 직전 교시 판정 |
| `PERIODS[i].end/start` | `schedule.js:4` | 쉬는 시간 구간 → 진행률(%) 계산 |
| `resolveRoom()` / `OFFICE_IDS` / `findRoomFloor()` | `location.js:252`, `floors.js` | 논리 room id → 실제 room 객체·층 |
| 캔버스 파이프라인(월드좌표 드로잉, `zoomToRoom` rAF, DPR/카메라) | `map.js` | 폴리라인·이동 점 렌더에 그대로 얹음 |

### 결정적 결핍
- **복도/계단을 잇는 내비 그래프가 없음.** `hall*`·`stair*L/M/R`은 렌더용 사각형일 뿐 연결 정보(엣지)가 없다.
- **해결의 열쇠**: 층 구조가 매우 규칙적이다 — 상단행(y 0~100)/**복도 스파인(y≈109)**/하단행(y 118~218) 2열 격자, 계단은 전 높이(y 0~220)를 차지하는 L·M·R. 따라서 **그래프를 손으로 만들 필요 없이 좌표에서 절차적으로** "방→방 문(복도 접점)→복도 중심선→가장 가까운 계단→(층 이동)→목적지" 맨해튼 경로를 계산할 수 있다. 배치도가 자주 바뀌는 프로젝트라, 데이터를 늘리지 않는 **절차적 라우터**가 유지보수 ROI가 가장 높다.

## 3. 기술 결정

| 결정 | 선택 | 근거 | 기각 대안 |
|------|------|------|-----------|
| 경로 표현 | 좌표 기반 **절차적 라우터**(신규 `route.js`) | 규칙적 격자 → 그래프 불필요, 배치도 변경에 자동 적응 | 손수 웨이포인트 그래프(유지보수 비용 큼), A*(과잉) |
| 복도 중심선 | `hall*` room 중심 y(≈109) | 데이터에 이미 존재, 층마다 자동 산출 | 상수 하드코딩(층 구조 변경에 취약) |
| 층간 이동 | 가장 가까운 **계단(L/M/R suffix 매칭)** 경유 2단 세그먼트 | 계단 id suffix가 상하층 대응, 좌표 근접 | 계단 그래프 신설(불필요) |
| 진행률 | `(now-end)/(nextStart-end)` clamp | 쉬는 시간 구간이 곧 이동 시간대 | 고정 애니메이션(시각과 무관 → 요구 불충족) |
| 애니메이션 구동 | 선택/쉬는시간에 한해 rAF 인트로(≈1.4s) 후 1s 틱 | 실시간 표류는 눈에 안 보임 → 인트로로 가시화, 평상시 CPU 절약 | 상시 60fps rAF(낭비), 정적(요구 불충족) |
| 교무실(floor=null) 해석 | 상대 엔드포인트 층의 교무실로 우선 매핑 | 수업↔교무실이 불필요하게 층을 넘지 않음 | 항상 현재 표시 층(엉뚱한 층 이동 유발) |

## 4. 설계

### 신규 모듈 `src/lib/route.js` (순수 · `floors.js`에만 의존)
- `resolveEndpoint(loc, hintFloor)` → `{room, floor} | null` (office·특별실·room=null 처리)
- `computeRoute(fromRoom, toRoom, fromFloor, toFloor)` → 
  `{ crossFloor, fromFloor, toFloor, stairKey, segments:[{floor, pts:[{x,y}], length}], totalLength }`
  - 같은 층: 1 세그먼트 `[중심→문→복도중심선→…→문→중심]`
  - 다른 층: `[fromFloor: 방→계단]`, (가상 계단 길이), `[toFloor: 계단→방]`
- `routePointAt(route, t∈[0,1])` → `{x, y, floor, onStairs}` (계단 중간 넘으면 floor가 toFloor로 전환 → 자동 층 전환 트리거)
- 내부 헬퍼: `corridorY(floor)`, `roomDoor(room, cy)`, `nearestStair(floor, x)`

### `src/lib/map.js`
- `_routeContext(teacherId)`: from/to 엔드포인트·route·moving·progress를 한 번에 계산(렌더와 `getTravelerState` 공유).
- `_drawTeacherRoute`: 현재/목적지 방 강조 + **현재 층에 해당하는 세그먼트 폴리라인**(방향 화살촉) + 계단 라벨("→ N층") + 목적지 마커 + **이동 점**(현재 층일 때).
- 신규 export: `getTravelerState(teacherId)`(index.html의 층 추적용), `setRouteProgress(p)`(인트로 스윕 override; null=실시각).

### `index.html`
- `startRouteAnim()`/`stopRouteAnim()`: 선택 시 rAF 인트로(0→실진행률) → 1s 틱. `getTravelerState().pos.floor`가 바뀌면 `switchFloor`로 **자동 층 추적**.
- `renderInfo()`: 다음 위치 문구에 계단·층 정보 보강.

### 계층 배치 (ADR 02)
- 순수 기하/경로 계산 → `route.js`(뷰·상태 무관, 테스트 가능).
- 캔버스 드로잉·카메라 → `map.js`. 화면 전환·타이머·층 추적 → `index.html`.

## 5. 구현 계획
1. `route.js` 신설 + Node 단독 기하 검증(브라우저 의존 없음).
2. `map.js`에 `_routeContext`/`getTravelerState`/`setRouteProgress`, `_drawTeacherRoute`·`_drawRoutePath` 개편.
3. `index.html` 애니메이션 드라이버·자동 층 전환·정보 패널 보강.
4. 브라우저 실행 검증(같은 층·다른 층·쉬는 시간 진행률·자동 층 전환).

**완료 기준**: 쉬는 시간에 선택한 선생님의 이동 점이 복도를 따라 목적지로 이동하고, 다른 층이면 계단→자동 층 전환으로 이어진다. 수업 중에는 목적지 경로가 정적으로 표시된다.

## 6. 위험 관리
| 위험 | 확률 | 완화 |
|------|------|------|
| 별관/abs 방은 복도에 안 접함 → 경로가 어색 | 중 | 문 앵커를 복도 중심선 방향으로 계산, 접점 없으면 중심→복도 직결(허용) |
| `room:null` 특별실(체육관 등)·office 모호성 | 중 | `resolveEndpoint`가 null·office를 명시 처리, 경로 불가 시 정적 강조로 폴백 |
| 자동 층 전환이 `resetZoom`으로 카메라 초기화 | 낮 | 층이 실제 바뀔 때만 1회 호출(프레임마다 X) |
| 지하(0층) 등 복도 없는 층 | 낮 | `corridorY` 폴백 상수, 계단 없으면 직선 폴백 |

## 7. 다음 단계
설계 리스크는 순수 기하 계산에 국한(DB·외부 API·트랜잭션 없음) → `/logic-design-review` 불요. 바로 구현 → 브라우저 실행 검증.
