$path = 'job_gate_seekers/src/contexts/LanguageContext.tsx'
$content = Get-Content -Raw $path
$lines = $content -split "`r?`n"

$insertAfter = @()
for ($i=0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match '^\s*aiConsultantIntro:') { $insertAfter += $i }
}

if ($insertAfter.Count -ge 1) {
  $extraEn = @(
    '    showSessions: "Show sessions",',
    '    hideSessions: "Hide sessions",',
    '    previewEmpty: "Keep chatting to build your CV.",',
    '    exportDisabledHint: "Generate a preview to enable export.",',
    '    insightsEmpty: "Insights will appear after the AI generates your CV.",' 
  )
  $lines = $lines[0..$insertAfter[0]] + $extraEn + $lines[($insertAfter[0]+1)..($lines.Length-1)]
}

$insertAfter = @()
for ($i=0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match '^\s*aiConsultantIntro:') { $insertAfter += $i }
}

if ($insertAfter.Count -ge 2) {
  $extraAr = @(
    '    showSessions: "??? ???????",',
    '    hideSessions: "????? ???????",',
    '    previewEmpty: "???? ???????? ????? ?????.",',
    '    exportDisabledHint: "?? ?????? ???????? ?????? ???????.",',
    '    insightsEmpty: "????? ????? ??? ?? ???? ?????? ????????? ?????.",' 
  )
  $lines = $lines[0..$insertAfter[1]] + $extraAr + $lines[($insertAfter[1]+1)..($lines.Length-1)]
}

Set-Content -Path $path -Value ($lines -join "`r`n") -NoNewline
