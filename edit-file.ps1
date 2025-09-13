<# edit-file.ps1
Search from this script's folder downward for a file by exact/partial name,
ignoring case and spaces/hyphens/underscores/dots in comparisons.
Offer a numbered picker, then open the chosen file in Notepad.
#>

# Start from this script's directory
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Path $MyInvocation.MyCommand.Path -Parent }

function Normalize-Name {
    param([string]$s)
    if (-not $s) { return "" }
    # Lowercase and strip spaces, dots, underscores, and hyphens so:
    # "README", "Read Me", "read-me", "read_me", "read.me" all normalize to "readme"
    return ($s.ToLower() -replace '[\s._-]+','')
}

function Get-CandidateFiles {
    param(
        [Parameter(Mandatory)][string]$Query,
        [Parameter(Mandatory)][string]$Root
    )

    $allFiles = Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue
    if (-not $allFiles) { return @() }

    $hasExt      = [System.IO.Path]::GetExtension($Query) -ne ''
    $queryBase   = [System.IO.Path]::GetFileNameWithoutExtension($Query)
    $normQ       = Normalize-Name $Query
    $normQBase   = Normalize-Name $queryBase

    # Match rules (case-insensitive + space-tolerant):
    #  1) Exact filename (ieq)
    #  2) Exact base name if no extension given
    #  3) Normalized "contains" on filename (ignore spaces/_/./-)
    #  4) Normalized "contains" on basename (when no ext provided)
    $matches = $allFiles | Where-Object {
        $normName = Normalize-Name $_.Name
        $normBase = Normalize-Name $_.BaseName

        ($_.Name -ieq $Query) -or
        ((-not $hasExt) -and ($_.BaseName -ieq $Query)) -or
        ($normName -like "*$normQ*") -or
        ((-not $hasExt) -and ($normBase -like "*$normQBase*"))
    }

    # De-dupe by full path and sort (shorter path first, then name)
    $unique = $matches | Sort-Object FullName -Unique | Sort-Object { $_.FullName.Length }, Name
    return @($unique)
}

function Pick-FromList {
    param([Parameter(Mandatory)][object[]]$Options)

    if ($Options.Count -eq 1) { return $Options[0] }

    Write-Host ""
    Write-Host "Multiple matches found:`n"
    for ($i = 0; $i -lt $Options.Count; $i++) {
        $n = $i + 1
        Write-Host ("[{0}] {1}" -f $n, $Options[$i].FullName)
    }
    Write-Host ""

    while ($true) {
        $raw = Read-Host "Enter the number to edit (1-$($Options.Count)) or Q to cancel"
        if ($raw -match '^[Qq]$') { return $null }

        [int]$idx = 0
        if ([int]::TryParse($raw, [ref]$idx)) {
            if ($idx -ge 1 -and $idx -le $Options.Count) {
                return $Options[$idx - 1]
            }
        }
        Write-Host "Invalid selection. Try again." -ForegroundColor Yellow
    }
}

function Open-InNotepad {
    param([Parameter(Mandatory)][string]$PathToFile)
    # Always open with Windows Notepad (user asked for default text editing notepad)
    Start-Process -FilePath notepad.exe -ArgumentList @("$PathToFile")
}

# --- MAIN LOOP ---
while ($true) {
    $query = Read-Host "Enter file name (exact or partial, spaces/case ignored), or Q to quit"
    if ($query -match '^[Qq]$') { break }

    $matches = @(Get-CandidateFiles -Query $query -Root $ScriptRoot)
    if (-not $matches -or $matches.Count -eq 0) {
        Write-Host "No files matched '$query' under '$ScriptRoot'." -ForegroundColor Yellow
        continue
    }

    $choice = Pick-FromList -Options $matches
    if ($null -eq $choice) { break }

    if (Test-Path -LiteralPath $choice.FullName) {
        Open-InNotepad -PathToFile $choice.FullName
        break
    } else {
        Write-Host "Selected file no longer exists: $($choice.FullName)" -ForegroundColor Red
    }
}
