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
// 선생님 기본 시간표
// schedule[요일(0=월)][교시(0=1교시)] = '과목(학년-반)' | null
// TODO: AI 업로드 또는 관리자 수정으로 localStorage에서 덮어씀
// ─────────────────────────────────────────────
export const TEACHERS = [
  {
    id: 'KY', name: '김영희', subject: '수학', color: '#7b8fe8',
    schedule: [
      [null, '수학(2-1)', '수학(3-2)', null,        null, '수학(1-3)', '수학(2-3)', null],
      ['수학(3-1)', null, null,        '수학(2-2)', null,  null,        '수학(1-1)', '수학(3-3)'],
      [null, '수학(1-2)', '수학(2-1)', null,        null, '수학(3-1)', null,        null],
      ['수학(2-3)', null, '수학(1-3)', '수학(3-2)', null,  null,        null,        '수학(2-2)'],
      [null, null,        '수학(3-3)', '수학(1-1)', null, '수학(2-1)', null,        null],
    ],
  },
  {
    id: 'PC', name: '박철수', subject: '영어', color: '#4db58a',
    schedule: [
      ['영어(1-1)', null,        null,        '영어(3-1)', null, '영어(2-2)', null,        null],
      [null,        '영어(2-1)', '영어(1-2)', null,        null,  null,        '영어(3-2)', '영어(1-3)'],
      ['영어(3-3)', null,        '영어(2-3)', null,        null, '영어(1-1)', null,        '영어(2-1)'],
      [null,        '영어(1-2)', null,        null,        null, '영어(3-1)', '영어(2-2)', null],
      ['영어(2-3)', null,        null,        '영어(3-2)', null,  null,        '영어(1-3)', null],
    ],
  },
  {
    id: 'LJ', name: '이지은', subject: '과학', color: '#e8c55a',
    schedule: [
      [null,        null,        '과학(2-1)', '과학(3-2)', null, null,        '과학(1-2)', null],
      ['과학(1-3)', '과학(3-1)', null,        null,        null, '과학(2-3)', null,        '과학(1-1)'],
      [null,        '과학(2-2)', null,        '과학(1-3)', null, null,        '과학(3-3)', null],
      ['과학(3-1)', null,        null,        '과학(2-1)', null, '과학(1-2)', null,        '과학(3-2)'],
      [null,        '과학(2-3)', '과학(1-1)', null,        null, null,        '과학(2-2)', null],
    ],
  },
  {
    id: 'CM', name: '최민준', subject: '국어', color: '#d57eb0',
    schedule: [
      ['국어(3-1)', null,        '국어(1-1)', null,        null, null,        '국어(2-1)', '국어(3-3)'],
      [null,        '국어(2-2)', null,        '국어(1-2)', null, '국어(3-2)', null,        null],
      ['국어(1-3)', null,        null,        '국어(3-1)', null, '국어(2-3)', '국어(1-1)', null],
      [null,        '국어(3-3)', '국어(2-1)', null,        null, null,        '국어(1-2)', '국어(2-2)'],
      ['국어(2-3)', null,        '국어(3-2)', null,        null, '국어(1-3)', null,        null],
    ],
  },
  {
    id: 'HS', name: '한소연', subject: '역사', color: '#8ab0e0',
    schedule: [
      [null,        '역사(1-1)', null,        '역사(2-1)', null, '역사(3-1)', null,        null],
      ['역사(2-2)', null,        '역사(3-2)', null,        null, null,        '역사(1-2)', null],
      [null,        null,        '역사(1-3)', null,        null, '역사(2-3)', null,        '역사(3-3)'],
      ['역사(3-1)', null,        null,        '역사(1-1)', null, '역사(2-1)', null,        '역사(1-2)'],
      [null,        '역사(3-2)', '역사(2-2)', null,        null, null,        '역사(1-3)', null],
    ],
  },
  {
    id: 'JD', name: '정다혜', subject: '미술', color: '#6dc4b0',
    schedule: [
      [null,        null,        '미술(1-1)', '미술(1-1)', null, '미술(2-1)', '미술(2-1)', null],
      ['미술(3-1)', '미술(3-1)', null,        null,        null, null,        '미술(1-2)', '미술(1-2)'],
      [null,        '미술(2-2)', '미술(2-2)', null,        null, '미술(3-2)', '미술(3-2)', null],
      [null,        null,        '미술(1-3)', '미술(1-3)', null, null,        '미술(2-3)', '미술(2-3)'],
      ['미술(3-3)', '미술(3-3)', null,        null,        null, '미술(1-1)', '미술(1-1)', null],
    ],
  },
];
