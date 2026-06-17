import { PERIODS, TEACHERS } from '../data/schedule.js';
import { OFFICE_IDS } from '../data/floors.js';
import { getCurrentPeriodIndex, getNextPeriodIndex, getBreakAfterIndex, getTodayIndex } from './time.js';

// ─────────────────────────────────────────────
// localStorage 헬퍼
// ─────────────────────────────────────────────

/** 임시 일정 목록 불러오기 */
export function loadOverrides() {
  try { return JSON.parse(localStorage.getItem('teacher_overrides') ?? '[]'); }
  catch { return []; }
}

/** 임시 일정 목록 저장 */
export function saveOverrides(list) {
  localStorage.setItem('teacher_overrides', JSON.stringify(list));
}

/** AI 분석으로 저장된 시간표 불러오기 */
export function loadAiSchedules() {
  try { return JSON.parse(localStorage.getItem('teacher_schedules') ?? '{}'); }
  catch { return {}; }
}

/** AI 분석 시간표 저장 */
export function saveAiSchedule(teacherId, schedule) {
  const all = loadAiSchedules();
  all[teacherId] = { schedule, updatedAt: new Date().toISOString(), source: 'image_ai' };
  localStorage.setItem('teacher_schedules', JSON.stringify(all));
}

// ─────────────────────────────────────────────
// 시간표 조회
// ─────────────────────────────────────────────

/**
 * 선생님의 실제 적용 시간표 반환
 * AI 저장 > 기본 하드코딩 순서
 */
export function getEffectiveSchedule(teacherId) {
  const ai = loadAiSchedules();
  if (ai[teacherId]) return ai[teacherId].schedule;
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
  const today     = new Date().toISOString().slice(0, 10);
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
    // "과목(학년-반)" 파싱 → ex. "수학(2-1)" → floor=2, roomId='2-1'
    const m = cls.match(/\((\d+)-(\d+)\)/);
    if (m) {
      const floor  = parseInt(m[1], 10);
      const roomId = `${m[1]}-${m[2]}`;
      return { type: 'class', label: cls, room: roomId, floor };
    }
    // 학년-반 없이 과목만 (예: '체육') → 교무실로 fallback
    return { type: 'class', label: cls, room: 'office', floor: null };
  }

  return { type: 'office', label: '교무실', room: 'office', floor: null };
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

  return PERIODS.map((period, pi) => {
    const loc = getTeacherLocation(teacherId, day, pi);
    let status = 'future';
    if (pi < piNow)                        status = 'past';
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
  if (locFloor && locFloor !== currentFloor) return null;
  return floorData.rooms.find(r => r.id === roomId) ?? null;
}
