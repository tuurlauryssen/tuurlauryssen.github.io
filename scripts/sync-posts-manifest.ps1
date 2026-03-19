<#
  File role: Rebuilds the local post manifest from the generated article files in /posts.
  Project relation: Keeps assets/data/posts.json aligned with the actual HTML files
  that exist in /posts/interviews and /posts/ideas.
#>

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$postsRoot = Join-Path $repoRoot 'posts'
$postsDataPath = Join-Path $repoRoot 'assets\data\posts.json'
$postsDataJsPath = Join-Path $repoRoot 'assets\data\posts-data.js'

function Get-ExistingManifestLookup {
  if (-not (Test-Path $postsDataPath)) {
    return @{}
  }

  $raw = Get-Content -Path $postsDataPath -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return @{}
  }

  $lookup = @{}
  foreach ($entry in @($raw | ConvertFrom-Json)) {
    $lookup["$($entry.language)|$($entry.slug)"] = $entry
  }

  return $lookup
}

function Get-RegexValue {
  param(
    [string]$InputText,
    [string]$Pattern
  )

  $match = [regex]::Match(
    $InputText,
    $Pattern,
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  if ($match.Success) {
    return [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value.Trim())
  }

  return ''
}

function Get-PostEntryFromFile {
  param(
    [System.IO.FileInfo]$File,
    [hashtable]$ExistingManifestLookup
  )

  $relativePath = $File.FullName.Substring($repoRoot.Length).TrimStart('\').Replace('\', '/')
  $pathParts = $relativePath -split '/'

  if ($pathParts.Length -lt 4) {
    return $null
  }

  $typeDirectory = $pathParts[1]
  $language = $pathParts[2]
  $slug = [System.IO.Path]::GetFileNameWithoutExtension($File.Name)
  $type = if ($typeDirectory -eq 'interviews') { 'interview' } else { 'learned' }
  $html = Get-Content -Path $File.FullName -Raw
  $existingEntry = $ExistingManifestLookup["$language|$slug"]

  $title = Get-RegexValue -InputText $html -Pattern '<title>(.*?)</title>'
  $title = $title -replace '\s+\|\s+INSPIRE\s*$', ''
  $excerpt = Get-RegexValue -InputText $html -Pattern '<meta[^>]+name="description"[^>]+content="([^"]+)"'
  $image = Get-RegexValue -InputText $html -Pattern '<div class="article-cover">\s*<img[^>]+src="([^"]+)"'
  $sourceUrl = Get-RegexValue -InputText $html -Pattern '<a class="article-source-link"[^>]+href="([^"]+)"'
  $pubDate = Get-RegexValue -InputText $html -Pattern '<time class="article-date-line" datetime="([^"]+)"'
  $visibility = Get-RegexValue -InputText $html -Pattern '<meta[^>]+name="inspire:visibility"[^>]+content="([^"]+)"'
  if ($visibility -ne 'hidden' -and $visibility -ne 'public') {
    $visibility = if ($existingEntry -and $existingEntry.visibility -eq 'hidden') { 'hidden' } else { 'public' }
  }

  return [PSCustomObject]@{
    title = $title
    slug = $slug
    language = $language
    type = $type
    pubDate = $pubDate
    updatedAt = $File.LastWriteTimeUtc.ToString('o')
    excerpt = $excerpt
    image = $image
    sourceUrl = $sourceUrl
    path = $relativePath
    visibility = $visibility
    categories = @()
  }
}

function Get-InterviewNumber {
  param($Entry)

  if ($Entry.type -ne 'interview') {
    return $null
  }

  $match = [regex]::Match([string]$Entry.title, '^(\d+)\.\s*')
  if ($match.Success) {
    return [int]$match.Groups[1].Value
  }

  return $null
}

$existingManifestLookup = Get-ExistingManifestLookup
$postFiles = Get-ChildItem -Path $postsRoot -Recurse -File -Filter *.html | Where-Object {
  $_.FullName -notmatch '\\posts\\raw\\'
}

$entries = @()
foreach ($file in $postFiles) {
  $entry = Get-PostEntryFromFile -File $file -ExistingManifestLookup $existingManifestLookup
  if ($null -ne $entry) {
    $entries += $entry
  }
}

$sortedEntries = @(
  $entries |
    Sort-Object -Property @{
      Expression = 'updatedAt'
      Descending = $true
    }, @{
      Expression = { Get-InterviewNumber $_ }
      Descending = $true
    }, @{
      Expression = 'title'
      Descending = $false
    }
)

ConvertTo-Json -InputObject $sortedEntries -Depth 5 | Set-Content -Path $postsDataPath -Encoding UTF8

$postsDataJsContent = @"
/*
  File role: Exposes the local posts manifest as an in-page JavaScript object.
  Project relation: Lets the homepage and archive render posts without waiting on a
  separate JSON fetch, matching the site's earlier faster load path.
*/

window.INSPIRE_LOCAL_POSTS = $(ConvertTo-Json -InputObject $sortedEntries -Depth 5);
"@

$postsDataJsContent | Set-Content -Path $postsDataJsPath -Encoding UTF8

Write-Host "Synced manifest with $($sortedEntries.Count) post file(s)."
Write-Host "Updated: $postsDataPath"
Write-Host "Updated: $postsDataJsPath"
