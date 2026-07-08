import { PERIODS, TEACHERS, buildSchedule } from '../data/schedule.js';
import { OFFICE_IDS, findRoomFloor } from '../data/floors.js';
import {
  getCurrentPeriodIndex, getNextPeriodIndex, getBreakAfterIndex, getTodayIndex,
  getLocalDateStr, getNowMins, toMins,
} from './time.js';
import { getOverridesCache, getAiSchedulesCache } from './sync.js';

export { initSync, addOverride, deleteOverride, saveAiSchedule } from './sync.js';

// ─────────────────────────────────────────────
// Supabase 동기화 캐시 읽기
// 실제 로드·구독·쓰기는 sync.js가 담당한다(기기 간 동기화, Realtime).
// 여기서는 기존 함수 이름을 유지해 getTeacherLocation 등 동기(sync) 코드가
// 그대로 동작하도록 캐시를 읽기만 한다.
// ─────────────────────────────────────────────

/** 임시 일정 목록 불러오기 */
export function loadOverrides() {
  return getOverridesCache();
}

/** AI 분석으로 저장된 시간표 불러오기 */
export function loadAiSchedules() {
  return getAiSchedulesCache();
}

// ─────────────────────────────────────────────
// 시간표 조회
// ─────────────────────────────────────────────

/**
 * 선생님의 실제 적용 시간표 반환 (ClassCell 그리드)
 * AI 저장 > 기본 하드코딩 순서
 * AI 시간표는 Supabase에 원본 문자열 그리드로 저장되므로,
 * 기본 시간표와 동일한 ClassCell 형태로 정규화해서 반환한다.
 */
export function getEffectiveSchedule(teacherId) {
  const ai = loadAiSchedules();
  if (ai[teacherId]) return buildSchedule(ai[teacherId].schedule);
  const t = TEACHERS.find(x => x.id === teacherId);
  return t?.schedule ?? null;
}

// ─────────────────────────────────────────────
// 위치 계산
// ─────────────────────────────────────────────

/**
 * @typedef {Object} LocationResult
 * @property {'class'|'office'|'lunch'|'break'|'override'} type
 * @property {string} label  - 표시할 텍스트 (예: '수학(2-1)', '교무실')
 * @property {string|null} room   - room id (예: '2-1', 'office', null)
 * @property {number|null} floor  - 층 (예: 2, null=교무실은 층 자유)
 * @property {string} [note]      - 임시일정 메모
 */

/**
 * 특정 선생님의 day/period 기준 실제 위치 반환
 * 우선순위: 임시 일정 > AI 시간표 > 기본 시간표
 *
 * @param {string} teacherId
 * @param {number} dayIdx   0=월 ~ 4=금
 * @param {number} periodIdx 0~7 | -1
 * @returns {LocationResult}
 */
export function getTeacherLocation(teacherId, dayIdx, periodIdx) {
  if (periodIdx < 0) {
    return { type: 'break', label: '쉬는 시간', room: null, floor: null };
  }

  const period = PERIODS[periodIdx];
  if (period.isLunch) {
    return { type: 'lunch', label: '점심', room: 'office', floor: null };
  }

  // 임시 일정 확인 (오늘 날짜 기준)
  // 주의: toISOString()은 UTC 기준이라 한국 시간 00:00~09:00에는 하루 전 날짜가 되어
  // 등교 시간대(1교시 08:30~)에 "오늘" 임시일정이 매칭되지 않는 버그가 있었다 → 로컬 날짜 사용.
  const today     = getLocalDateStr();
  const overrides = loadOverrides();
  const override  = overrides.find(
    o => o.teacherId === teacherId && o.date === today && o.periodIdx === periodIdx,
  );
  if (override) {
    return {
      type:  'override',
      label: override.label,
      room:  override.room,
      floor: override.floor,
      note:  override.note,
    };
  }

  // 기본 · AI 시간표
  const schedule = getEffectiveSchedule(teacherId);
  if (!schedule) return { type: 'office', label: '교무실', room: 'office', floor: null };

  const cls = schedule[dayIdx]?.[periodIdx];
  if (cls) {
    // ClassCell: { subject, grade, class, label }. 학년-반이 있으면 그 교실로,
    // 없으면(예: '체육'처럼 과목만 있는 경우) 교무실로 fallback.
    // 주의: 학년 숫자와 실제 건물 층수가 다르므로(예: 1학년 교실이 5층에 있음)
    // floor는 "학년"이 아니라 FLOORS 데이터에서 실제 위치를 조회해서 구한다.
    if (cls.grade != null && cls.class != null) {
      const roomId = `${cls.grade}-${cls.class}`;
      return { type: 'class', label: cls.label, room: roomId, floor: findRoomFloor(roomId) };
    }
    return { type: 'class', label: cls.label, room: 'office', floor: null };
  }

  return { type: 'office', label: '교무실', room: 'office', floor: null };
}

// ─────────────────────────────────────────────
// 학급(반) 시간표
// ─────────────────────────────────────────────

/**
 * 특정 학급(학년-반)의 주간 시간표를 모든 선생님의 시간표에서 조합해 반환.
 * 개별 선생님 시간표에 그 반을 가르치는 칸이 흩어져 있으므로, 전체 선생님을 훑어서
 * grade/class가 일치하는 칸을 모아 하나의 학급 시간표로 재구성한다.
 * 담당 선생님 정보가 없는 시간(자율학습·동아리 등)은 원본 데이터에 아예 없으므로
 * 빈 칸(null)으로 남는다 — 다른 반 시간표가 추가로 입력되면 자동으로 채워진다.
 * 날짜별 임시일정(override)은 반영하지 않는다(그 날 하루만 유효한 정보라 주간 시간표에 안 맞음).
 *
 * @param {number} grade
 * @param {number} classNum
 * @returns {Array<Array<{subject:string, teacherName:string, teacherId:string, label:string}|null>>} 5×8 그리드
 */
export function getClassSchedule(grade, classNum) {
  const grid = Array.from({ length: 5 }, () => Array(PERIODS.length).fill(null));
  TEACHERS.forEach(t => {
    const sched = getEffectiveSchedule(t.id);
    if (!sched) return;
    sched.forEach((row, d) => {
      row.forEach((cell, p) => {
        if (cell && cell.grade === grade && cell.class === classNum) {
          grid[d][p] = { subject: cell.subject, teacherName: t.name, teacherId: t.id, label: cell.label };
        }
      });
    });
  });
  return grid;
}

// ─────────────────────────────────────────────
// 오늘 전체 동선 타임라인
// ─────────────────────────────────────────────

/**
 * 오늘 하루 전체 교시별 위치 배열 반환
 * @param {string} teacherId
 * @returns {Array<{pi, period, loc, status: 'past'|'now'|'next'|'future'}>}
 */
export function buildTimeline(teacherId) {
  const day      = getTodayIndex();
  const piNow    = getCurrentPeriodIndex();
  const breakAfter = getBreakAfterIndex();
  const nowMins  = getNowMins();

  return PERIODS.map((period, pi) => {
    const loc = getTeacherLocation(teacherId, day, pi);
    let status = 'future';
    // 종료 시각 기준으로 판정해야 쉬는 시간(piNow=-1)에도 이미 끝난 교시가
    // 올바르게 '지난 교시'로 표시된다. piNow만 비교하면 쉬는 시간 동안
    // 이전 교시들이 전부 '미래'로 잘못 표시되는 버그가 있었다.
    if (nowMins >= toMins(period.end))     status = 'past';
    else if (pi === piNow)                 status = 'now';
    else if (breakAfter >= 0 && pi === breakAfter + 1) status = 'next';
    return { pi, period, loc, status };
  });
}

/**
 * 다음 이동 정보 반환 (현재 교시 → 다음 교시)
 * @param {string} teacherId
 * @returns {{ fromLoc, toLoc, toPeriod, isMovingNow } | null}
 */
export function getNextMove(teacherId) {
  const day      = getTodayIndex();
  const piNow    = getCurrentPeriodIndex();
  const nextPi   = getNextPeriodIndex();
  const breakAfter = getBreakAfterIndex();
  if (nextPi < 0) return null;

  const fromLoc = piNow >= 0 ? getTeacherLocation(teacherId, day, piNow) : null;
  const toLoc   = getTeacherLocation(teacherId, day, nextPi);

  return {
    fromLoc,
    toLoc,
    toPeriod:    PERIODS[nextPi],
    isMovingNow: breakAfter >= 0, // 현재 쉬는 시간 = 이미 이동 중
  };
}

// ─────────────────────────────────────────────
// 맵 렌더링용 헬퍼
// ─────────────────────────────────────────────

/** 상태 → 점 색상 */
export function statusColor(type) {
  switch (type) {
    case 'class':    return '#3b5bdb';
    case 'override': return '#c0501a';
    case 'lunch':    return '#a07000';
    default:         return '#2d7a4f'; // office / break
  }
}

/**
 * 현재 층에서 room id를 실제 room 객체로 resolve
 * 교무실(office)은 층별 OFFICE_IDS로 매핑
 */
export function resolveRoom(roomId, locFloor, currentFloor, floorData) {
  if (!roomId) return null;
  if (roomId === 'office') {
    const officeId = OFFICE_IDS[currentFloor];
    return floorData.rooms.find(r => r.id === officeId) ?? null;
  }
  // locFloor는 0(지하)일 수 있어 falsy 체크(if(locFloor && ...))를 쓰면 안 됨
  if (locFloor != null && locFloor !== currentFloor) return null;
  return floorData.rooms.find(r => r.id === roomId) ?? null;
}
