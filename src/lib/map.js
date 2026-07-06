import { TEACHERS } from '../data/schedule.js';
import { FLOORS } from '../data/floors.js';
import { getTeacherLocation, getNextMove, resolveRoom, statusColor } from './location.js';
import { getCurrentPeriodIndex, getBreakAfterIndex, getTodayIndex } from './time.js';

// ─────────────────────────────────────────────
// 카메라 상태 (외부에서 직접 변경 금지)
// ─────────────────────────────────────────────
let _camX = 0, _camY = 0, _camZ = 1;
let _CW = 0, _CH = 0;
let _currentFloor = 1;
let _selectedId   = null;
let _canvas       = null;

export function getCamera() { return { x: _camX, y: _camY, z: _camZ }; }
export function setSelectedId(id) { _selectedId = id; }

// ─────────────────────────────────────────────
// 초기화
// ─────────────────────────────────────────────
export function initCanvas(canvasEl) {
  _canvas = canvasEl;
}

export function setFloorAndReset(floorN) {
  _currentFloor = floorN;
  resetZoom();
}

// ─────────────────────────────────────────────
// 좌표 변환
// ─────────────────────────────────────────────

/** 월드 → 스크린 */
export function w2s(wx, wy) {
  return {
    x: (wx - _camX) * _camZ + _CW / 2,
    y: (wy - _camY) * _camZ + _CH / 2,
  };
}

/** 스크린 → 월드 */
export function s2w(sx, sy) {
  return {
    x: (sx - _CW / 2) / _camZ + _camX,
    y: (sy - _CH / 2) / _camZ + _camY,
  };
}

// ─────────────────────────────────────────────
// 카메라 제어
// ─────────────────────────────────────────────

/** 평면도 전체가 화면에 꽉 차도록 카메라 리셋 */
export function resetZoom() {
  const floor = FLOORS[_currentFloor];
  if (!floor || _CW < 10 || _CH < 10) return;
  const PAD = 40;
  _camZ = Math.min((_CW - PAD * 2) / floor.W, (_CH - PAD * 2) / floor.H);
  _camX = floor.W / 2;
  _camY = floor.H / 2;
  render();
}

/**
 * 줌 (스크린 좌표 기준 핀치 포인트)
 * @param {number} factor - 1보다 크면 확대
 * @param {number} sx     - 스크린 x
 * @param {number} sy     - 스크린 y
 */
export function zoom(factor, sx = _CW / 2, sy = _CH / 2) {
  const before = s2w(sx, sy);
  _camZ = Math.min(Math.max(_camZ * factor, 0.1), 10);
  const after = s2w(sx, sy);
  _camX += before.x - after.x;
  _camY += before.y - after.y;
  render();
}

/** 드래그 패닝 */
export function pan(dx, dy) {
  _camX -= dx / _camZ;
  _camY -= dy / _camZ;
  render();
}

/**
 * 특정 방으로 부드럽게 줌인
 * @param {object} room - room 객체 {x, y, w, h}
 * @param {number} [targetScale=2.5] - fit scale 대비 배율
 */
export function zoomToRoom(room, targetScale = 2.5) {
  if (!room) return;
  const floor = FLOORS[_currentFloor];
  const PAD   = 40;
  const fitZ  = Math.min((_CW - PAD * 2) / floor.W, (_CH - PAD * 2) / floor.H);
  const endZ  = fitZ * targetScale;
  const endX  = room.x + room.w / 2;
  const endY  = room.y + room.h / 2;

  const sx = _camX, sy = _camY, sz = _camZ;
  const t0 = performance.now();
  const dur = 500;

  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function tick(now) {
    const p = Math.min((now - t0) / dur, 1);
    const e = ease(p);
    _camX = sx + (endX - sx) * e;
    _camY = sy + (endY - sy) * e;
    _camZ = sz + (endZ - sz) * e;
    render();
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ─────────────────────────────────────────────
// 렌더링
// ─────────────────────────────────────────────
export function render() {
  if (!_canvas) return;
  const wrap = _canvas.parentElement;
  const rect = wrap.getBoundingClientRect();
  _CW = rect.width;
  _CH = rect.height;
  if (_CW < 10 || _CH < 10) return;

  const DPR = window.devicePixelRatio || 1;
  _canvas.width  = Math.round(_CW * DPR);
  _canvas.height = Math.round(_CH * DPR);
  _canvas.style.width  = _CW + 'px';
  _canvas.style.height = _CH + 'px';

  const ctx = _canvas.getContext('2d');
  ctx.scale(DPR, DPR);
  ctx.clearRect(0, 0, _CW, _CH);

  // 카메라 변환 적용
  ctx.save();
  ctx.translate(_CW / 2, _CH / 2);
  ctx.scale(_camZ, _camZ);
  ctx.translate(-_camX, -_camY);

  _drawFloor(ctx);

  if (_selectedId) {
    _drawTeacherRoute(ctx, _selectedId);
  }
  _drawAllPins(ctx);

  ctx.restore();
}

// ─────────────────────────────────────────────
// 내부 드로잉
// ─────────────────────────────────────────────
function _drawFloor(ctx) {
  const floor = FLOORS[_currentFloor];
  if (!floor) return;

  // 건물 외벽
  ctx.fillStyle = '#dddbd4';
  ctx.beginPath();
  ctx.roundRect(-10, -10, floor.W + 20, floor.H + 20, 14);
  ctx.fill();

  // 방 그리기
  floor.rooms.forEach(room => {
    const { x, y, w, h, fill, stroke, label, sub, type } = room;
    ctx.fillStyle   = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.stroke();

    if (type === 'hall') {
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.font      = `${Math.max(9, Math.min(11, w / 5))}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2);
    } else {
      const fs = Math.max(10, Math.min(13, w / 5));
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.font      = `500 ${fs}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2 - (sub ? fs * 0.7 : 0));
      if (sub) {
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.font      = `${fs * 0.85}px sans-serif`;
        ctx.fillText(sub, x + w / 2, y + h / 2 + fs * 0.8);
      }
    }
  });
}

function _drawTeacherRoute(ctx, teacherId) {
  const floor   = FLOORS[_currentFloor];
  const day     = getTodayIndex();
  const pi      = getCurrentPeriodIndex();
  const breakAf = getBreakAfterIndex();

  // 현재 위치
  const curLocPi  = pi >= 0 ? pi : (breakAf >= 0 ? breakAf : 0);
  const curLoc    = getTeacherLocation(teacherId, day, curLocPi);
  const curRoom   = resolveRoom(curLoc.room, curLoc.floor, _currentFloor, floor);

  // 다음 위치
  const t       = TEACHERS.find(x => x.id === teacherId);
  if (!t) return;

  // 현재 방 강조
  if (curRoom) {
    ctx.strokeStyle = t.color;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.roundRect(curRoom.x - 3, curRoom.y - 3, curRoom.w + 6, curRoom.h + 6, 8);
    ctx.stroke();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle   = t.color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 다음 위치가 같은 층에 있으면 화살표로 동선 표시
  // (다음 교시 위치가 다른 층이거나 없으면 생략)
  const move = getNextMove(teacherId);
  if (curRoom && move && move.toLoc) {
    const nextRoom = resolveRoom(move.toLoc.room, move.toLoc.floor, _currentFloor, floor);
    if (nextRoom && nextRoom.id !== curRoom.id) {
      _drawRouteArrow(ctx, curRoom, nextRoom, t.color);
    }
  }
}

/** 현재 방 → 다음 방으로 이어지는 점선 화살표 */
function _drawRouteArrow(ctx, fromRoom, toRoom, color) {
  const x1 = fromRoom.x + fromRoom.w / 2, y1 = fromRoom.y + fromRoom.h / 2;
  const x2 = toRoom.x + toRoom.w / 2,     y2 = toRoom.y + toRoom.h / 2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = 2.5;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 화살촉
  const angle   = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 11;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * 현재 층에 표시될 모든 선생님 핀의 실제 화면 좌표를 계산.
 * 같은 방에 여러 선생님이 있으면 원형으로 분산 배치한다.
 * _drawAllPins(렌더링)와 hitTestPin(클릭 판정)이 동일한 좌표를 사용해야
 * 분산 배치된 핀도 정확히 클릭되므로, 계산 로직을 여기 한 곳에 모은다.
 */
function _computePinPositions(floor, day, pi) {
  // room별 선생님 묶기
  const byRoom = {};
  TEACHERS.forEach(t => {
    const loc  = getTeacherLocation(t.id, day, pi);
    const room = resolveRoom(loc.room, loc.floor, _currentFloor, floor);
    if (!room) return;
    byRoom[room.id] ??= [];
    byRoom[room.id].push({ t, loc });
  });

  const positions = [];
  Object.entries(byRoom).forEach(([roomId, entries]) => {
    const room = floor.rooms.find(r => r.id === roomId);
    if (!room) return;
    const cx = room.x + room.w / 2;
    const cy = room.y + room.h / 2;
    const n  = entries.length;

    entries.forEach(({ t, loc }, i) => {
      const angle  = (i / n) * Math.PI * 2 - Math.PI / 2;
      const spread = n === 1 ? 0 : 16;
      positions.push({
        t, loc,
        px: cx + Math.cos(angle) * spread,
        py: cy + Math.sin(angle) * spread,
      });
    });
  });
  return positions;
}

function _drawAllPins(ctx) {
  const floor = FLOORS[_currentFloor];
  const day   = getTodayIndex();
  const pi    = getCurrentPeriodIndex();

  _computePinPositions(floor, day, pi).forEach(({ t, loc, px, py }) => {
    _drawPin(ctx, px, py, t, loc, _selectedId === t.id);
  });
}

function _drawPin(ctx, px, py, t, loc, selected) {
  const r = selected ? 15 : 12;
  if (selected) {
    ctx.fillStyle   = t.color + '33';
    ctx.beginPath(); ctx.arc(px, py, r + 7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle   = t.color;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // 상태 점
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(px + r - 3, py - r + 3, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = statusColor(loc.type);
  ctx.beginPath(); ctx.arc(px + r - 3, py - r + 3, 4, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle    = '#fff';
  ctx.font         = `700 ${Math.max(9, r * 0.75)}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t.id, px, py);
}

// ─────────────────────────────────────────────
// 클릭 히트테스트 (선생님 핀)
// ─────────────────────────────────────────────
/**
 * 스크린 좌표 클릭 → 선생님 id 반환 (없으면 null)
 */
export function hitTestPin(sx, sy) {
  const w     = s2w(sx, sy);
  const floor = FLOORS[_currentFloor];
  const day   = getTodayIndex();
  const pi    = getCurrentPeriodIndex();

  // _drawAllPins와 동일한 분산 좌표를 사용해야 같은 방 다수 핀도 정확히 클릭된다.
  // 나중에 그려진(위에 겹쳐진) 핀부터 검사해 화면상 위쪽 핀이 우선 선택되게 한다.
  const positions = _computePinPositions(floor, day, pi);
  for (let i = positions.length - 1; i >= 0; i--) {
    const { t, px, py } = positions[i];
    const r = _selectedId === t.id ? 15 : 12;
    if (Math.hypot(w.x - px, w.y - py) < r + 4) return t.id;
  }
  return null;
}
