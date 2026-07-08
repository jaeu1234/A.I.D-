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

-- RLS 활성화
alter table overrides enable row level security;
alter table ai_schedules enable row level security;

-- 기존 앱의 보안 수준(클라이언트 PIN)과 동일하게, 익명 키로 자유롭게 읽기/쓰기 허용.
-- (참고: 진짜 서버 인증은 로드맵 Phase C의 별도 항목이며 이번 작업 범위 밖입니다.)
create policy "anon full access" on overrides
  for all to anon using (true) with check (true);

create policy "anon full access" on ai_schedules
  for all to anon using (true) with check (true);

-- 실시간 반영(Realtime)을 위해 두 테이블을 publication에 추가
alter publication supabase_realtime add table overrides;
alter publication supabase_realtime add table ai_schedules;
