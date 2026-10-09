-- Nightly results fetch at 23:45 Europe/Warsaw.
-- pg_cron runs in UTC, so both DST offsets are scheduled; the edge function
-- ignores the run unless it is 23:xx in Warsaw.
--
-- Requires two Vault secrets (created outside migrations, never committed):
--   select vault.create_secret('<https://<ref>.supabase.co>', 'project_url');
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_fetch_results()
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';

  return net.http_post(
    url := v_url || '/functions/v1/fetch-results',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := jsonb_build_object('source', 'cron'),
    timeout_milliseconds := 60000
  );
end;
$$;

revoke execute on function public.invoke_fetch_results() from public, anon, authenticated;

select cron.schedule('fetch-results-cest', '45 21 * * *', $$select public.invoke_fetch_results()$$);
select cron.schedule('fetch-results-cet', '45 22 * * *', $$select public.invoke_fetch_results()$$);
