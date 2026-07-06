// ─────────────────────────────────────────────
// 교시 정의
// ─────────────────────────────────────────────
export const PERIODS = [
  { label: '1교시', start: '08:30', end: '09:20' },
  { label: '2교시', start: '09:30', end: '10:20' },
  { label: '3교시', start: '10:30', end: '11:20' },
  { label: '4교시', start: '11:30', end: '12:20' },
  { label: '점심',  start: '12:20', end: '13:10', isLunch: true },
  { label: '5교시', start: '13:10', end: '14:00' },
  { label: '6교시', start: '14:10', end: '15:00' },
  { label: '7교시', start: '15:10', end: '16:00' },
];

export const DAYS = ['월', '화', '수', '목', '금'];

// ─────────────────────────────────────────────
// 시간표 셀 파싱
// 원본 문자열 '과목(학년-반)' → { subject, grade, class, label } 객체로 정규화.
// 괄호가 문자열 끝에서만 '숫자-숫자' 형태로 닫힐 때만 학년-반으로 인식하므로,
// 과목명 중간에 괄호가 섞여 있어도(예: '국어(문학)') 오파싱되지 않는다.
// ─────────────────────────────────────────────

/**
 * @typedef {Object} ClassCell
 * @property {string} subject - 과목명 (괄호 앞부분, 또는 전체 문자열)
 * @property {number|null} grade - 학년 (파싱 실패 시 null)
 * @property {number|null} class - 반 (파싱 실패 시 null)
 * @property {string} label - 화면 표시용 원본 텍스트
 */

/** '과목(학년-반)' 또는 '과목' 문자열 → ClassCell | null */
export function parseClassLabel(raw) {
  if (!raw) return null;
  const m = raw.match(/^(.+?)\((\d+)-(\d+)\)$/);
  if (m) {
    return { subject: m[1], grade: Number(m[2]), class: Number(m[3]), label: raw };
  }
  return { subject: raw, grade: null, class: null, label: raw };
}

/** 요일×교시 원본 문자열 그리드 → ClassCell 그리드 */
export function buildSchedule(rawRows) {
  return rawRows.map(row => row.map(parseClassLabel));
}

// ─────────────────────────────────────────────
// 선생님 기본 시간표
// schedule[요일(0=월)][교시(0=1교시)] = ClassCell | null
// 원본은 '과목(학년-반)' 문자열로 작성하고 buildSchedule()로 정규화한다.
// TODO: AI 업로드 또는 관리자 수정으로 localStorage에서 덮어씀
// ─────────────────────────────────────────────
export const TEACHERS = [
  {
    id: 'KY', name: '김영희', subject: '수학', color: '#7b8fe8',
    schedule: buildSchedule([
      [null, '수학(2-1)', '수학(3-2)', null,        null, '수학(1-3)', '수학(2-3)', null],
      ['수학(3-1)', null, null,        '수학(2-2)', null,  null,        '수학(1-1)', '수학(3-3)'],
      [null, '수학(1-2)', '수학(2-1)', null,        null, '수학(3-1)', null,        null],
      ['수학(2-3)', null, '수학(1-3)', '수학(3-2)', null,  null,        null,        '수학(2-2)'],
      [null, null,        '수학(3-3)', '수학(1-1)', null, '수학(2-1)', null,        null],
    ]),
  },
  {
    id: 'PC', name: '박철수', subject: '영어', color: '#4db58a',
    schedule: buildSchedule([
      ['영어(1-1)', null,        null,        '영어(3-1)', null, '영어(2-2)', null,        null],
      [null,        '영어(2-1)', '영어(1-2)', null,        null,  null,        '영어(3-2)', '영어(1-3)'],
      ['영어(3-3)', null,        '영어(2-3)', null,        null, '영어(1-1)', null,        '영어(2-1)'],
      [null,        '영어(1-2)', null,        null,        null, '영어(3-1)', '영어(2-2)', null],
      ['영어(2-3)', null,        null,        '영어(3-2)', null,  null,        '영어(1-3)', null],
    ]),
  },
  {
    id: 'LJ', name: '이지은', subject: '과학', color: '#e8c55a',
    schedule: buildSchedule([
      [null,        null,        '과학(2-1)', '과학(3-2)', null, null,        '과학(1-2)', null],
      ['과학(1-3)', '과학(3-1)', null,        null,        null, '과학(2-3)', null,        '과학(1-1)'],
      [null,        '과학(2-2)', null,        '과학(1-3)', null, null,        '과학(3-3)', null],
      ['과학(3-1)', null,        null,        '과학(2-1)', null, '과학(1-2)', null,        '과학(3-2)'],
      [null,        '과학(2-3)', '과학(1-1)', null,        null, null,        '과학(2-2)', null],
    ]),
  },
  {
    id: 'CM', name: '최민준', subject: '국어', color: '#d57eb0',
    schedule: buildSchedule([
      ['국어(3-1)', null,        '국어(1-1)', null,        null, null,        '국어(2-1)', '국어(3-3)'],
      [null,        '국어(2-2)', null,        '국어(1-2)', null, '국어(3-2)', null,        null],
      ['국어(1-3)', null,        null,        '국어(3-1)', null, '국어(2-3)', '국어(1-1)', null],
      [null,        '국어(3-3)', '국어(2-1)', null,        null, null,        '국어(1-2)', '국어(2-2)'],
      ['국어(2-3)', null,        '국어(3-2)', null,        null, '국어(1-3)', null,        null],
    ]),
  },
  {
    id: 'HS', name: '한소연', subject: '역사', color: '#8ab0e0',
    schedule: buildSchedule([
      [null,        '역사(1-1)', null,        '역사(2-1)', null, '역사(3-1)', null,        null],
      ['역사(2-2)', null,        '역사(3-2)', null,        null, null,        '역사(1-2)', null],
      [null,        null,        '역사(1-3)', null,        null, '역사(2-3)', null,        '역사(3-3)'],
      ['역사(3-1)', null,        null,        '역사(1-1)', null, '역사(2-1)', null,        '역사(1-2)'],
      [null,        '역사(3-2)', '역사(2-2)', null,        null, null,        '역사(1-3)', null],
    ]),
  },
  {
    id: 'JD', name: '정다혜', subject: '미술', color: '#6dc4b0',
    schedule: buildSchedule([
      [null,        null,        '미술(1-1)', '미술(1-1)', null, '미술(2-1)', '미술(2-1)', null],
      ['미술(3-1)', '미술(3-1)', null,        null,        null, null,        '미술(1-2)', '미술(1-2)'],
      [null,        '미술(2-2)', '미술(2-2)', null,        null, '미술(3-2)', '미술(3-2)', null],
      [null,        null,        '미술(1-3)', '미술(1-3)', null, null,        '미술(2-3)', '미술(2-3)'],
      ['미술(3-3)', '미술(3-3)', null,        null,        null, '미술(1-1)', '미술(1-1)', null],
    ]),
  },
];
