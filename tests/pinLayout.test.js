import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutRoom, PIN_R } from '../src/lib/pinLayout.js';

function entry(id) {
  return { t: { id }, loc: { label: id } };
}

const bigRoom = { x: 0, y: 0, w: 300, h: 100 };
const tinyRoom = { x: 0, y: 0, w: 20, h: 20 };

test('layoutRoom: 방이 넉넉하면 전원 개별 핀으로 가로 나열', () => {
  const entries = [entry('A'), entry('B'), entry('C')];
  const result = layoutRoom(bigRoom, entries, null);
  assert.equal(result.length, 3);
  assert.ok(result.every(r => r.kind === 'pin'));
  // 순서대로 x좌표가 증가해야 함(왼쪽→오른쪽 나열)
  assert.ok(result[0].px < result[1].px && result[1].px < result[2].px);
});

test('layoutRoom: 좁은 방에 여러 명이면 선택된 사람이 없을 때 클러스터 칩 하나로 묶임', () => {
  const entries = [entry('A'), entry('B'), entry('C'), entry('D'), entry('E'), entry('F'), entry('G')];
  const result = layoutRoom(tinyRoom, entries, null);
  assert.equal(result.length, 1);
  assert.equal(result[0].kind, 'cluster');
  assert.equal(result[0].n, 7);
});

test('layoutRoom: 좁은 방에 선택된 선생님이 있으면 그 핀 + "+N" 배지로 표시(클러스터 아님)', () => {
  const entries = [entry('A'), entry('B'), entry('C'), entry('D'), entry('E'), entry('F'), entry('G')];
  const result = layoutRoom(tinyRoom, entries, 'D');
  assert.equal(result.length, 2);
  const pin = result.find(r => r.kind === 'pin');
  const count = result.find(r => r.kind === 'count');
  assert.equal(pin.t.id, 'D');
  assert.equal(count.n, 6); // 나머지 인원 수
});

test('layoutRoom: 7명 이상은 방이 넓어도 클러스터로 묶임(최대 6명 한 줄 제한)', () => {
  const entries = Array.from({ length: 7 }, (_, i) => entry(String(i)));
  const result = layoutRoom(bigRoom, entries, null);
  assert.equal(result.length, 1);
  assert.equal(result[0].kind, 'cluster');
});

test('layoutRoom: 빈 방(0명)은 빈 배열', () => {
  const result = layoutRoom(bigRoom, [], null);
  assert.deepEqual(result, []);
});

test('layoutRoom: pinR을 바꾸면 핀 간격도 그에 맞게 계산됨', () => {
  const entries = [entry('A'), entry('B')];
  const wide = layoutRoom(bigRoom, entries, null, 20);
  const narrow = layoutRoom(bigRoom, entries, null, PIN_R);
  const wideGap = wide[1].px - wide[0].px;
  const narrowGap = narrow[1].px - narrow[0].px;
  assert.ok(wideGap > narrowGap, 'pinR이 클수록 핀 사이 간격도 넓어야 함');
});
