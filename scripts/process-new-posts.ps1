<#
  File role: Scans posts/incoming for freshly dropped Beehiiv HTML exports and turns
  each one into a finished article page, with no interactive prompts.
  Project relation: Replaces import-beehiiv-post.ps1. Type and language come from
  which posts/incoming/<type>/<lang> folder a file was dropped into, rather than
  being typed in. Downloads cover/inline images into the repo instead of linking to
  Beehiiv's own URLs, strips Beehiiv's inline style/class bloat, and finishes by
  opening a pull request instead of pushing straight to the branch GitHub Pages
  serves.
#>

param(
  [switch]$SkipPullRequest
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$postsDataPath = Join-Path $repoRoot 'assets\data\posts.json'
$authorsDataPath = Join-Path $repoRoot 'assets\data\authors.json'
$incomingRoot = Join-Path $repoRoot 'posts\incoming'
$syncPostsManifestScriptPath = Join-Path $PSScriptRoot 'sync-posts-manifest.ps1'

$TypeDirectories = @('explained', 'ideas')
$LanguageDirectories = @('en', 'nl')

function Get-PostsManifestEntries {
  if (-not (Test-Path $postsDataPath)) {
    return @()
  }

  $raw = Get-Content -Path $postsDataPath -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return @()
  }

  return @($raw | ConvertFrom-Json)
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

function Resolve-PostSlug {
  param(
    [string]$Title,
    [string]$Language,
    [string]$Type
  )

  $baseSlug = Convert-ToSlug $Title
  $posts = Get-PostsManifestEntries

  $candidateSlug = $baseSlug
  $suffix = 2

  while ($true) {
    $postPath = Join-Path $repoRoot "posts\$Type\$Language\$candidateSlug.html"
    $rawPostPath = Join-Path $repoRoot "posts\raw\$Type\$Language\$candidateSlug-raw.html"
    $existingBySlug = $posts | Where-Object {
      $_.language -eq $Language -and $_.slug -eq $candidateSlug
    } | Select-Object -First 1

    $slugIsAvailable = (-not $existingBySlug) -and (-not (Test-Path $postPath)) -and (-not (Test-Path $rawPostPath))
    if ($slugIsAvailable) {
      return $candidateSlug
    }

    $candidateSlug = "$baseSlug-$suffix"
    $suffix += 1
  }
}

function Format-DisplayDate {
  param(
    [string]$Value,
    [string]$Language = 'en'
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ''
  }

  try {
    $date = [datetime]$Value
    if ($Language -eq 'nl') {
      return $date.ToString('d MMM yyyy', [System.Globalization.CultureInfo]::GetCultureInfo('nl-BE'))
    }

    return $date.ToString('MMM d, yyyy', [System.Globalization.CultureInfo]::InvariantCulture)
  }
  catch {
    return $Value
  }
}

function Get-LocalizedArticleCopy {
  param(
    [string]$Language,
    [string]$Type
  )

  if ($Language -eq 'nl') {
    return @{
      Home = 'Home'
      Archive = 'Alle edities'
      TypeLabel = if ($Type -eq 'explained') { 'Uitgelegd' } else { 'Columns' }
      SourceLabel = 'Originele bron'
      EndcapTitle = 'Lees verder op INSPIRE'
      EndcapText = 'Ga terug naar de homepage of blader door alle edities.'
      PlaceholderBody = '<p>Plaats hier de opgeschoonde artikeltekst.</p>'
    }
  }

  return @{
    Home = 'Home'
    Archive = 'All Editions'
    TypeLabel = if ($Type -eq 'explained') { 'Explained' } else { 'Columns' }
    SourceLabel = 'Original source'
    EndcapTitle = 'Continue reading on INSPIRE'
    EndcapText = 'Go back to the homepage or browse all editions.'
    PlaceholderBody = '<p>Paste the cleaned article body here.</p>'
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

  # Strip Beehiiv/Typedream's inline style + class soup (the '--wt-*' custom
  # property clutter that bloated every imported post) along with data-*/aria-*/
  # on* attributes. The site's own .article-body CSS already styles imported
  # articles, so none of this is needed.
  $attributePattern = '(style|class|data-[\w-]+|aria-[\w-]+|on\w+)'
  $withoutDouble = [regex]::Replace($Html, "\s$attributePattern=`"[^`"]*`"", '', 'IgnoreCase')
  $withoutSingle = [regex]::Replace($withoutDouble, "\s$attributePattern='[^']*'", '', 'IgnoreCase')
  return $withoutSingle
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
  foreach ($marker in @('>Keep Reading<', 'Keep Reading', 'Add your comment', 'Load more', 'View more')) {
    $markerIndex = $cleaned.IndexOf($marker, [System.StringComparison]::OrdinalIgnoreCase)
    if ($markerIndex -gt 0) {
      $cutIndex = $cleaned.LastIndexOf('<div', $markerIndex, [System.StringComparison]::OrdinalIgnoreCase)
      if ($cutIndex -lt 0) {
        $cutIndex = $cleaned.LastIndexOf('<section', $markerIndex, [System.StringComparison]::OrdinalIgnoreCase)
      }
      if ($cutIndex -gt 0) {
        $cleaned = $cleaned.Substring(0, $cutIndex)
      }
      else {
        $cleaned = $cleaned.Substring(0, $markerIndex)
      }
    }
  }
  $genericRecommendedIndex = $cleaned.IndexOf('<div class="relative flex flex-col"', [System.StringComparison]::OrdinalIgnoreCase)
  if ($genericRecommendedIndex -gt 0) {
    $cleaned = $cleaned.Substring(0, $genericRecommendedIndex)
  }
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

function Get-UniqueNonEmptyValues {
  param([string[]]$Values)

  $seen = @{}
  $result = @()

  foreach ($value in $Values) {
    $clean = Decode-Html $value
    if ([string]::IsNullOrWhiteSpace($clean)) {
      continue
    }

    $key = $clean.Trim().ToLowerInvariant()
    if (-not $seen.ContainsKey($key)) {
      $seen[$key] = $true
      $result += $clean.Trim()
    }
  }

  return @($result)
}

function Extract-SecondAuthorName {
  param([string]$Html)

  foreach ($pattern in @(
    'Inspired by[^A-Za-z]+([^"<\r\n]+)',
    '"text":"Inspired by[^A-Za-z]+([^"]+)"'
  )) {
    $name = Get-RegexValue -InputText $Html -Pattern $pattern
    if (-not [string]::IsNullOrWhiteSpace($name)) {
      $name = $name.Trim()
      if ($name -match '^[A-Z][a-z]+$') {
        $expandedName = Get-RegexValue -InputText $Html -Pattern ($name + '\s+([A-Z][a-z]+)\s+was\b')
        if ($expandedName) {
          return "$name $expandedName"
        }
      }
      return $name
    }
  }

  return ''
}

function Extract-HtmlMetadata {
  param(
    [string]$Html,
    [string]$Type
  )

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
  $schemaAuthor = Get-RegexValue -InputText $Html -Pattern '"author":\{"@type":"Person","name":"([^"]+)"'
  $metaAuthor = Get-RegexValue -InputText $Html -Pattern '<meta[^>]+name="author"[^>]+content="([^"]+)"'
  if (-not $metaAuthor) {
    $metaAuthor = $schemaAuthor
  }
  $metaAuthors = @($metaAuthor)
  if ($Type -eq 'explained') {
    $secondAuthorName = Extract-SecondAuthorName -Html $Html
    if ($secondAuthorName) {
      $metaAuthors += $secondAuthorName
    }
  }
  $metaAuthors = Get-UniqueNonEmptyValues -Values $metaAuthors
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
    Author = if ($metaAuthors.Count) { $metaAuthors[0] } else { '' }
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
        avatarUrl = ''
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
  $avatarItems = @()

  foreach ($authorName in $Authors) {
    $profile = $Profiles | Where-Object { $_.name -eq $authorName } | Select-Object -First 1
    $primaryLink = if ($profile) { Get-PrimaryAuthorLink -Profile $profile } else { '' }
    $escapedName = [System.Security.SecurityElement]::Escape($authorName)
    $avatarUrl = ''
    if ($profile -and $profile.PSObject.Properties.Name -contains 'avatarUrl') {
      $avatarUrl = $profile.avatarUrl
    }

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

    if (-not [string]::IsNullOrWhiteSpace($avatarUrl)) {
      $escapedAvatarUrl = [System.Security.SecurityElement]::Escape($avatarUrl)
      $avatarItems += '<span class="article-author-avatar"><img src="' + $escapedAvatarUrl + '" alt="' + $escapedName + '" loading="lazy"></span>'
    }
    else {
      $initials = (($authorName -split '\s+') | Where-Object { $_ } | ForEach-Object { $_.Substring(0, 1).ToUpperInvariant() })
      $initialsText = [System.Security.SecurityElement]::Escape((($initials | Select-Object -First 2) -join ''))
      $avatarItems += '<span class="article-author-avatar article-author-avatar-fallback">' + $initialsText + '</span>'
    }
  }

  return @{
    AvatarsHtml = ($avatarItems -join '')
    NamesHtml = ($authorItems -join '<span class="article-meta-separator">, </span>')
    SocialsHtml = ($allSocials -join '')
  }
}

function Get-ImageExtension {
  param([string]$Url)

  $withoutQuery = $Url -replace '\?.*$', ''
  $lastSegment = ($withoutQuery -split '/')[-1]
  if ($lastSegment -match '\.([a-zA-Z0-9]{2,5})$') {
    return ".$($matches[1].ToLowerInvariant())"
  }

  return '.jpg'
}

function Save-RemoteImage {
  param(
    [string]$Url,
    [string]$DestinationPath
  )

  try {
    $destinationDirectory = Split-Path -Parent $DestinationPath
    if (-not (Test-Path $destinationDirectory)) {
      New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    }

    Invoke-WebRequest -Uri $Url -OutFile $DestinationPath -UseBasicParsing -TimeoutSec 30
    return $true
  }
  catch {
    Write-Warning "Could not download image, leaving the original URL in place: $Url ($($_.Exception.Message))"
    return $false
  }
}

function Import-ArticleImages {
  param(
    [string]$BodyHtml,
    [string]$CoverUrl,
    [string]$Slug
  )

  # Downloads the cover + any inline images into assets/img/posts/<slug>/ so the
  # article no longer depends on Beehiiv's own hosted URLs, and rewrites the body
  # to point at the local copies. Falls back to the original URL per-image if a
  # download fails, rather than breaking the import.
  $imageDirectoryName = "assets/img/posts/$Slug"
  $imageDirectory = Join-Path $repoRoot $imageDirectoryName
  $localCoverUrl = $CoverUrl

  if (-not [string]::IsNullOrWhiteSpace($CoverUrl)) {
    $coverExtension = Get-ImageExtension -Url $CoverUrl
    $coverDestination = Join-Path $imageDirectory "cover$coverExtension"
    if (Save-RemoteImage -Url $CoverUrl -DestinationPath $coverDestination) {
      $localCoverUrl = "../../../$imageDirectoryName/cover$coverExtension"
    }
  }

  $updatedBody = $BodyHtml
  $inlineImageMatches = [regex]::Matches($BodyHtml, '<img\b[^>]*\ssrc="([^"]+)"', 'IgnoreCase')
  $seenUrls = @{}
  $imageIndex = 0

  foreach ($match in $inlineImageMatches) {
    $imageUrl = $match.Groups[1].Value
    if ([string]::IsNullOrWhiteSpace($imageUrl) -or $seenUrls.ContainsKey($imageUrl) -or $imageUrl -eq $CoverUrl) {
      continue
    }
    $seenUrls[$imageUrl] = $true
    $imageIndex += 1

    $imageExtension = Get-ImageExtension -Url $imageUrl
    $imageDestination = Join-Path $imageDirectory "img-$imageIndex$imageExtension"
    if (Save-RemoteImage -Url $imageUrl -DestinationPath $imageDestination) {
      $localImageUrl = "../../../$imageDirectoryName/img-$imageIndex$imageExtension"
      $updatedBody = $updatedBody.Replace("src=`"$imageUrl`"", "src=`"$localImageUrl`"")
    }
  }

  return @{
    BodyHtml = $updatedBody
    CoverUrl = $localCoverUrl
  }
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
    [array]$AuthorProfiles,
    [string]$Visibility
  )

  $escapedTitle = [System.Security.SecurityElement]::Escape($Title)
  $escapedExcerpt = [System.Security.SecurityElement]::Escape($Excerpt)
  $relativeStylesheet = '../../../assets/css/style.css'
  $relativeNlPageConfigJs = '../../../assets/js/page-config-nl.js'
  $relativeSiteConfigJs = '../../../assets/js/site-config.js'
  $relativeMainJs = '../../../assets/js/main.js'
  $displayDate = Format-DisplayDate -Value $Date -Language $Language
  $escapedDisplayDate = [System.Security.SecurityElement]::Escape($displayDate)
  $escapedReadTime = [System.Security.SecurityElement]::Escape($ReadTime)
  $escapedSourceUrl = [System.Security.SecurityElement]::Escape($SourceUrl)
  $authorsMarkup = Get-AuthorsMarkup -Authors $Authors -Profiles $AuthorProfiles
  $copy = Get-LocalizedArticleCopy -Language $Language -Type $Type

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
    $BodyHtml = $copy.PlaceholderBody
  }

  $pageConfigScriptHtml = ''
  if ($Language -eq 'nl') {
    $pageConfigScriptHtml = '  <script src="' + $relativeNlPageConfigJs + '"></script>'
  }

  $bylineParts = @()
  if ($authorsMarkup.NamesHtml) {
    $bylineParts += '<span class="article-authors-line"><span class="article-author-visuals">' + $authorsMarkup.AvatarsHtml + '</span><span class="article-author-names">' + $authorsMarkup.NamesHtml + '</span></span>'
  }
  if ($displayDate) {
    $bylineParts += '<time class="article-date-line" datetime="' + $Date + '">' + $escapedDisplayDate + '</time>'
  }
  if (-not [string]::IsNullOrWhiteSpace($ReadTime)) {
    $bylineParts += '<span class="article-readtime-line">' + $escapedReadTime + '</span>'
  }
  $bylineHtml = if ($bylineParts.Count) { ($bylineParts -join '<span class="article-meta-separator">&middot;</span>') } else { '' }
  $homeLink = if ($Language -eq 'nl') { '../../../nl/index.html' } else { '../../../index.html' }
  $archiveLink = if ($Language -eq 'nl') { '../../../nl/blog.html' } else { '../../../blog.html' }
  $typeLabel = $copy.TypeLabel
  $sourceHtml = ''
  if (-not [string]::IsNullOrWhiteSpace($SourceUrl)) {
    $sourceHtml = '<a class="article-source-link" href="' + $escapedSourceUrl + '" target="_blank" rel="noopener noreferrer">' + $copy.SourceLabel + '</a>'
  }

  $html = @"
<!DOCTYPE html>
<html lang="$Language">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$escapedTitle | INSPIRE</title>
  <meta name="description" content="$escapedExcerpt">
  <meta name="inspire:visibility" content="$Visibility">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,500;0,700;1,300;1,500;1,700&family=DM+Sans:wght@200;300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="$relativeStylesheet">
</head>
<body>
  <div class="progress-bar" id="progressBar"></div>
  <div class="cursor-dot" id="cursorDot"></div>
  <div class="cursor-ring" id="cursorRing"></div>

  <div class="article-topbar">
    <div class="article-topbar-inner">
      <a href="$homeLink" class="article-brand" data-brand-lockup>INSPIRE</a>
      <div class="article-topbar-actions">
        <a class="article-action-link" href="$homeLink">$($copy.Home)</a>
        <a class="article-action-link" href="$archiveLink">$($copy.Archive)</a>
      </div>
    </div>
  </div>

  <main id="main" class="article-shell beehiiv-article-shell">
    <header class="article-header">
      <div class="article-type-label">$typeLabel</div>
      <h1 class="article-page-title">$escapedTitle</h1>
      <p class="article-page-excerpt">$escapedExcerpt</p>
      <div class="article-byline">
        $bylineHtml
      </div>
    </header>
$coverHtml
    <article class="article-body">
      <div class="beehiiv-import typedream content">
$BodyHtml
      </div>
    </article>
    <div class="article-endcap">
      <div class="article-endcap-copy">
        <div class="article-endcap-title">$($copy.EndcapTitle)</div>
        <div class="article-endcap-text">$($copy.EndcapText)<span class="article-updated" data-last-updated></span></div>
        $sourceHtml
      </div>
      <div class="article-endcap-actions">
        <a class="article-action-link" href="$homeLink">$($copy.Home)</a>
        <a class="article-action-link" href="$archiveLink">$($copy.Archive)</a>
      </div>
    </div>
  </main>

${pageConfigScriptHtml}
  <script src="$relativeSiteConfigJs"></script>
  <script src="$relativeMainJs"></script>
</body>
</html>
"@

  $html | Set-Content -Path $Path -Encoding UTF8
}

function Write-RawPostFile {
  param(
    [string]$Path,
    [string]$RawHtml
  )

  if ([string]::IsNullOrWhiteSpace($RawHtml)) {
    throw 'Raw HTML is empty, so the raw reference file could not be written.'
  }

  $RawHtml | Set-Content -Path $Path -Encoding UTF8
}

function Sync-PostsManifest {
  if (Test-Path $syncPostsManifestScriptPath) {
    & $syncPostsManifestScriptPath
  }
}

function Get-NewIncomingFiles {
  $files = @()
  foreach ($type in $TypeDirectories) {
    foreach ($language in $LanguageDirectories) {
      $folder = Join-Path $incomingRoot "$type\$language"
      if (Test-Path $folder) {
        $files += Get-ChildItem -Path $folder -File -Filter *.html
      }
    }
  }
  return @($files)
}

function Get-TypeAndLanguageFromIncomingPath {
  param([System.IO.FileInfo]$File)

  $relativePath = $File.FullName.Substring($incomingRoot.Length).TrimStart('\').Replace('\', '/')
  $parts = $relativePath -split '/'
  if ($parts.Length -lt 3) {
    throw "Could not determine type/language for $($File.FullName). Expected posts/incoming/<type>/<lang>/file.html."
  }
  return @{ Type = $parts[0]; Language = $parts[1] }
}

function Test-GitWorkingTreeClean {
  $status = git -C $repoRoot status --porcelain
  return [string]::IsNullOrWhiteSpace(($status -join ''))
}

function Get-RepoSlug {
  $remoteUrl = git -C $repoRoot remote get-url origin
  $remoteUrl = $remoteUrl.Trim()
  $remoteUrl = $remoteUrl -replace '\.git$', ''
  if ($remoteUrl -match '[:/]([^/:]+/[^/:]+)$') {
    return $matches[1]
  }
  return $null
}

function Publish-ProcessedPosts {
  param([array]$ProcessedPosts)

  $branchSuffix = if ($ProcessedPosts.Count -eq 1) {
    "$($ProcessedPosts[0].Language)-$($ProcessedPosts[0].Slug)"
  }
  else {
    Get-Date -Format 'yyyyMMdd-HHmmss'
  }
  $branchName = "post/$branchSuffix"

  Write-Host "`nCreating branch $branchName from origin/main..."
  git -C $repoRoot fetch origin main | Out-Null
  git -C $repoRoot checkout -b $branchName origin/main | Out-Null

  $pathsToStage = @('posts', 'assets/data/posts.json', 'assets/data/posts-data.js', 'assets/data/authors.json', 'assets/img/posts')
  git -C $repoRoot add -- $pathsToStage

  $commitTitle = if ($ProcessedPosts.Count -eq 1) {
    "Add post: $($ProcessedPosts[0].Title)"
  }
  else {
    "Add $($ProcessedPosts.Count) new posts"
  }
  $commitBody = ($ProcessedPosts | ForEach-Object { "- [$($_.Type)/$($_.Language)] $($_.Title)" }) -join "`n"
  git -C $repoRoot commit -m $commitTitle -m $commitBody | Out-Null

  Write-Host "Pushing $branchName..."
  git -C $repoRoot push -u origin $branchName

  $prTitle = $commitTitle
  $prBody = "$commitBody`n`nGenerated by scripts/process-new-posts.ps1."
  $ghAvailable = Get-Command gh -ErrorAction SilentlyContinue

  if ($ghAvailable -and -not $SkipPullRequest) {
    Write-Host 'Opening pull request via gh...'
    & gh pr create --base main --head $branchName --title $prTitle --body $prBody
  }
  else {
    $repoSlug = Get-RepoSlug
    if ($repoSlug) {
      $compareUrl = "https://github.com/$repoSlug/compare/main...$branchName?expand=1"
      Write-Host "`ngh CLI not found. Open a pull request here:"
      Write-Host $compareUrl
    }
    else {
      Write-Host "`nCould not determine the GitHub repo URL to build a compare link. Push succeeded; open a pull request manually for branch $branchName."
    }
  }

  git -C $repoRoot checkout main | Out-Null
  git -C $repoRoot pull origin main | Out-Null
}

# =========================================
# MAIN
# =========================================

if (-not (Test-GitWorkingTreeClean)) {
  throw "Your git working tree has uncommitted changes. Commit or stash them first, then run this script again."
}

$incomingFiles = Get-NewIncomingFiles

if ($incomingFiles.Count -eq 0) {
  Write-Host "No new posts found in posts/incoming/**."
  Write-Host "Drop a raw Beehiiv HTML export into posts/incoming/explained/en (or /nl) or posts/incoming/ideas/en (or /nl), then run this again."
  exit 0
}

$processedPosts = @()

foreach ($incomingFile in $incomingFiles) {
  $location = Get-TypeAndLanguageFromIncomingPath -File $incomingFile
  $type = $location.Type
  $language = $location.Language

  Write-Host "`nProcessing $($incomingFile.Name) as [$type/$language]..."

  $rawHtml = Get-Content -Path $incomingFile.FullName -Raw
  $metadata = Extract-HtmlMetadata -Html $rawHtml -Type $type
  $bodyHtml = Extract-ArticleBody -Html $rawHtml
  $authorProfiles = Ensure-AuthorProfiles -Authors $metadata.Authors

  if ([string]::IsNullOrWhiteSpace($metadata.Title)) {
    throw "Could not extract a title from $($incomingFile.Name)."
  }
  if ([string]::IsNullOrWhiteSpace($metadata.Date)) {
    throw "Could not extract a publish date from $($incomingFile.Name)."
  }
  if ([string]::IsNullOrWhiteSpace($metadata.Excerpt)) {
    throw "Could not extract an excerpt/description from $($incomingFile.Name)."
  }
  if ([string]::IsNullOrWhiteSpace($bodyHtml)) {
    throw "Could not extract the article body from $($incomingFile.Name)."
  }

  $slug = Resolve-PostSlug -Title $metadata.Title -Language $language -Type $type

  $localizedImages = Import-ArticleImages -BodyHtml $bodyHtml -CoverUrl $metadata.Image -Slug $slug
  $bodyHtml = $localizedImages.BodyHtml
  $coverUrl = $localizedImages.CoverUrl

  $postDirectory = Join-Path $repoRoot "posts\$type\$language"
  $postPath = Join-Path $postDirectory "$slug.html"
  $rawPostDirectory = Join-Path $repoRoot "posts\raw\$type\$language"
  $rawPostPath = Join-Path $rawPostDirectory "$slug-raw.html"

  if (-not (Test-Path $postDirectory)) {
    New-Item -ItemType Directory -Path $postDirectory -Force | Out-Null
  }
  if (-not (Test-Path $rawPostDirectory)) {
    New-Item -ItemType Directory -Path $rawPostDirectory -Force | Out-Null
  }

  Write-PostFile -Path $postPath -Language $language -Type $type -Date $metadata.Date -Title $metadata.Title `
    -Excerpt $metadata.Excerpt -Image $coverUrl -SourceUrl $metadata.SourceUrl -BodyHtml $bodyHtml `
    -Authors $metadata.Authors -ReadTime $metadata.ReadTime -AuthorProfiles $authorProfiles -Visibility 'public'
  Write-RawPostFile -Path $rawPostPath -RawHtml $rawHtml
  Remove-Item -Path $incomingFile.FullName -Force

  Write-Host "  -> posts/$type/$language/$slug.html"

  $processedPosts += [PSCustomObject]@{
    Title = $metadata.Title
    Slug = $slug
    Type = $type
    Language = $language
  }
}

Sync-PostsManifest

if ($SkipPullRequest) {
  Write-Host "`nDone. Skipped branch/PR creation (-SkipPullRequest). Review and commit manually."
  exit 0
}

Publish-ProcessedPosts -ProcessedPosts $processedPosts

Write-Host "`nDone. $($processedPosts.Count) post(s) processed and sent up for review."
