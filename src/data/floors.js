// ─────────────────────────────────────────────
// 방 색상 팔레트
// ─────────────────────────────────────────────
const C = {
  class:   { fill: '#eef2ff', stroke: '#b0bcf0' }, // 일반 교실
  office:  { fill: '#e6f4ea', stroke: '#86c997' }, // 교무실
  special: { fill: '#fff8e1', stroke: '#f0c878' }, // 특별실
  lab:     { fill: '#e1f5fe', stroke: '#80caee' }, // 실험·컴퓨터실
  admin:   { fill: '#fce4ec', stroke: '#f0a0b8' }, // 행정·교장
  hall:    { fill: '#f5f5f2', stroke: '#e0e0e0' }, // 복도·계단
  toilet:  { fill: '#f0f0f0', stroke: '#cccccc' }, // 화장실
  lib:     { fill: '#f3e5f5', stroke: '#c986e0' }, // 도서관
  gym:     { fill: '#e8f5e9', stroke: '#80c880' }, // 체육·강당
  counsel: { fill: '#fff3e0', stroke: '#ffb74d' }, // 상담실
  annex:   { fill: '#e8f4fd', stroke: '#90caf9' }, // 별관
  lab2:    { fill: '#ffecd2', stroke: '#ffb347' }, // 교과연구실
};

// ─────────────────────────────────────────────
// 층별 평면도 데이터
// 좌표 단위: 가상 px (W×H 기준)
// type: 'class' | 'office' | 'special' | 'hall' | 'toilet'
// ─────────────────────────────────────────────
export const FLOORS = {

  // ── 5층 ─────────────────────────────────────
  5: { W: 1100, H: 220, label: '5층', rooms: [
    { id: 'toilet5L', label: '화장실',        x: 0,   y: 0,   w: 52,  h: 100, ...C.toilet,  type: 'toilet'  },
    { id: 'hub1',     label: '홈베이스1',     x: 52,  y: 0,   w: 110, h: 100, ...C.special, type: 'special' },
    { id: 'kor-sci',  label: '국어·과학연구실', x: 162, y: 0,  w: 130, h: 100, ...C.lab2,    type: 'special' },
    { id: '5-1',      label: '5-1',           x: 310, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '5-2',      label: '5-2',           x: 388, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '5-3',      label: '5-3',           x: 466, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '5-4',      label: '5-4',           x: 544, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '5-5',      label: '5-5',           x: 622, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: 'stair5',   label: '계단·EV',       x: 700, y: 0,   w: 52,  h: 100, ...C.hall,    type: 'hall'    },
    { id: 'office5',  label: '교무실',         x: 752, y: 0,   w: 160, h: 100, ...C.office,  type: 'office'  },
    { id: '5-6',      label: '5-6',           x: 310, y: 120, w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '5-7',      label: '5-7',           x: 388, y: 120, w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '5-8',      label: '5-8',           x: 466, y: 120, w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: 'hall5',    label: '복도',           x: 0,   y: 100, w: 912, h: 20,  ...C.hall,    type: 'hall'    },
    // 상생문 별관
    { id: 'sangseng', label: '상생문',         x: 940, y: 0,   w: 160, h: 220, ...C.annex,   type: 'special' },
  ]},

  // ── 4층 ─────────────────────────────────────
  4: { W: 1100, H: 220, label: '4층', rooms: [
    { id: 'toilet4L', label: '화장실',        x: 0,   y: 0,   w: 52,  h: 100, ...C.toilet,  type: 'toilet'  },
    { id: 'hub2',     label: '홈베이스2',     x: 52,  y: 0,   w: 110, h: 100, ...C.special, type: 'special' },
    { id: 'eng-mat',  label: '영어·수학연구실', x: 162, y: 0,  w: 130, h: 100, ...C.lab2,    type: 'special' },
    { id: '4-1',      label: '4-1',           x: 310, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '4-2',      label: '4-2',           x: 388, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '4-3',      label: '4-3',           x: 466, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '4-4',      label: '4-4',           x: 544, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '4-5',      label: '4-5',           x: 622, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: 'stair4',   label: '계단·EV',       x: 700, y: 0,   w: 52,  h: 100, ...C.hall,    type: 'hall'    },
    { id: 'office4',  label: '교무실',         x: 752, y: 0,   w: 160, h: 100, ...C.office,  type: 'office'  },
    { id: '4-6',      label: '4-6',           x: 310, y: 120, w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '4-7',      label: '4-7',           x: 388, y: 120, w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '4-8',      label: '4-8',           x: 466, y: 120, w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: 'hall4',    label: '복도',           x: 0,   y: 100, w: 912, h: 20,  ...C.hall,    type: 'hall'    },
    // 상생문 별관
    { id: 'prayer',   label: '기도실',         x: 940, y: 0,   w: 160, h: 110, ...C.annex,   type: 'special' },
    { id: 'club4',    label: '동아리실',       x: 940, y: 110, w: 160, h: 110, ...C.annex,   type: 'special' },
  ]},

  // ── 3층 ─────────────────────────────────────
  3: { W: 1100, H: 220, label: '3층', rooms: [
    { id: 'toilet3L', label: '화장실',        x: 0,   y: 0,   w: 52,  h: 100, ...C.toilet,  type: 'toilet'  },
    { id: 'library',  label: '도서관',         x: 52,  y: 0,   w: 240, h: 220, ...C.lib,     type: 'special' },
    { id: '3-1',      label: '3-1',           x: 310, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '3-2',      label: '3-2',           x: 388, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '3-3',      label: '3-3',           x: 466, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '3-4',      label: '3-4',           x: 544, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '3-5',      label: '3-5',           x: 622, y: 0,   w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: 'stair3',   label: '계단·EV',       x: 700, y: 0,   w: 52,  h: 100, ...C.hall,    type: 'hall'    },
    { id: 'office3',  label: '교무실',         x: 752, y: 0,   w: 110, h: 100, ...C.office,  type: 'office'  },
    { id: 'tchr3',    label: '교사 휴게실',    x: 862, y: 0,   w: 78,  h: 100, ...C.special, type: 'special' },
    { id: '3-6',      label: '3-6',           x: 310, y: 120, w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '3-7',      label: '3-7',           x: 388, y: 120, w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: '3-8',      label: '3-8',           x: 466, y: 120, w: 78,  h: 100, ...C.class,   type: 'class'   },
    { id: 'hall3',    label: '복도',           x: 0,   y: 100, w: 940, h: 20,  ...C.hall,    type: 'hall'    },
    // 상생문 별관
    { id: 'intellect', label: '지식실',        x: 940, y: 0,   w: 160, h: 220, ...C.annex,   type: 'special' },
  ]},

  // ── 2층 ─────────────────────────────────────
  2: { W: 1100, H: 240, label: '2층', rooms: [
    { id: 'toilet2L',  label: '화장실',       x: 0,   y: 0,   w: 52,  h: 110, ...C.toilet,  type: 'toilet'  },
    { id: 'daejeonon', label: '대전ON',        x: 52,  y: 0,   w: 88,  h: 110, ...C.admin,   type: 'special' },
    { id: 'linc',      label: '지산사이교실',  x: 140, y: 0,   w: 88,  h: 110, ...C.lab,     type: 'special' },
    { id: 'digital',   label: '디지털·AI실',  x: 228, y: 0,   w: 82,  h: 110, ...C.lab,     type: 'special' },
    { id: '2-1',       label: '2-1',          x: 318, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '2-2',       label: '2-2',          x: 396, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '2-3',       label: '2-3',          x: 474, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '2-4',       label: '2-4',          x: 552, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: 'stair2',    label: '계단·EV',      x: 630, y: 0,   w: 52,  h: 110, ...C.hall,    type: 'hall'    },
    { id: '2-5',       label: '2-5',          x: 682, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '2-6',       label: '2-6',          x: 760, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '2-7',       label: '2-7',          x: 838, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '2-8',       label: '2-8',          x: 916, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: 'info-room', label: '진로상담',      x: 0,   y: 130, w: 52,  h: 110, ...C.counsel, type: 'special' },
    { id: 'comproom',  label: '정류미실',      x: 52,  y: 130, w: 88,  h: 110, ...C.lab,     type: 'special' },
    { id: 'media',     label: '미디어실',      x: 140, y: 130, w: 88,  h: 110, ...C.lab,     type: 'special' },
    { id: 'health',    label: '보건실',        x: 228, y: 130, w: 82,  h: 110, ...C.admin,   type: 'special' },
    { id: 'office2',   label: '교무실',        x: 318, y: 130, w: 160, h: 110, ...C.office,  type: 'office'  },
    { id: '2-9',       label: '2-9',          x: 682, y: 130, w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '2-10',      label: '2-10',         x: 760, y: 130, w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: 'hall2',     label: '복도',          x: 0,   y: 110, w: 994, h: 20,  ...C.hall,    type: 'hall'    },
    // 경건관
    { id: 'gyeong-study', label: '자습실',    x: 994, y: 0,   w: 106, h: 120, ...C.annex,   type: 'special' },
    { id: 'gyeong-hall',  label: '경건관 강당', x: 994, y: 120, w: 106, h: 120, ...C.gym,     type: 'special' },
  ]},

  // ── 1층 ─────────────────────────────────────
  1: { W: 1100, H: 240, label: '1층', rooms: [
    { id: 'toilet1L',  label: '화장실',       x: 0,   y: 0,   w: 52,  h: 110, ...C.toilet,  type: 'toilet'  },
    { id: 'sukjik',    label: '숙직실',        x: 52,  y: 0,   w: 88,  h: 110, ...C.admin,   type: 'special' },
    { id: 'print',     label: '인쇄실',        x: 140, y: 0,   w: 88,  h: 110, ...C.special, type: 'special' },
    { id: '1-1',       label: '1-1',          x: 236, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '1-2',       label: '1-2',          x: 314, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '1-3',       label: '1-3',          x: 392, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '1-4',       label: '1-4',          x: 470, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '1-5',       label: '1-5',          x: 548, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: 'stair1',    label: '계단·EV',      x: 626, y: 0,   w: 52,  h: 110, ...C.hall,    type: 'hall'    },
    { id: '1-6',       label: '1-6',          x: 678, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '1-7',       label: '1-7',          x: 756, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '1-8',       label: '1-8',          x: 834, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '1-9',       label: '1-9',          x: 912, y: 0,   w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: 'seminar',   label: '세미나실',      x: 0,   y: 130, w: 88,  h: 110, ...C.special, type: 'special' },
    { id: 'counsel1',  label: '상담실',        x: 88,  y: 130, w: 88,  h: 110, ...C.counsel, type: 'special' },
    { id: 'admin1',    label: '행정실',        x: 176, y: 130, w: 156, h: 110, ...C.admin,   type: 'special' },
    { id: 'principal', label: '교장실',        x: 332, y: 130, w: 88,  h: 110, ...C.admin,   type: 'special' },
    { id: 'office1',   label: '교무실',        x: 420, y: 130, w: 180, h: 110, ...C.office,  type: 'office'  },
    { id: '1-10',      label: '1-10',         x: 678, y: 130, w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: '1-11',      label: '1-11',         x: 756, y: 130, w: 78,  h: 110, ...C.class,   type: 'class'   },
    { id: 'hall1',     label: '복도',          x: 0,   y: 110, w: 990, h: 20,  ...C.hall,    type: 'hall'    },
    // 신년관
    { id: 'sinyeon-gym', label: '신년관 강당', x: 994, y: 0,   w: 106, h: 130, ...C.gym,     type: 'special' },
    { id: 'cafeteria',   label: '식당',        x: 994, y: 130, w: 106, h: 110, ...C.gym,     type: 'special' },
  ]},

  // ── 지하 ────────────────────────────────────
  0: { W: 1100, H: 200, label: '지하', rooms: [
    { id: 'hall-b-top',  label: '복도',        x: 0,   y: 0,   w: 820, h: 60,  ...C.hall,    type: 'hall'    },
    { id: 'entrance-main', label: '중앙 현관', x: 380, y: 0,   w: 120, h: 60,  ...C.hall,    type: 'hall'    },
    { id: 'wee',         label: 'Wee클래스',   x: 0,   y: 60,  w: 110, h: 110, ...C.counsel, type: 'special' },
    { id: 'volunteer',   label: '전문상담',     x: 110, y: 60,  w: 88,  h: 110, ...C.counsel, type: 'special' },
    { id: 'archive',     label: '학생회실',     x: 198, y: 60,  w: 88,  h: 110, ...C.special, type: 'special' },
    { id: 'music-r',     label: '음악연습실',   x: 286, y: 60,  w: 94,  h: 110, ...C.lib,     type: 'special' },
    { id: 'broadcast',   label: '방송실',       x: 380, y: 60,  w: 88,  h: 110, ...C.special, type: 'special' },
    { id: 'entrance-b',  label: '현관',         x: 468, y: 60,  w: 88,  h: 110, ...C.hall,    type: 'hall'    },
    { id: 'admin-b',     label: '행정실',       x: 556, y: 60,  w: 88,  h: 110, ...C.admin,   type: 'special' },
    { id: 'seminar-b',   label: '세미나실',     x: 644, y: 60,  w: 88,  h: 110, ...C.special, type: 'special' },
    { id: 'counsel-b',   label: '상담실',       x: 732, y: 60,  w: 88,  h: 110, ...C.counsel, type: 'special' },
    { id: 'gym-main',    label: '체육관',       x: 820, y: 0,   w: 174, h: 200, ...C.gym,     type: 'special' },
  ]},
};

// 층별 교무실 room ID 매핑
export const OFFICE_IDS = {
  5: 'office5',
  4: 'office4',
  3: 'office3',
  2: 'office2',
  1: 'office1',
  0: 'admin-b',
};

// 관리자 PIN
export const ADMIN_PIN = '1234';
