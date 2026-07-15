// ─────────────────────────────────────────────
// 절차적 경로 계산기 (복도·계단을 따라가는 이동 동선)
//
// floors.js의 층 구조가 규칙적이라는 점을 이용해, 손으로 만든 내비 그래프 없이
// 좌표에서 직접 경로를 만든다:
//   상단행(y 0~100) / 복도 스파인(hall*, y≈109) / 하단행(y 118~218) 2열 격자,
//   계단(stair*L/M/R)은 층 전체 높이를 차지한다.
// 방→방 경로 = [방 중심 → 방 문(복도 접점) → 복도 중심선 → (가장 가까운 계단) →
//               (층 이동) → 복도 → 목적지 문 → 목적지 중심].
//
// 이 모듈은 순수하다(브라우저·상태 의존 없음, floors.js에만 의존) → Node로 단독 검증 가능.
// ─────────────────────────────────────────────
import { FLOORS, OFFICE_IDS, findRoomFloor } from '../data/floors.js';

const CORRIDOR_Y_FALLBACK = 109; // hall room이 없는 층(지하 등)용 기본 복도 중심선
const STAIR_FLOOR_UNIT = 70;     // 진행률 계산용 계단 한 층당 가상 길이

const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const isStair = (r) => r.type === 'hall' && /^stair/.test(r.id);
const stairKey = (id) => (id.match(/^stair\d*([A-Za-z]+)$/)?.[1] ?? id); // 'stair5L' → 'L'

/** 한 층의 복도 중심선 y (hall* room 중심, 없으면 폴백) */
export function corridorY(floorData) {
  const hall = floorData?.rooms.find(r => r.type === 'hall' && /^hall/.test(r.id));
  return hall ? hall.y + hall.h / 2 : CORRIDOR_Y_FALLBACK;
}

/**
 * 방에서 복도로 나가는 "문" 좌표. 방 중심 x에서, 복도 중심선(cy)을 향한 방의 변으로 잡는다.
 * 계단처럼 복도를 가로지르는(위·아래로 걸친) 방은 복도 중심선 위의 점을 문으로 쓴다.
 */
export function roomDoor(room, cy) {
  const cx = room.x + room.w / 2;
  const spansCorridor = room.y < cy && room.y + room.h > cy;
  if (spansCorridor) return { x: cx, y: cy };
  // 방이 복도 위(상단행)면 아래 변, 복도 아래(하단행)면 위 변이 복도에 접한다.
  const doorY = (room.y + room.h / 2) < cy ? room.y + room.h : room.y;
  return { x: cx, y: doorY };
}

/** 주어진 x에 가장 가까운 계단 room (없으면 null) */
export function nearestStair(floorData, x) {
  let best = null, bestD = Infinity;
  for (const r of floorData.rooms) {
    if (!isStair(r)) continue;
    const d = Math.abs((r.x + r.w / 2) - x);
    if (d < bestD) { bestD = d; best = r; }
  }
  return best;
}

/** 특정 suffix(L/M/R)의 계단 room (없으면 null) */
function stairByKey(floorData, key) {
  return floorData.rooms.find(r => isStair(r) && stairKey(r.id) === key) ?? null;
}

const ptEq = (a, b) => a && b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;

/** 연속 중복점 제거 */
function dedupe(pts) {
  const out = [];
  for (const p of pts) if (!ptEq(out[out.length - 1], p)) out.push(p);
  return out;
}

function polylineLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
}

/**
 * LocationResult({room, floor})를 실제 {room 객체, floor 번호}로 해석.
 * - room이 null(체육관 등 지도 밖 특별실·쉬는시간)이면 경로 불가 → null
 * - 'office'(층 자유)는 hintFloor(상대 엔드포인트 층)의 교무실로 우선 매핑해
 *   수업↔교무실 이동이 불필요하게 층을 넘지 않도록 한다.
 * @param {{room:string|null, floor:number|null}} loc
 * @param {number} hintFloor 상대 엔드포인트의 층(교무실 층 선택 힌트)
 * @returns {{room:object, floor:number} | null}
 */
export function resolveEndpoint(loc, hintFloor) {
  if (!loc || !loc.room) return null;
  if (loc.room === 'office') {
    // 힌트 층에 교무실이 있으면 그 층, 없으면 교무실이 있는 층 중 힌트에 가장 가까운 층.
    const officeFloors = Object.keys(OFFICE_IDS).map(Number);
    let floor = OFFICE_IDS[hintFloor] ? hintFloor : null;
    if (floor == null) {
      officeFloors.sort((a, b) => Math.abs(a - hintFloor) - Math.abs(b - hintFloor));
      floor = officeFloors[0];
    }
    if (floor == null) return null;
    const room = FLOORS[floor]?.rooms.find(r => r.id === OFFICE_IDS[floor]);
    return room ? { room, floor } : null;
  }
  const floor = loc.floor ?? findRoomFloor(loc.room);
  if (floor == null || !FLOORS[floor]) return null;
  const room = FLOORS[floor].rooms.find(r => r.id === loc.room);
  return room ? { room, floor } : null;
}

/** 같은 층에서 fromRoom → toRoom 복도 경유 폴리라인 */
function sameFloorPts(floorData, fromRoom, toRoom) {
  const cy = corridorY(floorData);
  const a = center(fromRoom), b = center(toRoom);
  const da = roomDoor(fromRoom, cy), db = roomDoor(toRoom, cy);
  return dedupe([
    a,
    da,
    { x: da.x, y: cy },
    { x: db.x, y: cy },
    db,
    b,
  ]);
}

/** fromRoom → (해당 층) 계단 진입점까지의 폴리라인 */
function toStairPts(floorData, fromRoom, stair) {
  const cy = corridorY(floorData);
  const a = center(fromRoom), da = roomDoor(fromRoom, cy);
  const sCx = stair.x + stair.w / 2, sCy = stair.y + stair.h / 2;
  return dedupe([a, da, { x: da.x, y: cy }, { x: sCx, y: cy }, { x: sCx, y: sCy }]);
}

/** (해당 층) 계단 → toRoom 까지의 폴리라인 */
function fromStairPts(floorData, stair, toRoom) {
  const cy = corridorY(floorData);
  const b = center(toRoom), db = roomDoor(toRoom, cy);
  const sCx = stair.x + stair.w / 2, sCy = stair.y + stair.h / 2;
  return dedupe([{ x: sCx, y: sCy }, { x: sCx, y: cy }, { x: db.x, y: cy }, db, b]);
}

/**
 * fromRoom(fromFloor) → toRoom(toFloor) 경로 계산.
 * @returns {{
 *   crossFloor:boolean, fromFloor:number, toFloor:number, stairKey:string|null,
 *   segments: Array<{floor:number, pts:Array<{x,y}>, length:number}>,
 *   totalLength:number
 * } | null}
 */
export function computeRoute(fromRoom, toRoom, fromFloor, toFloor) {
  if (!fromRoom || !toRoom) return null;
  const fromData = FLOORS[fromFloor], toData = FLOORS[toFloor];
  if (!fromData || !toData) return null;

  // 같은 층
  if (fromFloor === toFloor) {
    if (fromRoom.id === toRoom.id) return null;
    const pts = sameFloorPts(fromData, fromRoom, toRoom);
    const length = polylineLength(pts);
    return {
      crossFloor: false, fromFloor, toFloor, stairKey: null,
      segments: [{ floor: fromFloor, pts, length }],
      totalLength: length,
    };
  }

  // 다른 층 → 계단 경유. 출발/도착 방에서 가장 가까운 계단이 되도록,
  // 양쪽 층에 모두 존재하는 suffix(L/M/R) 중 총 이동거리가 최소인 계단을 고른다.
  const fromCx = fromRoom.x + fromRoom.w / 2;
  const toCx = toRoom.x + toRoom.w / 2;
  const fromStairs = fromData.rooms.filter(isStair);
  let chosen = null, bestCost = Infinity;
  for (const sf of fromStairs) {
    const st = stairByKey(toData, stairKey(sf.id));
    if (!st) continue;
    const cost = Math.abs((sf.x + sf.w / 2) - fromCx) + Math.abs((st.x + st.w / 2) - toCx);
    if (cost < bestCost) { bestCost = cost; chosen = { sf, st }; }
  }
  // suffix 대응이 하나도 없으면 각 층에서 독립적으로 가장 가까운 계단 사용(폴백).
  if (!chosen) {
    const sf = nearestStair(fromData, fromCx), st = nearestStair(toData, toCx);
    if (!sf || !st) {
      // 계단 자체가 없으면 각 층의 방→복도까지만이라도 표시(직선 폴백).
      const seg1 = sameFloorPtsFallback(fromData, fromRoom);
      const seg2 = sameFloorPtsFallback(toData, toRoom);
      return {
        crossFloor: true, fromFloor, toFloor, stairKey: null,
        segments: [
          { floor: fromFloor, pts: seg1, length: polylineLength(seg1) },
          { floor: toFloor, pts: seg2, length: polylineLength(seg2) },
        ],
        totalLength: polylineLength(seg1) + polylineLength(seg2) + STAIR_FLOOR_UNIT,
      };
    }
    chosen = { sf, st };
  }

  const seg1 = toStairPts(fromData, fromRoom, chosen.sf);
  const seg2 = fromStairPts(toData, chosen.st, toRoom);
  const len1 = polylineLength(seg1), len2 = polylineLength(seg2);
  const stairLen = Math.abs(fromFloor - toFloor) * STAIR_FLOOR_UNIT;
  return {
    crossFloor: true, fromFloor, toFloor, stairKey: stairKey(chosen.sf.id),
    segments: [
      { floor: fromFloor, pts: seg1, length: len1 },
      { floor: toFloor, pts: seg2, length: len2 },
    ],
    totalLength: len1 + stairLen + len2,
  };
}

/** 계단이 없는 층 폴백: 방 중심 → 복도 중심선까지만 */
function sameFloorPtsFallback(floorData, room) {
  const cy = corridorY(floorData);
  const a = center(room), d = roomDoor(room, cy);
  return dedupe([a, d, { x: d.x, y: cy }]);
}

function pointOnPolyline(pts, dist) {
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y };
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (acc + seg >= dist || i === pts.length - 1) {
      const r = seg === 0 ? 0 : Math.min(Math.max((dist - acc) / seg, 0), 1);
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * r,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * r,
      };
    }
    acc += seg;
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y };
}

/**
 * 경로 전체 파라미터 t∈[0,1]에서의 위치와 그 시점의 층을 반환.
 * 계단 구간(다른 층)의 절반을 넘으면 floor가 toFloor로 바뀐다 → 자동 층 전환 신호.
 * @returns {{x:number, y:number, floor:number, onStairs:boolean}}
 */
export function routePointAt(route, t) {
  const tc = Math.min(Math.max(t, 0), 1);
  const dist = tc * route.totalLength;

  if (!route.crossFloor) {
    const seg = route.segments[0];
    const p = pointOnPolyline(seg.pts, dist);
    return { x: p.x, y: p.y, floor: seg.floor, onStairs: false };
  }

  const [s1, s2] = route.segments;
  const stairLen = route.totalLength - s1.length - s2.length;
  if (dist <= s1.length) {
    const p = pointOnPolyline(s1.pts, dist);
    return { x: p.x, y: p.y, floor: s1.floor, onStairs: false };
  }
  if (dist <= s1.length + stairLen) {
    // 계단 안: 절반 전이면 출발 층 계단, 절반 후이면 도착 층 계단 위치로 표시.
    const half = dist < s1.length + stairLen / 2;
    const src = half ? s1 : s2;
    const p = half ? src.pts[src.pts.length - 1] : src.pts[0];
    return { x: p.x, y: p.y, floor: half ? s1.floor : s2.floor, onStairs: true };
  }
  const p = pointOnPolyline(s2.pts, dist - s1.length - stairLen);
  return { x: p.x, y: p.y, floor: s2.floor, onStairs: false };
}
