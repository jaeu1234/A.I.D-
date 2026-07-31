import { TEACHERS, PERIODS, DAYS } from '../data/schedule.js';
import { FLOORS } from '../data/floors.js';
import { loadOverrides, addOverride, deleteOverride, getEffectiveSchedule, initSync } from '../lib/location.js';
import { getLocalDateStr } from '../lib/time.js';
import { escapeHtml } from '../lib/html.js';

const $ = (id) => document.getElementById(id);

// 게이트를 통과한 PIN. 실제 쓰기 권한은 이 값 자체가 아니라 매 쓰기 요청마다
// /api/admin-write가 서버에서 다시 검증하는 데서 나온다 — 여기 저장은
// 매번 PIN을 다시 입력받지 않기 위한 UX 편의일 뿐이다.
let adminPin = null;

// ── PIN 게이트 ──────────────────
async function tryPin() {
  const candidate = $('pin').value;
  $('pinBtn').disabled = true;
  try {
    const res = await fetch('/api/verify-pin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pin: candidate }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      adminPin = candidate;
      $('gate').classList.add('hidden');
      $('app').classList.remove('hidden');
      await initSync(() => { renderOverrides(); renderSummary(); });
      initApp();
    } else {
      $('pinErr').textContent = data.error || 'PIN이 올바르지 않습니다.';
      $('pin').value = '';
    }
  } catch (err) {
    $('pinErr').textContent = `확인 실패: ${err.message}`;
  } finally {
    $('pinBtn').disabled = false;
  }
}
$('pinBtn').onclick = tryPin;
$('pin').addEventListener('keydown', e => { if (e.key === 'Enter') tryPin(); });

// ── 앱 초기화 ──────────────────
function initApp() {
  // 선생님 select 2곳
  const tOpts = TEACHERS.map(t => `<option value="${t.id}">${t.name} (${t.subject})</option>`).join('');
  $('fTeacher').innerHTML = tOpts;
  $('sTeacher').innerHTML = tOpts;

  // 교시 select
  $('fPeriod').innerHTML = PERIODS.map((p, i) => `<option value="${i}">${p.label}</option>`).join('');

  // 층 select (5층~지하)
  $('fFloor').innerHTML = [5,4,3,2,1,0]
    .map(f => `<option value="${f}">${FLOORS[f].label}</option>`).join('');
  $('fFloor').addEventListener('change', fillRooms);
  fillRooms();

  // 오늘 날짜 기본값 (UTC 기준 toISOString은 자정~오전9시 사이 하루 전 날짜가 되므로 로컬 날짜 사용)
  $('fDate').value = getLocalDateStr();

  $('addBtn').onclick = registerOverride;
  $('sTeacher').addEventListener('change', renderSummary);

  renderOverrides();
  renderSummary();
}

// 선택 층의 방 목록 (복도/화장실 제외하고 실제 위치 가능한 방 위주, 전부 포함)
function fillRooms() {
  const floor = Number($('fFloor').value);
  const rooms = FLOORS[floor].rooms.filter(r => r.type !== 'hall' && r.type !== 'toilet');
  $('fRoom').innerHTML = rooms.map(r => `<option value="${r.id}">${r.label}</option>`).join('');
}

// ── 임시일정 등록 ──────────────
async function registerOverride() {
  const floor = Number($('fFloor').value);
  const roomId = $('fRoom').value;
  const room = FLOORS[floor].rooms.find(r => r.id === roomId);
  if (!room) return;

  const ov = {
    teacherId: $('fTeacher').value,
    date: $('fDate').value,
    periodIdx: Number($('fPeriod').value),
    label: room.label,
    room: room.id,
    floor: floor,
    note: $('fNote').value.trim(),
  };
  if (!ov.date) { alert('날짜를 선택하세요.'); return; }

  $('addBtn').disabled = true;
  try {
    await addOverride(ov, adminPin);
    $('fNote').value = '';
    renderOverrides();
  } catch (err) {
    // 서버가 알려준 실제 원인(환경변수 미설정, PIN 불일치, Supabase 오류 등)을
    // 그대로 보여준다. 예전엔 일반 문구만 떠서 콘솔을 열지 않으면 원인을 알 수 없었다.
    alert(`임시일정 등록에 실패했습니다.\n\n${err.message}`);
  } finally {
    $('addBtn').disabled = false;
  }
}

// ── 목록 렌더 ──────────────────
function renderOverrides() {
  const list = loadOverrides();
  const body = $('ovBody');
  $('ovEmpty').classList.toggle('hidden', list.length > 0);

  body.innerHTML = list.map((o) => {
    const t = TEACHERS.find(x => x.id === o.teacherId);
    const pLabel = PERIODS[o.periodIdx]?.label ?? '-';
    return `<tr>
      <td>${escapeHtml(o.date)}</td>
      <td>${escapeHtml(t ? t.name : o.teacherId)}</td>
      <td>${escapeHtml(pLabel)}</td>
      <td>${escapeHtml(o.label)}${o.floor != null ? ` <span style="color:#8a90a0">(${o.floor === 0 ? '지하' : o.floor + '층'})</span>` : ''}</td>
      <td>${o.note ? escapeHtml(o.note) : '-'}</td>
      <td><button class="del" data-id="${o.id}">삭제</button></td>
    </tr>`;
  }).join('');

  body.querySelectorAll('.del').forEach(btn => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await deleteOverride(Number(btn.dataset.id), adminPin);
        renderOverrides();
      } catch (err) {
        alert(`임시일정 삭제에 실패했습니다.\n\n${err.message}`);
        btn.disabled = false;
      }
    };
  });
}

// ── 시간표 요약 ────────────────
function renderSummary() {
  const id = $('sTeacher').value;
  const sched = getEffectiveSchedule(id);
  const table = $('summary');
  if (!sched) { table.innerHTML = '<tr><td>시간표 없음</td></tr>'; return; }

  let head = '<tr><th>요일</th>' + PERIODS.map(p => `<th>${p.label}</th>`).join('') + '</tr>';
  let rows = DAYS.map((day, d) => {
    const cells = PERIODS.map((_, p) => {
      const v = sched[d]?.[p];
      return v ? `<td class="on">${escapeHtml(v.label)}</td>` : '<td>·</td>';
    }).join('');
    return `<tr><th>${day}</th>${cells}</tr>`;
  }).join('');
  table.innerHTML = head + rows;
}
