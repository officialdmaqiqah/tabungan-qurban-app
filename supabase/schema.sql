-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE (Stores Jamaah & Admin details)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  phone text,
  address text,
  role text default 'jamaah' check (role in ('jamaah', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger to automatically create profile on sign up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, address, role)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address',
    'jamaah'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- PROGRAM SETTINGS TABLE
create table program_settings (
  id uuid default uuid_generate_v4() primary key,
  qurban_date date not null,
  official_bank_account text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default settings
insert into program_settings (qurban_date, official_bank_account) 
values ('2027-06-15', 'BSI 1234567890 a.n. Masjid Agung Kubah Timah');

-- QURBAN PACKAGES TABLE (Admin creates these)
create table qurban_packages (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  price numeric not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- USER PACKAGES TABLE (Jamaah selects these)
create table user_packages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  package_id uuid references public.qurban_packages(id) on delete cascade not null,
  quantity integer not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, package_id)
);

-- TRANSACTIONS TABLE (Jamaah deposits)
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  method text not null check (method in ('tunai', 'transfer')),
  proof_url text,
  status text default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_at timestamp with time zone,
  verified_by uuid references public.profiles(id) on delete set null,
  admin_note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- STORAGE BUCKET FOR PROOFS
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', false)
on conflict (id) do nothing;

-- ROW LEVEL SECURITY
alter table profiles enable row level security;
alter table program_settings enable row level security;
alter table qurban_packages enable row level security;
alter table user_packages enable row level security;
alter table transactions enable row level security;

-- POLICIES

-- Profiles
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Program Settings
create policy "Anyone can read program settings" on program_settings for select using (true);
create policy "Admins can update program settings" on program_settings for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can insert program settings" on program_settings for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Qurban Packages
create policy "Anyone can read packages" on qurban_packages for select using (true);
create policy "Admins can insert packages" on qurban_packages for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can update packages" on qurban_packages for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can delete packages" on qurban_packages for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- User Packages
create policy "Users can view own selected packages" on user_packages for select using (auth.uid() = user_id);
create policy "Admins can view all selected packages" on user_packages for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Users can insert own selected packages" on user_packages for insert with check (auth.uid() = user_id);
create policy "Users can delete own selected packages" on user_packages for delete using (auth.uid() = user_id);

-- Transactions
create policy "Users can view own transactions" on transactions for select using (auth.uid() = user_id);
create policy "Admins can view all transactions" on transactions for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Users can insert own transactions" on transactions for insert with check (auth.uid() = user_id);
create policy "Admins can update transactions" on transactions for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Storage Policies for 'proofs'
create policy "Users can upload their own proofs" on storage.objects for insert with check (
  bucket_id = 'proofs' AND auth.uid()::text = (storage.foldername(name))[1]
);
create policy "Users can view their own proofs" on storage.objects for select using (
  bucket_id = 'proofs' AND auth.uid()::text = (storage.foldername(name))[1]
);
create policy "Admins can view all proofs" on storage.objects for select using (
  bucket_id = 'proofs' AND exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
