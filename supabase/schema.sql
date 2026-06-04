-- StageFlow initial database schema draft
-- Run this in Supabase SQL Editor when you are ready to connect the live app.

create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key,
  organisation_id uuid references organisations(id) on delete cascade,
  full_name text,
  role text default 'coach',
  created_at timestamptz default now()
);

create table if not exists assessment_frameworks (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade,
  name text not null,
  area text,
  mode text,
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists timetable_sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade,
  framework_id uuid references assessment_frameworks(id) on delete set null,
  day text,
  time text,
  school text,
  year_group text,
  class_name text,
  lesson_name text,
  coach_name text,
  mode text,
  created_at timestamptz default now()
);

create table if not exists learners (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade,
  display_name text not null,
  year_group text,
  class_name text,
  created_at timestamptz default now()
);

create table if not exists lesson_learners (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references timetable_sessions(id) on delete cascade,
  learner_id uuid references learners(id) on delete cascade,
  attendance text default 'Present',
  stage text,
  distance_front text default '0m',
  distance_back text default '0m',
  notes text,
  created_at timestamptz default now()
);

create table if not exists assessment_results (
  id uuid primary key default gen_random_uuid(),
  lesson_learner_id uuid references lesson_learners(id) on delete cascade,
  criteria text not null,
  result text,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade,
  actor_name text,
  action text not null,
  created_at timestamptz default now()
);
