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
 * 오늘 요일 인덱스 (0=월 ~ 4=금)
 *
 * 정책: 주말(토·일)에는 월요일(0) 시간표를 기준으로 고정 표시한다 — 의도된 동작.
 * 학교가 쉬는 날에도 화면이 완전히 비어 보이지 않고, 다음 등교일인 월요일 기준
 * 위치를 미리 보여주기 위함. 주말 여부 자체는 isWeekend()로 별도 확인한다.
 */
export function getTodayIndex() {
  const day = new Date().getDay(); // 0=일 ~ 6=토
  if (day === 0 || day === 6) return 0; // 주말은 월요일(0) 시간표로 고정
  return day - 1;
}

/**
 * 오늘이 주말(토·일)인지 여부
 * @returns {boolean}
 */
export function isWeekend() {
  const day = new Date().getDay();
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
export function getLocalDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
