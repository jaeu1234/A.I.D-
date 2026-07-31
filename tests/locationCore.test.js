import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERIODS } from '../src/data/schedule.js';
import { OFFICE_IDS, FLOORS } from '../src/data/floors.js';
import {
  resolveSpecialRoom, resolveTeacherLocation, combineClassSchedule,
  classifyTimeline, statusColor, resolveRoom,
} from '../src/lib/locationCore.js';

// ── resolveSpecialRoom ──────────────────────
test('resolveSpecialRoom: 과목 기본 매핑(체육 → 체육관)', () => {
  const r = resolveSpecialRoom('아무개', '체육');
  assert.equal(r.room, 'gymnasium');
});

test('resolveSpecialRoom: 교사별 override가 과목 기본 매핑보다 우선(김선희 정보 → AI실)', () => {
  const r = resolveSpecialRoom('KS', '정보');
  assert.equal(r.room, 'ai-room');
});

test('resolveSpecialRoom: override 없는 교사는 과목 기본 매핑 사용(정보 → 컴퓨터실)', () => {
  const r = resolveSpecialRoom('아무개', '정보');
  assert.equal(r.room, 'computer-room');
});

test('resolveSpecialRoom: 특별과목이 아니면 null', () => {
  assert.equal(resolveSpecialRoom('아무개', '수학'), null);
});

// ── resolveTeacherLocation ───────────────────
const ctxBase = { periods: PERIODS, overrides: [], today: '2026-07-31' };

test('resolveTeacherLocation: periodIdx<0이면 쉬는 시간', () => {
  const loc = resolveTeacherLocation('T1', 0, -1, { ...ctxBase, schedule: null });
  assert.equal(loc.type, 'break');
});

test('resolveTeacherLocation: 점심 교시는 항상 점심(시간표 무관)', () => {
  const lunchIdx = PERIODS.findIndex(p => p.isLunch);
  const loc = resolveTeacherLocation('T1', 0, lunchIdx, { ...ctxBase, schedule: null });
  assert.equal(loc.type, 'lunch');
});

test('resolveTeacherLocation: 오늘 날짜·교시가 일치하는 임시일정이 시간표보다 우선', () => {
  const overrides = [{ teacherId: 'T1', date: '2026-07-31', periodIdx: 0, label: '학부모 상담', room: 'office', floor: 5, note: '3반 학부모' }];
  const schedule = [[{ subject: '수학', grade: 1, class: 1, label: '수학(1-1)' }], [], [], [], []];
  const loc = resolveTeacherLocation('T1', 0, 0, { ...ctxBase, overrides, schedule });
  assert.equal(loc.type, 'override');
  assert.equal(loc.label, '학부모 상담');
});

test('resolveTeacherLocation: 날짜가 다른 임시일정은 무시하고 시간표를 따름', () => {
  const overrides = [{ teacherId: 'T1', date: '2026-08-01', periodIdx: 0, label: '학부모 상담', room: 'office', floor: 5 }];
  const schedule = [[{ subject: '수학', grade: 1, class: 1, label: '수학(1-1)' }], [], [], [], []];
  const loc = resolveTeacherLocation('T1', 0, 0, { ...ctxBase, overrides, schedule });
  assert.equal(loc.type, 'class');
});

test('resolveTeacherLocation: 시간표가 없으면 교무실', () => {
  const loc = resolveTeacherLocation('T1', 0, 0, { ...ctxBase, schedule: null });
  assert.equal(loc.type, 'office');
  assert.equal(loc.room, 'office');
});

test('resolveTeacherLocation: officeFloor를 주면 교무실·점심 위치에 그 층이 실린다', () => {
  const lunchIdx = PERIODS.findIndex(p => p.isLunch);
  const ctx = { ...ctxBase, schedule: null, officeFloor: 4 };
  assert.equal(resolveTeacherLocation('T1', 0, 0, ctx).floor, 4);
  assert.equal(resolveTeacherLocation('T1', 0, lunchIdx, ctx).floor, 4);
});

test('resolveTeacherLocation: officeFloor를 안 주면 floor가 null(층 자유)', () => {
  // 소속 교무실을 아직 확인하지 못한 선생님은 예전처럼 모든 층 교무실에 표시돼야 한다.
  const loc = resolveTeacherLocation('T1', 0, 0, { ...ctxBase, schedule: null });
  assert.equal(loc.floor, null);
});

test('resolveTeacherLocation: 학년-반이 있는 일반 과목은 그 교실로, floor는 findRoomFloor로 조회', () => {
  const schedule = [[{ subject: '수학', grade: 1, class: 1, label: '수학(1-1)' }], [], [], [], []];
  const loc = resolveTeacherLocation('T1', 0, 0, { ...ctxBase, schedule });
  assert.equal(loc.type, 'class');
  assert.equal(loc.room, '1-1');
  assert.equal(loc.floor, 5); // route.test.js에서도 확인된 실제 위치
});

test('resolveTeacherLocation: 특별과목(체육)은 학년-반 교실이 아니라 특별실로', () => {
  const schedule = [[{ subject: '체육', grade: 1, class: 1, label: '체육(1-1)' }], [], [], [], []];
  const loc = resolveTeacherLocation('T1', 0, 0, { ...ctxBase, schedule });
  assert.equal(loc.room, 'gymnasium');
});

test('resolveTeacherLocation: 학년-반 없는 과목(자율학습 등)은 교무실로 fallback하되 라벨은 유지', () => {
  const schedule = [[{ subject: '자율학습', grade: null, class: null, label: '자율학습' }], [], [], [], []];
  const loc = resolveTeacherLocation('T1', 0, 0, { ...ctxBase, schedule });
  assert.equal(loc.type, 'class');
  assert.equal(loc.room, 'office');
  assert.equal(loc.label, '자율학습');
});

test('resolveTeacherLocation: 해당 교시에 수업이 없으면 교무실', () => {
  const schedule = [[null], [], [], [], []];
  const loc = resolveTeacherLocation('T1', 0, 0, { ...ctxBase, schedule });
  assert.equal(loc.type, 'office');
});

// ── combineClassSchedule ─────────────────────
test('combineClassSchedule: 여러 선생님 시간표에서 같은 반 수업만 모아 그리드로 조합', () => {
  const teacherSchedules = [
    { id: 'T1', name: '홍길동', schedule: [[{ subject: '수학', grade: 1, class: 1, label: '수학(1-1)' }, null]] },
    { id: 'T2', name: '김선희', schedule: [[null, { subject: '영어', grade: 1, class: 1, label: '영어(1-1)' }]] },
    { id: 'T3', name: '이철수', schedule: [[{ subject: '국어', grade: 2, class: 3, label: '국어(2-3)' }, null]] }, // 다른 반, 안 섞여야 함
  ];
  const grid = combineClassSchedule(1, 1, 2, { teacherSchedules, classAiEntry: undefined });
  assert.equal(grid[0][0].subject, '수학');
  assert.equal(grid[0][0].teacherName, '홍길동');
  assert.equal(grid[0][1].subject, '영어');
});

test('combineClassSchedule: 선생님 시간표에 없는 빈 칸만 반 AI 시간표로 채움(있는 칸은 덮어쓰지 않음)', () => {
  const teacherSchedules = [
    { id: 'T1', name: '홍길동', schedule: [[{ subject: '수학', grade: 1, class: 1, label: '수학(1-1)' }, null]] },
  ];
  const classAiEntry = { schedule: [['국어(다른선생님)', '영어(김선희)']] };
  const grid = combineClassSchedule(1, 1, 2, { teacherSchedules, classAiEntry });
  assert.equal(grid[0][0].subject, '수학', '이미 채워진 칸은 AI 시간표로 덮어쓰지 않아야 함');
  assert.equal(grid[0][1].subject, '영어', '빈 칸은 AI 시간표로 채워야 함');
});

// ── classifyTimeline ─────────────────────────
test('classifyTimeline: 종료 시각이 지난 교시는 now가 아니어도 past로 분류', () => {
  const dayLocations = PERIODS.map(() => ({ type: 'office', label: '교무실' }));
  // 1교시(08:30-09:20) 종료 후, 쉬는 시간(piNow=-1)인 상황
  const nowMins = 9 * 60 + 25; // 09:25
  const result = classifyTimeline(PERIODS, dayLocations, { piNow: -1, breakAfter: 0, nowMins });
  assert.equal(result[0].status, 'past');
  assert.equal(result[1].status, 'next'); // 쉬는 시간 다음 교시
});

test('classifyTimeline: 진행 중인 교시는 now', () => {
  const dayLocations = PERIODS.map(() => ({ type: 'office', label: '교무실' }));
  const nowMins = 8 * 60 + 45; // 08:45, 1교시 진행 중
  const result = classifyTimeline(PERIODS, dayLocations, { piNow: 0, breakAfter: -1, nowMins });
  assert.equal(result[0].status, 'now');
  assert.equal(result[1].status, 'future');
});

// ── statusColor ───────────────────────────────
test('statusColor: 타입별로 다른 색을 반환', () => {
  assert.equal(statusColor('class'), '#3b5bdb');
  assert.equal(statusColor('override'), '#c0501a');
  assert.equal(statusColor('lunch'), '#a07000');
  assert.equal(statusColor('office'), '#2d7a4f');
  assert.equal(statusColor('break'), '#2d7a4f');
});

// ── resolveRoom ───────────────────────────────
test('resolveRoom: roomId가 office면 현재 층의 OFFICE_IDS로 매핑', () => {
  const floorData = FLOORS[5];
  const room = resolveRoom('office', null, 5, floorData);
  assert.equal(room.id, OFFICE_IDS[5]);
});

test('resolveRoom: 일반 room은 locFloor가 currentFloor와 다르면 null(그 층엔 안 보임)', () => {
  const floorData = FLOORS[5];
  const room = resolveRoom('1-1', 4, 5, floorData);
  assert.equal(room, null);
});

test('resolveRoom: locFloor가 0(지하)이어도 falsy로 오판하지 않고 정상 비교', () => {
  const floorData = FLOORS[0];
  // 지하(0층)와 currentFloor(0)가 같으면 정상적으로 room을 찾아야 함(0을 "없음"으로 오판하면 안 됨)
  const anyRoomId = floorData.rooms[0].id;
  const room = resolveRoom(anyRoomId, 0, 0, floorData);
  assert.equal(room.id, anyRoomId);
});

test('resolveRoom: roomId가 없으면 null', () => {
  assert.equal(resolveRoom(null, 5, 5, FLOORS[5]), null);
});

test('resolveRoom: 소속 층이 정해진 교무실은 다른 층에서 null', () => {
  // 이게 없으면 교무실 선생님이 모든 층을 따라다닌다(층을 바꿔도 같은 자리에 남던 버그).
  assert.equal(resolveRoom('office', 4, 5, FLOORS[5]), null);
});

test('resolveRoom: 소속 층과 보는 층이 같으면 그 층 교무실로 매핑', () => {
  const room = resolveRoom('office', 5, 5, FLOORS[5]);
  assert.equal(room.id, OFFICE_IDS[5]);
});
