-- Sprint 6 Phase 2D: persist teacher password reset feedback.
-- Safe to run repeatedly. Existing accounts are unchanged.

alter table public.student_accounts
  add column if not exists password_reset_at timestamptz;

comment on column public.student_accounts.password_reset_at is
  'Most recent teacher-issued temporary-password reset. Null means no teacher reset has been recorded.';

create index if not exists student_accounts_password_reset_at_idx
  on public.student_accounts (password_reset_at)
  where password_reset_at is not null;
