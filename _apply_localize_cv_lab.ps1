$ctx = 'job_gate_seekers/src/contexts/LanguageContext.tsx'
$cv  = 'job_gate_seekers/src/pages/CVLabPage.tsx'

$ctxContent = Get-Content -Raw $ctx
if ($ctxContent -notmatch 'atsScore') {
  $nl = "`r`n"
  $enTarget = '    recommendations: "Recommendations",' + $nl
  $enTargetLF = '    recommendations: "Recommendations",' + "`n"
  $arTarget = '    recommendations: "????????",' + $nl
  $arTargetLF = '    recommendations: "????????",' + "`n"

  $enReplace = '    recommendations: "Recommendations",' + $nl +
    '    atsScore: "ATS Score",' + $nl +
    '    experienceYears: "Experience",' + $nl +
    '    keySkills: "Key Skills",' + $nl +
    '    yearsSuffix: "y",' + $nl

  $arReplace = '    recommendations: "????????",' + $nl +
    '    atsScore: "???? ATS",' + $nl +
    '    experienceYears: "??????",' + $nl +
    '    keySkills: "???????? ????????",' + $nl +
    '    yearsSuffix: "???",' + $nl

  if ($ctxContent.Contains($enTarget)) { $ctxContent = $ctxContent.Replace($enTarget, $enReplace) }
  if ($ctxContent.Contains($enTargetLF)) { $ctxContent = $ctxContent.Replace($enTargetLF, $enReplace) }
  if ($ctxContent.Contains($arTarget)) { $ctxContent = $ctxContent.Replace($arTarget, $arReplace) }
  if ($ctxContent.Contains($arTargetLF)) { $ctxContent = $ctxContent.Replace($arTargetLF, $arReplace) }

  Set-Content -Path $ctx -Value $ctxContent -NoNewline
}

$cvContent = Get-Content -Raw $cv
$cvContent = $cvContent -replace '<p className="text-xs text-\[var\(--text-muted\)\]">ATS Score</p>', '<p className="text-xs text-[var(--text-muted)]">{t("atsScore")}</p>'
$cvContent = $cvContent -replace '<p className="text-xs text-\[var\(--text-muted\)\]">Experience</p>', '<p className="text-xs text-[var(--text-muted)]">{t("experienceYears")}</p>'
$cvContent = $cvContent -replace '<p className="mb-2 text-sm font-semibold">Key Skills</p>', '<p className="mb-2 text-sm font-semibold">{t("keySkills")}</p>'
$cvContent = $cvContent -replace '\$\{experience\}y', '${experience}${t("yearsSuffix")}'
Set-Content -Path $cv -Value $cvContent -NoNewline
