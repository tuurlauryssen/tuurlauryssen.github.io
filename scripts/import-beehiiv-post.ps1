param(
  [string]$HtmlPath,
  [string]$RawHtml,
  [string]$Title,
  [ValidateSet('en', 'nl')]
  [string]$Language,
  [ValidateSet('interview', 'learned')]
  [string]$Type,
  [string]$Date,
  [string]$Excerpt,
  [string]$Image,
  [string]$SourceUrl
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$postsDataPath = Join-Path $repoRoot 'assets\data\posts.json'
$postsDataJsPath = Join-Path $repoRoot 'assets\data\posts-data.js'
$authorsDataPath = Join-Path $repoRoot 'assets\data\authors.json'

function Get-TypeDirectoryName {
  param([string]$Type)

  if ($Type -eq 'interview') {
    return 'interviews'
  }

  return 'ideas'
}

function Prompt-Value {
  param(
    [string]$Label,
    [string]$Default = '',
    [switch]$AllowEmpty
  )

  if ($Default) {
    $value = Read-Host "$Label [$Default]"
    if ([string]::IsNullOrWhiteSpace($value)) {
      return $Default
    }

    return $value.Trim()
  }

  if ($AllowEmpty) {
    $value = Read-Host $Label
    return $value.Trim()
  }

  do {
    $value = Read-Host $Label
  } while ([string]::IsNullOrWhiteSpace($value))

  return $value.Trim()
}

function Read-MultilineInput {
  param(
    [string]$Label,
    [string]$EndMarker = 'ENDHTML'
  )

  Write-Host $Label
  Write-Host "Paste the raw HTML below. Type $EndMarker on its own line when finished."

  $lines = New-Object System.Collections.Generic.List[string]
  while ($true) {
    $line = Read-Host
    if ($line -eq $EndMarker) {
      break
    }
    $lines.Add($line)
  }

  return ($lines -join [Environment]::NewLine).Trim()
}

function Convert-ToSlug {
  param([string]$Value)

  $slug = $Value.ToLowerInvariant()
  $slug = $slug -replace '[^a-z0-9]+', '-'
  $slug = $slug.Trim('-')

  if ([string]::IsNullOrWhiteSpace($slug)) {
    throw 'Unable to generate a slug from the title.'
  }

  return $slug
}

function Format-DisplayDate {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ''
  }

  try {
    return ([datetime]$Value).ToString('MMM d, yyyy', [System.Globalization.CultureInfo]::InvariantCulture)
  }
  catch {
    return $Value
  }
}

function Decode-Html {
  param([string]$Value)

  if ($null -eq $Value) {
    return ''
  }

  return [System.Net.WebUtility]::HtmlDecode($Value.Trim())
}

function Get-RegexValue {
  param(
    [string]$InputText,
    [string]$Pattern
  )

  $match = [regex]::Match($InputText, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if ($match.Success) {
    return Decode-Html $match.Groups[1].Value
  }

  return ''
}

function Get-RegexValues {
  param(
    [string]$InputText,
    [string]$Pattern
  )

  $matches = [regex]::Matches($InputText, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
  $values = @()

  foreach ($match in $matches) {
    if ($match.Success) {
      $values += $match.Groups[1].Value
    }
  }

  return $values
}

function Remove-HtmlNodes {
  param(
    [string]$Html,
    [string[]]$Tags
  )

  $cleaned = $Html
  foreach ($tag in $Tags) {
    $pattern = "<$tag\b[^>]*>.*?</$tag>"
    $cleaned = [regex]::Replace(
      $cleaned,
      $pattern,
      '',
      [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
  }

  return $cleaned
}

function Remove-Attributes {
  param([string]$Html)

  $withoutData = [regex]::Replace($Html, '\s(data-[\w-]+|aria-[\w-]+)="[^"]*"', '', 'IgnoreCase')
  $withoutSingles = [regex]::Replace($withoutData, "\s(data-[\w-]+|aria-[\w-]+)='[^']*'", '', 'IgnoreCase')
  $withoutEvents = [regex]::Replace($withoutSingles, '\s(on\w+)="[^"]*"', '', 'IgnoreCase')
  $withoutSingleEvents = [regex]::Replace($withoutEvents, "\s(on\w+)='[^']*'", '', 'IgnoreCase')
  return $withoutSingleEvents
}

function Normalize-ArticleHtml {
  param([string]$Html)

  if ([string]::IsNullOrWhiteSpace($Html)) {
    return ''
  }

  $cleaned = Remove-HtmlNodes -Html $Html -Tags @('script', 'noscript', 'form', 'button', 'header', 'footer', 'nav')
  $cleaned = [regex]::Replace($cleaned, '<!--.*?-->', '', 'Singleline')
  $cleaned = Remove-Attributes -Html $cleaned
  $cleaned = $cleaned -replace '&nbsp;', ' '
  $cleaned = [regex]::Replace($cleaned, '(?is)<(section|div)\b[^>]*>\s*<h[2-4][^>]*>\s*Keep Reading\s*</h[2-4]>\s*.*?</\1>', '')
  $cleaned = [regex]::Replace($cleaned, '(?is)<(section|div)\b[^>]*(recommendedPosts|postComments|comments?)[^>]*>.*?</\1>', '')
  $cleaned = [regex]::Replace($cleaned, '(?is)<(section|div)\b[^>]*>\s*.*?(Add your comment|Load more|View more)\s*.*?</\1>', '')
  $cleaned = [regex]::Replace($cleaned, '\n\s*\n+', "`n", 'Singleline')
  $cleaned = $cleaned.Trim()

  return $cleaned
}

function Get-LongestMatchValue {
  param(
    [string]$Html,
    [string[]]$Patterns
  )

  $bestValue = ''

  foreach ($pattern in $Patterns) {
    $match = [regex]::Match($Html, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($match.Success) {
      $value = $match.Groups[1].Value.Trim()
      if ($value.Length -gt $bestValue.Length) {
        $bestValue = $value
      }
    }
  }

  return $bestValue
}

function Extract-ArticleBody {
  param([string]$Html)

  $htmlWithoutScripts = Remove-HtmlNodes -Html $Html -Tags @('script', 'noscript')
  $bodyStart = $htmlWithoutScripts.IndexOf('<body', [System.StringComparison]::OrdinalIgnoreCase)
  if ($bodyStart -ge 0) {
    $htmlWithoutScripts = $htmlWithoutScripts.Substring($bodyStart)
  }

  $beehiivStartMarker = 'id="content-blocks"'
  $beehiivStartIndex = $htmlWithoutScripts.IndexOf($beehiivStartMarker, [System.StringComparison]::OrdinalIgnoreCase)
  if ($beehiivStartIndex -ge 0) {
    $tagStart = $htmlWithoutScripts.LastIndexOf('<', $beehiivStartIndex)
    if ($tagStart -ge 0) {
      $endCandidates = @()
      foreach ($marker in @('id="bh-comments"', 'recommendedPosts', '>Keep Reading<', '<footer', '</main>')) {
        $markerIndex = $htmlWithoutScripts.IndexOf($marker, $beehiivStartIndex, [System.StringComparison]::OrdinalIgnoreCase)
        if ($markerIndex -gt $beehiivStartIndex) {
          $endCandidates += $markerIndex
        }
      }

      if ($endCandidates.Count -gt 0) {
        $fragmentEnd = ($endCandidates | Measure-Object -Minimum).Minimum
        $body = $htmlWithoutScripts.Substring($tagStart, $fragmentEnd - $tagStart)
        $body = Normalize-ArticleHtml -Html $body
        if (-not [string]::IsNullOrWhiteSpace($body)) {
          return $body
        }
      }
    }
  }

  $candidatePatterns = @(
    '<article\b[^>]*>(.*?)</article>',
    '<main\b[^>]*>(.*?)</main>',
    '<div\b[^>]*class="[^"]*(?:entry-content|post-content|article-content|newsletter-body|content-body|content|markup|prose)[^"]*"[^>]*>(.*?)</div>',
    '<section\b[^>]*class="[^"]*(?:entry-content|post-content|article-content|newsletter-body|content-body|content|markup|prose)[^"]*"[^>]*>(.*?)</section>',
    '<body\b[^>]*>(.*?)</body>'
  )

  $body = Get-LongestMatchValue -Html $Html -Patterns $candidatePatterns
  $body = Normalize-ArticleHtml -Html $body

  if ([string]::IsNullOrWhiteSpace($body)) {
    return ''
  }

  $blockTagMatch = [regex]::Match($body, '<(p|h2|h3|ul|ol|blockquote|figure|img)\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if (-not $blockTagMatch.Success) {
    $textOnly = Decode-Html ([regex]::Replace($body, '<[^>]+>', ' '))
    $textOnly = [regex]::Replace($textOnly, '\s+', ' ').Trim()
    if ($textOnly) {
      return "<p>$([System.Security.SecurityElement]::Escape($textOnly))</p>"
    }
  }

  return $body
}

function Extract-HtmlMetadata {
  param([string]$Html)

  $metaTitle = Get-RegexValue -InputText $Html -Pattern '<meta[^>]+property="og:title"[^>]+content="([^"]+)"'
  if (-not $metaTitle) {
    $metaTitle = Get-RegexValue -InputText $Html -Pattern '<title>(.*?)</title>'
  }
  $metaTitle = $metaTitle -replace '\s+\|\s+beehiiv.*$', ''
  $metaTitle = $metaTitle -replace '\s+\|\s+INSPIRE.*$', ''

  $metaDescription = Get-RegexValue -InputText $Html -Pattern '<meta[^>]+(?:name|property)="(?:description|og:description)"[^>]+content="([^"]+)"'
  $metaImage = Get-RegexValue -InputText $Html -Pattern '<meta[^>]+property="og:image"[^>]+content="([^"]+)"'
  $metaCanonical = Get-RegexValue -InputText $Html -Pattern '<link[^>]+rel="canonical"[^>]+href="([^"]+)"'
  $metaDate = Get-RegexValue -InputText $Html -Pattern '<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"'
  if (-not $metaDate) {
    $metaDate = Get-RegexValue -InputText $Html -Pattern '"datePublished":"([^"]+)"'
  }
  $metaAuthor = Get-RegexValue -InputText $Html -Pattern '"author":\{"@type":"Person","name":"([^"]+)"'
  $authorsBlock = Get-RegexValue -InputText $Html -Pattern '"authors":\[(.*?)\],"audience"'
  $metaAuthors = @()
  if ($authorsBlock) {
    $metaAuthors = @(Get-RegexValues -InputText $authorsBlock -Pattern '"name":"([^"]+)"' | Select-Object -Unique)
  }
  if (-not $metaAuthors.Count -and $metaAuthor) {
    $metaAuthors = @($metaAuthor)
  }
  $metaReadTime = Get-RegexValue -InputText $Html -Pattern '"estimated_reading_time_display":"([^"]+)"'

  if ($metaDate.Length -ge 10) {
    $metaDate = $metaDate.Substring(0, 10)
  }

  return @{
    Title = $metaTitle
    Excerpt = $metaDescription
    Image = $metaImage
    SourceUrl = $metaCanonical
    Date = $metaDate
    Author = $metaAuthor
    Authors = @($metaAuthors)
    ReadTime = $metaReadTime
  }
}

function Load-AuthorProfiles {
  if (-not (Test-Path $authorsDataPath)) {
    return @()
  }

  $raw = Get-Content -Path $authorsDataPath -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return @()
  }

  return @($raw | ConvertFrom-Json)
}

function Save-AuthorProfiles {
  param([array]$Profiles)

  ConvertTo-Json -InputObject @($Profiles) -Depth 6 | Set-Content -Path $authorsDataPath -Encoding UTF8
}

function Ensure-AuthorProfiles {
  param([string[]]$Authors)

  $profiles = Load-AuthorProfiles
  $updated = $false

  foreach ($authorName in $Authors) {
    if ([string]::IsNullOrWhiteSpace($authorName)) {
      continue
    }

    $existing = $profiles | Where-Object { $_.name -eq $authorName } | Select-Object -First 1
    if (-not $existing) {
      $profiles += [PSCustomObject]@{
        name = $authorName
        slug = Convert-ToSlug $authorName
        profileUrl = ''
        email = ''
        linkedin = ''
        instagram = ''
        x = ''
        website = ''
        note = ''
      }
      $updated = $true
    }
  }

  if ($updated -or -not (Test-Path $authorsDataPath)) {
    Save-AuthorProfiles -Profiles $profiles
  }

  return @($profiles)
}

function Get-PrimaryAuthorLink {
  param($Profile)

  foreach ($key in @('profileUrl', 'website', 'linkedin', 'instagram', 'x', 'email')) {
    $value = $Profile.$key
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      if ($key -eq 'email' -and $value -notmatch '^mailto:') {
        return "mailto:$value"
      }
      return $value
    }
  }

  return ''
}

function Get-AuthorSocialLinksHtml {
  param($Profile)

  if ($null -eq $Profile) {
    return ''
  }

  $links = @()
  $socialMap = @(
    @{ Key = 'linkedin'; Label = 'LinkedIn' },
    @{ Key = 'instagram'; Label = 'Instagram' },
    @{ Key = 'x'; Label = 'X' },
    @{ Key = 'website'; Label = 'Website' },
    @{ Key = 'email'; Label = 'Email' }
  )

  foreach ($item in $socialMap) {
    $value = $Profile.($item.Key)
    if ([string]::IsNullOrWhiteSpace($value)) {
      continue
    }

    if ($item.Key -eq 'email' -and $value -notmatch '^mailto:') {
      $value = "mailto:$value"
    }

    $escapedUrl = [System.Security.SecurityElement]::Escape($value)
    $links += '<a href="' + $escapedUrl + '" target="_blank" rel="noopener noreferrer">' + $item.Label + '</a>'
  }

  if (-not $links.Count) {
    return ''
  }

  return '<span class="article-social-links">' + ($links -join '') + '</span>'
}

function Get-AuthorsMarkup {
  param(
    [string[]]$Authors,
    [array]$Profiles
  )

  $authorItems = @()
  $allSocials = @()

  foreach ($authorName in $Authors) {
    $profile = $Profiles | Where-Object { $_.name -eq $authorName } | Select-Object -First 1
    $primaryLink = if ($profile) { Get-PrimaryAuthorLink -Profile $profile } else { '' }
    $escapedName = [System.Security.SecurityElement]::Escape($authorName)

    if ($primaryLink) {
      $escapedLink = [System.Security.SecurityElement]::Escape($primaryLink)
      $authorItems += '<a class="article-author-link" href="' + $escapedLink + '" target="_blank" rel="noopener noreferrer">' + $escapedName + '</a>'
    }
    else {
      $authorItems += '<span class="article-author-name">' + $escapedName + '</span>'
    }

    $socialHtml = Get-AuthorSocialLinksHtml -Profile $profile
    if ($socialHtml) {
      $allSocials += '<span class="article-author-social-group"><span class="article-author-social-name">' + $escapedName + '</span>' + $socialHtml + '</span>'
    }
  }

  return @{
    NamesHtml = ($authorItems -join '<span class="article-meta-separator">, </span>')
    SocialsHtml = ($allSocials -join '')
  }
}

function Extract-EmbeddedStyles {
  param([string]$Html)

  $styleBlocks = Get-RegexValues -InputText $Html -Pattern '<style\b[^>]*>(.*?)</style>'
  if (-not $styleBlocks.Count) {
    return ''
  }

  $joinedStyles = ($styleBlocks -join "`n")
  return "<style>`n$joinedStyles`n</style>"
}

function Write-PostFile {
  param(
    [string]$Path,
    [string]$Language,
    [string]$Type,
    [string]$Date,
    [string]$Title,
    [string]$Excerpt,
    [string]$Image,
    [string]$SourceUrl,
    [string]$BodyHtml,
    [string[]]$Authors,
    [string]$ReadTime,
    [string]$ImportedStyles,
    [array]$AuthorProfiles
  )

  $typeLabel = if ($Type -eq 'interview') { 'Interview' } else { 'Things I Learned' }
  $escapedTitle = [System.Security.SecurityElement]::Escape($Title)
  $escapedExcerpt = [System.Security.SecurityElement]::Escape($Excerpt)
  $relativeStylesheet = '../../assets/css/style.css'
  $relativeMainJs = '../../assets/js/main.js'
  $displayDate = Format-DisplayDate -Value $Date
  $escapedDisplayDate = [System.Security.SecurityElement]::Escape($displayDate)
  $escapedReadTime = [System.Security.SecurityElement]::Escape($ReadTime)
  $authorsMarkup = Get-AuthorsMarkup -Authors $Authors -Profiles $AuthorProfiles

  $coverHtml = ''
  if (-not [string]::IsNullOrWhiteSpace($Image)) {
    $escapedImage = [System.Security.SecurityElement]::Escape($Image)
    $coverHtml = @"
    <div class="article-cover">
      <img src="$escapedImage" alt="$escapedTitle" loading="eager">
    </div>
"@
  }

  if ([string]::IsNullOrWhiteSpace($BodyHtml)) {
    $BodyHtml = '<p>Paste the cleaned article body here.</p>'
  }

  $bylineParts = @()
  if ($authorsMarkup.NamesHtml) {
    $bylineParts += '<span class="article-authors-line">' + $authorsMarkup.NamesHtml + '</span>'
  }
  if ($displayDate) {
    $bylineParts += '<time class="article-date-line" datetime="' + $Date + '">' + $escapedDisplayDate + '</time>'
  }
  if (-not [string]::IsNullOrWhiteSpace($ReadTime)) {
    $bylineParts += '<span class="article-readtime-line">' + $escapedReadTime + '</span>'
  }
  $bylineHtml = if ($bylineParts.Count) { ($bylineParts -join '<span class="article-meta-separator">·</span>') } else { '' }
  $socialsHtml = if ($authorsMarkup.SocialsHtml) { '<div class="article-social-row">' + $authorsMarkup.SocialsHtml + '</div>' } else { '' }

  $html = @"
<!DOCTYPE html>
<html lang="$Language">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$escapedTitle | INSPIRE</title>
  <meta name="description" content="$escapedExcerpt">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,500;0,700;1,300;1,500;1,700&family=DM+Sans:wght@200;300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="$relativeStylesheet">
$ImportedStyles
</head>
<body>
  <div class="progress-bar" id="progressBar"></div>
  <div class="cursor-dot" id="cursorDot"></div>
  <div class="cursor-ring" id="cursorRing"></div>

  <nav>
    <div class="nav-left">
      <a href="../../index.html" class="nav-logo">Inspire</a>
      <div class="nav-divider"></div>
      <div class="nav-tagline">Finding People Worth Learning From</div>
    </div>
    <div class="nav-right">
      <button class="nav-cta" onclick="window.location.href='../../index.html#subscribe'">Subscribe Free</button>
    </div>
  </nav>

  <main id="main" class="article-shell">
    <header class="article-header">
      <a class="article-back" href="../../blog.html">&larr; Back to archive</a>
      <div class="article-meta">
        <span class="article-pill $Type">$typeLabel</span>
      </div>
      <h1 class="article-page-title">$escapedTitle</h1>
      <div class="article-byline">
        $bylineHtml
      </div>
$socialsHtml
      <p class="article-page-excerpt">$escapedExcerpt</p>
    </header>
$coverHtml
    <article class="article-body">
      <div class="beehiiv-import typedream content">
$BodyHtml
      </div>
    </article>
  </main>

  <footer>
    <div class="footer-logo">INSPIRE</div>
    <div class="footer-links">
      <a href="../../index.html#about">About</a>
      <a href="../../index.html#latest">Formats</a>
      <a href="../../blog.html">All Editions</a>
      <a href="../../index.html#contact">Contact</a>
    </div>
    <div class="footer-copy">&copy; 2026 Inspire by Tuur Lauryssen</div>
  </footer>

  <script src="$relativeMainJs"></script>
</body>
</html>
"@

  $html | Set-Content -Path $Path -Encoding UTF8
}

function Write-RawPostFile {
  param(
    [string]$Path,
    [string]$Language,
    [string]$Title,
    [string]$Excerpt,
    [string]$BodyHtml,
    [string]$ImportedStyles
  )

  $escapedTitle = [System.Security.SecurityElement]::Escape($Title)
  $escapedExcerpt = [System.Security.SecurityElement]::Escape($Excerpt)

  if ([string]::IsNullOrWhiteSpace($BodyHtml)) {
    $BodyHtml = '<p>No article body was extracted.</p>'
  }

  $html = @"
<!DOCTYPE html>
<html lang="$Language">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$escapedTitle | Raw Import</title>
  <meta name="description" content="$escapedExcerpt">
$ImportedStyles
</head>
<body>
  <main>
    <div class="typedream content">
$BodyHtml
    </div>
  </main>
</body>
</html>
"@

  $html | Set-Content -Path $Path -Encoding UTF8
}

function Update-PostsManifest {
  param(
    [string]$Title,
    [string]$Slug,
    [string]$Language,
    [string]$Type,
    [string]$Date,
    [string]$Excerpt,
    [string]$Image,
    [string]$SourceUrl
  )

  $posts = @()
  if (Test-Path $postsDataPath) {
    $raw = Get-Content -Path $postsDataPath -Raw
    if (-not [string]::IsNullOrWhiteSpace($raw)) {
      $posts = @($raw | ConvertFrom-Json)
    }
  }

  $filtered = @($posts | Where-Object { $_.slug -ne $Slug -or $_.language -ne $Language })
  $entry = [PSCustomObject]@{
    title = $Title
    slug = $Slug
    language = $Language
    type = $Type
    pubDate = $Date
    excerpt = $Excerpt
    image = $Image
    sourceUrl = $SourceUrl
    path = "posts/$(Get-TypeDirectoryName -Type $Type)/$Language/$Slug.html"
    categories = @()
  }

  $updatedPosts = @($filtered + $entry) | Sort-Object -Property pubDate -Descending
  ConvertTo-Json -InputObject @($updatedPosts) -Depth 5 | Set-Content -Path $postsDataPath -Encoding UTF8
  $jsContent = 'window.INSPIRE_LOCAL_POSTS = ' + (ConvertTo-Json -InputObject @($updatedPosts) -Depth 5) + ';'
  Set-Content -Path $postsDataJsPath -Value $jsContent -Encoding UTF8
}

if ([string]::IsNullOrWhiteSpace($Type)) {
  $Type = Prompt-Value 'Type (interview/learned)' 'learned'
}
$Type = $Type.ToLowerInvariant()

if ([string]::IsNullOrWhiteSpace($Language)) {
  $Language = Prompt-Value 'Language (en/nl)' 'en'
}
$Language = $Language.ToLowerInvariant()

if ([string]::IsNullOrWhiteSpace($RawHtml)) {
  if (-not [string]::IsNullOrWhiteSpace($HtmlPath)) {
    if (-not (Test-Path $HtmlPath)) {
      throw "HTML file not found: $HtmlPath"
    }

    $RawHtml = Get-Content -Path $HtmlPath -Raw
  }
  else {
    $RawHtml = Read-MultilineInput -Label 'Raw Beehiiv HTML'
  }
}

$rawHtml = $RawHtml
$metadata = Extract-HtmlMetadata -Html $rawHtml
$bodyHtml = Extract-ArticleBody -Html $rawHtml
$importedStyles = Extract-EmbeddedStyles -Html $rawHtml
$authorProfiles = Ensure-AuthorProfiles -Authors $metadata.Authors

if ([string]::IsNullOrWhiteSpace($Title)) {
  $Title = $metadata.Title
}

if ([string]::IsNullOrWhiteSpace($Date)) {
  $Date = $metadata.Date
}

if ([string]::IsNullOrWhiteSpace($Excerpt)) {
  $Excerpt = $metadata.Excerpt
}

if ([string]::IsNullOrWhiteSpace($Image)) {
  $Image = $metadata.Image
}

if ([string]::IsNullOrWhiteSpace($SourceUrl)) {
  $SourceUrl = $metadata.SourceUrl
}

if ([string]::IsNullOrWhiteSpace($Title)) {
  throw 'Could not extract a title from the raw HTML.'
}

if ([string]::IsNullOrWhiteSpace($Date)) {
  throw 'Could not extract a publish date from the raw HTML.'
}

if ([string]::IsNullOrWhiteSpace($Excerpt)) {
  throw 'Could not extract an excerpt/description from the raw HTML.'
}

if ([string]::IsNullOrWhiteSpace($bodyHtml)) {
  throw 'Could not extract the article body from the raw HTML.'
}

$slug = Convert-ToSlug $Title
$typeDirectoryName = Get-TypeDirectoryName -Type $Type
$postDirectory = Join-Path $repoRoot "posts\$typeDirectoryName\$Language"
$postPath = Join-Path $postDirectory "$slug.html"
$rawPostDirectory = Join-Path $repoRoot "posts\raw\$typeDirectoryName\$Language"
$rawPostPath = Join-Path $rawPostDirectory "$slug-raw.html"

if (-not (Test-Path $postDirectory)) {
  New-Item -ItemType Directory -Path $postDirectory | Out-Null
}

if (-not (Test-Path $rawPostDirectory)) {
  New-Item -ItemType Directory -Path $rawPostDirectory -Force | Out-Null
}

Write-PostFile -Path $postPath -Language $Language -Type $Type -Date $Date -Title $Title -Excerpt $Excerpt -Image $Image -SourceUrl $SourceUrl -BodyHtml $bodyHtml -Authors $metadata.Authors -ReadTime $metadata.ReadTime -ImportedStyles $importedStyles -AuthorProfiles $authorProfiles
Write-RawPostFile -Path $rawPostPath -Language $Language -Title $Title -Excerpt $Excerpt -BodyHtml $bodyHtml -ImportedStyles $importedStyles
Update-PostsManifest -Title $Title -Slug $slug -Language $Language -Type $Type -Date $Date -Excerpt $Excerpt -Image $Image -SourceUrl $SourceUrl

Write-Host "Created or updated post file: $postPath"
Write-Host "Created or updated raw import: $rawPostPath"
Write-Host "Updated author data: $authorsDataPath"
Write-Host "Updated manifest: $postsDataPath"
Write-Host "Updated browser data: $postsDataJsPath"
Write-Host "Next: review the generated HTML, adjust any formatting, then commit and push."
