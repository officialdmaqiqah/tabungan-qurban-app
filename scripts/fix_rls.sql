-- Create security definer function to check admin status
create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public
as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Drop old policies causing recursion
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Admins can update program settings" on program_settings;
drop policy if exists "Admins can insert program settings" on program_settings;
drop policy if exists "Admins can insert packages" on qurban_packages;
drop policy if exists "Admins can update packages" on qurban_packages;
drop policy if exists "Admins can delete packages" on qurban_packages;
drop policy if exists "Admins can view all selected packages" on user_packages;
drop policy if exists "Admins can view all transactions" on transactions;
drop policy if exists "Admins can update transactions" on transactions;
drop policy if exists "Admins can view all proofs" on storage.objects;

-- Recreate policies using the new function
create policy "Admins can view all profiles" on profiles for select using (public.is_admin());

create policy "Admins can update program settings" on program_settings for update using (public.is_admin());
create policy "Admins can insert program settings" on program_settings for insert with check (public.is_admin());

create policy "Admins can insert packages" on qurban_packages for insert with check (public.is_admin());
create policy "Admins can update packages" on qurban_packages for update using (public.is_admin());
create policy "Admins can delete packages" on qurban_packages for delete using (public.is_admin());

create policy "Admins can view all selected packages" on user_packages for select using (public.is_admin());

create policy "Admins can view all transactions" on transactions for select using (public.is_admin());
create policy "Admins can update transactions" on transactions for update using (public.is_admin());

create policy "Admins can view all proofs" on storage.objects for select using (
  bucket_id = 'proofs' AND public.is_admin()
);
