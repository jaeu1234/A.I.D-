import { supabase } from './supabaseClient.js';

// ─────────────────────────────────────────────
// 임시일정(overrides) · AI 시간표(ai_schedules) 기기 간 동기화
// Supabase에서 초기 데이터를 불러와 메모리 캐시에 두고, Realtime으로
// 다른 기기의 변경사항을 구독해 캐시를 갱신한다.
// 캐시를 두는 이유: getTeacherLocation/buildTimeline 등 기존 코드가
// 전부 동기(sync) 함수라, 매 호출마다 네트워크를 타면 렌더링 경로 전체를
// async로 바꿔야 해서 변경 범위가 커진다 → 캐시 읽기로 기존 동기 API를 유지.
// ─────────────────────────────────────────────

let overridesCache = [];
let aiSchedulesCache = {};
let classAiSchedulesCache = {};

const rowToOverride = (row) => ({
  id: row.id,
  teacherId: row.teacher_id,
  date: row.date,
  periodIdx: row.period_idx,
  label: row.label,
  room: row.room,
  floor: row.floor,
  note: row.note,
});

function upsertOverrideInCache(row) {
  const ov = rowToOverride(row);
  const i = overridesCache.findIndex(o => o.id === ov.id);
  if (i >= 0) overridesCache[i] = ov;
  else overridesCache.push(ov);
}

function removeOverrideFromCache(id) {
  overridesCache = overridesCache.filter(o => o.id !== id);
}

function upsertAiScheduleInCache(row) {
  aiSchedulesCache[row.teacher_id] = { schedule: row.schedule, updatedAt: row.updated_at };
}

function upsertClassAiScheduleInCache(row) {
  classAiSchedulesCache[row.class_id] = { schedule: row.schedule, updatedAt: row.updated_at };
}

export function getOverridesCache() { return overridesCache; }
export function getAiSchedulesCache() { return aiSchedulesCache; }
export function getClassAiSchedulesCache() { return classAiSchedulesCache; }

/**
 * 초기 데이터 로드 + Realtime 구독 시작.
 * @param {() => void} onRemoteChange 다른 기기에서 변경이 들어왔을 때 호출할 콜백(재렌더링용)
 */
export async function initSync(onRemoteChange) {
  const [ovRes, aiRes, classRes] = await Promise.all([
    supabase.from('overrides').select('*'),
    supabase.from('ai_schedules').select('*'),
    supabase.from('class_ai_schedules').select('*'),
  ]);

  if (ovRes.error) console.error('overrides 로드 실패:', ovRes.error.message);
  else overridesCache = ovRes.data.map(rowToOverride);

  if (aiRes.error) console.error('ai_schedules 로드 실패:', aiRes.error.message);
  else {
    aiSchedulesCache = {};
    aiRes.data.forEach(upsertAiScheduleInCache);
  }

  if (classRes.error) console.error('class_ai_schedules 로드 실패:', classRes.error.message);
  else {
    classAiSchedulesCache = {};
    classRes.data.forEach(upsertClassAiScheduleInCache);
  }

  supabase
    .channel('teacher-map-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'overrides' }, (payload) => {
      if (payload.eventType === 'DELETE') removeOverrideFromCache(payload.old.id);
      else upsertOverrideInCache(payload.new);
      onRemoteChange?.();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_schedules' }, (payload) => {
      if (payload.eventType === 'DELETE') delete aiSchedulesCache[payload.old.teacher_id];
      else upsertAiScheduleInCache(payload.new);
      onRemoteChange?.();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'class_ai_schedules' }, (payload) => {
      if (payload.eventType === 'DELETE') delete classAiSchedulesCache[payload.old.class_id];
      else upsertClassAiScheduleInCache(payload.new);
      onRemoteChange?.();
    })
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('[sync] realtime 연결 실패:', status, err);
      }
    });
}

/** 임시일정 등록 */
export async function addOverride(ov) {
  const { data, error } = await supabase
    .from('overrides')
    .insert({
      teacher_id: ov.teacherId,
      date: ov.date,
      period_idx: ov.periodIdx,
      label: ov.label,
      room: ov.room,
      floor: ov.floor,
      note: ov.note,
    })
    .select()
    .single();
  if (error) { console.error('임시일정 등록 실패:', error.message); throw error; }
  upsertOverrideInCache(data);
  return rowToOverride(data);
}

/** 임시일정 삭제 */
export async function deleteOverride(id) {
  const { error } = await supabase.from('overrides').delete().eq('id', id);
  if (error) { console.error('임시일정 삭제 실패:', error.message); throw error; }
  removeOverrideFromCache(id);
}

/** AI 분석 시간표 저장 (선생님당 1개, upsert) */
export async function saveAiSchedule(teacherId, schedule) {
  const { data, error } = await supabase
    .from('ai_schedules')
    .upsert({ teacher_id: teacherId, schedule, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) { console.error('AI 시간표 저장 실패:', error.message); throw error; }
  upsertAiScheduleInCache(data);
}

/** 반 AI 시간표 저장 (반당 1개, upsert). class_id = "학년-반" 예: "1-5" */
export async function saveClassAiSchedule(classId, schedule) {
  const { data, error } = await supabase
    .from('class_ai_schedules')
    .upsert({ class_id: classId, schedule, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) { console.error('반 AI 시간표 저장 실패:', error.message); throw error; }
  upsertClassAiScheduleInCache(data);
}
