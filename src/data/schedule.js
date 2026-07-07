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
// 출처: '1학년 7반 시간표' 사진 1장 (2026-07-07 입력).
// 이 사진은 "반" 시간표라 각 선생님이 1-7반을 가르치는 시간만 알 수 있고,
// 그 선생님이 다른 반 수업을 하는 시간은 알 수 없다 → 그 시간은 채우지 않고
// null로 남겨 getTeacherLocation()이 기본값(교무실)으로 처리하게 한다.
// 다른 반 시간표가 추가로 들어오면 해당 칸을 채워 넣으면 된다.
export const TEACHERS = [
  {
    id: 'RH', name: '류학철', subject: '실험실습', color: '#7b8fe8',
    schedule: buildSchedule([
      ['실험실습(1-7)', null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'HM', name: '홍민지', subject: '수학', color: '#4db58a',
    schedule: buildSchedule([
      [null, null, null, null, null, '수학(1-7)', null, null],
      ['수학(1-7)', null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, '수학(1-7)', null, null, null, null, null, null],
      [null, null, null, null, null, '수학(1-7)', null, null],
    ]),
  },
  {
    id: 'PC', name: '박채영', subject: '음악', color: '#e8c55a',
    schedule: buildSchedule([
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['음악(1-7)', null, null, null, null, null, null, null],
      [null, null, null, '음악(1-7)', null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'KS', name: '김선희', subject: '정보', color: '#d57eb0',
    schedule: buildSchedule([
      [null, null, null, null, null, null, null, '정보(1-7)'],
      [null, null, null, null, null, '정보(1-7)', null, null],
      [null, null, null, null, null, null, null, null],
      ['정보(1-7)', null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'LJR', name: '이정란', subject: '국사', color: '#8ab0e0',
    schedule: buildSchedule([
      [null, null, null, null, null, null, null, null],
      [null, '국사(1-7)', null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, '국사(1-7)'],
      ['국사(1-7)', null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'JH', name: '장화순', subject: '통합과학', color: '#6dc4b0',
    schedule: buildSchedule([
      [null, '통과(1-7)', null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'CS', name: '최성욱', subject: '체육', color: '#e0895a',
    schedule: buildSchedule([
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, '체육(1-7)', null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, '체육(1-7)', null, null, null, null, null, null],
    ]),
  },
  {
    id: 'JE', name: '전일체', subject: '통합사회', color: '#b08ae0',
    schedule: buildSchedule([
      [null, null, '통사(1-7)', null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, '통사(1-7)', null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'KD', name: '김동억', subject: '국어', color: '#5ac0e0',
    schedule: buildSchedule([
      [null, null, null, null, null, null, '국어(1-7)', null],
      [null, null, '국어(1-7)', '국어(1-7)', null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, '국어(1-7)', null, null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'CG', name: '최기쁨', subject: '통합과학', color: '#e0b05a',
    schedule: buildSchedule([
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, '통과(1-7)', null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'KW', name: '곽삼웅', subject: '통합과학', color: '#8ae0a0',
    schedule: buildSchedule([
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, '통과(1-7)', null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'YS', name: '양설', subject: '영어', color: '#e07a7a',
    schedule: buildSchedule([
      [null, null, null, '영어(1-7)', null, null, null, null],
      [null, null, null, null, null, null, null, '영어(1-7)'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, '영어(1-7)', null, null, null, null, null],
    ]),
  },
  {
    id: 'IJ', name: '임지예', subject: '창의적체험활동', color: '#a0a0e0',
    schedule: buildSchedule([
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, '창체(1-7)', null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'LJH', name: '이진현', subject: '통합사회', color: '#5ae0c0',
    schedule: buildSchedule([
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, '통사(1-7)', null, null, null, null],
    ]),
  },
  {
    id: 'EY', name: '엄유진', subject: '통합과학', color: '#d5a05a',
    schedule: buildSchedule([
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, '통과(1-7)', null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
];
