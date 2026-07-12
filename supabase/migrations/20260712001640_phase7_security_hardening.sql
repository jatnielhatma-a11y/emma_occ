-- NOVA Phase 7: production security hardening.
-- Keep the auth signup trigger available to Postgres triggers while blocking
-- direct API execution of the SECURITY DEFINER function.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
