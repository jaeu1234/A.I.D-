import { PERIODS, DAYS, TEACHERS, shortName } from '../data/schedule.js';
import { FLOORS } from '../data/floors.js';
import { getCurrentPeriodIndex, getTodayIndex, getPeriodStatusLabel } from '../lib/time.js';
import { getTeacherLocation, resolveRoom, initSync } from '../lib/location.js';
import {
  initCanvas, render, resetZoom, setFloorAndReset,
  zoom, pan, zoomToRoom, hitTestPin, setSelectedId,
  setPredictionContext, invalidateLocationCache,
} from '../lib/map.js';
import { escapeHtml } from '../lib/html.js';

// ── 상태 ──────────────────────────
let selectedId = null;
let currentFloor = 1;
let predictDay = getTodayIndex();      // 0=월 ~ 4=금
const _now = new Date();
let predictHour = _now.getHours();     // 0~23 (24시간제 — 오전/오후 없음)
let predictMin  = _now.getMinutes(); // 0~59 (24시간제 — 오전/오후 없음)

const $ = (id) => document.getElementById(id);
const canvas = $('map');

// ── 초기화 ────────────────────────
function rerenderCurrentSelection() {
  // 다른 기기(관리자 임시일정 등록, AI 시간표 업로드)의 변경이 Realtime으로 들어오면
  // 지금 보고 있는 (층, 예측 요일·교시)가 그대로라도 점유 캐시가 낡은 값을 계속
  // 돌려주지 않도록 비운다.
  invalidateLocationCache();
  applyPredictionContext();
  render();
  if (selectedId) renderInfo();
}

async function boot() {
  await initSync(rerenderCurrentSelection);
  initCanvas(canvas);
  buildDayPicker();
  buildTimePicker();
  buildFloorTabs();
  buildTeacherList();
  applyPredictionContext();
  switchFloor(1);
  updateSummary();
}
boot();
window.addEventListener('resize', () => resetZoom());

// ── 예측 시점 계산 ─────────────────
/** "HH:MM" 입력값 → PERIODS 기준 교시 인덱스 (0~7 | -1 쉬는시간/등교전/하교후) */
function timeToPeriodIndex(hh, mm) {
  const fake = new Date(2000, 0, 1, hh, mm);
  return getCurrentPeriodIndex(fake);
}

function currentPredictPeriodIndex() {
  return timeToPeriodIndex(predictHour, predictMin);
}

function applyPredictionContext() {
  setPredictionContext(predictDay, currentPredictPeriodIndex());
}

function updateSummary() {
  const periodLabel = getPeriodStatusLabel(new Date(2000, 0, 1, predictHour, predictMin));
  $('predictSummary').textContent = `${DAYS[predictDay]}요일 ${fmtTime()} · ${periodLabel} 기준`;
}

function fmtTime() {
  return `${String(predictHour).padStart(2, '0')}:${String(predictMin).padStart(2, '0')}`;
}

function onPredictChange() {
  applyPredictionContext();
  updateSummary();
  render();
  // 정보 패널도 같이 다시 그려야 한다. moveToSelected()는 지도만 옮기므로,
  // 이게 빠지면 요일·시각을 바꿔도 패널엔 이전 시점의 시간표가 그대로 남는다.
  if (selectedId) { moveToSelected(); renderInfo(); }
  buildTeacherList($('search').value);
}

// ── 요일 선택 ─────────────────────
function buildDayPicker() {
  const wrap = $('dayPicker');
  DAYS.forEach((d, i) => {
    const b = document.createElement('button');
    b.textContent = d;
    b.dataset.day = i;
    b.className = i === predictDay ? 'active' : '';
    b.onclick = () => {
      predictDay = i;
      [...wrap.children].forEach(c => c.classList.toggle('active', Number(c.dataset.day) === i));
      onPredictChange();
    };
    wrap.appendChild(b);
  });
}

// ── 시각 선택 (24시간제 드롭다운 — 오전/오후 없음, 항상 같은 순서) ──
function buildTimePicker() {
  const hourSel = $('predictHour');
  for (let h = 0; h < 24; h++) {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = String(h).padStart(2, '0') + '시';
    hourSel.appendChild(opt);
  }
  hourSel.value = predictHour;

  const minSel = $('predictMin');
  for (let m = 0; m < 60; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = String(m).padStart(2, '0') + '분';
    minSel.appendChild(opt);
  }
  minSel.value = predictMin;

  hourSel.addEventListener('change', e => { predictHour = Number(e.target.value); onPredictChange(); });
  minSel.addEventListener('change',  e => { predictMin  = Number(e.target.value); onPredictChange(); });
}

// ── 층 탭 ─────────────────────────
function buildFloorTabs() {
  const tabs = $('floorTabs');
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

$('search').addEventListener('input', e => buildTeacherList(e.target.value));

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

// ── 선생님 선택 ───────────────────
function selectTeacher(id) {
  closeSidebar();
  selectedId = id;
  setSelectedId(id);
  buildTeacherList($('search').value);
  moveToSelected();
  renderInfo();
  openInfoSheet();
}

function moveToSelected() {
  if (!selectedId) return;
  const loc = getTeacherLocation(selectedId, predictDay, currentPredictPeriodIndex());
  const targetFloor = loc.floor ?? currentFloor;
  if (FLOORS[targetFloor]) switchFloor(targetFloor);
  const room = resolveRoom(loc.room, loc.floor, currentFloor, FLOORS[currentFloor]);
  if (room) zoomToRoom(room);
  else render();
}

// ── 정보 패널 렌더 ────────────────
function renderInfo() {
  const panel = $('infoPanelBody');
  const t = TEACHERS.find(x => x.id === selectedId);
  if (!t) {
    panel.innerHTML = '<div class="info-empty">요일·시각을 고르고<br>선생님을 선택하면<br>그 시점의 예상 위치가 표시됩니다.</div>';
    return;
  }

  const pi  = currentPredictPeriodIndex();
  const loc = getTeacherLocation(t.id, predictDay, pi);
  const noteHtml = loc.note ? `<div class="note">📌 ${escapeHtml(loc.note)}</div>` : '';

  const rows = PERIODS.map((period, p) => {
    const rowLoc = getTeacherLocation(t.id, predictDay, p);
    const pill = p === pi ? '<span class="status-pill">예측 시점</span>' : '';
    return `
      <div class="tl-row ${p === pi ? 'picked' : ''}">
        <span class="tl-time">${period.start}</span>
        <span class="tl-period">${period.label}</span>
        <span class="tl-loc">${escapeHtml(rowLoc.label)}${pill}</span>
      </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="info-head">
      <div class="name">${escapeHtml(t.name)} <span style="font-size:14px;color:${t.color}">●</span></div>
      <div class="subject">${escapeHtml(t.subject)} 선생님</div>
    </div>
    <div class="now-card">
      <div class="lbl">${DAYS[predictDay]}요일 ${fmtTime()} 예상 위치</div>
      <div class="loc">${escapeHtml(loc.label)}</div>
      ${noteHtml}
    </div>
    <div class="timeline">
      <h3>${DAYS[predictDay]}요일 시간표</h3>
      ${rows}
    </div>
    <div class="class-note" style="padding:0 18px 18px;font-size:11px;color:var(--muted);line-height:1.5;">
      기본 시간표·AI 시간표 기준 예측입니다. 오늘 등록된 임시일정은 오늘 날짜·교시가 일치할 때만 반영됩니다.
    </div>`;
}

// ── 캔버스 인터랙션 (index.html과 동일) ──
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  zoom(factor, e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });

let dragging = false, moved = false, lastX = 0, lastY = 0;
const activePointers = new Map();
let pinchState = null;

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size === 2) {
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

$('zoomIn').onclick  = () => zoom(1.3);
$('zoomOut').onclick = () => zoom(1 / 1.3);
$('zoomReset').onclick = () => resetZoom();
