param([string]$Queue, [string]$OutputDirectory, [string]$Encoder)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = -1
$rows = Get-Content -LiteralPath $Queue -Raw -Encoding UTF8 | ConvertFrom-Json
$count = 0
try {
  foreach ($row in $rows) {
    $wav = Join-Path $OutputDirectory ($row.id + '.wav')
    $mp3 = Join-Path $OutputDirectory ($row.id + '.mp3')
    $synth.SelectVoice($row.voice)
    $synth.SetOutputToWaveFile($wav)
    $escaped = [System.Security.SecurityElement]::Escape($row.text)
    if ($row.lang -eq 'en') {
      # Chinese characters remain Chinese in bilingual literacy prompts.
      $escaped = [regex]::Replace($escaped, '[\p{IsCJKUnifiedIdeographs}]+', '<voice name="Microsoft Huihui Desktop">$0</voice>')
    }
    $culture = if ($row.lang -eq 'en') { 'en-US' } else { 'zh-CN' }
    $synth.SpeakSsml('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="' + $culture + '">' + $escaped + '</speak>')
    $synth.SetOutputToNull()
    & $Encoder -hide_banner -loglevel error -y -i $wav -af 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-20:TP=-3:LRA=7' -ac 1 -ar 24000 -b:a 48k $mp3
    if ($LASTEXITCODE -ne 0) { throw "Audio encoding failed: $($row.id)" }
    Remove-Item -LiteralPath $wav
    $count++
    if ($count % 40 -eq 0) { Write-Output "Recorded $count / $($rows.Count)" }
  }
} finally { $synth.Dispose() }
