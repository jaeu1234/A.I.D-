-- ─────────────────────────────────────────────
-- 선생님 위치 안내 · Supabase 스키마
-- Phase C: 임시일정(overrides) + AI 분석 시간표(ai_schedules) 기기 간 동기화
-- Supabase SQL Editor에 붙여넣고 실행하세요.
-- ─────────────────────────────────────────────

-- 임시일정 (admin.html에서 등록)
create table if not exists overrides (
  id bigint generated always as identity primary key,
  teacher_id text not null,
  date date not null,
  period_idx int not null,
  label text not null,
  room text,
  floor int,
  note text,
  created_at timestamptz not null default now()
);

-- AI 분석 시간표 (upload.html에서 저장, 선생님당 1개)
create table if not exists ai_schedules (
  teacher_id text primary key,
  schedule jsonb not null,
  updated_at timestamptz not null default now()
);

-- 반 AI 분석 시간표 (upload.html에서 저장, 반당 1개)
-- 코드에서는 이미 쓰고 있었지만 이 스키마 파일엔 누락돼 있었다.
create table if not exists class_ai_schedules (
  class_id text primary key,
  schedule jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS 활성화
alter table overrides enable row level security;
alter table ai_schedules enable row level security;
alter table class_ai_schedules enable row level security;

-- 기존 앱의 보안 수준(클라이언트 PIN)과 동일하게, 익명 키로 자유롭게 읽기/쓰기 허용.
-- (참고: 진짜 서버 인증은 로드맵 Phase C의 별도 항목이며 이번 작업 범위 밖입니다.)
create policy "anon full access" on overrides
  for all to anon using (true) with check (true);

create policy "anon full access" on ai_schedules
  for all to anon using (true) with check (true);

-- 실시간 반영(Realtime)을 위해 두 테이블을 publication에 추가
alter publication supabase_realtime add table overrides;
alter publication supabase_realtime add table ai_schedules;

-- ─────────────────────────────────────────────
-- 마이그레이션: anon 쓰기 권한 제거 (관리자 PIN 우회 취약점 수정)
-- 위 "anon full access" 정책은 누구나 브라우저 devtools에서 anon key로
-- overrides/ai_schedules를 직접 insert/update/delete할 수 있게 해서,
-- admin.html의 PIN 확인이 사실상 아무것도 막지 못했다. 이제 쓰기는
-- Vercel 서버리스 함수(api/admin-write.js)가 PIN을 서버에서 검증한 뒤
-- service_role 키로만 수행하고, anon 키는 읽기만 허용한다.
-- 기존 DB에 이미 위 구문을 실행했다면, 이 블록을 SQL Editor에서 추가로 실행하세요.
-- ─────────────────────────────────────────────
drop policy if exists "anon full access" on overrides;
drop policy if exists "anon full access" on ai_schedules;
drop policy if exists "anon full access" on class_ai_schedules;

create policy "anon read only" on overrides
  for select to anon using (true);
create policy "anon read only" on ai_schedules
  for select to anon using (true);
create policy "anon read only" on class_ai_schedules
  for select to anon using (true);

-- class_ai_schedules를 이미 수동으로 publication에 추가해뒀을 수 있으므로,
-- 이미 등록돼 있으면 에러 없이 넘어가도록 감싼다.
do $$
begin
  alter publication supabase_realtime add table class_ai_schedules;
exception when duplicate_object then
  null;
end $$;
