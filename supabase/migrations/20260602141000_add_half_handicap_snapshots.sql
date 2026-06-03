alter table golfer_handicap_snapshots
  add column if not exists half_handicap integer;

update golfer_handicap_snapshots
set half_handicap = ceiling(handicap / 2.0)::integer
where half_handicap is null;

alter table golfer_handicap_snapshots
  alter column half_handicap set not null;

alter table golfer_handicap_snapshots
  add constraint golfer_handicap_snapshots_half_handicap_check
  check (half_handicap >= 0);
