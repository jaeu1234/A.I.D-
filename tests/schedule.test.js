import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseClassLabel, parseClassScheduleCell, buildSchedule, TEACHERS } from '../src/data/schedule.js';

test('parseClassLabel: "과목(학년-반)" 정상 파싱', () => {
  assert.deepEqual(parseClassLabel('수학(2-1)'), { subject: '수학', grade: 2, class: 1, label: '수학(2-1)' });
});

test('parseClassLabel: 괄호 없는 과목명은 grade/class가 null', () => {
  assert.deepEqual(parseClassLabel('체육'), { subject: '체육', grade: null, class: null, label: '체육' });
});

test('parseClassLabel: 과목명에 괄호가 섞여도 끝의 "학년-반"만 인식', () => {
  const cell = parseClassLabel('국어(문학)(2-1)');
  assert.equal(cell.subject, '국어(문학)');
  assert.equal(cell.grade, 2);
  assert.equal(cell.class, 1);
});

test('parseClassLabel: null/빈 문자열은 null 반환', () => {
  assert.equal(parseClassLabel(null), null);
  assert.equal(parseClassLabel(''), null);
});

test('parseClassScheduleCell: "과목(선생님이름)" 정상 파싱 + teacherId 매칭', () => {
  const cell = parseClassScheduleCell('수학(홍민지)');
  assert.equal(cell.subject, '수학');
  assert.equal(cell.teacherName, '홍민지');
  assert.equal(cell.teacherId, 'HM');
});

test('parseClassScheduleCell: 과목명에 괄호가 섞여도 마지막 괄호만 선생님 이름으로 인식', () => {
  // 회귀 테스트: 예전 정규식(/^(.+?)\((.+)\)$/)은 그리디하게 앞 괄호까지
  // teacherName에 욱여넣어 '국어(문학)(홍길동)'을 subject='국어', teacherName='문학)(홍길동'으로 잘못 잘랐다.
  const cell = parseClassScheduleCell('국어(문학)(홍민지)');
  assert.equal(cell.subject, '국어(문학)');
  assert.equal(cell.teacherName, '홍민지');
  assert.equal(cell.teacherId, 'HM');
});

test('parseClassScheduleCell: 등록되지 않은 이름은 teacherId가 null', () => {
  const cell = parseClassScheduleCell('수학(없는선생님)');
  assert.equal(cell.teacherId, null);
});

test('parseClassScheduleCell: null/빈 문자열은 null 반환', () => {
  assert.equal(parseClassScheduleCell(null), null);
  assert.equal(parseClassScheduleCell(''), null);
});

test('buildSchedule: 원본 문자열 그리드를 ClassCell 그리드로 정규화', () => {
  const grid = buildSchedule([['수학(1-1)', null]]);
  assert.equal(grid[0][0].subject, '수학');
  assert.equal(grid[0][1], null);
});

test('TEACHERS: id가 전부 유일함', () => {
  const ids = TEACHERS.map(t => t.id);
  assert.equal(new Set(ids).size, ids.length, '중복된 선생님 id가 있으면 지도에서 잘못 매칭됨');
});

test('TEACHERS: 각 선생님 schedule이 5일 × 정의된 교시 수 형태', () => {
  for (const t of TEACHERS) {
    assert.equal(t.schedule.length, 5, `${t.name} 시간표는 5일(월~금)이어야 함`);
  }
});
