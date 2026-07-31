// ─────────────────────────────────────────────
// 위치 판정의 순수 로직만 모아둔 모듈.
//
// location.js는 Supabase(sync.js → supabaseClient.js)를 거쳐 브라우저 CDN을
// import하기 때문에 Node의 내장 테스트 러너로 직접 테스트할 수 없다
// (node --test는 네트워크 import를 지원하지 않음). 이 파일은 그 CDN 체인과
// 완전히 무관한 "데이터를 받아 결과를 돌려주는" 순수 함수만 담아, 여기 있는
// 로직(특별실 매핑·임시일정 우선순위·반 시간표 조합·타임라인 상태 분류)은
// tests/locationCore.test.js에서 직접 검증할 수 있다.
//
// location.js는 이 함수들을 감싸서 실제 Supabase 캐시 데이터를 넣어 호출하는
// 얇은 wrapper 역할만 한다 — 공개 API(getTeacherLocation 등)는 그대로 유지.
// ─────────────────────────────────────────────
import { parseClassScheduleCell } from '../data/schedule.js';
import { findRoomFloor, OFFICE_IDS } from '../data/floors.js';
import { toMins } from './time.js';

// ─────────────────────────────────────────────
// 특별과목 → 전용 특별실 매핑
// 체육·음악·미술·정보·실험은 학생이 특별실로 이동해 수업하므로, 교사도 반
// 교실이 아니라 이 특별실에 있다(같은 과목이 연달아 있으면 교사는 특별실에
// 머물고 학생만 바뀐다). room id는 floors.js 기준.
//
// 과목 단위 기본 매핑. room이 null이면 지도에 없는 장소(예: 체육관은 별도
// 건물)라 라벨만 표시하고 지도 핀은 찍지 않는다.
// ─────────────────────────────────────────────
const SUBJECT_ROOMS = {
  음악: { room: 'music1',        label: '음악실1' },   // 1학년용(악기창고1 쪽)
  미술: { room: 'art-room2a',    label: '미술교과실' },
  실험: { room: 'bio-lab',       label: '생명과학실' }, // 통과(이론)는 교실 유지
  정보: { room: 'computer-room', label: '컴퓨터실' },   // 기본(강혜영 등)
  체육: { room: 'gymnasium',     label: '체육관' },     // 운동장 동쪽 1층 단층 건물(floors.js 1층)
};

// 같은 과목이라도 교사마다 쓰는 방이 다른 경우의 override (id = schedule.js 기준).
const TEACHER_ROOMS = {
  KS:  { 정보: { room: 'ai-room',    label: '신나는AI교실' } }, // 김선희 → 3층 AI실
  GDH: { 미술: { room: 'art-room2a', label: '미술교과실' } },   // 고동현 → 위쪽 미술실(1·2반)
  LEK: { 미술: { room: 'art-room2b', label: '미술교과실' } },   // 이은경 → 아래쪽 미술실(3·4·5반)
};

/** 교사·과목 → 특별실({room,label}) 또는 null(특별과목 아님) */
export function resolveSpecialRoom(teacherId, subject) {
  return TEACHER_ROOMS[teacherId]?.[subject] ?? SUBJECT_ROOMS[subject] ?? null;
}

// ─────────────────────────────────────────────
// 위치 계산
// ─────────────────────────────────────────────

/**
 * @typedef {Object} LocationResult
 * @property {'class'|'office'|'lunch'|'break'|'override'} type
 * @property {string} label
 * @property {string|null} room
 * @property {number|null} floor
 * @property {string} [note]
 */

/**
 * 특정 선생님의 day/period 기준 실제 위치 반환 (순수 함수).
 * 우선순위: 임시 일정 > AI 시간표 > 기본 시간표
 *
 * @param {string} teacherId
 * @param {number} dayIdx   0=월 ~ 4=금
 * @param {number} periodIdx 0~7 | -1
 * @param {object} ctx
 * @param {Array<{label:string,end:string,isLunch?:boolean}>} ctx.periods - PERIODS
 * @param {Array<{teacherId,date,periodIdx,label,room,floor,note}>} ctx.overrides - 임시일정 목록
 * @param {string} ctx.today - 'YYYY-MM-DD' (로컬 날짜)
 * @param {Array<Array<object|null>>|null} ctx.schedule - getEffectiveSchedule 결과(5×8 ClassCell 그리드)
 * @returns {LocationResult}
 */
export function resolveTeacherLocation(teacherId, dayIdx, periodIdx, { periods, overrides, today, schedule }) {
  if (periodIdx < 0) {
    return { type: 'break', label: '쉬는 시간', room: null, floor: null };
  }

  const period = periods[periodIdx];
  if (period.isLunch) {
    return { type: 'lunch', label: '점심', room: 'office', floor: null };
  }

  const override = overrides.find(
    o => o.teacherId === teacherId && o.date === today && o.periodIdx === periodIdx,
  );
  if (override) {
    return {
      type:  'override',
      label: override.label,
      room:  override.room,
      floor: override.floor,
      note:  override.note,
    };
  }

  if (!schedule) return { type: 'office', label: '교무실', room: 'office', floor: null };

  const cls = schedule[dayIdx]?.[periodIdx];
  if (cls) {
    // ClassCell: { subject, grade, class, label }. 학년-반이 있으면 그 교실로,
    // 없으면(예: '체육'처럼 과목만 있는 경우) 교무실로 fallback.
    // 주의: 학년 숫자와 실제 건물 층수가 다르므로(예: 1학년 교실이 5층에 있음)
    // floor는 "학년"이 아니라 FLOORS 데이터에서 실제 위치를 조회해서 구한다.
    if (cls.grade != null && cls.class != null) {
      const sr = resolveSpecialRoom(teacherId, cls.subject);
      if (sr) {
        return { type: 'class', label: sr.label, room: sr.room ?? null,
                 floor: sr.room ? findRoomFloor(sr.room) : null };
      }
      const roomId = `${cls.grade}-${cls.class}`;
      return { type: 'class', label: cls.label, room: roomId, floor: findRoomFloor(roomId) };
    }
    return { type: 'class', label: cls.label, room: 'office', floor: null };
  }

  return { type: 'office', label: '교무실', room: 'office', floor: null };
}

// ─────────────────────────────────────────────
// 학급(반) 시간표 조합
// ─────────────────────────────────────────────

/**
 * 여러 선생님의 유효 시간표를 훑어 특정 학급의 주간 시간표로 재구성 (순수 함수).
 * 담당 선생님 정보가 없는 시간은 반 AI 시간표로 보완한다.
 *
 * @param {number} grade
 * @param {number} classNum
 * @param {number} periodsCount
 * @param {object} ctx
 * @param {Array<{id:string,name:string,schedule:Array<Array<object|null>>|null}>} ctx.teacherSchedules
 * @param {{schedule: Array<Array<string|null>>}|undefined} ctx.classAiEntry
 * @returns {Array<Array<{subject:string,teacherName:string,teacherId:string,label:string}|null>>} 5×periodsCount 그리드
 */
export function combineClassSchedule(grade, classNum, periodsCount, { teacherSchedules, classAiEntry }) {
  const grid = Array.from({ length: 5 }, () => Array(periodsCount).fill(null));

  teacherSchedules.forEach(({ id, name, schedule }) => {
    if (!schedule) return;
    schedule.forEach((row, d) => {
      row.forEach((cell, p) => {
        if (cell && cell.grade === grade && cell.class === classNum) {
          grid[d][p] = { subject: cell.subject, teacherName: name, teacherId: id, label: cell.label };
        }
      });
    });
  });

  if (classAiEntry) {
    for (let d = 0; d < 5; d++) {
      for (let p = 0; p < periodsCount; p++) {
        if (grid[d][p]) continue;
        const cell = parseClassScheduleCell(classAiEntry.schedule[d]?.[p]);
        if (cell) grid[d][p] = cell;
      }
    }
  }

  return grid;
}

// ─────────────────────────────────────────────
// 타임라인 상태 분류
// ─────────────────────────────────────────────

/**
 * 하루치 위치 목록에 past/now/next/future 상태를 매긴다 (순수 함수).
 * 종료 시각 기준으로 판정해야 쉬는 시간(piNow=-1)에도 이미 끝난 교시가
 * 올바르게 '지난 교시'로 표시된다.
 *
 * @param {Array<{label:string,start:string,end:string}>} periods
 * @param {Array<LocationResult>} dayLocations - periods와 같은 길이, 인덱스별 위치
 * @param {{piNow:number, breakAfter:number, nowMins:number}} ctx
 * @returns {Array<{pi:number, period:object, loc:LocationResult, status:'past'|'now'|'next'|'future'}>}
 */
export function classifyTimeline(periods, dayLocations, { piNow, breakAfter, nowMins }) {
  return periods.map((period, pi) => {
    const loc = dayLocations[pi];
    let status = 'future';
    if (nowMins >= toMins(period.end))     status = 'past';
    else if (pi === piNow)                 status = 'now';
    else if (breakAfter >= 0 && pi === breakAfter + 1) status = 'next';
    return { pi, period, loc, status };
  });
}

// ─────────────────────────────────────────────
// 맵 렌더링용 헬퍼
// ─────────────────────────────────────────────

/** 상태 → 점 색상 */
export function statusColor(type) {
  switch (type) {
    case 'class':    return '#3b5bdb';
    case 'override': return '#c0501a';
    case 'lunch':    return '#a07000';
    default:         return '#2d7a4f'; // office / break
  }
}

/**
 * 현재 층에서 room id를 실제 room 객체로 resolve
 * 교무실(office)은 층별 OFFICE_IDS로 매핑
 */
export function resolveRoom(roomId, locFloor, currentFloor, floorData) {
  if (!roomId) return null;
  if (roomId === 'office') {
    const officeId = OFFICE_IDS[currentFloor];
    return floorData.rooms.find(r => r.id === officeId) ?? null;
  }
  // locFloor는 0(지하)일 수 있어 falsy 체크(if(locFloor && ...))를 쓰면 안 됨
  if (locFloor != null && locFloor !== currentFloor) return null;
  return floorData.rooms.find(r => r.id === roomId) ?? null;
}
