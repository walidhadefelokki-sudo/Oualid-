-- Supabase Schema for Dar L'emploi

-- 1. Users table (linked to auth.users)
create table public.users (
  uid uuid references auth.users on delete cascade primary key,
  display_name text,
  email text unique,
  photo_url text,
  company_name text,
  role text check (role in ('user', 'employer')),
  resume_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. CVs table
create table public.cvs (
  user_id uuid references public.users(uid) on delete cascade primary key,
  name text,
  email text,
  phone text,
  address text,
  summary text,
  experiences jsonb,
  education jsonb,
  skills text[],
  languages jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Jobs table
create table public.jobs (
  id uuid default gen_random_uuid() primary key,
  employer_id uuid references public.users(uid) on delete cascade not null,
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

-- 4. Applications table
create table public.applications (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  candidate_id uuid references public.users(uid) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'reviewed', 'accepted', 'rejected')),
  resume_url text,
  cover_letter text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Notifications table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(uid) on delete cascade not null,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.cvs enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.notifications enable row level security;

-- Policies for Users
create policy "Users can view their own profile" on public.users
  for select using (auth.uid() = uid);

create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = uid);

-- Policies for CVs
create policy "Users can view their own CV" on public.cvs
  for select using (auth.uid() = user_id);

create policy "Users can update their own CV" on public.cvs
  for all using (auth.uid() = user_id);

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

-- Policies for Notifications
create policy "Users can view their own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update their own notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- 7. Storage Policies (Assume bucket 'candidate-cvs' exists)
-- Note: Buckets must be created in the Supabase UI first.
-- These policies allow authenticated users to upload their own CVs.

-- insert into storage.buckets (id, name, public) values ('candidate-cvs', 'candidate-cvs', true);

create policy "Public Access to CVs"
  on storage.objects for select
  using ( bucket_id = 'candidate-cvs' );

create policy "Authenticated users can upload CVs"
  on storage.objects for insert
  with check ( bucket_id = 'candidate-cvs' AND auth.role() = 'authenticated' );

create policy "Users can update their own CVs"
  on storage.objects for update
  using ( bucket_id = 'candidate-cvs' AND auth.uid() = owner );
