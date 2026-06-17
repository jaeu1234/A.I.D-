import { PERIODS } from '../data/schedule.js';

/** "HH:MM" → 분 수 */
export function toMins(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** 현재 시각 → 분 수 */
export function getNowMins() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

/**
 * 현재 진행 중인 교시 인덱스
 * @returns {number} 0~7 | -1(쉬는시간·방과후)
 */
export function getCurrentPeriodIndex() {
  const m = getNowMins();
  for (let i = 0; i < PERIODS.length; i++) {
    if (m >= toMins(PERIODS[i].start) && m < toMins(PERIODS[i].end)) return i;
  }
  return -1;
}

/**
 * 다음 교시 인덱스
 * @returns {number} 0~7 | -1(방과후)
 */
export function getNextPeriodIndex() {
  const m = getNowMins();
  for (let i = 0; i < PERIODS.length; i++) {
    if (toMins(PERIODS[i].start) > m) return i;
  }
  return -1;
}

/**
 * 현재 쉬는시간이라면 몇 교시 '후' 쉬는시간인지 반환
 * @returns {number} 교시 인덱스 | -1(쉬는시간 아님)
 */
export function getBreakAfterIndex() {
  const m = getNowMins();
  for (let i = 0; i < PERIODS.length - 1; i++) {
    const end   = toMins(PERIODS[i].end);
    const start = toMins(PERIODS[i + 1].start);
    if (m >= end && m < start) return i;
  }
  return -1;
}

/**
 * 오늘 요일 인덱스 (0=월 ~ 4=금, 주말은 0으로 고정)
 */
export function getTodayIndex() {
  return Math.min(Math.max(new Date().getDay() - 1, 0), 4);
}
