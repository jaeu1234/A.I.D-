import { PERIODS } from '../data/schedule.js';

// ─────────────────────────────────────────────
// 데모용 시각 이동
// 방과 후·주말에 화면을 시연해야 할 때, 수업 중인 것처럼 보이도록 "지금"을
// 옮긴다. 시각을 한 지점에 고정하지 않고 실제 시각과의 차이(offset)만 두므로
// 시계도 계속 흐르고, 쉬는 시간 이동 애니메이션처럼 시간에 따라 변하는 것들도
// 그대로 동작한다.
//
// 이 파일의 함수들이 인자 없이 호출될 때 쓰는 기본 "지금"을 바꾸는 것이므로,
// setNowOverride를 부르지 않으면 동작은 예전과 완전히 동일하다.
// ─────────────────────────────────────────────

let _nowOffsetMs = 0;

/**
 * "지금"을 target 시각으로 옮긴다. null을 주면 실제 시각으로 되돌린다.
 * @param {Date|null} target
 */
export function setNowOverride(target) {
  _nowOffsetMs = target == null ? 0 : target.getTime() - Date.now();
}

/** 시각이 옮겨져 있는지 여부 (화면에 표시할지 판단용) */
export function isNowOverridden() {
  return _nowOffsetMs !== 0;
}

/** 이 모듈이 쓰는 "지금". setNowOverride로 옮겨졌으면 옮겨진 시각. */
export function nowDate() {
  return _nowOffsetMs === 0 ? new Date() : new Date(Date.now() + _nowOffsetMs);
}


/** "HH:MM" → 분 수 */
export function toMins(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * 현재 시각 → 분 수
 * @param {Date} [now] - 생략하면 실제 현재 시각. 테스트에서 특정 시각을 고정하는 데 사용.
 */
export function getNowMins(now = nowDate()) {
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * 현재 진행 중인 교시 인덱스
 * @param {Date} [now]
 * @returns {number} 0~7 | -1(쉬는시간·방과후)
 */
export function getCurrentPeriodIndex(now = nowDate()) {
  const m = getNowMins(now);
  for (let i = 0; i < PERIODS.length; i++) {
    if (m >= toMins(PERIODS[i].start) && m < toMins(PERIODS[i].end)) return i;
  }
  return -1;
}

/**
 * 다음 교시 인덱스
 * @param {Date} [now]
 * @returns {number} 0~7 | -1(방과후)
 */
export function getNextPeriodIndex(now = nowDate()) {
  const m = getNowMins(now);
  for (let i = 0; i < PERIODS.length; i++) {
    if (toMins(PERIODS[i].start) > m) return i;
  }
  return -1;
}

/**
 * 현재 쉬는시간이라면 몇 교시 '후' 쉬는시간인지 반환
 * @param {Date} [now]
 * @returns {number} 교시 인덱스 | -1(쉬는시간 아님)
 */
export function getBreakAfterIndex(now = nowDate()) {
  const m = getNowMins(now);
  for (let i = 0; i < PERIODS.length - 1; i++) {
    const end   = toMins(PERIODS[i].end);
    const start = toMins(PERIODS[i + 1].start);
    if (m >= end && m < start) return i;
  }
  return -1;
}

/**
 * 화면에 표시할 교시 상태 라벨.
 * 진행 중인 교시면 그 이름, 교시 사이 쉬는 시간이면 '쉬는 시간', 등교 전·하교
 * 후처럼 일과 시간 자체를 벗어났으면 '방과후'를 반환한다. 예전엔 이 셋을
 * 구분 안 하고 교시가 아니면 전부 '쉬는 시간'으로 표시해서, 밤에 봐도
 * "쉬는 시간"이라고 나오는 게 어색했다.
 * @param {Date} [now]
 * @returns {string}
 */
export function getPeriodStatusLabel(now = nowDate()) {
  const pi = getCurrentPeriodIndex(now);
  if (pi >= 0) return PERIODS[pi].label;
  return getBreakAfterIndex(now) >= 0 ? '쉬는 시간' : '방과후';
}

/**
 * 오늘 요일 인덱스 (0=월 ~ 4=금)
 *
 * 정책: 주말(토·일)에는 월요일(0) 시간표를 기준으로 고정 표시한다 — 의도된 동작.
 * 학교가 쉬는 날에도 화면이 완전히 비어 보이지 않고, 다음 등교일인 월요일 기준
 * 위치를 미리 보여주기 위함. 주말 여부 자체는 isWeekend()로 별도 확인한다.
 * @param {Date} [now]
 */
export function getTodayIndex(now = nowDate()) {
  const day = now.getDay(); // 0=일 ~ 6=토
  if (day === 0 || day === 6) return 0; // 주말은 월요일(0) 시간표로 고정
  return day - 1;
}

/**
 * 오늘이 주말(토·일)인지 여부
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isWeekend(now = nowDate()) {
  const day = now.getDay();
  return day === 0 || day === 6;
}

/**
 * 로컬 타임존 기준 'YYYY-MM-DD' 문자열 반환.
 * 주의: `Date.prototype.toISOString()`은 UTC 기준이라 한국(UTC+9)에서는
 * 00:00~09:00 사이에 하루 전 날짜가 나온다 — 등교 시간(1교시 08:30)과 정확히 겹치므로
 * 임시일정의 "오늘" 판정에는 반드시 이 함수를 써야 한다.
 * @param {Date} [d]
 * @returns {string}
 */
export function getLocalDateStr(d = nowDate()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
