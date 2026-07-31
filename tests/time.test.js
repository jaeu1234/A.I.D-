// node --test tests/time.test.js (Node 18+ 내장 테스트 러너, 설치 불필요)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toMins, getNowMins, getCurrentPeriodIndex, getNextPeriodIndex,
  getBreakAfterIndex, getTodayIndex, isWeekend, getLocalDateStr,
} from '../src/lib/time.js';

test('toMins: HH:MM을 분으로 변환', () => {
  assert.equal(toMins('00:00'), 0);
  assert.equal(toMins('08:30'), 510);
  assert.equal(toMins('23:59'), 1439);
});

test('getNowMins: 주입한 시각 기준으로 계산', () => {
  assert.equal(getNowMins(new Date(2026, 0, 1, 9, 15)), 9 * 60 + 15);
});

test('getCurrentPeriodIndex: 교시 경계값', () => {
  // 1교시 08:30~09:20
  assert.equal(getCurrentPeriodIndex(new Date(2026, 0, 1, 8, 30)), 0, '시작 시각은 포함');
  assert.equal(getCurrentPeriodIndex(new Date(2026, 0, 1, 9, 19)), 0, '끝나기 1분 전은 포함');
  assert.equal(getCurrentPeriodIndex(new Date(2026, 0, 1, 9, 20)), -1, '끝 시각은 배제(쉬는 시간)');
  assert.equal(getCurrentPeriodIndex(new Date(2026, 0, 1, 8, 29)), -1, '등교 전은 -1');
  assert.equal(getCurrentPeriodIndex(new Date(2026, 0, 1, 20, 0)), -1, '방과후는 -1');
});

test('getNextPeriodIndex: 다음 교시 찾기', () => {
  // 1교시(08:30~09:20) 끝난 직후 쉬는 시간 → 다음은 2교시(인덱스 1, 09:30 시작)
  assert.equal(getNextPeriodIndex(new Date(2026, 0, 1, 9, 25)), 1);
  assert.equal(getNextPeriodIndex(new Date(2026, 0, 1, 20, 0)), -1, '방과후엔 다음 교시 없음');
});

test('getBreakAfterIndex: 쉬는 시간 여부·직전 교시', () => {
  // 1교시(0) 끝 09:20 ~ 2교시(1) 시작 09:30 사이가 쉬는 시간
  assert.equal(getBreakAfterIndex(new Date(2026, 0, 1, 9, 25)), 0, '1교시 직후 쉬는 시간');
  assert.equal(getBreakAfterIndex(new Date(2026, 0, 1, 9, 0)), -1, '수업 중엔 쉬는 시간 아님');
  assert.equal(getBreakAfterIndex(new Date(2026, 0, 1, 20, 0)), -1, '방과후는 쉬는 시간 아님(수업 사이만 해당)');
});

test('getTodayIndex: 평일은 0=월~4=금, 주말은 월요일(0)로 고정', () => {
  assert.equal(getTodayIndex(new Date(2026, 6, 27)), 0, '2026-07-27은 월요일');
  assert.equal(getTodayIndex(new Date(2026, 6, 31)), 4, '2026-07-31은 금요일');
  assert.equal(getTodayIndex(new Date(2026, 7, 1)), 0, '2026-08-01은 토요일 → 월요일로 고정');
  assert.equal(getTodayIndex(new Date(2026, 7, 2)), 0, '2026-08-02는 일요일 → 월요일로 고정');
});

test('isWeekend: 토·일만 true', () => {
  assert.equal(isWeekend(new Date(2026, 6, 27)), false, '월요일');
  assert.equal(isWeekend(new Date(2026, 7, 1)), true, '토요일');
  assert.equal(isWeekend(new Date(2026, 7, 2)), true, '일요일');
});

test('getLocalDateStr: 자정 근처에도 UTC로 밀리지 않고 로컬 날짜 유지', () => {
  // toISOString()을 썼다면 한국(UTC+9) 새벽 0~9시엔 하루 전 날짜가 나왔을 상황을 재현
  const d = new Date(2026, 6, 31, 0, 30); // 2026-07-31 00:30 (로컬)
  assert.equal(getLocalDateStr(d), '2026-07-31');
});
