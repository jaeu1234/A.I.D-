import { PERIODS, TEACHERS, buildSchedule } from '../data/schedule.js';
import {
  getCurrentPeriodIndex, getNextPeriodIndex, getBreakAfterIndex, getTodayIndex,
  getLocalDateStr, getNowMins,
} from './time.js';
import { getOverridesCache, getAiSchedulesCache, getClassAiSchedulesCache } from './sync.js';
import { resolveTeacherLocation, combineClassSchedule, classifyTimeline } from './locationCore.js';

export { initSync, addOverride, deleteOverride, saveAiSchedule, saveClassAiSchedule } from './sync.js';
// 위치 판정의 순수 로직은 locationCore.js로 옮겼다(Node에서 직접 테스트하기 위함,
// tests/locationCore.test.js 참고). 기존 import 경로를 쓰는 코드가 그대로 동작하도록
// 여기서 재수출한다 — 공개 API는 바뀌지 않았다.
export { resolveSpecialRoom, statusColor, resolveRoom } from './locationCore.js';

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

/** 반 AI 시간표 불러오기 */
export function loadClassAiSchedules() {
  return getClassAiSchedulesCache();
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
// 실제 판정 로직은 locationCore.js의 resolveTeacherLocation(순수 함수)에
// 있고, 여기서는 Supabase 캐시에서 읽은 데이터를 넣어 호출만 한다.
// ─────────────────────────────────────────────

/**
 * 특정 선생님의 day/period 기준 실제 위치 반환
 * 우선순위: 임시 일정 > AI 시간표 > 기본 시간표
 *
 * @param {string} teacherId
 * @param {number} dayIdx   0=월 ~ 4=금
 * @param {number} periodIdx 0~7 | -1
 * @returns {import('./locationCore.js').LocationResult}
 */
export function getTeacherLocation(teacherId, dayIdx, periodIdx) {
  return resolveTeacherLocation(teacherId, dayIdx, periodIdx, {
    periods: PERIODS,
    overrides: loadOverrides(),
    // 주의: toISOString()은 UTC 기준이라 한국 시간 00:00~09:00에는 하루 전 날짜가 되어
    // 등교 시간대(1교시 08:30~)에 "오늘" 임시일정이 매칭되지 않는 버그가 있었다 → 로컬 날짜 사용.
    today: getLocalDateStr(),
    schedule: getEffectiveSchedule(teacherId),
  });
}

// ─────────────────────────────────────────────
// 학급(반) 시간표
// ─────────────────────────────────────────────

/**
 * 특정 학급(학년-반)의 주간 시간표를 모든 선생님의 시간표에서 조합해 반환.
 * 조합 로직 자체는 locationCore.js의 combineClassSchedule(순수 함수)에 있다.
 * 날짜별 임시일정(override)은 반영하지 않는다(그 날 하루만 유효한 정보라 주간 시간표에 안 맞음).
 *
 * @param {number} grade
 * @param {number} classNum
 * @returns {Array<Array<{subject:string, teacherName:string, teacherId:string, label:string}|null>>} 5×8 그리드
 */
export function getClassSchedule(grade, classNum) {
  const teacherSchedules = TEACHERS.map(t => ({ id: t.id, name: t.name, schedule: getEffectiveSchedule(t.id) }));
  const classAi = loadClassAiSchedules();
  const classAiEntry = classAi[`${grade}-${classNum}`];
  return combineClassSchedule(grade, classNum, PERIODS.length, { teacherSchedules, classAiEntry });
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
  const day        = getTodayIndex();
  const piNow      = getCurrentPeriodIndex();
  const breakAfter = getBreakAfterIndex();
  const nowMins    = getNowMins();

  const dayLocations = PERIODS.map((_, pi) => getTeacherLocation(teacherId, day, pi));
  return classifyTimeline(PERIODS, dayLocations, { piNow, breakAfter, nowMins });
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
