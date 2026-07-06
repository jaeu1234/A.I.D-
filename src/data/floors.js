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
// 층별 평면도 데이터 (2026학년도 교실배치도 기준)
// 좌표 단위: 가상 px (W×H 기준). 스캔 도면을 그대로 축척한 것이 아니라
// 방 이름·상대 위치를 보존한 개략적(schematic) 배치이며, 필요하면 아래
// x/y/w/h 값만 조정하면 된다.
// type: 'class' | 'office' | 'special' | 'hall' | 'toilet'
//
// 주의: 교실 id는 "학년-반"(예: '2-9') 형식이며, 실제 건물에서는
// 학년 숫자가 물리적 층수와 다르다(예: 1학년 교실이 5층·4층에 있음).
// 어떤 층에 있는지는 findRoomFloor()로 조회해야 한다. → location.js 참고
// ─────────────────────────────────────────────
export const FLOORS = {

  // ── 5층 ─────────────────────────────────────
  5: { W: 1100, H: 220, label: '5층', rooms: [
    { id: 'toilet5L',      label: '화장실',            x: 0,   y: 0,   w: 48, h: 100, ...C.toilet,  type: 'toilet'  },
    { id: 'hub1',          label: '홈베이스1',          x: 48,  y: 0,   w: 95, h: 100, ...C.special, type: 'special' },
    { id: 'kor-lab5',      label: '국어교과연구실',      x: 143, y: 0,   w: 90, h: 100, ...C.lab2,    type: 'special' },
    { id: 'eng-lab5',      label: '영어교과연구실',      x: 233, y: 0,   w: 90, h: 100, ...C.lab2,    type: 'special' },
    { id: 'honor-lab',     label: '명예교장교과연구실',  x: 323, y: 0,   w: 90, h: 100, ...C.lab2,    type: 'special' },
    { id: '1-1',           label: '1-1',               x: 413, y: 0,   w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '1-2',           label: '1-2',               x: 485, y: 0,   w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '1-3',           label: '1-3',               x: 557, y: 0,   w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '1-4',           label: '1-4',               x: 629, y: 0,   w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '1-5',           label: '1-5',               x: 701, y: 0,   w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: 'office5',       label: '교무실(안생·진로·창의·융합)', x: 0,   y: 120, w: 190, h: 100, ...C.office,  type: 'office' },
    { id: '2-1',           label: '2-1',               x: 190, y: 120, w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '2-2',           label: '2-2',               x: 262, y: 120, w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '2-3',           label: '2-3',               x: 334, y: 120, w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '2-4',           label: '2-4',               x: 406, y: 120, w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: 'toilet5R',      label: '화장실',            x: 880, y: 0,   w: 50, h: 220, ...C.toilet,  type: 'toilet'  },
    { id: 'hall5',         label: '복도',              x: 0,   y: 100, w: 880, h: 20,  ...C.hall,    type: 'hall'    },
    // 상생문 별관 (5층)
    { id: 'pray-room',     label: '기도실',            x: 940,  y: 0,   w: 53, h: 110, ...C.annex, type: 'special' },
    { id: 'inst-storage2', label: '악기창고2',          x: 993,  y: 0,   w: 53, h: 110, ...C.annex, type: 'special' },
    { id: 'music2',        label: '음악실2',            x: 1046, y: 0,   w: 54, h: 110, ...C.annex, type: 'special' },
    { id: 'club-room',     label: '동아리실',           x: 940,  y: 110, w: 40, h: 110, ...C.annex, type: 'special' },
    { id: 'prep-room5',    label: '준비실',            x: 980,  y: 110, w: 40, h: 110, ...C.annex, type: 'special' },
    { id: 'music1',        label: '음악실1',            x: 1020, y: 110, w: 40, h: 110, ...C.annex, type: 'special' },
    { id: 'inst-storage1', label: '악기창고1',          x: 1060, y: 110, w: 40, h: 110, ...C.annex, type: 'special' },
  ]},

  // ── 4층 ─────────────────────────────────────
  4: { W: 1100, H: 220, label: '4층', rooms: [
    { id: 'toilet4L',   label: '화장실',              x: 0,   y: 0,   w: 48, h: 100, ...C.toilet,  type: 'toilet'  },
    { id: 'hub2',       label: '홈베이스2',            x: 48,  y: 0,   w: 95, h: 100, ...C.special, type: 'special' },
    { id: 'math-lab',   label: '수학교과연구실',        x: 143, y: 0,   w: 95, h: 100, ...C.lab2,    type: 'special' },
    { id: 'soc-lab',    label: '사회교과연구실',        x: 238, y: 0,   w: 95, h: 100, ...C.lab2,    type: 'special' },
    { id: '1-6',        label: '1-6',                 x: 333, y: 0,   w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '1-7',        label: '1-7',                 x: 405, y: 0,   w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '1-8',        label: '1-8',                 x: 477, y: 0,   w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '1-9',        label: '1-9',                 x: 549, y: 0,   w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '1-10',       label: '1-10',                x: 621, y: 0,   w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: 'office4',    label: '교무실(교무·1학년·2학년)', x: 0,   y: 120, w: 190, h: 100, ...C.office,  type: 'office' },
    { id: '2-5',        label: '2-5',                 x: 190, y: 120, w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '2-6',        label: '2-6',                 x: 262, y: 120, w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '2-7',        label: '2-7',                 x: 334, y: 120, w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: '2-8',        label: '2-8',                 x: 406, y: 120, w: 72, h: 100, ...C.class,   type: 'class'   },
    { id: 'toilet4R',   label: '화장실(교사·학생)',     x: 880, y: 0,   w: 50, h: 220, ...C.toilet,  type: 'toilet'  },
    { id: 'hall4',      label: '복도',                 x: 0,   y: 100, w: 880, h: 20,  ...C.hall,    type: 'hall'    },
    // 상생문 별관 (4층)
    { id: 'resource-room', label: '리소스실',          x: 940,  y: 0,   w: 80, h: 110, ...C.annex, type: 'special' },
    { id: 'jangyoungsil',  label: '장영실실',          x: 1020, y: 0,   w: 80, h: 110, ...C.annex, type: 'special' },
    { id: 'heojun-lab',    label: '허준실험실',        x: 940,  y: 110, w: 40, h: 110, ...C.annex, type: 'special' },
    { id: 'pe-lab',        label: '예체능교과연구실',  x: 980,  y: 110, w: 40, h: 110, ...C.annex, type: 'special' },
    { id: 'prep-room4',    label: '준비실',            x: 1020, y: 110, w: 40, h: 110, ...C.annex, type: 'special' },
    { id: 'sejong-room',   label: '세종대왕실',        x: 1060, y: 110, w: 40, h: 110, ...C.annex, type: 'special' },
  ]},

  // ── 3층 ─────────────────────────────────────
  3: { W: 1100, H: 220, label: '3층', rooms: [
    { id: 'toilet3L',   label: '화장실',                     x: 0,   y: 0,   w: 48,  h: 100, ...C.toilet,  type: 'toilet'  },
    { id: 'library',    label: '도서관',                     x: 48,  y: 0,   w: 200, h: 220, ...C.lib,     type: 'special' },
    { id: 'toilet3M',   label: '화장실(교사)',                x: 248, y: 0,   w: 48,  h: 100, ...C.toilet,  type: 'toilet'  },
    { id: 'eco-room',   label: '생태전환실',                  x: 296, y: 0,   w: 80,  h: 100, ...C.special, type: 'special' },
    { id: 'career3',    label: '진로상담실',                  x: 376, y: 0,   w: 80,  h: 100, ...C.counsel, type: 'special' },
    { id: 'daejin-on',  label: '대진-ON진로활동실',           x: 456, y: 0,   w: 95,  h: 100, ...C.lab,     type: 'special' },
    { id: 'ai-room',    label: '신나는AI교실',                x: 551, y: 0,   w: 85,  h: 100, ...C.lab,     type: 'special' },
    { id: 'media-prep', label: '준비실·디지털미디어실',       x: 636, y: 0,   w: 95,  h: 100, ...C.lab,     type: 'special' },
    { id: 'office3',    label: '교무실(연구·환경·경상·보·3학년)', x: 731, y: 0,   w: 149, h: 100, ...C.office,  type: 'office' },
    { id: 'cafe1',      label: '수업카페1',                   x: 296, y: 120, w: 80,  h: 100, ...C.special, type: 'special' },
    { id: 'study-cafe', label: '학습카페',                    x: 376, y: 120, w: 80,  h: 100, ...C.special, type: 'special' },
    { id: '2-9',        label: '2-9',                        x: 456, y: 120, w: 72,  h: 100, ...C.class,   type: 'class'   },
    { id: '2-10',       label: '2-10',                       x: 528, y: 120, w: 72,  h: 100, ...C.class,   type: 'class'   },
    { id: 'doc-room3',  label: '문서보관실',                  x: 600, y: 120, w: 90,  h: 100, ...C.special, type: 'special' },
    { id: 'toilet3R',   label: '화장실',                     x: 880, y: 0,   w: 50,  h: 220, ...C.toilet,  type: 'toilet'  },
    { id: 'hall3',      label: '복도',                        x: 0,   y: 100, w: 880, h: 20,  ...C.hall,    type: 'hall'    },
    // 상생문 별관 (3층)
    { id: 'earth-lab',  label: '지학실',                     x: 940,  y: 0,   w: 80, h: 110, ...C.lab,  type: 'special' },
    { id: 'physics-lab',label: '물리실',                     x: 1020, y: 0,   w: 80, h: 110, ...C.lab,  type: 'special' },
    { id: 'chem-lab',   label: '화학실',                     x: 940,  y: 110, w: 53, h: 110, ...C.lab,  type: 'special' },
    { id: 'sci-lab',    label: '과학교과연구실',              x: 993,  y: 110, w: 53, h: 110, ...C.lab2, type: 'special' },
    { id: 'bio-lab',    label: '생명과학실',                  x: 1046, y: 110, w: 54, h: 110, ...C.lab,  type: 'special' },
  ]},

  // ── 2층 ─────────────────────────────────────
  2: { W: 1100, H: 240, label: '2층', rooms: [
    { id: 'toilet2L',     label: '화장실',                x: 0,   y: 0,   w: 48, h: 110, ...C.toilet,  type: 'toilet'  },
    { id: 'computer-room',label: '컴퓨터실',              x: 48,  y: 0,   w: 85, h: 110, ...C.lab,     type: 'special' },
    { id: 'media-room2',  label: '영상미디어실',          x: 133, y: 0,   w: 85, h: 110, ...C.lab,     type: 'special' },
    { id: 'maker-space',  label: '메이커스페이스·학부모회의실', x: 218, y: 0,   w: 110, h: 110, ...C.special, type: 'special' },
    { id: '3-11',         label: '3-11',                 x: 328, y: 0,   w: 68, h: 110, ...C.class,   type: 'class'   },
    { id: '3-1',          label: '3-1',                  x: 396, y: 0,   w: 68, h: 110, ...C.class,   type: 'class'   },
    { id: '3-2',          label: '3-2',                  x: 464, y: 0,   w: 68, h: 110, ...C.class,   type: 'class'   },
    { id: '3-3',          label: '3-3',                  x: 532, y: 0,   w: 68, h: 110, ...C.class,   type: 'class'   },
    { id: '3-4',          label: '3-4',                  x: 600, y: 0,   w: 68, h: 110, ...C.class,   type: 'class'   },
    { id: '3-5',          label: '3-5',                  x: 668, y: 0,   w: 68, h: 110, ...C.class,   type: 'class'   },
    { id: 'career-room2', label: '창업진로지도실',        x: 736, y: 0,   w: 60, h: 110, ...C.counsel, type: 'special' },
    { id: 'sim-edu',      label: '심체소셜교육',          x: 796, y: 0,   w: 60, h: 110, ...C.special, type: 'special' },
    { id: 'art-room2a',   label: '미술교과실',            x: 856, y: 0,   w: 40, h: 110, ...C.special, type: 'special' },
    { id: 'toilet2M',     label: '화장실(교사·학생)',      x: 0,   y: 130, w: 48, h: 110, ...C.toilet,  type: 'toilet'  },
    { id: 'hub3',         label: '홈베이스3',             x: 48,  y: 130, w: 90, h: 110, ...C.special, type: 'special' },
    { id: 'multi-room',   label: '다목적실',              x: 138, y: 130, w: 90, h: 110, ...C.special, type: 'special' },
    { id: '3-6',          label: '3-6',                  x: 328, y: 130, w: 68, h: 110, ...C.class,   type: 'class'   },
    { id: '3-7',          label: '3-7',                  x: 396, y: 130, w: 68, h: 110, ...C.class,   type: 'class'   },
    { id: '3-8',          label: '3-8',                  x: 464, y: 130, w: 68, h: 110, ...C.class,   type: 'class'   },
    { id: '3-9',          label: '3-9',                  x: 532, y: 130, w: 68, h: 110, ...C.class,   type: 'class'   },
    { id: '3-10',         label: '3-10',                 x: 600, y: 130, w: 68, h: 110, ...C.class,   type: 'class'   },
    { id: 'lounge2',      label: '휴게실',                x: 736, y: 130, w: 60, h: 110, ...C.special, type: 'special' },
    { id: 'prep-room2',   label: '준비실',                x: 796, y: 130, w: 60, h: 110, ...C.special, type: 'special' },
    { id: 'art-room2b',   label: '미술교과실',            x: 856, y: 130, w: 40, h: 110, ...C.special, type: 'special' },
    { id: 'toilet2R',     label: '화장실',                x: 896, y: 0,   w: 44, h: 240, ...C.toilet,  type: 'toilet'  },
    { id: 'hall2',        label: '복도',                  x: 0,   y: 110, w: 940, h: 20,  ...C.hall,    type: 'hall'    },
    // 경건관 · 신념관 (2층)
    { id: 'gyeongeon-2f', label: '경건관 2층 설렘온실',   x: 940,  y: 0, w: 80, h: 240, ...C.annex, type: 'special' },
    { id: 'sinnyeom-2f',  label: '신념관 2층 강당',       x: 1020, y: 0, w: 80, h: 240, ...C.gym,   type: 'special' },
  ]},

  // ── 1층 ─────────────────────────────────────
  1: { W: 1100, H: 240, label: '1층', rooms: [
    { id: 'toilet1L',      label: '화장실',            x: 0,   y: 0,   w: 48, h: 110, ...C.toilet,  type: 'toilet'  },
    { id: 'night-duty',    label: '숙직실',            x: 48,  y: 0,   w: 85, h: 110, ...C.admin,   type: 'special' },
    { id: 'doc-room1',     label: '문서보관실(행정)',   x: 133, y: 0,   w: 90, h: 110, ...C.admin,   type: 'special' },
    { id: 'toilet1M',      label: '교사화장실',        x: 223, y: 0,   w: 48, h: 110, ...C.toilet,  type: 'toilet'  },
    { id: 'storage1',      label: '창고',              x: 850, y: 0,   w: 90, h: 55,  ...C.special, type: 'special' },
    { id: 'print-room',    label: '인쇄실',            x: 850, y: 55,  w: 90, h: 55,  ...C.special, type: 'special' },
    { id: 'wee-class',     label: 'Wee클래스',         x: 0,   y: 130, w: 68, h: 110, ...C.counsel, type: 'special' },
    { id: 'career1',       label: '진로상담실',        x: 68,  y: 130, w: 68, h: 110, ...C.counsel, type: 'special' },
    { id: 'admin-office1', label: '서비실',            x: 136, y: 130, w: 60, h: 110, ...C.admin,   type: 'special' },
    { id: 'server-room',   label: '전산실',            x: 196, y: 130, w: 60, h: 110, ...C.lab,     type: 'special' },
    { id: 'student-council', label: '학생회실',        x: 256, y: 130, w: 68, h: 110, ...C.special, type: 'special' },
    { id: 'media-room1',   label: '미디어실',          x: 324, y: 130, w: 60, h: 110, ...C.lab,     type: 'special' },
    { id: 'broadcast1',    label: '방송실',            x: 384, y: 130, w: 60, h: 110, ...C.special, type: 'special' },
    { id: 'health-room1',  label: '보건실',            x: 444, y: 130, w: 60, h: 110, ...C.admin,   type: 'special' },
    { id: 'entrance1',     label: '현관',              x: 504, y: 130, w: 60, h: 110, ...C.hall,    type: 'hall'    },
    { id: 'admin-room1',   label: '행정실',            x: 564, y: 130, w: 68, h: 110, ...C.admin,   type: 'special' },
    { id: 'principal-room',label: '교장실',            x: 632, y: 130, w: 60, h: 110, ...C.admin,   type: 'special' },
    { id: 'seminar1',      label: '세미나실',          x: 692, y: 130, w: 68, h: 110, ...C.special, type: 'special' },
    { id: 'lecture-hall1', label: '대강의실',          x: 760, y: 130, w: 90, h: 110, ...C.special, type: 'special' },
    { id: 'toilet1R',      label: '화장실',            x: 850, y: 130, w: 46, h: 110, ...C.toilet,  type: 'toilet'  },
    { id: 'hall1',         label: '복도',              x: 0,   y: 110, w: 940, h: 20,  ...C.hall,    type: 'hall'    },
    // 경건관 · 신념관 (1층)
    { id: 'gyeongeon-1f',  label: '경건관 1층 자습실', x: 940,  y: 0, w: 80, h: 240, ...C.annex, type: 'special' },
    { id: 'sinnyeom-1f',   label: '신념관 1층 식당',   x: 1020, y: 0, w: 80, h: 240, ...C.gym,   type: 'special' },
  ]},

  // ── 지하 ────────────────────────────────────
  0: { W: 1100, H: 200, label: '지하', rooms: [
    { id: 'gym-class',    label: '체육교과실',                    x: 0,    y: 0, w: 200, h: 200, ...C.gym,   type: 'special' },
    // 경건관 · 신념관 (지하)
    { id: 'gyeongeon-b',  label: '경건관 지하 체육공간·문화공간',  x: 940,  y: 0, w: 80,  h: 200, ...C.annex, type: 'special' },
    { id: 'sinnyeom-b',   label: '신념관 지하 식당',               x: 1020, y: 0, w: 80,  h: 200, ...C.gym,   type: 'special' },
  ]},
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

// 관리자 PIN
export const ADMIN_PIN = '5609';
