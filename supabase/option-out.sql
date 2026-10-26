-- Out-of-stock options: an option the admin marked «نفذ» (variants[].o[].out = true) can't be ordered.
-- Adds one check to the live shop_place_order without touching anything else in it. Safe to run twice.
do $$ declare d text; m text := $m$if v_o is null then raise exception 'اختار % لـ %', coalesce(g->>'ar', g->>'k'), p.name; end if;$m$;
begin
  d := pg_get_functiondef('public.shop_place_order'::regproc);
  if position(m in d) = 0 then raise exception 'anchor missing'; end if;
  if position('نفذ من المخزون' in d) = 0 then
    d := replace(d, m, m || E'\n      -- an option the admin marked out of stock (out = true) can''t be ordered\n      if (v_o->>''out'') = ''true'' then raise exception ''% (%) نفذ من المخزون، اختار حاجة تانية'', v_o->>''n'', p.name; end if;');
    execute d;
  end if;
end $$;
