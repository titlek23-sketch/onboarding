-- =====================================================================
-- 다온정밀 온보딩 앱 — Supabase 준비 (표 5개, 가입 규칙, 보기 권한)
-- Supabase SQL Editor에 통째로 붙여넣고 Run. 두 번 실행해도 괜찮습니다.
--
-- 표 이름과 열 이름은 코드에서 쓰기 쉽게 영어로 지었습니다.
-- 각 열 옆의 주석이 엑셀의 열 이름입니다.
-- 이메일은 모두 소문자로 저장합니다. (대소문자 구분 안 함)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 표 5개
-- ---------------------------------------------------------------------

-- FAQ (01_FAQ.xlsx / FAQ 시트)
create table if not exists public.faq (
  faq_id        text primary key,          -- 번호
  category      text not null,             -- 분류
  question      text not null,             -- 질문
  aliases       text not null,             -- 이런 말로도 찾음
  short_answer  text not null,             -- 한 줄 답변
  detail        text not null,             -- 상세 설명
  related_form  text,                      -- 관련 서식 (비어도 됨)
  department    text not null,             -- 담당 부서
  last_checked  date not null              -- 최종 확인일
);

-- 할 일 템플릿 (02_할일템플릿.xlsx / 할일 시트)
create table if not exists public.task_templates (
  task_id       text primary key,          -- 할일ID
  period        text not null              -- 시기
                check (period in ('입사 전', '첫날', '첫 주', '첫 달')),
  due_days      integer not null,          -- 기한(입사일 기준 일수), 마이너스 가능
  title         text not null,             -- 할 일
  description   text not null,             -- 설명
  department    text not null,             -- 담당 부서
  required_type text not null              -- 필수 여부
                check (required_type in ('필수', '선택')),
  target_group  text not null              -- 대상 직군
                check (target_group in ('전체', '현장직', '사무직'))
);

-- 입사자 명단 (03_입사자명단.xlsx / 입사자 시트)
create table if not exists public.hires (
  employee_no   text primary key,          -- 사번
  name          text not null,             -- 이름
  email         text not null unique       -- 이메일
                check (email = lower(email)),
  department    text not null,             -- 부서
  job_group     text not null              -- 직군
                check (job_group in ('현장직', '사무직')),
  site          text,                      -- 사업장
  hire_date     date not null,             -- 입사일
  mentor        text                       -- 멘토
);

-- HR 담당자 명단 (03_입사자명단.xlsx / HR담당자 시트)
create table if not exists public.hr_staff (
  email         text primary key           -- 이메일
                check (email = lower(email)),
  name          text,                      -- 이름
  role          text                       -- 역할
);

-- 체크 기록 (앱에서 쌓이는 기록 + 체크기록_샘플 시트)
-- (이메일, 할일ID)가 기본 키라서 같은 사람이 같은 할 일을 두 번 체크한 줄은 생기지 않습니다.
create table if not exists public.task_checks (
  email         text not null              -- 이메일
                references public.hires (email) on update cascade,
  task_id       text not null              -- 할일ID
                references public.task_templates (task_id) on update cascade,
  completed_at  timestamptz not null default now(),  -- 완료 일시
  primary key (email, task_id),
  check (email = lower(email))
);


-- ---------------------------------------------------------------------
-- 2. 도우미 함수
-- ---------------------------------------------------------------------

-- 지금 로그인한 사람의 이메일 (소문자)
create or replace function public.current_email()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(auth.jwt() ->> 'email');
$$;

-- 지금 로그인한 사람이 HR 담당자인지
create or replace function public.is_hr()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.hr_staff where email = public.current_email()
  );
$$;

-- 이 이메일이 명단(입사자 또는 HR)에 있는지 — 회원가입 전에 앱이 물어봄
create or replace function public.is_signup_allowed(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.hires    where email = lower(trim(p_email)))
      or exists (select 1 from public.hr_staff where email = lower(trim(p_email)));
$$;

revoke all on function public.is_hr() from public;
revoke all on function public.is_signup_allowed(text) from public;
grant execute on function public.current_email() to authenticated;
grant execute on function public.is_hr() to authenticated;
grant execute on function public.is_signup_allowed(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. 가입 규칙: 명단에 있는 이메일만 가입
--    앱이 가입 전에 is_signup_allowed로 먼저 확인해 정해진 문구를 보여 주고,
--    앱을 거치지 않은 가입도 여기서 한 번 더 막습니다.
-- ---------------------------------------------------------------------

create or replace function public.block_unlisted_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_signup_allowed(new.email) then
    raise exception '입사자 명단에 없는 이메일입니다. 경영지원팀에 문의하세요';
  end if;
  return new;
end;
$$;

drop trigger if exists block_unlisted_signup on auth.users;
create trigger block_unlisted_signup
  before insert on auth.users
  for each row execute function public.block_unlisted_signup();


-- ---------------------------------------------------------------------
-- 4. 보기 권한 (RLS: 줄마다 누가 볼 수 있는지 정하는 규칙)
--    엑셀 내용을 올리는 Python은 Secret key를 쓰므로 이 규칙과 상관없이 씁니다.
-- ---------------------------------------------------------------------

alter table public.faq            enable row level security;
alter table public.task_templates enable row level security;
alter table public.hires          enable row level security;
alter table public.hr_staff       enable row level security;
alter table public.task_checks    enable row level security;

-- 로그인한 사람이 쓸 수 있는 동작만 열어 둠
revoke all on public.faq, public.task_templates, public.hires, public.hr_staff, public.task_checks from anon;
grant select on public.faq, public.task_templates, public.hires, public.hr_staff to authenticated;
grant select, insert, delete on public.task_checks to authenticated;
grant all on public.faq, public.task_templates, public.hires, public.hr_staff, public.task_checks to service_role;

-- FAQ, 할 일 템플릿: 로그인한 사람 누구나 읽기
drop policy if exists "로그인하면 읽기" on public.faq;
create policy "로그인하면 읽기" on public.faq
  for select to authenticated using (true);

drop policy if exists "로그인하면 읽기" on public.task_templates;
create policy "로그인하면 읽기" on public.task_templates
  for select to authenticated using (true);

-- 입사자 명단: 입사자는 자기 줄만, HR은 전체
drop policy if exists "내 줄 또는 HR" on public.hires;
create policy "내 줄 또는 HR" on public.hires
  for select to authenticated
  using (email = public.current_email() or public.is_hr());

-- HR 담당자 명단: 자기 줄만 (앱이 [대시보드] 탭을 보여 줄지 정할 때 씀), HR은 전체
drop policy if exists "내 줄 또는 HR" on public.hr_staff;
create policy "내 줄 또는 HR" on public.hr_staff
  for select to authenticated
  using (email = public.current_email() or public.is_hr());

-- 체크 기록: 보기는 내 것 또는 HR은 전체
drop policy if exists "내 기록 또는 HR 보기" on public.task_checks;
create policy "내 기록 또는 HR 보기" on public.task_checks
  for select to authenticated
  using (email = public.current_email() or public.is_hr());

-- 체크하기: 내 이메일로만
drop policy if exists "내 기록 체크" on public.task_checks;
create policy "내 기록 체크" on public.task_checks
  for insert to authenticated
  with check (email = public.current_email());

-- 체크 풀기: 내 기록만
drop policy if exists "내 기록 풀기" on public.task_checks;
create policy "내 기록 풀기" on public.task_checks
  for delete to authenticated
  using (email = public.current_email());
