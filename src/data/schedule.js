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
// 출처: '2026학년도 1학기 1학년 시간표.hwpx' (1학년 1~10반 전체, 2026-07-08 반영).
// 반 시간표를 교사별로 역변환해 생성 — 각 교사가 1학년 어느 반을 언제 가르치는지 전부 반영.
// 2·3학년 수업 시간은 이 파일에 없으므로 null로 남고 getTeacherLocation()이 교무실로 처리한다.
export const TEACHERS = [
  {
    id: 'KHY', name: '강혜영', subject: '정보', color: '#7bc47b',
    schedule: buildSchedule([
      ['정보(1-9)', null, null, null, null, '정보(1-8)', '정보(1-10)', null],
      ['정보(1-10)', null, '정보(1-8)', null, null, '정보(1-7)', null, '정보(1-9)'],
      ['정보(1-6)', '정보(1-7)', null, '정보(1-8)', null, null, null, null],
      ['정보(1-7)', null, null, '정보(1-9)', null, null, null, '정보(1-6)'],
      ['정보(1-6)', null, null, '정보(1-10)', null, null, null, null],
    ]),
  },
  {
    id: 'GDH', name: '고동현', subject: '미술', color: '#9a8ae0',
    schedule: buildSchedule([
      [null, null, null, '미술(1-1)', null, null, null, null],
      [null, null, null, null, null, null, null, '미술(1-2)'],
      [null, null, null, null, null, null, null, null],
      [null, '미술(1-1)', null, null, null, null, '미술(1-2)', null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'KW', name: '곽삼웅', subject: '통합과학', color: '#8ae0a0',
    schedule: buildSchedule([
      [null, '실험(1-2)', '실험(1-6)', null, null, null, '실험(1-1)', null],
      [null, '실험(1-3)', '통과(1-4)', null, null, '통과(1-2)', '통과(1-9)', null],
      ['통과(1-3)', '통과(1-5)', null, null, null, null, null, null],
      [null, '통과(1-8)', '통과(1-7)', null, null, '실험(1-5)', '실험(1-4)', null],
      [null, '통과(1-6)', '통과(1-1)', null, null, '통과(1-10)', null, null],
    ]),
  },
  {
    id: 'KD', name: '김동억', subject: '국어', color: '#5ac0e0',
    schedule: buildSchedule([
      [null, '국어(1-9)', null, null, null, null, '국어(1-7)', '국어(1-10)'],
      ['국어(1-8)', null, '국어(1-7)', null, null, '국어(1-9)', '국어(1-6)', null],
      [null, null, null, '국어(1-10)', null, null, null, null],
      [null, '국어(1-6)', '국어(1-10)', null, null, '국어(1-7)', '국어(1-8)', null],
      ['국어(1-9)', null, '국어(1-8)', null, null, '국어(1-6)', null, null],
    ]),
  },
  {
    id: 'KS', name: '김선희', subject: '정보', color: '#d57eb0',
    schedule: buildSchedule([
      [null, null, '정보(1-1)', '정보(1-4)', null, null, '정보(1-2)', null],
      ['정보(1-3)', '정보(1-4)', null, null, null, '정보(1-1)', '정보(1-5)', null],
      [null, '정보(1-2)', '정보(1-4)', null, null, null, null, null],
      ['정보(1-1)', '정보(1-2)', null, null, null, '정보(1-3)', null, '정보(1-5)'],
      [null, '정보(1-5)', null, null, null, '정보(1-3)', null, null],
    ]),
  },
  {
    id: 'KJI', name: '김종인', subject: '국어', color: '#e08fb0',
    schedule: buildSchedule([
      [null, '국어(1-4)', null, null, null, '국어(1-2)', null, null],
      ['국어(1-4)', null, '국어(1-2)', '국어(1-5)', null, null, '국어(1-1)', null],
      ['국어(1-5)', '국어(1-3)', null, '국어(1-2)', null, null, null, null],
      [null, null, '국어(1-4)', '국어(1-1)', null, null, '국어(1-5)', '국어(1-3)'],
      ['국어(1-1)', '국어(1-3)', null, null, null, null, null, null],
    ]),
  },
  {
    id: 'KJE', name: '김주은', subject: '영어', color: '#6f9de0',
    schedule: buildSchedule([
      ['영어(1-2)', null, '영어(1-3)', '영어(1-5)', null, null, null, '영어(1-4)'],
      [null, null, '영어(1-1)', null, null, '영어(1-5)', null, '영어(1-4)'],
      ['영어(1-1)', null, null, '영어(1-3)', null, null, null, null],
      ['영어(1-3)', null, '영어(1-5)', '영어(1-2)', null, null, null, null],
      [null, '영어(1-2)', '영어(1-4)', null, null, '영어(1-1)', null, null],
    ]),
  },
  {
    id: 'KHS', name: '김황섭', subject: '체육', color: '#e0a35a',
    schedule: buildSchedule([
      [null, null, '체육(1-2)', null, null, '체육(1-5)', null, '체육(1-3)'],
      [null, null, null, null, null, null, '체육(1-2)', '체육(1-3)'],
      [null, '체육(1-1)', null, null, null, null, null, null],
      [null, null, null, null, null, null, null, '체육(1-4)'],
      ['체육(1-4)', '체육(1-1)', null, null, null, '체육(1-5)', null, null],
    ]),
  },
  {
    id: 'RH', name: '류학철', subject: '실험실습', color: '#7b8fe8',
    schedule: buildSchedule([
      ['실험(1-7)', null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['실험(1-8)', '실험(1-10)', null, null, null, null, null, '실험(1-9)'],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'PC', name: '박채영', subject: '음악', color: '#e8c55a',
    schedule: buildSchedule([
      ['음악(1-8)', null, null, null, null, null, '음악(1-6)', null],
      [null, '음악(1-10)', null, '음악(1-6)', null, null, null, '음악(1-8)'],
      ['음악(1-7)', '음악(1-9)', null, null, null, null, null, null],
      [null, null, null, '음악(1-7)', null, null, null, null],
      ['음악(1-10)', null, null, null, null, '음악(1-9)', null, null],
    ]),
  },
  {
    id: 'BGJ', name: '백광재', subject: '수학', color: '#d090d0',
    schedule: buildSchedule([
      [null, null, '수학(1-10)', '수학(1-9)', null, null, null, null],
      [null, '수학(1-5)', null, '수학(1-4)', null, '수학(1-10)', null, null],
      [null, '수학(1-10)', null, '수학(1-9)', null, null, null, null],
      [null, null, null, null, null, '수학(1-9)', null, '수학(1-10)'],
      [null, '수학(1-9)', null, null, null, null, null, null],
    ]),
  },
  {
    id: 'SSY', name: '신소연', subject: '수학', color: '#5cc4c0',
    schedule: buildSchedule([
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, '수학(1-1)', null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'YS', name: '양설', subject: '영어', color: '#e07a7a',
    schedule: buildSchedule([
      [null, '영어(1-10)', null, '영어(1-7)', null, null, null, '영어(1-8)'],
      ['영어(1-9)', null, '영어(1-10)', null, null, '영어(1-6)', null, '영어(1-7)'],
      [null, null, '영어(1-9)', '영어(1-6)', null, null, null, null],
      [null, '영어(1-9)', '영어(1-8)', null, null, '영어(1-10)', '영어(1-6)', null],
      [null, null, '영어(1-7)', '영어(1-8)', null, null, null, null],
    ]),
  },
  {
    id: 'EY', name: '엄유진', subject: '통합과학', color: '#d5a05a',
    schedule: buildSchedule([
      ['통과(1-1)', '통과(1-3)', null, null, null, null, null, null],
      [null, '통과(1-8)', null, null, null, null, '통과(1-7)', null],
      ['통과(1-4)', null, null, null, null, null, null, null],
      ['통과(1-2)', '통과(1-5)', null, '통과(1-6)', null, null, '통과(1-10)', null],
      [null, null, null, '통과(1-9)', null, null, null, null],
    ]),
  },
  {
    id: 'LNH', name: '이나현', subject: '통합사회', color: '#c0a860',
    schedule: buildSchedule([
      ['통사(1-10)', null, '통사(1-5)', null, null, '통사(1-3)', null, '통사(1-1)'],
      [null, '통사(1-9)', null, '통사(1-7)', null, '통사(1-4)', null, null],
      [null, '통사(1-8)', '통사(1-6)', null, null, null, null, null],
      ['통사(1-5)', '통사(1-4)', null, null, null, '통사(1-2)', null, '통사(1-1)'],
      [null, null, '통사(1-3)', '통사(1-2)', null, null, null, null],
    ]),
  },
  {
    id: 'LMY', name: '이미영', subject: '국사', color: '#e07a6a',
    schedule: buildSchedule([
      [null, null, '국사(1-4)', null, null, '국사(1-1)', null, '국사(1-5)'],
      [null, null, '국사(1-3)', '국사(1-2)', null, null, '국사(1-4)', '국사(1-5)'],
      [null, null, '국사(1-3)', '국사(1-5)', null, null, null, null],
      [null, null, '국사(1-1)', null, null, null, '국사(1-3)', '국사(1-2)'],
      ['국사(1-2)', '국사(1-4)', null, '국사(1-1)', null, null, null, null],
    ]),
  },
  {
    id: 'LEK', name: '이은경', subject: '미술', color: '#8ac0e0',
    schedule: buildSchedule([
      ['미술(1-4)', null, null, null, null, null, '미술(1-3)', null],
      [null, null, '미술(1-5)', null, null, null, '미술(1-3)', null],
      [null, '미술(1-4)', null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, '미술(1-5)', null, null, null, null],
    ]),
  },
  {
    id: 'LJR', name: '이정란', subject: '국사', color: '#8ab0e0',
    schedule: buildSchedule([
      [null, '국사(1-6)', '국사(1-8)', null, null, '국사(1-10)', null, '국사(1-9)'],
      [null, '국사(1-7)', null, '국사(1-9)', null, null, '국사(1-8)', null],
      ['국사(1-10)', '국사(1-6)', null, null, null, null, null, null],
      ['국사(1-10)', null, '국사(1-6)', '국사(1-8)', null, null, null, '국사(1-7)'],
      ['국사(1-7)', null, '국사(1-9)', null, null, null, null, null],
    ]),
  },
  {
    id: 'LJH', name: '이진현', subject: '통합사회', color: '#5ae0c0',
    schedule: buildSchedule([
      ['통사(1-6)', null, null, '통사(1-3)', null, null, null, null],
      ['통사(1-5)', '통사(1-2)', null, null, null, null, null, null],
      [null, null, null, '통사(1-1)', null, null, null, null],
      [null, null, null, '통사(1-10)', null, null, '통사(1-9)', null],
      ['통사(1-8)', null, null, '통사(1-7)', null, '통사(1-4)', null, null],
    ]),
  },
  {
    id: 'IJ', name: '임지예', subject: '창의적체험활동', color: '#a0a0e0',
    schedule: buildSchedule([
      [null, null, null, '창체(1-10)', null, null, '창체(1-5)', null],
      ['창체(1-6)', '창체(1-1)', null, '창체(1-3)', null, null, null, null],
      [null, null, null, '창체(1-7)', null, null, null, null],
      ['창체(1-9)', null, '창체(1-2)', '창체(1-4)', null, null, null, null],
      [null, '창체(1-8)', null, null, null, null, null, null],
    ]),
  },
  {
    id: 'JH', name: '장화순', subject: '통합과학', color: '#6dc4b0',
    schedule: buildSchedule([
      [null, '통과(1-7)', null, null, null, null, '통과(1-9)', '통과(1-2)'],
      [null, null, null, null, null, null, null, '통과(1-6)'],
      [null, null, '통과(1-8)', null, null, null, null, null],
      ['통과(1-4)', null, null, null, null, '통과(1-1)', null, null],
      ['통과(1-5)', null, '통과(1-10)', '통과(1-3)', null, null, null, null],
    ]),
  },
  {
    id: 'JE', name: '전일채', subject: '통합사회', color: '#b08ae0',
    schedule: buildSchedule([
      [null, '통사(1-8)', '통사(1-7)', null, null, '통사(1-9)', '통사(1-4)', null],
      [null, '통사(1-6)', null, '통사(1-1)', null, null, '통사(1-10)', null],
      ['통사(1-9)', null, '통사(1-2)', null, null, null, null, null],
      ['통사(1-6)', '통사(1-3)', null, null, null, '통사(1-8)', '통사(1-7)', null],
      [null, '통사(1-10)', '통사(1-5)', null, null, null, null, null],
    ]),
  },
  {
    id: 'CMJ', name: '조명조', subject: '수학', color: '#7ecb9a',
    schedule: buildSchedule([
      ['수학(1-3)', '수학(1-1)', null, '수학(1-2)', null, '수학(1-4)', null, null],
      ['수학(1-2)', null, null, null, null, '수학(1-3)', null, '수학(1-1)'],
      ['수학(1-2)', null, null, '수학(1-4)', null, null, null, null],
      [null, null, '수학(1-3)', null, null, '수학(1-4)', '수학(1-1)', null],
      ['수학(1-3)', null, null, null, null, '수학(1-2)', null, null],
    ]),
  },
  {
    id: 'CG', name: '최기쁨', subject: '통합과학', color: '#e0b05a',
    schedule: buildSchedule([
      ['통과(1-5)', null, null, '통과(1-6)', null, null, '통과(1-8)', null],
      ['통과(1-1)', null, null, '통과(1-10)', null, null, null, null],
      [null, null, '통과(1-7)', null, null, null, null, null],
      [null, null, '통과(1-9)', '통과(1-3)', null, null, null, null],
      [null, null, '통과(1-2)', '통과(1-4)', null, null, null, null],
    ]),
  },
  {
    id: 'CS', name: '최성욱', subject: '체육', color: '#e0895a',
    schedule: buildSchedule([
      [null, null, '체육(1-9)', null, null, '체육(1-6)', null, '체육(1-7)'],
      [null, null, '체육(1-9)', null, null, '체육(1-8)', null, '체육(1-10)'],
      [null, null, '체육(1-10)', null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, '체육(1-7)', null, '체육(1-6)', null, '체육(1-8)', null, null],
    ]),
  },
  {
    id: 'HM', name: '홍민지', subject: '수학', color: '#4db58a',
    schedule: buildSchedule([
      [null, '수학(1-5)', null, '수학(1-8)', null, '수학(1-7)', null, '수학(1-6)'],
      ['수학(1-7)', null, '수학(1-6)', '수학(1-8)', null, null, null, null],
      ['수학(1-8)', null, '수학(1-5)', null, null, null, null, null],
      [null, '수학(1-7)', null, '수학(1-5)', null, '수학(1-6)', null, '수학(1-8)'],
      [null, null, '수학(1-6)', null, null, '수학(1-7)', null, null],
    ]),
  },
];
