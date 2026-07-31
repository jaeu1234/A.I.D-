import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLOORS, OFFICE_IDS } from '../src/data/floors.js';
import { computeRoute, routePointAt, resolveEndpoint } from '../src/lib/route.js';

function room(floor, id) {
  return FLOORS[floor].rooms.find(r => r.id === id);
}

test('computeRoute: 같은 방이면 null(이동 경로 없음)', () => {
  const r = room(5, '1-1');
  assert.equal(computeRoute(r, r, 5, 5), null);
});

test('computeRoute: 같은 층 두 방 사이는 crossFloor=false, 세그먼트 1개', () => {
  const a = room(5, '1-1'), b = room(5, '1-2');
  const route = computeRoute(a, b, 5, 5);
  assert.equal(route.crossFloor, false);
  assert.equal(route.segments.length, 1);
  assert.equal(route.segments[0].floor, 5);
  assert.ok(route.totalLength > 0);
});

test('computeRoute: 다른 층은 crossFloor=true, 세그먼트 2개(출발층+도착층)', () => {
  const a = room(5, '1-1'), b = room(4, '1-6');
  const route = computeRoute(a, b, 5, 4);
  assert.equal(route.crossFloor, true);
  assert.equal(route.segments.length, 2);
  assert.equal(route.segments[0].floor, 5);
  assert.equal(route.segments[1].floor, 4);
  assert.ok(route.totalLength > route.segments[0].length + route.segments[1].length,
    '계단 구간 길이가 totalLength에 더해져야 함');
});

test('routePointAt: t=0은 출발 방, t=1은 도착 방 근처(같은 층)', () => {
  const a = room(5, '1-1'), b = room(5, '1-2');
  const route = computeRoute(a, b, 5, 5);
  const start = routePointAt(route, 0);
  const end = routePointAt(route, 1);
  assert.equal(start.floor, 5);
  assert.equal(end.floor, 5);
  const aCenter = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const bCenter = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  assert.ok(Math.hypot(start.x - aCenter.x, start.y - aCenter.y) < 1, 't=0은 출발 방 중심과 거의 일치');
  assert.ok(Math.hypot(end.x - bCenter.x, end.y - bCenter.y) < 1, 't=1은 도착 방 중심과 거의 일치');
});

test('routePointAt: 층이 다른 경로는 진행 중 floor가 출발층→도착층으로 바뀜', () => {
  const a = room(5, '1-1'), b = room(4, '1-6');
  const route = computeRoute(a, b, 5, 4);
  assert.equal(routePointAt(route, 0).floor, 5);
  assert.equal(routePointAt(route, 1).floor, 4);
  // 중간 어딘가에서 층이 바뀌어야 자동 층 전환 로직이 동작함
  const floors = [0.1, 0.3, 0.5, 0.7, 0.9].map(t => routePointAt(route, t).floor);
  assert.ok(floors.includes(5) && floors.includes(4), `진행률 중간에 층 전환이 있어야 함: ${floors}`);
});

test('resolveEndpoint: room이 null이면 null(경로 계산 불가)', () => {
  assert.equal(resolveEndpoint({ room: null, floor: null }, 3), null);
  assert.equal(resolveEndpoint(null, 3), null);
});

test('resolveEndpoint: office는 hintFloor에 교무실이 있으면 그 층으로 매핑', () => {
  const ep = resolveEndpoint({ room: 'office', floor: null }, 4);
  assert.equal(ep.floor, 4);
  assert.equal(ep.room.id, OFFICE_IDS[4]);
});

test('resolveEndpoint: office는 hintFloor에 교무실이 없으면 가장 가까운 교무실 층으로', () => {
  // 2층엔 교무실이 없음(OFFICE_IDS: 5,4,3만) → 가장 가까운 3층으로 떨어져야 함
  const ep = resolveEndpoint({ room: 'office', floor: null }, 2);
  assert.equal(ep.floor, 3);
});

test('resolveEndpoint: 일반 room은 지정된 floor의 room 객체를 그대로 반환', () => {
  const ep = resolveEndpoint({ room: '1-1', floor: 5 }, 1);
  assert.equal(ep.floor, 5);
  assert.equal(ep.room.id, '1-1');
});
