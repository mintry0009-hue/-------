create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('teacher', 'student')),
  created_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  join_code text not null unique,
  teacher_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  group_id uuid references groups(id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (class_id, user_id)
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  title text not null,
  content text not null,
  created_by uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  subscription_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_classes_teacher_id on classes(teacher_id);
create index if not exists idx_groups_class_id on groups(class_id);
create index if not exists idx_class_members_class_id on class_members(class_id);
create index if not exists idx_class_members_user_id on class_members(user_id);
create index if not exists idx_notices_class_id on notices(class_id);
create index if not exists idx_push_subscriptions_user_id on push_subscriptions(user_id);
