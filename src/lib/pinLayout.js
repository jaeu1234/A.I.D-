// ─────────────────────────────────────────────
// 방 안 핀 배치 알고리즘의 순수 로직만 모아둔 모듈.
//
// map.js는 캔버스에 직접 그리는 코드라 브라우저 없이는 의미 있게 테스트하기
// 어렵지만, "이 방에 선생님이 몇 명이고 화면에 얼마나 들어가는지"를 보고
// 개별 핀/클러스터 칩/+N 배지 중 뭘 그릴지 결정하는 이 계산 자체는 순수
// 함수라 캔버스 없이도 검증할 수 있다. tests/pinLayout.test.js 참고.
// ─────────────────────────────────────────────

/** 기본 핀 반지름 (선택 시 살짝 커짐) */
export const PIN_R = 11;

/**
 * 한 방 안의 선생님들을 어떻게 그릴지 결정한다 (순수 함수).
 * - 핀들이 한 줄로 방 너비에 들어가면 → 개별 핀을 가로로 나란히(row)
 * - 너무 많아 안 들어가면 → "N명" 클러스터 칩 하나로 묶음(cluster)
 *   단, 그 방에 선택된 선생님이 있으면 그 선생님 핀 + "+N" 배지로 표시해
 *   교무실처럼 다 모여 있어도 선택한 선생님은 또렷이 보이게 한다.
 *
 * @param {{x:number,y:number,w:number,h:number}} room
 * @param {Array<{t:{id:string}, loc:object}>} entries
 * @param {string|null} selectedId - 현재 선택된 선생님 id
 * @param {number} [pinR=PIN_R]
 * @returns {Array<{kind:'pin'|'cluster'|'count', ...}>}
 */
export function layoutRoom(room, entries, selectedId, pinR = PIN_R) {
  const n     = entries.length;
  const cx    = room.x + room.w / 2;
  // 라벨을 위로 올렸으므로 핀은 방의 중앙보다 살짝 아래에 배치한다.
  const yRow  = room.y + room.h * 0.60;
  const gap   = 5;
  const rowW  = n * (pinR * 2) + (n - 1) * gap;

  // 한 줄에 여유 있게 들어가면 개별 핀을 가로로 나열
  if (n <= 6 && rowW <= room.w - 10) {
    const startX = cx - rowW / 2 + pinR;
    return entries.map((e, i) => ({
      kind: 'pin', t: e.t, loc: e.loc,
      px: startX + i * (pinR * 2 + gap), py: yRow,
    }));
  }

  // 붐비는 방 → 클러스터로 묶음
  const sel = entries.find(e => e.t.id === selectedId);
  if (sel) {
    return [
      { kind: 'pin',   t: sel.t, loc: sel.loc, px: cx - 12, py: yRow },
      { kind: 'count', n: n - 1, px: cx - 12 + pinR + 9, py: yRow - pinR - 1 },
    ];
  }
  return [{ kind: 'cluster', n, px: cx, py: yRow }];
}
