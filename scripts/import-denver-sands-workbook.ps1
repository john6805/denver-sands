param(
  [string]$WorkbookPath = "docs/Denver Sands Golf League (1).xlsx",
  [string]$OutputSqlPath = "supabase/import-denver-sands-workbook.sql",
  [switch]$InspectOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-ZipText {
  param(
    [System.IO.Compression.ZipArchive]$Zip,
    [string]$Path
  )

  $entry = $Zip.GetEntry($Path)
  if ($null -eq $entry) {
    throw "Missing XLSX entry: $Path"
  }

  $reader = [System.IO.StreamReader]::new($entry.Open())
  try {
    return $reader.ReadToEnd()
  }
  finally {
    $reader.Dispose()
  }
}

function Get-Attr {
  param(
    [xml]$Xml,
    [System.Xml.XmlNode]$Node,
    [string]$Name
  )

  $attr = $Node.Attributes.GetNamedItem($Name)
  if ($null -ne $attr) {
    return $attr.Value
  }

  foreach ($candidate in @($Node.Attributes)) {
    if ($candidate.LocalName -eq $Name) {
      return $candidate.Value
    }
  }

  return $null
}

function Convert-ColToIndex {
  param([string]$Column)

  $result = 0
  foreach ($char in $Column.ToUpperInvariant().ToCharArray()) {
    $result = ($result * 26) + ([int][char]$char - [int][char]'A' + 1)
  }
  return $result
}

function Convert-ExcelSerialDate {
  param([double]$Serial)

  return ([datetime]"1899-12-30").AddDays($Serial).ToString("yyyy-MM-dd")
}

function Convert-CellValue {
  param(
    [System.Xml.XmlNode]$Cell,
    [string[]]$SharedStrings
  )

  $type = Get-Attr $null $Cell "t"
  $valueNode = $Cell.SelectSingleNode("*[local-name()='v']")
  if ($null -eq $valueNode) {
    $inlineNode = $Cell.SelectSingleNode("*[local-name()='is']/*[local-name()='t']")
    if ($null -ne $inlineNode) {
      return $inlineNode.InnerText
    }
    return $null
  }

  $raw = $valueNode.InnerText
  if ($type -eq "s") {
    return $SharedStrings[[int]$raw]
  }
  if ($type -eq "b") {
    return $raw -eq "1"
  }
  if ($raw -match "^-?\d+(\.\d+)?$") {
    return [double]$raw
  }
  return $raw
}

function Get-SheetRows {
  param(
    [System.IO.Compression.ZipArchive]$Zip,
    [string]$SheetPath,
    [string[]]$SharedStrings
  )

  [xml]$sheetXml = Read-ZipText $Zip $SheetPath
  $rows = @()
  foreach ($row in $sheetXml.SelectNodes("//*[local-name()='sheetData']/*[local-name()='row']")) {
    $valuesByColumn = @{}
    foreach ($cell in $row.SelectNodes("*[local-name()='c']")) {
      $ref = Get-Attr $null $cell "r"
      if ($ref -notmatch "^([A-Z]+)") {
        continue
      }
      $columnIndex = Convert-ColToIndex $Matches[1]
      $valuesByColumn[$columnIndex] = Convert-CellValue $cell $SharedStrings
    }
    $rows += ,$valuesByColumn
  }
  return $rows
}

function Escape-SqlText {
  param($Value)

  if ($null -eq $Value) {
    return "null"
  }

  $text = [string]$Value
  return "'" + $text.Replace("'", "''") + "'"
}

function Format-SqlDate {
  param($Value)

  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) {
    return "null::date"
  }
  return (Escape-SqlText $Value) + "::date"
}

function Format-SqlTime {
  param($Value)

  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value) -or [string]$Value -eq "n/a" -or [string]$Value -eq "-") {
    return "null::time"
  }

  $text = [string]$Value
  if ($Value -is [double]) {
    $totalMinutes = [int][math]::Round($Value * 24 * 60)
    $hour = [int][math]::Floor($totalMinutes / 60)
    $minute = [int]($totalMinutes % 60)
    if ($hour -ge 1 -and $hour -le 7) {
      $hour += 12
    }
    $text = "{0:D2}:{1:D2}" -f $hour, $minute
  }
  elseif ($text -match "^\d{3,4}$") {
    $padded = $text.PadLeft(4, "0")
    $hour = [int]$padded.Substring(0, 2)
    $minute = [int]$padded.Substring(2, 2)
    if ($hour -ge 1 -and $hour -le 7) {
      $hour += 12
    }
    $text = "{0:D2}:{1:D2}" -f $hour, $minute
  }

  return (Escape-SqlText $text) + "::time"
}

function Format-SqlNumeric {
  param($Value, [string]$Cast = "numeric")

  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value) -or [string]$Value -eq "-") {
    return "null::$Cast"
  }
  $parsed = 0.0
  if (-not [double]::TryParse([string]$Value, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)) {
    return "null::$Cast"
  }
  return $parsed.ToString([Globalization.CultureInfo]::InvariantCulture) + "::$Cast"
}

function Format-SqlInteger {
  param($Value)

  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value) -or [string]$Value -eq "-") {
    return "null::integer"
  }
  $parsed = 0.0
  if (-not [double]::TryParse([string]$Value, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)) {
    return "null::integer"
  }
  return ([int]$parsed).ToString([Globalization.CultureInfo]::InvariantCulture)
}

function Test-Numeric {
  param($Value)

  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value) -or [string]$Value -eq "-") {
    return $false
  }

  $parsed = 0.0
  return [double]::TryParse([string]$Value, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)
}

function Normalize-CourseName {
  param($Value)

  if ($null -eq $Value) {
    return $null
  }

  $text = ([string]$Value).Trim()
  if ($text -eq "" -or $text -eq "-") {
    return $null
  }

  switch -Regex ($text) {
    "^Indian\s*Tree$" { return "Indian Tree" }
    "^Walnut\s+Creet$" { return "Walnut Creek" }
    default { return $text }
  }
}

function Normalize-Attendance {
  param($Value)

  $text = if ($null -eq $Value) { "" } else { ([string]$Value).Trim().ToLowerInvariant() }
  switch ($text) {
    "yes" { return "played" }
    "confirmed" { return "confirmed" }
    "no" { return "no_show" }
    "unk" { return "unknown" }
    "unknown" { return "unknown" }
    default { return "unknown" }
  }
}

function Normalize-WeeklyAttendance {
  param($Value, $Gross, $Net, $Putts)

  $status = Normalize-Attendance $Value
  if ($status -eq "confirmed" -and ((Test-Numeric $Gross) -or (Test-Numeric $Net) -or (Test-Numeric $Putts))) {
    return "played"
  }
  return $status
}

function Normalize-MatchResult {
  param($Value)

  $text = if ($null -eq $Value) { "" } else { ([string]$Value).Trim().ToLowerInvariant() }
  switch ($text) {
    "won" { return "won" }
    "tied" { return "tied" }
    "lost" { return "lost" }
    default { return "not_applicable" }
  }
}

function Round-HalfHandicap {
  param($Value)

  if (-not (Test-Numeric $Value)) {
    return $null
  }
  return [int][math]::Ceiling([double]$Value / 2)
}

$resolvedWorkbookPath = Resolve-Path $WorkbookPath
$file = [System.IO.File]::OpenRead($resolvedWorkbookPath)
try {
  $zip = [System.IO.Compression.ZipArchive]::new($file, [System.IO.Compression.ZipArchiveMode]::Read)
  try {
    [xml]$workbookXml = Read-ZipText $zip "xl/workbook.xml"
    [xml]$relsXml = Read-ZipText $zip "xl/_rels/workbook.xml.rels"
    [xml]$sharedStringsXml = Read-ZipText $zip "xl/sharedStrings.xml"

    $sharedStrings = @()
    foreach ($si in $sharedStringsXml.SelectNodes("//*[local-name()='si']")) {
      $parts = @()
      foreach ($textNode in $si.SelectNodes(".//*[local-name()='t']")) {
        $parts += $textNode.InnerText
      }
      $sharedStrings += ($parts -join "")
    }

    $relTargets = @{}
    foreach ($rel in $relsXml.SelectNodes("//*[local-name()='Relationship']")) {
      $relTargets[(Get-Attr $null $rel "Id")] = Get-Attr $null $rel "Target"
    }

    $sheetPaths = @{}
    foreach ($sheet in $workbookXml.SelectNodes("//*[local-name()='sheet']")) {
      $name = Get-Attr $null $sheet "name"
      $relId = Get-Attr $null $sheet "id"
      if ($null -eq $relId) {
        foreach ($attr in @($sheet.Attributes)) {
          if ($attr.LocalName -eq "id") {
            $relId = $attr.Value
          }
        }
      }
      $target = $relTargets[$relId]
      $sheetPaths[$name] = "xl/" + $target.TrimStart("/")
    }

    $scheduleRows = Get-SheetRows $zip $sheetPaths["Schedule"] $sharedStrings
    $weeklyRows = Get-SheetRows $zip $sheetPaths["Weekly Point Data"] $sharedStrings
    $matchRows = Get-SheetRows $zip $sheetPaths["0512 Match Generator"] $sharedStrings
  }
  finally {
    $zip.Dispose()
  }
}
finally {
  $file.Dispose()
}

$schedule = @()
foreach ($row in $scheduleRows | Select-Object -Skip 1) {
  if (-not $row.ContainsKey(1) -or $null -eq $row[1]) {
    continue
  }

  $date = Convert-ExcelSerialDate $row[1]
  $weekNumber = $schedule.Count + 1
  $courseName = Normalize-CourseName $row[2]
  $times = @($row[3], $row[4], $row[5]) | Where-Object { $null -ne $_ -and [string]$_ -ne "" -and [string]$_ -ne "n/a" -and [string]$_ -ne "-" }

  $schedule += [pscustomobject]@{
    WeekCode = "W{0:D2}" -f $weekNumber
    PlayDate = $date
    Course = $courseName
    Times = $times
  }
}

$weekly = @()
foreach ($row in $weeklyRows | Select-Object -Skip 2) {
  if (-not $row.ContainsKey(1) -or -not $row.ContainsKey(5) -or $null -eq $row[1] -or $null -eq $row[5]) {
    continue
  }

  $weekCode = ([string]$row[1]).Trim()
  if ($weekCode -notmatch "^W\d{2}$") {
    continue
  }

  $weekly += [pscustomobject]@{
    WeekCode = $weekCode
    PlayDate = Convert-ExcelSerialDate $row[2]
    Course = Normalize-CourseName $row[3]
    Golfer = ([string]$row[5]).Trim()
    Attendance = Normalize-WeeklyAttendance $row[6] $row[13] $row[15] $row[14]
    MatchResult = Normalize-MatchResult $row[12]
    Handicap = $row[11]
    Gross = $row[13]
    Putts = $row[14]
    Net = $row[15]
  }
}

if ($InspectOnly) {
  Write-Output "Sheets: $((($sheetPaths.Keys | Sort-Object) -join ', '))"
  Write-Output "Schedule sample:"
  $scheduleRows | Select-Object -First 6 | ForEach-Object {
    $ordered = $_.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name)=$($_.Value)" }
    Write-Output ("  " + ($ordered -join " | "))
  }
  Write-Output "Weekly Point Data sample:"
  $weeklyRows | Select-Object -First 15 | ForEach-Object {
    $ordered = $_.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name)=$($_.Value)" }
    Write-Output ("  " + ($ordered -join " | "))
  }
  Write-Output "Parsed weekly sample:"
  $weekly | Select-Object -First 15 | Format-Table -AutoSize | Out-String | Write-Output
  exit 0
}

$activeGolfers = $weekly |
  Group-Object Golfer |
  ForEach-Object { $_.Name } |
  Where-Object { $_ -ne "" } |
  Sort-Object

$currentHandicaps = @{}
foreach ($golfer in $activeGolfers) {
  $last = $weekly |
    Where-Object { $_.Golfer -eq $golfer -and (Test-Numeric $_.Handicap) } |
    Sort-Object WeekCode |
    Select-Object -Last 1
  if ($null -ne $last) {
    $currentHandicaps[$golfer] = [double]$last.Handicap
  }
}

$weeklyEventOverrides = @{}
foreach ($group in ($weekly | Group-Object WeekCode)) {
  $first = $group.Group | Select-Object -First 1
  $weeklyEventOverrides[$group.Name] = [pscustomobject]@{
    WeekCode = $group.Name
    PlayDate = $first.PlayDate
    Course = $first.Course
  }
}

foreach ($override in $weeklyEventOverrides.Values) {
  $existing = $schedule | Where-Object { $_.WeekCode -eq $override.WeekCode } | Select-Object -First 1
  if ($null -ne $existing) {
    $existing.PlayDate = $override.PlayDate
    $existing.Course = $override.Course
  }
  else {
    $schedule += [pscustomobject]@{
      WeekCode = $override.WeekCode
      PlayDate = $override.PlayDate
      Course = $override.Course
      Times = @()
    }
  }
}

$schedule = $schedule | Sort-Object WeekCode

$matchSeeds = @()
$knownW01Matches = @(
  @{ Time = "17:40"; Seed = "workbook-0512-import-1740"; Players = @("Bryan", "Joe", "John") },
  @{ Time = "17:50"; Seed = "workbook-0512-import-1750"; Players = @("Brandt", "Bird", "Hunter") },
  @{ Time = "18:00"; Seed = "workbook-0512-import-1800"; Players = @("GT", "Zach", "Joey") }
)
foreach ($match in $knownW01Matches) {
  $side = 1
  foreach ($player in $match.Players) {
    $resultRow = $weekly | Where-Object { $_.WeekCode -eq "W01" -and $_.Golfer -eq $player } | Select-Object -First 1
    $matchSeeds += [pscustomobject]@{
      StartsAt = $match.Time
      Seed = $match.Seed
      SideNumber = $side
      Golfer = $player
      Handicap = $resultRow.Handicap
      HalfHandicap = Round-HalfHandicap $resultRow.Handicap
      MatchResult = $resultRow.MatchResult
    }
    $side += 1
  }
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("begin;")
$lines.Add("")
$lines.Add("-- Generated from $WorkbookPath on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz").")
$lines.Add("")

$golferValues = $activeGolfers | ForEach-Object { "  ($((Escape-SqlText $_)), true)" }
$lines.Add("insert into golfers (display_name, active)")
$lines.Add("values")
$lines.Add(($golferValues -join ",`n") + "")
$lines.Add("on conflict (display_name) do update")
$lines.Add("set active = excluded.active, updated_at = now();")
$lines.Add("")

$courseValues = $schedule |
  Where-Object { $null -ne $_.Course } |
  Select-Object -ExpandProperty Course -Unique |
  Sort-Object |
  ForEach-Object { "  ($((Escape-SqlText $_)), true)" }
if ($courseValues.Count -gt 0) {
  $lines.Add("insert into courses (name, active)")
  $lines.Add("values")
  $lines.Add(($courseValues -join ",`n") + "")
  $lines.Add("on conflict (name) do update")
  $lines.Add("set active = excluded.active, updated_at = now();")
  $lines.Add("")
}

$seasonGolferValues = $activeGolfers | ForEach-Object {
  $handicap = if ($currentHandicaps.ContainsKey($_)) { Format-SqlNumeric $currentHandicaps[$_] } else { "null::numeric" }
  "    ($((Escape-SqlText $_)), $handicap)"
}
$lines.Add("with current_season as (")
$lines.Add("  select id from seasons where year = 2026")
$lines.Add("), seed_golfers(display_name, handicap) as (")
$lines.Add("  values")
$lines.Add(($seasonGolferValues -join ",`n"))
$lines.Add(")")
$lines.Add("insert into season_golfers (season_id, golfer_id, starting_handicap, current_handicap, joined_on)")
$lines.Add("select current_season.id, golfers.id, seed_golfers.handicap, seed_golfers.handicap, '2026-05-12'::date")
$lines.Add("from seed_golfers")
$lines.Add("cross join current_season")
$lines.Add("join golfers on golfers.display_name = seed_golfers.display_name")
$lines.Add("on conflict (season_id, golfer_id) do update")
$lines.Add("set current_handicap = excluded.current_handicap, updated_at = now();")
$lines.Add("")

$eventValues = $schedule | ForEach-Object {
  $event = $_
  $completedRows = @($weekly | Where-Object { $_.WeekCode -eq $event.WeekCode -and $_.Attendance -in @("played", "no_show") })
  $status = if ($completedRows.Count -gt 0) { "completed" } else { "planned" }
  "    ($((Escape-SqlText $event.WeekCode)), $(Format-SqlDate $event.PlayDate), $((Escape-SqlText $event.Course)), '$status'::week_status)"
}
$lines.Add("with current_season as (")
$lines.Add("  select id from seasons where year = 2026")
$lines.Add("), seed_weeks(week_code, play_date, course_name, status) as (")
$lines.Add("  values")
$lines.Add(($eventValues -join ",`n"))
$lines.Add(")")
$lines.Add("insert into weekly_events (season_id, week_code, play_date, course_id, status)")
$lines.Add("select current_season.id, seed_weeks.week_code, seed_weeks.play_date, courses.id, seed_weeks.status")
$lines.Add("from seed_weeks")
$lines.Add("cross join current_season")
$lines.Add("left join courses on courses.name = seed_weeks.course_name")
$lines.Add("on conflict (season_id, week_code) do update")
$lines.Add("set play_date = excluded.play_date, course_id = excluded.course_id, status = excluded.status, updated_at = now();")
$lines.Add("")

$teeValues = @()
foreach ($event in $schedule) {
  $sort = 1
  foreach ($time in $event.Times) {
    $teeValues += "    ($((Escape-SqlText $event.WeekCode)), $(Format-SqlTime $time), $sort)"
    $sort += 1
  }
}
if ($teeValues.Count -gt 0) {
  $teeValuesSql = $teeValues -join ",`n"
  $lines.Add("with seed_tee_times(week_code, starts_at, sort_order) as (")
  $lines.Add("  values")
  $lines.Add($teeValuesSql)
  $lines.Add("), deletable_tee_times as (")
  $lines.Add("  select weekly_tee_times.id")
  $lines.Add("  from seed_tee_times")
  $lines.Add("  join seasons on seasons.year = 2026")
  $lines.Add("  join weekly_events on weekly_events.season_id = seasons.id and weekly_events.week_code = seed_tee_times.week_code")
  $lines.Add("  join weekly_tee_times on weekly_tee_times.weekly_event_id = weekly_events.id")
  $lines.Add("  left join weekly_matches on weekly_matches.tee_time_id = weekly_tee_times.id")
  $lines.Add("  where weekly_matches.id is null")
  $lines.Add(")")
  $lines.Add("delete from weekly_tee_times")
  $lines.Add("using deletable_tee_times")
  $lines.Add("where weekly_tee_times.id = deletable_tee_times.id;")
  $lines.Add("")
  $lines.Add("with seed_tee_times(week_code, starts_at, sort_order) as (")
  $lines.Add("  values")
  $lines.Add($teeValuesSql)
  $lines.Add(")")
  $lines.Add("insert into weekly_tee_times (weekly_event_id, starts_at, sort_order)")
  $lines.Add("select weekly_events.id, seed_tee_times.starts_at, seed_tee_times.sort_order")
  $lines.Add("from seed_tee_times")
  $lines.Add("join seasons on seasons.year = 2026")
  $lines.Add("join weekly_events on weekly_events.season_id = seasons.id and weekly_events.week_code = seed_tee_times.week_code")
  $lines.Add("on conflict (weekly_event_id, sort_order) do update")
  $lines.Add("set starts_at = excluded.starts_at, updated_at = now();")
  $lines.Add("")
}

$rsvpValues = $weekly | ForEach-Object {
  "    ($((Escape-SqlText $_.WeekCode)), $((Escape-SqlText $_.Golfer)), '$($_.Attendance)'::attendance_status)"
}
$lines.Add("with seed_rsvps(week_code, display_name, status) as (")
$lines.Add("  values")
$lines.Add(($rsvpValues -join ",`n"))
$lines.Add(")")
$lines.Add("insert into weekly_rsvps (weekly_event_id, golfer_id, status)")
$lines.Add("select weekly_events.id, golfers.id, seed_rsvps.status")
$lines.Add("from seed_rsvps")
$lines.Add("join seasons on seasons.year = 2026")
$lines.Add("join weekly_events on weekly_events.season_id = seasons.id and weekly_events.week_code = seed_rsvps.week_code")
$lines.Add("join golfers on golfers.display_name = seed_rsvps.display_name")
$lines.Add("on conflict (weekly_event_id, golfer_id) do update")
$lines.Add("set status = excluded.status, updated_at = now();")
$lines.Add("")

$snapshotValues = $weekly |
  Where-Object { Test-Numeric $_.Handicap } |
  ForEach-Object {
    "    ($((Escape-SqlText $_.WeekCode)), $((Escape-SqlText $_.Golfer)), $(Format-SqlNumeric $_.Handicap), $(Round-HalfHandicap $_.Handicap))"
  }
$lines.Add("with seed_snapshots(week_code, display_name, handicap, half_handicap) as (")
$lines.Add("  values")
$lines.Add(($snapshotValues -join ",`n"))
$lines.Add(")")
$lines.Add("insert into golfer_handicap_snapshots (season_id, golfer_id, effective_week_id, handicap, half_handicap, source)")
$lines.Add("select seasons.id, golfers.id, weekly_events.id, seed_snapshots.handicap, seed_snapshots.half_handicap, 'import'::handicap_snapshot_source")
$lines.Add("from seed_snapshots")
$lines.Add("join seasons on seasons.year = 2026")
$lines.Add("join weekly_events on weekly_events.season_id = seasons.id and weekly_events.week_code = seed_snapshots.week_code")
$lines.Add("join golfers on golfers.display_name = seed_snapshots.display_name")
$lines.Add("on conflict (season_id, golfer_id, effective_week_id) do update")
$lines.Add("set handicap = excluded.handicap, half_handicap = excluded.half_handicap;")
$lines.Add("")

$matchValues = $knownW01Matches | ForEach-Object {
  "    ($(Format-SqlTime $_.Time), $((Escape-SqlText $_.Seed)))"
}
$lines.Add("with w01 as (")
$lines.Add("  select id from weekly_events where week_code = 'W01' and season_id = (select id from seasons where year = 2026)")
$lines.Add("), seed_matches(starts_at, random_seed) as (")
$lines.Add("  values")
$lines.Add(($matchValues -join ",`n"))
$lines.Add(")")
$lines.Add("insert into weekly_matches (weekly_event_id, tee_time_id, format, status, random_seed, generated_at, published_at, completed_at)")
$lines.Add("select w01.id, weekly_tee_times.id, 'one_v_one_v_one', 'draft', seed_matches.random_seed, '2026-05-12 17:00:00-06'::timestamptz, '2026-05-12 17:00:00-06'::timestamptz, '2026-05-12 20:00:00-06'::timestamptz")
$lines.Add("from seed_matches")
$lines.Add("cross join w01")
$lines.Add("join weekly_tee_times on weekly_tee_times.weekly_event_id = w01.id and weekly_tee_times.starts_at = seed_matches.starts_at")
$lines.Add("where not exists (select 1 from weekly_matches where weekly_matches.weekly_event_id = w01.id and weekly_matches.random_seed = seed_matches.random_seed);")
$lines.Add("")

$sideValues = $matchSeeds | ForEach-Object {
  "    ($((Escape-SqlText $_.Seed)), $($_.SideNumber), $((Escape-SqlText $_.Golfer)), $($_.HalfHandicap), '$($_.MatchResult)'::match_result)"
}
$lines.Add("with seed_sides(random_seed, side_number, display_name, side_half_handicap, result) as (")
$lines.Add("  values")
$lines.Add(($sideValues -join ",`n"))
$lines.Add(")")
$lines.Add("insert into weekly_match_sides (match_id, side_number, side_half_handicap, result)")
$lines.Add("select weekly_matches.id, seed_sides.side_number, seed_sides.side_half_handicap, seed_sides.result")
$lines.Add("from seed_sides")
$lines.Add("join weekly_matches on weekly_matches.random_seed = seed_sides.random_seed")
$lines.Add("join weekly_events on weekly_events.id = weekly_matches.weekly_event_id")
$lines.Add("join seasons on seasons.id = weekly_events.season_id and seasons.year = 2026")
$lines.Add("on conflict (match_id, side_number) do update")
$lines.Add("set side_half_handicap = excluded.side_half_handicap, result = excluded.result, updated_at = now();")
$lines.Add("")

$participantValues = $matchSeeds | ForEach-Object {
  "    ($((Escape-SqlText $_.Seed)), $($_.SideNumber), $((Escape-SqlText $_.Golfer)), $(Format-SqlNumeric $_.Handicap), $($_.HalfHandicap))"
}
$lines.Add("with seed_participants(random_seed, side_number, display_name, handicap_snapshot, half_handicap_snapshot) as (")
$lines.Add("  values")
$lines.Add(($participantValues -join ",`n"))
$lines.Add(")")
$lines.Add("insert into weekly_match_participants (match_id, match_side_id, golfer_id, handicap_snapshot, half_handicap_snapshot)")
$lines.Add("select weekly_matches.id, weekly_match_sides.id, golfers.id, seed_participants.handicap_snapshot, seed_participants.half_handicap_snapshot")
$lines.Add("from seed_participants")
$lines.Add("join weekly_matches on weekly_matches.random_seed = seed_participants.random_seed")
$lines.Add("join weekly_events on weekly_events.id = weekly_matches.weekly_event_id")
$lines.Add("join seasons on seasons.id = weekly_events.season_id and seasons.year = 2026")
$lines.Add("join weekly_match_sides on weekly_match_sides.match_id = weekly_matches.id and weekly_match_sides.side_number = seed_participants.side_number")
$lines.Add("join golfers on golfers.display_name = seed_participants.display_name")
$lines.Add("on conflict (match_id, golfer_id) do update")
$lines.Add("set match_side_id = excluded.match_side_id, handicap_snapshot = excluded.handicap_snapshot, half_handicap_snapshot = excluded.half_handicap_snapshot, updated_at = now();")
$lines.Add("")

$lines.Add("update weekly_matches")
$lines.Add("set status = 'completed', updated_at = now()")
$lines.Add("where random_seed in ($(($knownW01Matches | ForEach-Object { Escape-SqlText $_.Seed }) -join ", "))")
$lines.Add("and weekly_event_id = (select weekly_events.id from weekly_events join seasons on seasons.id = weekly_events.season_id where seasons.year = 2026 and weekly_events.week_code = 'W01');")
$lines.Add("")

$resultValues = $weekly | ForEach-Object {
  $gross = if ($_.Attendance -eq "played") { Format-SqlInteger $_.Gross } else { "null::integer" }
  $net = if ($_.Attendance -eq "played") { Format-SqlInteger $_.Net } else { "null::integer" }
  $putts = if ($_.Attendance -eq "played") { Format-SqlInteger $_.Putts } else { "null::integer" }
  "    ($((Escape-SqlText $_.WeekCode)), $((Escape-SqlText $_.Golfer)), '$($_.Attendance)'::attendance_status, '$($_.MatchResult)'::match_result, $(Format-SqlNumeric $_.Handicap), $gross, $net, $putts)"
}
$lines.Add("with seed_results(week_code, display_name, attendance_status, match_result, handicap_snapshot, gross_score, net_score, putts) as (")
$lines.Add("  values")
$lines.Add(($resultValues -join ",`n"))
$lines.Add(")")
$lines.Add("insert into weekly_results (weekly_event_id, golfer_id, attendance_status, match_side_id, match_result, handicap_snapshot, gross_score, net_score, putts)")
$lines.Add("select weekly_events.id, golfers.id, seed_results.attendance_status, weekly_match_sides.id, seed_results.match_result, seed_results.handicap_snapshot, seed_results.gross_score, seed_results.net_score, seed_results.putts")
$lines.Add("from seed_results")
$lines.Add("join seasons on seasons.year = 2026")
$lines.Add("join weekly_events on weekly_events.season_id = seasons.id and weekly_events.week_code = seed_results.week_code")
$lines.Add("join golfers on golfers.display_name = seed_results.display_name")
$lines.Add("left join weekly_match_participants on weekly_match_participants.golfer_id = golfers.id")
$lines.Add("left join weekly_matches on weekly_matches.id = weekly_match_participants.match_id and weekly_matches.weekly_event_id = weekly_events.id")
$lines.Add("left join weekly_match_sides on weekly_match_sides.id = weekly_match_participants.match_side_id")
$lines.Add("on conflict (weekly_event_id, golfer_id) do update")
$lines.Add("set attendance_status = excluded.attendance_status, match_side_id = excluded.match_side_id, match_result = excluded.match_result, handicap_snapshot = excluded.handicap_snapshot, gross_score = excluded.gross_score, net_score = excluded.net_score, putts = excluded.putts, updated_at = now();")
$lines.Add("")
$lines.Add("commit;")

$outputDirectory = Split-Path $OutputSqlPath -Parent
if ($outputDirectory) {
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
}
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $OutputSqlPath), ($lines -join "`r`n"), $utf8NoBom)

$completedWeeks = ($weekly | Where-Object { $_.Attendance -in @("played", "no_show") } | Select-Object -ExpandProperty WeekCode -Unique).Count
Write-Output "Generated $OutputSqlPath"
Write-Output "Golfers: $($activeGolfers.Count)"
Write-Output "Schedule weeks: $($schedule.Count)"
Write-Output "Weekly result rows: $($weekly.Count)"
Write-Output "Completed weeks in workbook: $completedWeeks"
