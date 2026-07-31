import { PERIODS, DAYS, TEACHERS, shortName } from '../data/schedule.js';
import { FLOORS, getAllClassrooms, findRoomFloor } from '../data/floors.js';
import {
  getCurrentPeriodIndex, getBreakAfterIndex, getTodayIndex, isWeekend, toMins,
} from '../lib/time.js';
import {
  getTeacherLocation, buildTimeline, getNextMove, resolveRoom, getClassSchedule, initSync,
} from '../lib/location.js';
import {
  initCanvas, render, resetZoom, setFloorAndReset,
  zoom, pan, zoomToRoom, hitTestPin, setSelectedId,
  getTravelerState, setRouteProgress, invalidateRouteCache,
} from '../lib/map.js';
import { escapeHtml } from '../lib/html.js';

// ── 상태 ──────────────────────────
let selectedId = null;
let selectedClass = null; // { grade, classNum }
let viewMode = 'teacher'; // 'teacher' | 'class'
let currentFloor = 1;

const $ = (id) => document.getElementById(id);
const canvas = $('map');

// ── 초기화 ────────────────────────
// 다른 기기(관리자 임시일정 등록, AI 시간표 업로드)의 변경이 Realtime으로
// 들어오면 현재 화면(선택된 선생님/반)을 다시 그린다.
function rerenderCurrentSelection() {
  invalidateRouteCache(); // Realtime로 임시일정·AI 시간표가 바뀌면 경로 캐시 무효화
  render();
  if (viewMode === 'teacher' && selectedId) renderInfo();
  if (viewMode === 'class' && selectedClass) renderClassInfo(selectedClass.grade, selectedClass.classNum);
}

async function boot() {
  await initSync(rerenderCurrentSelection);
  initCanvas(canvas);
  buildFloorTabs();
  buildTeacherList();
  switchFloor(1);
  updateClock();
}
boot();

// 1분마다 시각·위치 갱신 (선택된 선생님이 이동 중이면 경로 애니메이션 재가동)
setInterval(() => {
  updateClock();
  render();
  if (selectedId) { renderInfo(); ensureRouteAnim(); }
}, 30000);
// 창 크기 변화 대응
window.addEventListener('resize', () => resetZoom());

// ── 층 탭 ─────────────────────────
function buildFloorTabs() {
  const tabs = $('floorTabs');
  // 5층 → 지하 순으로
  [5, 4, 3, 2, 1, 0].forEach(f => {
    const b = document.createElement('button');
    b.textContent = FLOORS[f].label;
    b.dataset.floor = f;
    b.onclick = () => switchFloor(f);
    tabs.appendChild(b);
  });
}

function switchFloor(f) {
  currentFloor = f;
  setFloorAndReset(f);
  [...$('floorTabs').children].forEach(b =>
    b.classList.toggle('active', Number(b.dataset.floor) === f));
}

// ── 선생님/반 모드 전환 ───────────
$('modeTeacherBtn').onclick = () => switchMode('teacher');
$('modeClassBtn').onclick   = () => switchMode('class');

function switchMode(mode) {
  if (viewMode === mode) return;
  viewMode = mode;
  $('modeTeacherBtn').classList.toggle('active', mode === 'teacher');
  $('modeClassBtn').classList.toggle('active', mode === 'class');
  $('search').value = '';
  $('search').placeholder = mode === 'teacher' ? '선생님 이름 · 과목 검색' : '반 검색 (예: 1-7)';
  stopRouteAnim();
  selectedId = null; setSelectedId(null);
  selectedClass = null;
  renderList();
  renderEmptyInfo();
  render();
}

function renderList(filter = '') {
  if (viewMode === 'teacher') buildTeacherList(filter);
  else buildClassList(filter);
}

function renderEmptyInfo() {
  $('infoPanelBody').innerHTML = viewMode === 'teacher'
    ? '<div class="info-empty">선생님을 선택하면<br>현재 위치와 시간표가 표시됩니다.</div>'
    : '<div class="info-empty">반을 선택하면<br>주간 시간표가 표시됩니다.</div>';
  closeInfoSheet();
}

// ── 모바일: 좌측 목록 드로어 ───────
function openSidebar()  { $('sidebar').classList.add('open'); $('sidebarBackdrop').classList.add('show'); }
function closeSidebar() { $('sidebar').classList.remove('open'); $('sidebarBackdrop').classList.remove('show'); }
$('menuBtn').onclick = () => {
  $('sidebar').classList.contains('open') ? closeSidebar() : openSidebar();
};
$('sidebarBackdrop').onclick = closeSidebar;

// ── 모바일: 하단 정보 시트 ─────────
function openInfoSheet()  { $('infoPanel').classList.add('open'); }
function closeInfoSheet() { $('infoPanel').classList.remove('open'); }
$('ipClose').onclick = closeInfoSheet;

$('search').addEventListener('input', e => renderList(e.target.value));

// ── 선생님 목록 ───────────────────
function buildTeacherList(filter = '') {
  const list = $('teacherList');
  list.innerHTML = '';
  const q = filter.trim().toLowerCase();
  TEACHERS
    .filter(t => !q || t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))
    .forEach(t => {
      const div = document.createElement('div');
      div.className = 'teacher-item' + (t.id === selectedId ? ' active' : '');
      div.onclick = () => selectTeacher(t.id);
      div.innerHTML = `
        <div class="teacher-dot" style="background:${t.color}">${shortName(t.name)}</div>
        <div class="teacher-meta">
          <div class="name">${t.name}</div>
          <div class="sub">${t.subject}</div>
        </div>`;
      list.appendChild(div);
    });
}

// ── 반 목록 ───────────────────────
function buildClassList(filter = '') {
  const list = $('teacherList');
  list.innerHTML = '';
  const q = filter.trim().replace(/\s/g, '').toLowerCase();
  getAllClassrooms()
    .filter(c => !q || `${c.grade}-${c.classNum}`.includes(q) || `${c.grade}학년${c.classNum}반`.includes(q))
    .forEach(c => {
      const div = document.createElement('div');
      const isActive = selectedClass && selectedClass.grade === c.grade && selectedClass.classNum === c.classNum;
      div.className = 'teacher-item' + (isActive ? ' active' : '');
      div.onclick = () => selectClass(c.grade, c.classNum);
      div.innerHTML = `
        <div class="teacher-dot" style="background:var(--accent)">${c.grade}-${c.classNum}</div>
        <div class="teacher-meta">
          <div class="name">${c.grade}학년 ${c.classNum}반</div>
          <div class="sub">${c.floor === 0 ? '지하' : c.floor + '층'}</div>
        </div>`;
      list.appendChild(div);
    });
}

// ── 반 선택 ───────────────────────
function selectClass(grade, classNum) {
  closeSidebar();
  selectedClass = { grade, classNum };
  buildClassList($('search').value);

  const roomId = `${grade}-${classNum}`;
  const floor  = findRoomFloor(roomId);
  if (floor != null && FLOORS[floor]) {
    switchFloor(floor);
    const room = FLOORS[floor].rooms.find(r => r.id === roomId);
    if (room) zoomToRoom(room);
    else render();
  } else {
    render();
  }

  renderClassInfo(grade, classNum);
  openInfoSheet();
}

// ── 반 시간표 렌더 ────────────────
function renderClassInfo(grade, classNum) {
  const panel = $('infoPanelBody');
  const sched = getClassSchedule(grade, classNum);

  const head = '<tr><th>교시</th>' + DAYS.map(d => `<th>${d}</th>`).join('') + '</tr>';
  const rows = PERIODS.map((period, p) => {
    const cells = DAYS.map((_, d) => {
      const cell = sched[d][p];
      return cell
        ? `<td class="on"><span class="sub-name">${escapeHtml(cell.subject)}</span><span class="sub-teacher">${escapeHtml(cell.teacherName)}</span></td>`
        : '<td>·</td>';
    }).join('');
    return `<tr><th>${period.label}</th>${cells}</tr>`;
  }).join('');

  panel.innerHTML = `
    <div class="info-head">
      <div class="name">${grade}학년 ${classNum}반</div>
      <div class="subject">주간 시간표</div>
    </div>
    <div class="class-wrap">
      <table class="class-table">${head}${rows}</table>
    </div>
    <div class="class-note">담당 선생님 정보가 없는 시간(자율학습·동아리 등)은 빈 칸(·)으로 표시됩니다.</div>`;
}

// ── 이동 경로 애니메이션 ──────────
// 쉬는 시간에 선택된 선생님의 이동 점을 경로 위에서 움직이고, 다른 층으로
// 넘어가면 자동으로 층을 전환한다. 실시간 표류는 눈에 잘 안 보이므로,
// 선택 직후 0→현재진행률로 짧게 스윕(인트로)한 뒤 1초 틱으로 실시각을 따른다.
let routeTimer = null, introRAF = null, breakTimeout = null;
// 이동 점이 마지막으로 관측된 층. "점이 실제로 층을 바꿨을 때"만 따라가기 위한 기준.
let lastTravelerFloor = null;

function stopRouteAnim() {
  if (routeTimer)   { clearInterval(routeTimer); routeTimer = null; }
  if (introRAF)     { cancelAnimationFrame(introRAF); introRAF = null; }
  if (breakTimeout) { clearTimeout(breakTimeout); breakTimeout = null; }
  lastTravelerFloor = null;
  setRouteProgress(null);
}

// 이동 점이 "직전 관측 층과 다른 층으로 넘어갔을 때"만 그 층으로 따라간다.
// currentFloor와 매 틱 비교하지 않으므로, 사용자가 수동으로 다른 층을 봐도 튕기지 않는다.
function followTravelerFloor() {
  if (!selectedId) return false;
  const st = getTravelerState(selectedId);
  const f = st?.pos?.floor;
  if (f == null) return false;
  const crossed = f !== lastTravelerFloor;
  lastTravelerFloor = f;
  if (crossed && f !== currentFloor && FLOORS[f]) { switchFloor(f); return true; }
  return false;
}

// 다음 쉬는 시간 시작 시각에 정확히 애니메이션을 켠다(30초 지연·폴링 없이).
function scheduleNextBreak() {
  const pi = getCurrentPeriodIndex();
  if (pi < 0) return; // 쉬는 시간·방과후엔 예약 안 함
  const now = new Date();
  const nowMs = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000;
  const endMs = toMins(PERIODS[pi].end) * 60000;
  const wait = Math.max(endMs - nowMs, 0) + 500;
  breakTimeout = setTimeout(() => { breakTimeout = null; startRouteAnim(); }, wait);
}

// 이동 중이 아니면 정적 렌더 + 다음 쉬는 시간 예약, 이동 중이면 인트로 스윕 → 1초 틱.
function startRouteAnim() {
  stopRouteAnim();
  if (!selectedId) return;
  const st = getTravelerState(selectedId);
  if (!st || !st.moving) { render(); scheduleNextBreak(); return; }

  const target = st.progress, t0 = performance.now(), dur = 1400;
  const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  setRouteProgress(0);
  (function intro(now) {
    if (!selectedId) { introRAF = null; setRouteProgress(null); return; } // 선택 해제 시 즉시 중단
    const p = Math.min((now - t0) / dur, 1);
    setRouteProgress(target * ease(p));
    if (!followTravelerFloor()) render(); // switchFloor는 내부에서 render 호출
    if (p < 1) { introRAF = requestAnimationFrame(intro); }
    else {
      introRAF = null;
      setRouteProgress(null); // 이후 실시각 기준
      routeTimer = setInterval(() => {
        if (!selectedId) return stopRouteAnim();
        const s = getTravelerState(selectedId);
        if (!s || !s.moving) { startRouteAnim(); return; } // 쉬는 시간 종료 → 다음 쉬는 시간 예약
        if (!followTravelerFloor()) render();
      }, 1000);
    }
  })(performance.now());
}

// 선택 상태에서 이동이 시작됐는데 애니메이션이 꺼져 있으면 켠다(30초 틱의 안전망).
function ensureRouteAnim() {
  if (!selectedId || routeTimer || introRAF || breakTimeout) return;
  startRouteAnim();
}

// ── 선생님 선택 ───────────────────
function selectTeacher(id) {
  closeSidebar();
  // 반 모드에서 지도 핀을 클릭해 선생님을 선택한 경우 선생님 모드로 전환
  if (viewMode !== 'teacher') {
    viewMode = 'teacher';
    $('modeTeacherBtn').classList.add('active');
    $('modeClassBtn').classList.remove('active');
    $('search').value = '';
    $('search').placeholder = '선생님 이름 · 과목 검색';
  }
  selectedClass = null;
  selectedId = id;
  setSelectedId(id);
  buildTeacherList($('search').value);

  // 현재 위치가 있는 층으로 이동 후 해당 방으로 줌.
  // 쉬는 시간(pi<0)에는 직전 교시 위치를 기준으로 잡아 이동 경로의 출발점이 보이게 한다.
  const day = getTodayIndex();
  const pi  = getCurrentPeriodIndex();
  const breakAf = getBreakAfterIndex();
  const curPi = pi >= 0 ? pi : (breakAf >= 0 ? breakAf : -1);
  const loc = getTeacherLocation(id, day, curPi);
  // loc.floor가 없으면(교무실 등 층이 정해지지 않은 위치) 현재 보고 있는 층을 유지
  const targetFloor = loc.floor ?? currentFloor;

  if (FLOORS[targetFloor]) switchFloor(targetFloor);
  const room = resolveRoom(loc.room, loc.floor, currentFloor, FLOORS[currentFloor]);
  if (room) zoomToRoom(room);
  else render();

  renderInfo();
  startRouteAnim();
  openInfoSheet();
}

// ── 정보 패널 렌더 ────────────────
function renderInfo() {
  const panel = $('infoPanelBody');
  const t = TEACHERS.find(x => x.id === selectedId);
  if (!t) { panel.innerHTML = '<div class="info-empty">선생님을 선택하면<br>현재 위치와 시간표가 표시됩니다.</div>'; return; }

  const day = getTodayIndex();
  const pi  = getCurrentPeriodIndex();
  const cur = getTeacherLocation(t.id, day, pi);
  const move = getNextMove(t.id);
  const timeline = buildTimeline(t.id);

  let nextHtml = '';
  if (move && move.toLoc) {
    const verb = move.isMovingNow ? '이동 중 →' : '다음';
    const st = getTravelerState(t.id);
    let hint = '';
    if (st.route && st.route.crossFloor) {
      hint = ` <span class="route-hint">${st.route.fromFloor}층→${st.route.toFloor}층 · 계단</span>`;
    }
    const pct = (move.isMovingNow && st.route)
      ? ` <span class="route-hint">${Math.round(st.progress * 100)}%</span>` : '';
    nextHtml = `<div class="next">${verb} <b>${escapeHtml(move.toPeriod.label)}</b> · ${escapeHtml(move.toLoc.label)}${hint}${pct}</div>`;
  }
  const noteHtml = cur.note ? `<div class="note">📌 ${escapeHtml(cur.note)}</div>` : '';

  const rows = timeline.map(({ period, loc, status }) => {
    let pill = '';
    if (status === 'now')  pill = '<span class="status-pill pill-now">현재</span>';
    if (status === 'next') pill = '<span class="status-pill pill-next">다음</span>';
    return `
      <div class="tl-row ${status}">
        <span class="tl-time">${period.start}</span>
        <span class="tl-period">${period.label}</span>
        <span class="tl-loc">${escapeHtml(loc.label)}${pill}</span>
      </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="info-head">
      <div class="name">${escapeHtml(t.name)} <span style="font-size:14px;color:${t.color}">●</span></div>
      <div class="subject">${escapeHtml(t.subject)} 선생님</div>
    </div>
    <div class="now-card">
      <div class="lbl">지금 위치</div>
      <div class="loc">${escapeHtml(cur.label)}</div>
      ${nextHtml}
      ${noteHtml}
    </div>
    <div class="timeline">
      <h3>${DAYS[day]}요일 시간표</h3>
      ${rows}
    </div>`;
}

// ── 시계 · 교시 뱃지 ──────────────
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const weekendNote = isWeekend() ? ' · 주말(월요일 시간표 기준)' : '';
  $('clock').textContent = `${DAYS[getTodayIndex()]}요일 ${hh}:${mm}${weekendNote}`;
  const pi = getCurrentPeriodIndex();
  $('periodBadge').textContent = pi >= 0 ? PERIODS[pi].label : '쉬는 시간';
}

// ── 캔버스 인터랙션 ───────────────
// 휠 줌
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  zoom(factor, e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });

// 드래그 패닝 · 두 손가락 핀치 줌 · 탭 클릭 판정
let dragging = false, moved = false, lastX = 0, lastY = 0;
const activePointers = new Map(); // 터치 중인 모든 포인터(핀치 감지용)
let pinchState = null; // { prevDist, prevMidX, prevMidY }

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size === 2) {
    // 핀치 시작: 단일 드래그는 중단하고 두 손가락 거리·중점을 기준으로 삼는다.
    dragging = false;
    const [p1, p2] = [...activePointers.values()];
    pinchState = {
      prevDist: Math.hypot(p2.x - p1.x, p2.y - p1.y),
      prevMidX: (p1.x + p2.x) / 2,
      prevMidY: (p1.y + p2.y) / 2,
    };
  } else if (activePointers.size === 1) {
    dragging = true; moved = false; lastX = e.clientX; lastY = e.clientY;
  }
});
canvas.addEventListener('pointermove', e => {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size >= 2) {
    const [p1, p2] = [...activePointers.values()];
    const rect = canvas.getBoundingClientRect();
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
    if (pinchState) {
      const dx = midX - pinchState.prevMidX, dy = midY - pinchState.prevMidY;
      if (dx || dy) pan(dx, dy);
      const factor = dist / pinchState.prevDist;
      if (Number.isFinite(factor) && factor > 0) zoom(factor, midX - rect.left, midY - rect.top);
    }
    pinchState = { prevDist: dist, prevMidX: midX, prevMidY: midY };
    return;
  }

  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
  pan(dx, dy);
  lastX = e.clientX; lastY = e.clientY;
});

function endPointer(e) {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) pinchState = null;
  if (activePointers.size === 1) {
    // 손가락 하나가 남으면 그 지점부터 드래그를 이어간다(탭으로 오인하지 않게 moved=true).
    const p = [...activePointers.values()][0];
    dragging = true; moved = true; lastX = p.x; lastY = p.y;
  } else if (activePointers.size === 0) {
    dragging = false;
    if (!moved) {
      const rect = canvas.getBoundingClientRect();
      const id = hitTestPin(e.clientX - rect.left, e.clientY - rect.top);
      if (id) selectTeacher(id);
    }
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

// 줌 버튼
$('zoomIn').onclick  = () => zoom(1.3);
$('zoomOut').onclick = () => zoom(1 / 1.3);
$('zoomReset').onclick = () => resetZoom();
