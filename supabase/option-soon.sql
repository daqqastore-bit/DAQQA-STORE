-- Coming-soon options: an option the admin marked «قريبًا» (variants[].o[].soon = true) can't be ordered yet.
-- Adds one check to the live shop_place_order without touching anything else in it. Safe to run twice.
do $$ declare d text; m text := $m$if v_o is null then raise exception 'اختار % لـ %', coalesce(g->>'ar', g->>'k'), p.name; end if;$m$;
begin
  d := pg_get_functiondef('public.shop_place_order'::regproc);
  if position(m in d) = 0 then raise exception 'anchor missing'; end if;
  if position('لسه منزلش' in d) = 0 then
    d := replace(d, m, m || E'\n      -- an option the admin marked coming soon (soon = true) can''t be ordered yet\n      if (v_o->>''soon'') = ''true'' then raise exception ''% (%) قريبًا، لسه منزلش'', v_o->>''n'', p.name; end if;');
    execute d;
  end if;
end $$;
