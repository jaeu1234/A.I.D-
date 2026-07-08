// ─────────────────────────────────────────────
// 방 색상 팔레트 (2026 교실배치도 기준)
// 교실은 학년별 색(1학년 초록·2학년 파랑·3학년 주황)으로 구분한다.
// ─────────────────────────────────────────────
const C = {
  g1:      { fill: '#dcedc8', stroke: '#9ccc65' }, // 1학년 교실
  g2:      { fill: '#d6e2ff', stroke: '#9fb4ef' }, // 2학년 교실
  g3:      { fill: '#ffe0b2', stroke: '#ffb74d' }, // 3학년 교실
  office:  { fill: '#c8e6c9', stroke: '#81c784' }, // 교무실
  home:    { fill: '#e8f5e9', stroke: '#a5d6a7' }, // 홈베이스
  lab2:    { fill: '#ffecb3', stroke: '#ffca62' }, // 교과연구실
  cafe:    { fill: '#e7def5', stroke: '#b39ddb' }, // 수업카페·학습카페
  special: { fill: '#fff8e1', stroke: '#f0c878' }, // 일반 특별실
  lab:     { fill: '#e1f5fe', stroke: '#80caee' }, // 실험·컴퓨터·미디어
  admin:   { fill: '#fce4ec', stroke: '#f0a0b8' }, // 행정·교장·보건
  music:   { fill: '#e1bee7', stroke: '#ba68c8' }, // 음악실
  counsel: { fill: '#f8bbd0', stroke: '#f06292' }, // 상담·창의인성
  lib:     { fill: '#ffcc80', stroke: '#ffa726' }, // 도서관
  gym:     { fill: '#c5e1a5', stroke: '#8bc34a' }, // 체육관·강당
  annex:   { fill: '#c8e6c9', stroke: '#81c784' }, // 경건관·상생문 별관
  stair:   { fill: '#ece9e0', stroke: '#c9c6bb' }, // 계단
  toilet:  { fill: '#b3e5fc', stroke: '#4fc3f7' }, // 화장실
  hall:    { fill: '#f5f5f2', stroke: '#e0e0e0' }, // 복도
};
const TYPE_OF = {
  g1:'class', g2:'class', g3:'class', office:'office', home:'special', lab2:'special',
  cafe:'special', special:'special', lab:'special', admin:'special', music:'special',
  counsel:'special', lib:'special', gym:'special', annex:'special', stair:'hall', toilet:'toilet',
  hall:'hall',
};

// ─────────────────────────────────────────────
// 층 레이아웃 빌더
// 방을 왼쪽부터 순서대로 배치(x 자동 계산). 위/아래 두 줄(top/bot)과 그 사이
// 복도, 층 전체를 가르는 계단·화장실(div)로 구성. 별관은 abs로 절대 배치.
// ─────────────────────────────────────────────
const TOP_H = 100, BOT_Y = 118, BOT_H = 100, FLOOR_H = 220;

function makeFloor(label) {
  const rooms = [];
  let tx = 0, bx = 0;
  const push = (id, l, x, y, w, h, ck) =>
    rooms.push({ id, label: l, x, y, w, h, ...C[ck], type: TYPE_OF[ck] });
  const api = {
    // 층 전체 높이를 가르는 계단/화장실
    div(id, l, w, ck) { const x = Math.max(tx, bx); push(id, l, x, 0, w, FLOOR_H, ck); tx = bx = x + w; return api; },
    top(id, l, w, ck) { push(id, l, tx, 0, w, TOP_H, ck); tx += w; return api; },
    bot(id, l, w, ck) { push(id, l, bx, BOT_Y, w, BOT_H, ck); bx += w; return api; },
    tgap(w) { tx += w; return api; },
    bgap(w) { bx += w; return api; },
    sync() { const m = Math.max(tx, bx); tx = bx = m; return api; },
    abs(id, l, x, y, w, h, ck) { push(id, l, x, y, w, h, ck); return api; },
    at() { return Math.max(tx, bx); },
    corridor(id, x0, x1) { push(id, '복도', x0, 100, x1 - x0, 18, 'hall'); return api; },
    build() {
      const W = Math.max(...rooms.map(r => r.x + r.w));
      const H = Math.max(FLOOR_H, ...rooms.map(r => r.y + r.h));
      return { W, H, label, rooms };
    },
  };
  return api;
}

// 별관 한 줄을 x0부터 배치 → 다음 x 반환
function annexRow(api, x0, y, h, list) {
  let x = x0;
  list.forEach(([id, l, w, ck]) => { api.abs(id, l, x, y, w, h, ck); x += w; });
  return x;
}

// ─────────────────────────────────────────────
// 층별 평면도 (2026학년도 교실배치도)
// 교실 id는 "학년-반"(예: '2-9'). 학년 숫자와 실제 층수는 다르다
// (1학년 교실이 5·4층에 있음) → 위치는 findRoomFloor()로 조회. location.js 참고
// ─────────────────────────────────────────────
function build5() {
  const f = makeFloor('5층');
  f.div('stair5L', '계단', 40, 'stair').div('toilet5L', '화장실', 46, 'toilet');
  const lx = f.at();
  // 세그먼트1: 홈베이스1·연구실 (위) / 1-1~1-5 (아래)
  f.top('hub1', '홈베이스1', 130, 'home').top('kor-lab5', '국어교과연구실', 92, 'lab2').top('eng-lab5', '영어교과연구실', 92, 'lab2');
  f.bot('1-1', '1-1', 70, 'g1').bot('1-2', '1-2', 70, 'g1').bot('1-3', '1-3', 70, 'g1').bot('1-4', '1-4', 70, 'g1').bot('1-5', '1-5', 70, 'g1');
  f.sync();
  f.div('stair5M', '계단', 40, 'stair');
  // 세그먼트2: 생활교양연구실·화장실 (위) / 교무실·수업카페3·2-1~2-4 (아래)
  f.top('life-lab5', '생활교양교과연구실', 120, 'lab2').top('toilet5M', '화장실', 46, 'toilet');
  f.bot('office5', '교무실(안생·진로·창의·융과)', 158, 'office').bot('cafe3', '수업카페3', 66, 'cafe');
  f.bot('2-1', '2-1', 70, 'g2').bot('2-2', '2-2', 70, 'g2').bot('2-3', '2-3', 70, 'g2').bot('2-4', '2-4', 70, 'g2');
  f.sync();
  const rx = f.at();
  f.corridor('hall5', lx, rx);
  f.div('stair5R', '계단', 40, 'stair').div('toilet5R', '화장실', 48, 'toilet');
  // 상생문 별관
  const ax = f.at() + 38;
  annexRow(f, ax, 0,     100, [['pray-room', '기도실', 70, 'annex'], ['inst-storage2', '악기창고2', 70, 'annex'], ['music2', '음악실2', 70, 'music']]);
  annexRow(f, ax, BOT_Y, 100, [['club-room', '동아리실', 62, 'annex'], ['prep-room5', '준비실', 62, 'annex'], ['music1', '음악실1', 62, 'music'], ['inst-storage1', '악기창고1', 62, 'annex']]);
  return f.build();
}

function build4() {
  const f = makeFloor('4층');
  f.div('stair4L', '계단', 40, 'stair').div('toilet4L', '화장실', 46, 'toilet');
  const lx = f.at();
  f.top('hub2', '홈베이스2', 130, 'home').top('math-lab', '수학교과연구실', 92, 'lab2').top('soc-lab', '사회교과연구실', 92, 'lab2');
  f.bot('1-6', '1-6', 70, 'g1').bot('1-7', '1-7', 70, 'g1').bot('1-8', '1-8', 70, 'g1').bot('1-9', '1-9', 70, 'g1').bot('1-10', '1-10', 70, 'g1');
  f.sync();
  f.div('stair4M', '계단', 40, 'stair');
  f.top('toilet4M', '화장실(교사·학생)', 70, 'toilet');
  f.bot('office4', '교무실(교무·1학년·2학년)', 158, 'office').bot('cafe2', '수업카페2', 66, 'cafe');
  f.bot('2-5', '2-5', 70, 'g2').bot('2-6', '2-6', 70, 'g2').bot('2-7', '2-7', 70, 'g2').bot('2-8', '2-8', 70, 'g2');
  f.sync();
  const rx = f.at();
  f.corridor('hall4', lx, rx);
  f.div('stair4R', '계단', 40, 'stair').div('toilet4R', '화장실', 48, 'toilet');
  const ax = f.at() + 38;
  annexRow(f, ax, 0,     100, [['resource-room', '리소스실', 78, 'annex'], ['jangyoungsil', '장영실실', 130, 'annex']]);
  annexRow(f, ax, BOT_Y, 100, [['heojun-lab', '허준실험실', 66, 'annex'], ['pe-lab', '예체능교과연구실', 66, 'lab2'], ['prep-room4', '준비실', 50, 'annex'], ['sejong-room', '세종대왕실', 60, 'annex']]);
  return f.build();
}

function build3() {
  const f = makeFloor('3층');
  f.div('stair3L', '계단', 40, 'stair').div('toilet3L', '화장실', 46, 'toilet');
  const lx = f.at();
  // 위: 도서관(넓게) / 아래: 특별실·교무실·수업카페·학습카페·2-9·2-10·문서보관실
  f.top('library', '도서관', 300, 'lib');
  f.bot('eco-room', '생태전환실', 88, 'special').bot('career3', '진로상담실', 84, 'counsel')
   .bot('daejin-on', '대진-ON진로활동실', 100, 'lab').bot('ai-room', '신나는AI교실', 96, 'lab')
   .bot('prep-room3', '준비실', 54, 'special').bot('media-prep', '디지털미디어실', 96, 'lab');
  f.sync(); // 도서관 오른쪽 끝과 아래 특별실 끝을 맞춤
  f.top('stair3M', '계단', 40, 'stair').top('toilet3M', '교사화장실', 62, 'toilet');
  f.bot('office3', '교무실(연구·환경·정보·3학년)', 158, 'office').bot('cafe1', '수업카페1', 66, 'cafe').bot('study-cafe', '학습카페', 70, 'cafe')
   .bot('2-9', '2-9', 70, 'g2').bot('2-10', '2-10', 70, 'g2').bot('doc-room3', '문서보관실', 90, 'special');
  f.sync();
  const rx = f.at();
  f.corridor('hall3', lx, rx);
  f.div('stair3R', '계단', 40, 'stair').div('toilet3R', '화장실', 48, 'toilet');
  const ax = f.at() + 38;
  annexRow(f, ax, 0,     100, [['earth-lab', '지학실', 90, 'lab'], ['physics-lab', '물리실', 90, 'lab']]);
  annexRow(f, ax, BOT_Y, 100, [['chem-lab', '화학실', 60, 'lab'], ['sci-lab', '과학교과연구실', 90, 'lab2'], ['bio-lab', '생명과학실', 80, 'lab']]);
  // 경건관 3층 (상생문 별관 오른쪽 끝 뒤에 배치 — 겹침 방지)
  f.abs('gyeongeon-3f', '경건관 3층 자습실', ax + 260, 0, 90, FLOOR_H, 'annex');
  return f.build();
}

function build2() {
  const f = makeFloor('2층');
  f.div('stair2L', '계단', 40, 'stair').div('toilet2L', '화장실', 46, 'toilet');
  const lx = f.at();
  f.top('computer-room', '컴퓨터실', 95, 'lab').top('media-room2', '영상미디어실', 95, 'lab')
   .top('maker-space', '메이커스페이스', 96, 'special').top('parent-room', '학부모회의실', 84, 'special');
  f.bot('3-11', '3-11', 68, 'g3').bot('3-1', '3-1', 68, 'g3').bot('3-2', '3-2', 68, 'g3').bot('3-3', '3-3', 68, 'g3').bot('3-4', '3-4', 68, 'g3').bot('3-5', '3-5', 68, 'g3');
  f.sync();
  f.top('hub3', '홈베이스3', 90, 'home').top('multi-room', '다목적실', 90, 'special');
  f.bot('3-6', '3-6', 68, 'g3').bot('3-7', '3-7', 68, 'g3').bot('3-8', '3-8', 68, 'g3').bot('3-9', '3-9', 68, 'g3').bot('3-10', '3-10', 68, 'g3');
  f.sync();
  const rx = f.at();
  f.corridor('hall2', lx, rx);
  f.div('stair2R', '계단', 40, 'stair').div('toilet2R', '학생화장실(교사·학생)', 70, 'toilet');
  // 별관(창의인성·미술 등)
  const ax = f.at() + 38;
  annexRow(f, ax, 0,     100, [['creative-room', '창의인성지도실', 66, 'counsel'], ['cpr-room', '심폐소생교육', 66, 'special'], ['art-room2a', '미술교과실', 60, 'special']]);
  annexRow(f, ax, BOT_Y, 100, [['lounge2', '휴게실', 66, 'special'], ['prep-room2', '준비실', 66, 'special'], ['art-room2b', '미술교과실', 60, 'special']]);
  // 경건관·신념관 2층
  f.abs('gyeongeon-2f', '경건관 2층 설렘ON실', ax + 200, 0, 90, FLOOR_H, 'annex');
  f.abs('sinnyeom-2f', '신념관 2층 강당', ax + 290, 0, 90, FLOOR_H, 'gym');
  return f.build();
}

function build1() {
  const f = makeFloor('1층');
  // 운동장 서쪽의 별도 건물 (1층 단층 체육관) — 실제 체육 수업 장소.
  f.abs('gymnasium', '체육관', 0, 0, 140, FLOOR_H, 'gym');
  f.tgap(170).bgap(170); // 체육관과 본관 사이 간격(운동장)
  f.div('stair1L', '계단', 40, 'stair').div('toilet1L', '화장실', 46, 'toilet');
  const lx = f.at();
  f.top('night-duty', '숙직실', 90, 'admin').top('doc-room1', '문서보관실(행)', 90, 'admin');
  f.bot('wee-class', 'Wee클래스', 68, 'counsel').bot('career1', '진로상담실', 68, 'counsel')
   .bot('server-room', '서버실', 54, 'lab').bot('info-room1', '전산실', 62, 'lab')
   .bot('student-council', '학생회실', 68, 'special').bot('media-room1', '미디어', 54, 'lab')
   .bot('broadcast1', '방송실', 62, 'special').bot('health-room1', '보건실', 62, 'admin');
  f.sync();
  f.div('stair1M', '계단', 40, 'stair').top('toilet1M', '교사화장실', 62, 'toilet');
  f.bot('entrance1', '현관', 62, 'special')
   .bot('admin-room1', '행정실', 90, 'admin').bot('principal-room', '교장실', 68, 'admin')
   .bot('seminar1', '세미나실', 68, 'special').bot('lecture-hall1', '대강의실', 110, 'special');
  f.sync();
  const rx = f.at();
  f.corridor('hall1', lx, rx);
  f.div('stair1R', '계단', 40, 'stair').div('toilet1R', '화장실', 48, 'toilet');
  // 창고·인쇄실
  const ax = f.at() + 30;
  f.abs('storage1', '창고', ax, 0, 90, 100, 'special');
  f.abs('print-room', '인쇄실', ax, BOT_Y, 90, 100, 'special');
  // 경건관·신념관 1층
  f.abs('gyeongeon-1f', '경건관 1층 자습실', ax + 120, 0, 90, FLOOR_H, 'annex');
  f.abs('sinnyeom-1f', '신념관 1층 식당', ax + 210, 0, 90, FLOOR_H, 'gym');
  return f.build();
}

function build0() {
  const f = makeFloor('지하');
  // 지하는 경건관·신념관만 (본관 지하는 시간표 대상 아님)
  f.abs('gyeongeon-b', '경건관 지하 체육공간·문화공간', 0, 0, 130, 200, 'annex');
  f.abs('sinnyeom-b', '신념관 지하 식당', 150, 0, 100, 200, 'gym');
  return f.build();
}

export const FLOORS = {
  5: build5(),
  4: build4(),
  3: build3(),
  2: build2(),
  1: build1(),
  0: build0(),
};

// 층별 교무실 room ID 매핑 (2층·1층·지하에는 교무실이 없음)
export const OFFICE_IDS = {
  5: 'office5',
  4: 'office4',
  3: 'office3',
};

/**
 * room id로 그 방이 실제로 위치한 층 번호를 찾는다.
 * 학년(교실 id의 앞자리)과 실제 층수가 다르므로(예: 1학년 교실이 5층에 있음)
 * "학년 = 층"으로 계산하지 말고 반드시 이 함수로 조회해야 한다.
 * @param {string} roomId
 * @returns {number|null} 층 번호, 못 찾으면 null
 */
export function findRoomFloor(roomId) {
  for (const [floorNum, floor] of Object.entries(FLOORS)) {
    if (floor.rooms.some(r => r.id === roomId)) return Number(floorNum);
  }
  return null;
}

/**
 * 모든 층에서 교실(type: 'class') room만 추출해 학년-반 오름차순으로 정렬한 목록 반환.
 * 학급(반) 시간표 검색 화면에서 반 목록을 만드는 데 사용한다.
 * @returns {Array<{id:string, grade:number, classNum:number, floor:number, label:string}>}
 */
export function getAllClassrooms() {
  const list = [];
  Object.entries(FLOORS).forEach(([floorNum, floor]) => {
    floor.rooms.forEach(r => {
      if (r.type !== 'class') return;
      const m = r.id.match(/^(\d+)-(\d+)$/);
      if (!m) return;
      list.push({ id: r.id, grade: Number(m[1]), classNum: Number(m[2]), floor: Number(floorNum), label: r.label });
    });
  });
  list.sort((a, b) => a.grade - b.grade || a.classNum - b.classNum);
  return list;
}

// 관리자 PIN
export const ADMIN_PIN = '5609';
