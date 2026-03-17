-- Supabase Schema for Dar L'emploi

-- 1. Users table (linked to auth.users)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  email text unique,
  photo_url text,
  role text check (role in ('user', 'employer')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Jobs table
create table public.jobs (
  id uuid default gen_random_uuid() primary key,
  employer_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  company text not null,
  location text not null,
  type text not null,
  salary text,
  description text,
  requirements text[],
  is_featured boolean default false,
  status text default 'active' check (status in ('active', 'closed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Applications table
create table public.applications (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  candidate_id uuid references public.users(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'reviewed', 'accepted', 'rejected')),
  resume_url text,
  cover_letter text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

-- Policies for Users
create policy "Users can view their own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = id);

-- Policies for Jobs
create policy "Anyone can view active jobs" on public.jobs
  for select using (status = 'active');

create policy "Employers can manage their own jobs" on public.jobs
  for all using (auth.uid() = employer_id);

-- Policies for Applications
create policy "Candidates can view their own applications" on public.applications
  for select using (auth.uid() = candidate_id);

create policy "Employers can view applications for their jobs" on public.applications
  for select using (
    exists (
      select 1 from public.jobs
      where jobs.id = applications.job_id
      and jobs.employer_id = auth.uid()
    )
  );

create policy "Candidates can create applications" on public.applications
  for insert with check (auth.uid() = candidate_id);
