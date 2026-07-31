import { TEACHERS, PERIODS, DAYS } from '../data/schedule.js';
import { getAllClassrooms } from '../data/floors.js';
import { saveAiSchedule, saveClassAiSchedule } from '../lib/location.js';
import { initPinGate } from '../lib/pinGate.js';

const $ = (id) => document.getElementById(id);

let imageB64 = null, imageMime = null, parsed = null;
let currentMode = 'teacher'; // 'teacher' | 'class'

// 게이트를 통과한 PIN. 실제 저장 권한은 이 값 자체가 아니라 매 저장 요청마다
// /api/admin-write가 서버에서 다시 검증하는 데서 나온다.
let adminPin = null;

initPinGate((pin) => { adminPin = pin; });

// ── 선생님 select ──────────────
$('teacher').innerHTML = TEACHERS
  .map(t => `<option value="${t.id}">${t.name} (${t.subject})</option>`).join('');

// ── 반 select 초기화 ───────────
function updateClassNums() {
  const grade = Number($('grade').value);
  const classes = getAllClassrooms().filter(c => c.grade === grade);
  $('classNum').innerHTML = classes
    .map(c => `<option value="${c.classNum}">${c.classNum}반</option>`).join('');
}
updateClassNums();
$('grade').addEventListener('change', updateClassNums);

// ── 모드 전환 ──────────────────
$('modeTeacherBtn').onclick = () => switchMode('teacher');
$('modeClassBtn').onclick   = () => switchMode('class');

function switchMode(mode) {
  currentMode = mode;
  imageB64 = null;
  $('preview').style.display = 'none';
  $('analyze').disabled = true;
  $('resultCard').classList.add('hidden');
  setStatus('status', '', '');

  const isTeacher = mode === 'teacher';
  $('modeTeacherBtn').style.cssText = isTeacher
    ? 'flex:1;padding:8px 0;font-size:13px;font-weight:700;background:var(--accent);color:#fff;'
    : 'flex:1;padding:8px 0;font-size:13px;font-weight:700;';
  $('modeClassBtn').style.cssText = !isTeacher
    ? 'flex:1;padding:8px 0;font-size:13px;font-weight:700;background:var(--accent);color:#fff;'
    : 'flex:1;padding:8px 0;font-size:13px;font-weight:700;';

  $('teacherRow').classList.toggle('hidden', !isTeacher);
  $('classRow').classList.toggle('hidden', isTeacher);

  $('editHint').innerHTML = isTeacher
    ? '셀 형식: <b>과목(학년-반)</b> 예: 수학(2-1). 빈 시간은 비워두세요. 점심 열은 보통 빈칸입니다.'
    : '셀 형식: <b>과목(선생님이름)</b> 예: 수학(홍민지). 선생님 이름이 정확해야 지도에 연동됩니다. 빈 시간은 비워두세요.';
  $('save').textContent = isTeacher ? '💾 이 선생님 시간표로 저장' : '💾 이 반 시간표로 저장';
}

// ── 파일 → base64 공통 처리 (업로드 전 축소·압축) ────
// 휴대폰 카메라 원본(수 MB)을 그대로 base64로 보내면 서버리스 함수의
// 기본 요청 바디 크기 제한에 걸려 큰 사진이 업로드 실패할 수 있다.
// AI가 표를 읽는 데는 원본 해상도가 필요 없으므로 canvas로 한 변
// MAX_DIM 이하로 줄이고 JPEG로 재압축해서 보낸다.
const MAX_DIM = 1600;
const JPEG_QUALITY = 0.85;

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = MAX_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽을 수 없습니다.')); };
    img.src = url;
  });
}

function bindFileInput(inputId) {
  $(inputId).addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const dataUrl = await resizeImageFile(f);
      imageMime = 'image/jpeg';
      imageB64 = dataUrl.split(',')[1];
      $('preview').src = dataUrl;
      $('preview').style.display = 'block';
      $('analyze').disabled = false;
    } catch (err) {
      setStatus('status', 'err', `이미지 처리 실패: ${err.message}`);
    }
  });
}
bindFileInput('file');
bindFileInput('fileClass');

// ── AI 분석 ────────────────────
// 실제 Anthropic API 호출은 서버(/api/analyze)가 대신 한다 — API 키가
// 브라우저에 전혀 노출되지 않도록 서버 환경변수(ANTHROPIC_API_KEY)로만 보관.
$('analyze').onclick = analyze;

async function analyze() {
  if (!imageB64) { setStatus('status', 'err', '사진을 먼저 업로드하세요.'); return; }

  $('analyze').disabled = true;
  setStatus('status', '', '분석 중… (수 초 소요)');

  const payload = { pin: adminPin, mode: currentMode, imageB64, imageMime };
  if (currentMode === 'class') {
    payload.grade = $('grade').value;
    payload.classNum = $('classNum').value;
  }

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus('status', 'err', `분석 실패: ${data?.error || 'HTTP ' + res.status}`);
      $('analyze').disabled = false; return;
    }

    parsed = normalize(data.schedule);
    renderEditTable(parsed);
    $('resultCard').classList.remove('hidden');
    setStatus('status', 'ok', '분석 완료. 아래에서 확인·수정하세요.');
    $('analyze').disabled = false;
  } catch (err) {
    setStatus('status', 'err', `네트워크 오류: ${err.message}`);
    $('analyze').disabled = false;
  }
}

// schedule을 5×8로 정규화
function normalize(sched) {
  const out = [];
  for (let d = 0; d < 5; d++) {
    const row = Array.isArray(sched?.[d]) ? sched[d] : [];
    const fixed = [];
    for (let p = 0; p < PERIODS.length; p++) {
      const v = row[p];
      fixed.push(typeof v === 'string' && v.trim() ? v.trim() : null);
    }
    out.push(fixed);
  }
  return out;
}

// ── 편집 표 렌더 ───────────────
function renderEditTable(sched) {
  const table = $('editTable');
  let head = '<tr><th>요일</th>' + PERIODS.map(p => `<th>${p.label}</th>`).join('') + '</tr>';
  let rows = DAYS.map((day, d) => {
    const cells = PERIODS.map((_, p) => {
      const v = sched[d][p] ?? '';
      return `<td><input data-d="${d}" data-p="${p}" value="${v.replace(/"/g, '&quot;')}" /></td>`;
    }).join('');
    return `<tr><th>${day}</th>${cells}</tr>`;
  }).join('');
  table.innerHTML = head + rows;
}

function collectTable() {
  const out = Array.from({ length: 5 }, () => Array(PERIODS.length).fill(null));
  $('editTable').querySelectorAll('input').forEach(inp => {
    const d = Number(inp.dataset.d), p = Number(inp.dataset.p);
    const v = inp.value.trim();
    out[d][p] = v || null;
  });
  return out;
}

// ── 저장 ───────────────────────
$('save').onclick = async () => {
  const schedule = collectTable();
  $('save').disabled = true;
  try {
    if (currentMode === 'teacher') {
      const id = $('teacher').value;
      await saveAiSchedule(id, schedule, adminPin);
      const t = TEACHERS.find(x => x.id === id);
      setStatus('saveStatus', 'ok', `${t ? t.name : id} 선생님 시간표를 저장했습니다. 학생 화면에 반영됩니다.`);
    } else {
      const grade = $('grade').value, classNum = $('classNum').value;
      const classId = `${grade}-${classNum}`;
      await saveClassAiSchedule(classId, schedule, adminPin);
      setStatus('saveStatus', 'ok', `${grade}학년 ${classNum}반 시간표를 저장했습니다. 반 시간표 화면에 반영됩니다.`);
    }
  } catch {
    setStatus('saveStatus', 'err', '저장에 실패했습니다. Supabase에 class_ai_schedules 테이블이 있는지 확인하세요.');
  } finally {
    $('save').disabled = false;
  }
};

// ── 유틸 ───────────────────────
function setStatus(id, cls, msg) {
  const el = $(id);
  el.className = 'status' + (cls ? ' ' + cls : '');
  el.textContent = msg;
}
