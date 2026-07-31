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

/**
 * "과목(선생님이름)" 형식 셀 파싱 (반 AI 시간표 전용).
 * 괄호를 그리디하게 앞에서부터 잡으면 과목명에 괄호가 섞인 경우
 * (예: '국어(문학)(홍길동)') 선생님 이름 자리가 어긋난다. 마지막
 * '(괄호 없는 내용)'만 선생님 이름으로 잡도록 앵커링한다.
 * TEACHERS를 참조하므로 이 파일에 둔다(location.js는 sync.js를 거쳐
 * Supabase 클라이언트를 불러오는 무거운 모듈이라, 순수 파싱 로직을 여기
 * 두면 테스트에서 네트워크 의존 없이 바로 import해 검증할 수 있다).
 * @returns {{subject:string, teacherName:string, teacherId:string|null, label:string} | null}
 */
export function parseClassScheduleCell(raw) {
  if (!raw) return null;
  const m = raw.match(/^(.+)\(([^()]+)\)$/);
  if (m) {
    const teacherName = m[2];
    const teacher = TEACHERS.find(t => t.name === teacherName);
    return { subject: m[1], teacherName, teacherId: teacher?.id ?? null, label: raw };
  }
  return { subject: raw, teacherName: '', teacherId: null, label: raw };
}

/**
 * 지도 핀·목록 아이콘처럼 좁은 자리에 넣을 이름 축약형.
 * 성을 뺀 이름 두 글자를 쓴다(류학철 → 학철). 두 글자 이하 이름은 그대로 둔다(양설).
 * 예전엔 영문 이니셜(id: 'RH')을 그대로 노출해서 누구인지 알아볼 수 없었다.
 * id는 데이터 키로만 남기고 화면에는 쓰지 않는다.
 */
export function shortName(name) {
  if (!name) return '';
  return name.length > 2 ? name.slice(-2) : name;
}

// ─────────────────────────────────────────────
// 선생님 기본 시간표
// schedule[요일(0=월)][교시(0=1교시)] = ClassCell | null
// 원본은 '과목(학년-반)' 문자열로 작성하고 buildSchedule()로 정규화한다.
// 여기 있는 건 최후 폴백일 뿐, 실제로는 AI 업로드·관리자 임시일정이 Supabase에
// 저장돼 이보다 우선 적용된다 (location.js getEffectiveSchedule 참고).
// ─────────────────────────────────────────────
// officeFloor: 그 선생님이 소속된 교무실 층(3·4·5 중 하나). 수업이 없는 교시·점심에
// 어느 층 교무실에 표시할지, 그리고 선택했을 때 어느 층으로 이동할지를 결정한다.
// 생략하면 "층 자유"로 취급돼 보고 있는 층의 교무실마다 표시된다 — 아직 소속을
// 확인하지 못한 선생님(2026-07-31 기준 12명)은 일부러 비워둔 것이니, 확인되는 대로
// 채우면 된다. 값을 채우기 전까지는 그 선생님만 예전 동작이 유지된다.
//
// 출처: '2026학년도 1학기 1학년 시간표.hwpx' (1학년 1~10반 전체, 2026-07-08 입력).
// 반 시간표 10개를 모두 합쳐 선생님별 시간표로 재구성했으므로, 각 선생님이
// 1학년 전체에서 가르치는 시간이 전부 반영되어 있다 (다른 학년 시간표는 미포함).
// 자율학습·동아리 시간은 담당 선생님 정보가 없어 채우지 않았다.
export const TEACHERS = [
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
    id: 'HM', name: '홍민지', subject: '수학', color: '#4db58a', officeFloor: 4,
    schedule: buildSchedule([
      [null, '수학(1-5)', null, '수학(1-8)', null, '수학(1-7)', null, '수학(1-6)'],
      ['수학(1-7)', null, '수학(1-6)', '수학(1-8)', null, null, null, null],
      ['수학(1-8)', null, '수학(1-5)', null, null, null, null, null],
      [null, '수학(1-7)', null, '수학(1-5)', null, '수학(1-6)', null, '수학(1-8)'],
      [null, null, '수학(1-6)', null, null, '수학(1-7)', null, null],
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
    id: 'KS', name: '김선희', subject: '정보', color: '#d57eb0', officeFloor: 5,
    schedule: buildSchedule([
      [null, null, '정보(1-1)', '정보(1-4)', null, null, '정보(1-2)', null],
      ['정보(1-3)', '정보(1-4)', null, null, null, '정보(1-1)', '정보(1-5)', null],
      [null, '정보(1-2)', '정보(1-4)', null, null, null, null, null],
      ['정보(1-1)', '정보(1-2)', null, null, null, '정보(1-3)', null, '정보(1-5)'],
      [null, '정보(1-5)', null, null, null, '정보(1-3)', null, null],
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
    id: 'JH', name: '장화순', subject: '통합과학', color: '#6dc4b0', officeFloor: 3,
    schedule: buildSchedule([
      [null, '통과(1-7)', null, null, null, null, '통과(1-9)', '통과(1-2)'],
      [null, null, null, null, null, null, null, '통과(1-6)'],
      [null, null, '통과(1-8)', null, null, null, null, null],
      ['통과(1-4)', null, null, null, null, '통과(1-1)', null, null],
      ['통과(1-5)', null, '통과(1-10)', '통과(1-3)', null, null, null, null],
    ]),
  },
  {
    id: 'CS', name: '최성욱', subject: '체육', color: '#e0895a', officeFloor: 5,
    schedule: buildSchedule([
      [null, null, '체육(1-9)', null, null, '체육(1-6)', null, '체육(1-7)'],
      [null, null, '체육(1-9)', null, null, '체육(1-8)', null, '체육(1-10)'],
      [null, null, '체육(1-10)', null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, '체육(1-7)', null, '체육(1-6)', null, '체육(1-8)', null, null],
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
    id: 'KD', name: '김동억', subject: '국어', color: '#5ac0e0', officeFloor: 3,
    schedule: buildSchedule([
      [null, '국어(1-9)', null, null, null, null, '국어(1-7)', '국어(1-10)'],
      ['국어(1-8)', null, '국어(1-7)', null, null, '국어(1-9)', '국어(1-6)', null],
      [null, null, null, '국어(1-10)', null, null, null, null],
      [null, '국어(1-6)', '국어(1-10)', null, null, '국어(1-7)', '국어(1-8)', null],
      ['국어(1-9)', null, '국어(1-8)', null, null, '국어(1-6)', null, null],
    ]),
  },
  {
    id: 'CG', name: '최기쁨', subject: '통합과학', color: '#e0b05a', officeFloor: 3,
    schedule: buildSchedule([
      ['통과(1-5)', null, null, '통과(1-6)', null, null, '통과(1-8)', null],
      ['통과(1-1)', null, null, '통과(1-10)', null, null, null, null],
      [null, null, '통과(1-7)', null, null, null, null, null],
      [null, null, '통과(1-9)', '통과(1-3)', null, null, null, null],
      [null, null, '통과(1-2)', '통과(1-4)', null, null, null, null],
    ]),
  },
  {
    id: 'KW', name: '곽삼웅', subject: '통합과학·실험실습', color: '#8ae0a0', officeFloor: 5,
    schedule: buildSchedule([
      [null, '실험(1-2)', '실험(1-6)', null, null, null, '실험(1-1)', null],
      [null, '실험(1-3)', '통과(1-4)', null, null, '통과(1-2)', '통과(1-9)', null],
      ['통과(1-3)', '통과(1-5)', null, null, null, null, null, null],
      [null, '통과(1-8)', '통과(1-7)', null, null, '실험(1-5)', '실험(1-4)', null],
      [null, '통과(1-6)', '통과(1-1)', null, null, '통과(1-10)', null, null],
    ]),
  },
  {
    id: 'YS', name: '양설', subject: '영어', color: '#e07a7a', officeFloor: 3,
    schedule: buildSchedule([
      [null, '영어(1-10)', null, '영어(1-7)', null, null, null, '영어(1-8)'],
      ['영어(1-9)', null, '영어(1-10)', null, null, '영어(1-6)', null, '영어(1-7)'],
      [null, null, '영어(1-9)', '영어(1-6)', null, null, null, null],
      [null, '영어(1-9)', '영어(1-8)', null, null, '영어(1-10)', '영어(1-6)', null],
      [null, null, '영어(1-7)', '영어(1-8)', null, null, null, null],
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
    id: 'EY', name: '엄유진', subject: '통합과학', color: '#d5a05a', officeFloor: 3,
    schedule: buildSchedule([
      ['통과(1-1)', '통과(1-3)', null, null, null, null, null, null],
      [null, '통과(1-8)', null, null, null, null, '통과(1-7)', null],
      ['통과(1-4)', null, null, null, null, null, null, null],
      ['통과(1-2)', '통과(1-5)', null, '통과(1-6)', null, null, '통과(1-10)', null],
      [null, null, null, '통과(1-9)', null, null, null, null],
    ]),
  },
  {
    id: 'KHY', name: '강혜영', subject: '정보', color: '#e0a5d5', officeFloor: 3,
    schedule: buildSchedule([
      ['정보(1-9)', null, null, null, null, '정보(1-8)', '정보(1-10)', null],
      ['정보(1-10)', null, '정보(1-8)', null, null, '정보(1-7)', null, '정보(1-9)'],
      ['정보(1-6)', '정보(1-7)', null, '정보(1-8)', null, null, null, null],
      ['정보(1-7)', null, null, '정보(1-9)', null, null, null, '정보(1-6)'],
      ['정보(1-6)', null, null, '정보(1-10)', null, null, null, null],
    ]),
  },
  {
    id: 'GDH', name: '고동현', subject: '미술', color: '#a5e0c5',
    schedule: buildSchedule([
      [null, null, null, '미술(1-1)', null, null, null, null],
      [null, null, null, null, null, null, null, '미술(1-2)'],
      [null, null, null, null, null, null, null, null],
      [null, '미술(1-1)', null, null, null, null, '미술(1-2)', null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'KJI', name: '김종인', subject: '국어', color: '#c5a5e0', officeFloor: 5,
    schedule: buildSchedule([
      [null, '국어(1-4)', null, null, null, '국어(1-2)', null, null],
      ['국어(1-4)', null, '국어(1-2)', '국어(1-5)', null, null, '국어(1-1)', null],
      ['국어(1-5)', '국어(1-3)', null, '국어(1-2)', null, null, null, null],
      [null, null, '국어(1-4)', '국어(1-1)', null, null, '국어(1-5)', '국어(1-3)'],
      ['국어(1-1)', '국어(1-3)', null, null, null, null, null, null],
    ]),
  },
  {
    id: 'KJE', name: '김주은', subject: '영어', color: '#e0c5a5',
    schedule: buildSchedule([
      ['영어(1-2)', null, '영어(1-3)', '영어(1-5)', null, null, null, '영어(1-4)'],
      [null, null, '영어(1-1)', null, null, '영어(1-5)', null, '영어(1-4)'],
      ['영어(1-1)', null, null, '영어(1-3)', null, null, null, null],
      ['영어(1-3)', null, '영어(1-5)', '영어(1-2)', null, null, null, null],
      [null, '영어(1-2)', '영어(1-4)', null, null, '영어(1-1)', null, null],
    ]),
  },
  {
    id: 'KHS', name: '김황섭', subject: '체육', color: '#a5c5e0',
    schedule: buildSchedule([
      [null, null, '체육(1-2)', null, null, '체육(1-5)', null, '체육(1-3)'],
      [null, null, null, null, null, null, '체육(1-2)', '체육(1-3)'],
      [null, '체육(1-1)', null, null, null, null, null, null],
      [null, null, null, null, null, null, null, '체육(1-4)'],
      ['체육(1-4)', '체육(1-1)', null, null, null, '체육(1-5)', null, null],
    ]),
  },
  {
    id: 'BKJ', name: '백광재', subject: '수학', color: '#d5e0a5', officeFloor: 4,
    schedule: buildSchedule([
      [null, null, '수학(1-10)', '수학(1-9)', null, null, null, null],
      [null, '수학(1-5)', null, '수학(1-4)', null, '수학(1-10)', null, null],
      [null, '수학(1-10)', null, '수학(1-9)', null, null, null, null],
      [null, null, null, null, null, '수학(1-9)', null, '수학(1-10)'],
      [null, '수학(1-9)', null, null, null, null, null, null],
    ]),
  },
  {
    id: 'SSY', name: '신소연', subject: '수학', color: '#e0a5a5',
    schedule: buildSchedule([
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, '수학(1-1)', null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ]),
  },
  {
    id: 'LNH', name: '이나현', subject: '통합사회', color: '#a5e0e0', officeFloor: 4,
    schedule: buildSchedule([
      ['통사(1-10)', null, '통사(1-5)', null, null, '통사(1-3)', null, '통사(1-1)'],
      [null, '통사(1-9)', null, '통사(1-7)', null, '통사(1-4)', null, null],
      [null, '통사(1-8)', '통사(1-6)', null, null, null, null, null],
      ['통사(1-5)', '통사(1-4)', null, null, null, '통사(1-2)', null, '통사(1-1)'],
      [null, null, '통사(1-3)', '통사(1-2)', null, null, null, null],
    ]),
  },
  {
    id: 'LMY', name: '이미영', subject: '국사', color: '#c5e0a5', officeFloor: 5,
    schedule: buildSchedule([
      [null, null, '국사(1-4)', null, null, '국사(1-1)', null, '국사(1-5)'],
      [null, null, '국사(1-3)', '국사(1-2)', null, null, '국사(1-4)', '국사(1-5)'],
      [null, null, '국사(1-3)', '국사(1-5)', null, null, null, null],
      [null, null, '국사(1-1)', null, null, null, '국사(1-3)', '국사(1-2)'],
      ['국사(1-2)', '국사(1-4)', null, '국사(1-1)', null, null, null, null],
    ]),
  },
  {
    id: 'LEK', name: '이은경', subject: '미술', color: '#e0a5c5',
    schedule: buildSchedule([
      ['미술(1-4)', null, null, null, null, null, '미술(1-3)', null],
      [null, null, '미술(1-5)', null, null, null, '미술(1-3)', null],
      [null, '미술(1-4)', null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, '미술(1-5)', null, null, null, null],
    ]),
  },
  {
    id: 'JMJ', name: '조명조', subject: '수학', color: '#a5a5e0',
    schedule: buildSchedule([
      ['수학(1-3)', '수학(1-1)', null, '수학(1-2)', null, '수학(1-4)', null, null],
      ['수학(1-2)', null, null, null, null, '수학(1-3)', null, '수학(1-1)'],
      ['수학(1-2)', null, null, '수학(1-4)', null, null, null, null],
      [null, null, '수학(1-3)', null, null, '수학(1-4)', '수학(1-1)', null],
      ['수학(1-3)', null, null, null, null, '수학(1-2)', null, null],
    ]),
  },
];
