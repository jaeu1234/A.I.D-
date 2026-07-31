import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLOORS, findRoomFloor, getAllClassrooms, OFFICE_IDS } from '../src/data/floors.js';

test('findRoomFloor: 존재하는 방은 올바른 층 번호를 반환', () => {
  // 1학년 교실은 5·4층에 있다(학년 숫자와 실제 층수가 다름) — floors.js 주석 참고
  assert.equal(findRoomFloor('1-1'), 5);
  assert.equal(findRoomFloor('1-6'), 4);
});

test('findRoomFloor: 존재하지 않는 방은 null', () => {
  assert.equal(findRoomFloor('없는방'), null);
});

test('getAllClassrooms: 학년-반 오름차순 정렬', () => {
  const list = getAllClassrooms();
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1], b = list[i];
    assert.ok(a.grade < b.grade || (a.grade === b.grade && a.classNum <= b.classNum),
      `정렬 순서 위반: ${a.grade}-${a.classNum} 다음에 ${b.grade}-${b.classNum}`);
  }
});

test('getAllClassrooms: 항목마다 findRoomFloor로 조회한 층과 floor 필드가 일치', () => {
  for (const c of getAllClassrooms()) {
    assert.equal(findRoomFloor(c.id), c.floor);
  }
});

test('FLOORS: 층마다 room id가 전부 유일함', () => {
  for (const [floorNum, floor] of Object.entries(FLOORS)) {
    const ids = floor.rooms.map(r => r.id);
    assert.equal(new Set(ids).size, ids.length, `${floorNum}층에 중복된 room id가 있음`);
  }
});

test('OFFICE_IDS: 지정된 층마다 실제 존재하는 room id를 가리킴', () => {
  for (const [floorNum, officeId] of Object.entries(OFFICE_IDS)) {
    const floor = FLOORS[floorNum];
    assert.ok(floor.rooms.some(r => r.id === officeId), `${floorNum}층에 ${officeId} room이 없음`);
  }
});
