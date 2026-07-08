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
  if (!floor || !_canvas) return;
  // 주의: _CW/_CH는 render()가 실행돼야만 채워지는 값이라, 최초 로드 시(아직 한 번도
  // render()가 호출되기 전)에는 항상 0이다. 그 상태에서 이 값만 보고 판단하면
  // 페이지가 열려도 지도가 영원히 렌더되지 않는 버그가 생긴다 — 여기서 직접
  // wrap 크기를 새로 측정해야 최초 로드 시에도 정상적으로 화면이 그려진다.
  const wrap = _canvas.parentElement;
  const rect = wrap.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;
  _CW = rect.width;
  _CH = rect.height;
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

  // 방별 선생님 점유 현황을 한 번만 계산해 라벨 위치(_drawFloor)와
  // 핀/클러스터 배치(_drawAllPins)가 동일한 기준을 쓰도록 공유한다.
  const floor = FLOORS[_currentFloor];
  const occ   = floor ? _computeOccupancy(floor, getTodayIndex(), getCurrentPeriodIndex()) : {};

  _drawFloor(ctx, occ);

  if (_selectedId) {
    _drawTeacherRoute(ctx, _selectedId);
  }
  _drawAllPins(ctx, occ);

  ctx.restore();
}

// ─────────────────────────────────────────────
// 내부 드로잉
// ─────────────────────────────────────────────
function _drawFloor(ctx, occ = {}) {
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

    // 라벨은 방 너비에 맞춰 자동 줄바꿈 + 폰트 자동 축소로 그린다.
    // (긴 이름이 옆 칸으로 넘쳐 겹쳐 보이던 "글씨 깨짐" 문제 해결)
    const cx = x + w / 2;
    if (type === 'hall') {
      const fit = _fitLabel(ctx, label, w - 8, h - 6, Math.min(11, w / 5), 6.5, '');
      _drawLines(ctx, fit, cx, y + h / 2, '', 'rgba(0,0,0,.28)');
    } else {
      // 선생님 핀/클러스터가 방 중앙~하단에 그려지므로, 점유된 방은 라벨을
      // 위쪽 영역에만 배치해 핀과 겹치지 않게 한다(빈 방은 방 전체 중앙).
      const occupied = (occ[room.id]?.length ?? 0) > 0;
      const padX   = Math.min(10, w * 0.14);
      const top    = y + 5;
      const bottom = occupied ? y + h * 0.48 : y + h - 5;
      const fit = _fitLabel(ctx, label, w - padX * 2, bottom - top, 13, 6.5, '500 ');
      _drawLines(ctx, fit, cx, (top + bottom) / 2, '500 ', 'rgba(0,0,0,.68)');
    }
  });
}

// ─────────────────────────────────────────────
// 라벨 자동 줄바꿈 · 폰트 축소
// ─────────────────────────────────────────────

/** 주어진 폭에 맞게 텍스트를 문자 단위로 줄바꿈(한글은 단어 경계가 없어 문자 기준). */
function _wrapText(ctx, text, maxW) {
  const lines = [];
  let line = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * 방 크기(maxW×maxH) 안에 들어가도록 폰트를 단계적으로 줄이며 줄바꿈을 계산한다.
 * 최소 폰트로도 안 들어가면 마지막 줄을 '…'로 잘라 절대 칸 밖으로 넘치지 않게 한다.
 * @returns {{ fs:number, lines:string[], lineH:number }}
 */
function _fitLabel(ctx, text, maxW, maxH, maxFont, minFont, weight) {
  for (let fs = maxFont; fs >= minFont; fs -= 0.5) {
    ctx.font = `${weight}${fs}px sans-serif`;
    const lines  = _wrapText(ctx, text, maxW);
    const lineH  = fs * 1.16;
    const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
    if (lines.length * lineH <= maxH && widest <= maxW) return { fs, lines, lineH };
  }
  // 최소 폰트 + 높이 초과 시 말줄임
  const fs = minFont;
  ctx.font = `${weight}${fs}px sans-serif`;
  let lines = _wrapText(ctx, text, maxW);
  const lineH = fs * 1.16;
  const maxLines = Math.max(1, Math.floor(maxH / lineH));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return { fs, lines, lineH };
}

/** _fitLabel 결과를 (cx, cyCenter) 중심에 여러 줄로 그린다. */
function _drawLines(ctx, fit, cx, cyCenter, weight, color) {
  ctx.font = `${weight}${fit.fs}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const startY = cyCenter - (fit.lines.length - 1) * fit.lineH / 2;
  fit.lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * fit.lineH));
}

function _drawTeacherRoute(ctx, teacherId) {
  const floor   = FLOORS[_currentFloor];
  const day     = getTodayIndex();
  const pi      = getCurrentPeriodIndex();
  const breakAf = getBreakAfterIndex();

  // 현재 위치
  // 등교 전·하교 후(pi<0 이고 쉬는 시간도 아님)에는 표시할 "현재 교시"가 없으므로
  // -1을 그대로 넘겨 room:null을 받는다. 과거에는 0(1교시)으로 고정 대체해
  // 하교 후에도 1교시 위치가 잘못 강조 표시되는 버그가 있었다.
  const curLocPi  = pi >= 0 ? pi : (breakAf >= 0 ? breakAf : -1);
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

const PIN_R = 11; // 기본 핀 반지름 (선택 시 살짝 커짐)

/**
 * 방별로 어떤 선생님이 있는지 묶어서 반환. { [roomId]: [{ t, loc }] }
 * 렌더링(_drawFloor 라벨 위치·_drawAllPins)과 클릭 판정(hitTestPin)이
 * 모두 같은 기준을 쓰도록 한 곳에서 계산한다.
 */
function _computeOccupancy(floor, day, pi) {
  const byRoom = {};
  TEACHERS.forEach(t => {
    const loc  = getTeacherLocation(t.id, day, pi);
    const room = resolveRoom(loc.room, loc.floor, _currentFloor, floor);
    if (!room) return;
    (byRoom[room.id] ??= []).push({ t, loc });
  });
  return byRoom;
}

/**
 * 한 방 안의 선생님들을 어떻게 그릴지 결정한다.
 * - 핀들이 한 줄로 방 너비에 들어가면 → 개별 핀을 가로로 나란히(row)
 * - 너무 많아 안 들어가면 → "N명" 클러스터 칩 하나로 묶음(cluster)
 *   단, 그 방에 선택된 선생님이 있으면 그 선생님 핀 + "+N" 배지로 표시해
 *   교무실처럼 다 모여 있어도 선택한 선생님은 또렷이 보이게 한다.
 * 반환: [{ kind:'pin'|'cluster'|'count', ... }]
 */
function _layoutRoom(room, entries) {
  const n     = entries.length;
  const cx    = room.x + room.w / 2;
  // 라벨을 위로 올렸으므로 핀은 방의 중앙보다 살짝 아래에 배치한다.
  const yRow  = room.y + room.h * 0.60;
  const gap   = 5;
  const rowW  = n * (PIN_R * 2) + (n - 1) * gap;

  // 한 줄에 여유 있게 들어가면 개별 핀을 가로로 나열
  if (n <= 6 && rowW <= room.w - 10) {
    const startX = cx - rowW / 2 + PIN_R;
    return entries.map((e, i) => ({
      kind: 'pin', t: e.t, loc: e.loc,
      px: startX + i * (PIN_R * 2 + gap), py: yRow,
    }));
  }

  // 붐비는 방 → 클러스터로 묶음
  const sel = entries.find(e => e.t.id === _selectedId);
  if (sel) {
    return [
      { kind: 'pin',   t: sel.t, loc: sel.loc, px: cx - 12, py: yRow },
      { kind: 'count', n: n - 1, px: cx - 12 + PIN_R + 9, py: yRow - PIN_R - 1 },
    ];
  }
  return [{ kind: 'cluster', n, px: cx, py: yRow }];
}

function _drawAllPins(ctx, occ) {
  const floor = FLOORS[_currentFloor];
  Object.entries(occ).forEach(([roomId, entries]) => {
    const room = floor.rooms.find(r => r.id === roomId);
    if (!room) return;
    _layoutRoom(room, entries).forEach(item => {
      if (item.kind === 'pin')          _drawPin(ctx, item.px, item.py, item.t, item.loc, _selectedId === item.t.id);
      else if (item.kind === 'cluster') _drawCluster(ctx, item.px, item.py, item.n);
      else if (item.kind === 'count')   _drawCountBadge(ctx, item.px, item.py, item.n);
    });
  });
}

function _drawPin(ctx, px, py, t, loc, selected) {
  const r = selected ? PIN_R + 3 : PIN_R;
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

/** 여러 명이 모인 방을 대표하는 "N명" 클러스터 칩 */
function _drawCluster(ctx, px, py, n) {
  const text = `${n}명`;
  ctx.font = `700 12px sans-serif`;
  const tw    = ctx.measureText(text).width;
  const iconW = 15;          // 좌측 사람 아이콘 영역
  const padX  = 9;
  const w = tw + iconW + padX * 2;
  const h = 24;
  const x = px - w / 2, y = py - h / 2;

  ctx.save();
  // 그림자
  ctx.shadowColor = 'rgba(16,24,40,.28)';
  ctx.shadowBlur  = 5;
  ctx.shadowOffsetY = 1.5;
  ctx.fillStyle   = '#3b5bdb';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.stroke();

  // 사람 아이콘(겹친 두 개의 머리+어깨)
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  const ix = x + padX + 3;
  ctx.beginPath(); ctx.arc(ix,     py - 3, 3,   0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ix + 5, py - 3, 3,   0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(ix - 3.5, py + 0.5, 7, 5, 2.4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(ix + 1.5, py + 0.5, 7, 5, 2.4); ctx.fill();

  // 숫자
  ctx.fillStyle    = '#fff';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX + iconW, py + 0.5);
  ctx.restore();
}

/** 선택된 선생님 핀 옆에 붙는 "+N"(같은 방의 나머지 인원) 배지 */
function _drawCountBadge(ctx, px, py, n) {
  const text = `+${n}`;
  ctx.font = `700 10px sans-serif`;
  const tw = ctx.measureText(text).width;
  const w  = Math.max(18, tw + 9);
  const h  = 16;
  const x  = px - w / 2, y = py - h / 2;

  ctx.save();
  ctx.fillStyle   = '#3b5bdb';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.6;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle    = '#fff';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, px, py + 0.5);
  ctx.restore();
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
  const occ   = _computeOccupancy(floor, getTodayIndex(), getCurrentPeriodIndex());

  // _drawAllPins와 동일한 배치를 재현해, 실제로 그려진 개별 핀만 클릭 대상으로 삼는다.
  // 클러스터("N명")는 대표 표시일 뿐이라 클릭 대상에서 제외(선택은 좌측 목록으로).
  const pins = [];
  Object.entries(occ).forEach(([roomId, entries]) => {
    const room = floor.rooms.find(r => r.id === roomId);
    if (!room) return;
    _layoutRoom(room, entries).forEach(item => { if (item.kind === 'pin') pins.push(item); });
  });

  // 나중에 그려진(위에 겹쳐진) 핀부터 검사해 화면상 위쪽 핀이 우선 선택되게 한다.
  for (let i = pins.length - 1; i >= 0; i--) {
    const { t, px, py } = pins[i];
    const r = _selectedId === t.id ? PIN_R + 3 : PIN_R;
    if (Math.hypot(w.x - px, w.y - py) < r + 4) return t.id;
  }
  return null;
}
