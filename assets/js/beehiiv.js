// =========================================
// BEEHIIV RSS FEED INTEGRATION
// =========================================

const BEEHIIV_CONFIG = {
  localPostsUrl: 'assets/data/posts.json',
  // Replace feedUrl with the exact RSS URL from Beehiiv Settings > RSS if it differs.
  publicationName: 'tuurlauryssen',
  feedUrl: 'https://tuurlauryssen.beehiiv.com/feed',
  siteLanguage: 'en',
  languageCategoryMap: {
    en: ['en', 'english'],
    nl: ['nl', 'dutch', 'nederlands']
  },

  // Fallback RSS-to-JSON proxy. No API key is hardcoded client-side.
  get rssToJsonUrl() {
    return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(this.feedUrl)}`;
  }
};

// =========================================
// CACHE CONFIGURATION
// =========================================

const CACHE_DURATION = 10 * 60 * 1000;
let cachedPosts = null;
let cacheTime = null;

// =========================================
// FETCH POSTS FROM BEEHIIV RSS
// =========================================

async function fetchBeehiivPosts(limit = null) {
  if (cachedPosts && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
    console.log('Using cached posts');
    return limit ? cachedPosts.slice(0, limit) : cachedPosts;
  }

  try {
    console.log('Fetching posts from Beehiiv...');
    const posts = await fetchPostsWithFallbacks();
    console.log(`Fetched ${posts.length} posts`);

    cachedPosts = posts;
    cacheTime = Date.now();

    return limit ? posts.slice(0, limit) : posts;
  } catch (error) {
    console.error('Error fetching Beehiiv posts:', error);

    if (cachedPosts) {
      console.log('Using stale cache due to error');
      return limit ? cachedPosts.slice(0, limit) : cachedPosts;
    }

    return [];
  }
}

async function fetchPostsWithFallbacks() {
  try {
    const localPosts = await fetchLocalPosts();
    if (localPosts.length > 0) {
      console.log(`Loaded ${localPosts.length} local posts`);
      return localPosts;
    }
  } catch (error) {
    console.warn('Local posts fetch failed, falling back to Beehiiv:', error);
  }

  try {
    return await fetchDirectRssPosts();
  } catch (error) {
    console.warn('Direct RSS fetch failed, falling back to rss2json:', error);
  }

  try {
    return await fetchRss2JsonPosts();
  } catch (error) {
    console.warn('rss2json fallback failed:', error);
  }

  throw new Error('All Beehiiv feed sources failed');
}

async function fetchLocalPosts() {
  if (Array.isArray(window.INSPIRE_LOCAL_POSTS)) {
    return window.INSPIRE_LOCAL_POSTS
      .map(mapLocalPost)
      .filter(Boolean)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  }

  const response = await fetch(BEEHIIV_CONFIG.localPostsUrl, {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Local posts HTTP error: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Local posts file must contain an array');
  }

  return data
    .map(mapLocalPost)
    .filter(Boolean)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
}

function mapLocalPost(entry) {
  if (!entry || !entry.title || !entry.slug || !entry.language || !entry.type || !entry.pubDate) {
    return null;
  }

  const typeDirectory = entry.type === 'interview' ? 'interviews' : 'ideas';
  const path = entry.path || `posts/${typeDirectory}/${entry.language}/${entry.slug}.html`;
  const categories = Array.isArray(entry.categories) ? entry.categories : [];
  const normalizedCategories = [...new Set([entry.language, ...categories])];
  const excerpt = entry.excerpt || entry.description || '';
  const image = entry.image || '';

  return {
    title: entry.title,
    link: path,
    pubDate: entry.pubDate,
    description: excerpt,
    content: excerpt,
    categories: normalizedCategories,
    thumbnail: image,
    enclosure: image ? { link: image } : null,
    type: entry.type,
    language: entry.language,
    author: entry.author || '',
    sourceUrl: entry.sourceUrl || ''
  };
}

async function fetchDirectRssPosts() {
  const response = await fetch(BEEHIIV_CONFIG.feedUrl, {
    headers: {
      'Accept': 'application/rss+xml, application/xml, text/xml'
    }
  });

  if (!response.ok) {
    throw new Error(`Direct RSS HTTP error: ${response.status}`);
  }

  const xmlText = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');
  const parserError = xml.querySelector('parsererror');

  if (parserError) {
    throw new Error('RSS XML parse error');
  }

  const items = Array.from(xml.querySelectorAll('item'));
  return items.map(parseRssItem);
}

function parseRssItem(item) {
  const getText = (selector) => item.querySelector(selector)?.textContent?.trim() || '';
  const enclosure = item.querySelector('enclosure');
  const thumbnail = item.querySelector('media\\:thumbnail, thumbnail');
  const categories = Array.from(item.querySelectorAll('category')).map((el) => el.textContent.trim()).filter(Boolean);

  return {
    title: getText('title'),
    link: getText('link'),
    pubDate: getText('pubDate'),
    description: getText('description'),
    content: getText('content\\:encoded'),
    categories,
    thumbnail: thumbnail?.getAttribute('url') || '',
    enclosure: enclosure ? { link: enclosure.getAttribute('url') || '' } : null
  };
}

async function fetchRss2JsonPosts() {
  const response = await fetch(BEEHIIV_CONFIG.rssToJsonUrl);

  if (!response.ok) {
    throw new Error(`rss2json HTTP error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 'ok') {
    throw new Error(`rss2json error: ${data.message || 'Unknown error'}`);
  }

  return data.items || [];
}

// =========================================
// DETERMINE POST TYPE (Interview vs Learned)
// =========================================

function getPostType(post) {
  if (post.type === 'interview' || post.type === 'learned') {
    return post.type;
  }

  const title = (post.title || '').trim();

  if (/^\d+\.\s*/.test(title)) {
    return 'interview';
  }

  return 'learned';
}

function detectPostLanguage(post) {
  if (post.language === 'en' || post.language === 'nl') {
    return post.language;
  }

  const explicitLanguage = getExplicitPostLanguage(post);

  if (explicitLanguage) {
    return explicitLanguage;
  }

  const categoryText = (post.categories || []).join(' ').toLowerCase();
  const title = (post.title || '').toLowerCase();
  const description = cleanHTML(post.description || '').toLowerCase();
  const content = `${categoryText} ${title} ${description}`;

  const dutchSignals = [
    ' de ', ' het ', ' een ', ' van ', ' voor ', ' met ', ' niet ', ' wel ',
    ' zijn ', ' haar ', ' hoe ', ' waarom ', ' wat ', ' dit ', ' deze ',
    ' gesprek ', ' interview met ', ' ik ', ' je ', ' we '
  ];

  const englishSignals = [
    ' the ', ' and ', ' with ', ' from ', ' about ', ' this ', ' that ',
    ' how ', ' why ', ' what ', ' interview ', ' conversation ', ' i ', ' you '
  ];

  let dutchScore = 0;
  let englishScore = 0;

  dutchSignals.forEach((signal) => {
    if (content.includes(signal)) dutchScore += 1;
  });

  englishSignals.forEach((signal) => {
    if (content.includes(signal)) englishScore += 1;
  });

  return dutchScore > englishScore ? 'nl' : 'en';
}

function getExplicitPostLanguage(post) {
  const categories = (post.categories || []).map((category) => normalizeCategory(category));

  for (const [language, acceptedCategories] of Object.entries(BEEHIIV_CONFIG.languageCategoryMap)) {
    if (acceptedCategories.some((category) => categories.includes(category))) {
      return language;
    }
  }

  return null;
}

function normalizeCategory(category) {
  return String(category || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function filterPostsForSiteLanguage(posts) {
  return posts.filter((post) => detectPostLanguage(post) === BEEHIIV_CONFIG.siteLanguage);
}

// =========================================
// EXTRACT FEATURED IMAGE FROM POST
// =========================================

function extractFeaturedImage(post) {
  if (post.enclosure && post.enclosure.link) {
    return post.enclosure.link;
  }

  if (post.thumbnail) {
    return post.thumbnail;
  }

  const imgRegex = /<img[^>]+src=["']([^"'>]+)["']/;
  const match = (post.description && post.description.match(imgRegex))
    || (post.content && post.content.match(imgRegex));

  if (match && match[1]) {
    return match[1];
  }

  return 'assets/images/post-placeholder.jpg';
}

// =========================================
// CLEAN HTML FROM DESCRIPTION
// =========================================

function cleanHTML(html) {
  if (!html) return '';

  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  const scripts = tmp.querySelectorAll('script, style');
  scripts.forEach((el) => el.remove());

  let text = tmp.textContent || tmp.innerText || '';
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

// =========================================
// FORMAT DATE
// =========================================

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// =========================================
// EXTRACT TAGS/CATEGORIES FROM POST
// =========================================

function extractTags(post) {
  if (post.categories && post.categories.length > 0) {
    const visibleCategories = post.categories.filter((category) => {
      const normalized = normalizeCategory(category);
      return !Object.values(BEEHIIV_CONFIG.languageCategoryMap).flat().includes(normalized);
    });

    if (visibleCategories.length > 0) {
      return visibleCategories.join(' · ');
    }
  }

  return getPostType(post) === 'interview' ? 'Interview' : 'Things I Learned';
}

// =========================================
// CREATE POST CARD HTML
// =========================================

function createPostCard(post) {
  const type = getPostType(post);
  const image = extractFeaturedImage(post);
  const cleanExcerpt = cleanHTML(post.description).substring(0, 180) + '...';
  const formattedDate = formatDate(post.pubDate);
  const tags = extractTags(post);

  const badge = type === 'interview'
    ? { class: 's-badge-i', label: 'Interview' }
    : { class: 's-badge-l', label: 'Things I Learned' };

  return `
    <a class="s-card" data-type="${type}" data-date="${post.pubDate}" href="${post.link}">
      <div class="s-img-wrap">
        <div class="s-badge ${badge.class}">${badge.label}</div>
        <img class="s-img" src="${image}" alt="${post.title}" loading="lazy" onerror="this.src='assets/images/post-placeholder.jpg'">
      </div>
      <div class="s-meta">
        <div class="s-tag">${tags}</div>
        <div class="s-date">${formattedDate}</div>
      </div>
      <h3 class="s-title">${post.title}</h3>
      <p class="s-excerpt">${cleanExcerpt}</p>
      <div class="s-read">
        Read edition &rarr;
      </div>
    </a>
  `;
}

// =========================================
// HOMEPAGE SPLIT VIEW
// =========================================

function createHomepageSplitCard(post, variant = 'featured') {
  const type = getPostType(post);
  const image = extractFeaturedImage(post);
  const excerptLength = variant === 'featured' ? 180 : 110;
  const excerpt = cleanHTML(post.description).substring(0, excerptLength) + '...';
  const formattedDate = formatDate(post.pubDate);
  const tags = extractTags(post);
  const badgeLabel = type === 'interview' ? 'Interview' : 'Things I Learned';

  return `
    <a class="ih-post-card ${variant}" href="${post.link}">
      <div class="ih-post-media">
        <img src="${image}" alt="${post.title}" loading="lazy" onerror="this.src='assets/images/post-placeholder.jpg'">
      </div>
      <div class="ih-post-copy">
        <div class="ih-post-meta">
          <div class="ih-post-kicker">${tags}</div>
          <div class="ih-post-date">${formattedDate}</div>
        </div>
        <div class="ih-post-badge ${type}">${badgeLabel}</div>
        <h3 class="ih-post-title">${post.title}</h3>
        <p class="ih-post-excerpt">${excerpt}</p>
        <div class="ih-post-read">Read edition &rarr;</div>
      </div>
    </a>
  `;
}

function renderHomepageSplitPosts(posts) {
  const interviewsContainer = document.getElementById('latestInterviews');
  const learnedContainer = document.getElementById('latestLearned');

  if (!interviewsContainer || !learnedContainer) {
    return false;
  }

  const interviews = posts.filter((post) => getPostType(post) === 'interview');
  const learned = posts.filter((post) => getPostType(post) === 'learned');

  const interviewPreview = interviews.slice(0, 3);
  const learnedPreview = learned.slice(0, 3);

  interviewsContainer.innerHTML = interviewPreview.length > 0
    ? interviewPreview.map((post, index) => createHomepageSplitCard(post, index === 0 ? 'featured' : 'compact')).join('')
    : `
      <div class="ih-latest-empty">
        No interviews found yet. Check back soon for the next conversation.
      </div>
    `;

  learnedContainer.innerHTML = learnedPreview.length > 0
    ? learnedPreview.map((post, index) => createHomepageSplitCard(post, index === 0 ? 'featured' : 'compact')).join('')
    : `
      <div class="ih-latest-empty">
        No essays found yet. Check back soon for the next idea worth understanding.
      </div>
    `;

  console.log(`Rendered homepage split preview from ${posts.length} total posts`);
  return true;
}

// =========================================
// RENDER POSTS TO PAGE
// =========================================

function renderPosts(posts, containerId) {
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`Container #${containerId} not found`);
    return;
  }

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="no-posts">
        <p class="no-posts-title">No posts found</p>
        <p class="no-posts-desc">Check back soon for new editions!</p>
      </div>
    `;
    return;
  }

  const postsHTML = posts.map((post) => createPostCard(post)).join('');
  container.innerHTML = postsHTML;

  console.log(`Rendered ${posts.length} posts to #${containerId}`);
}

// =========================================
// LOAD LATEST POSTS (for homepage)
// =========================================

async function loadLatestPosts(limit = null) {
  console.log('Loading latest posts...');
  const posts = filterPostsForSiteLanguage(await fetchBeehiivPosts(limit));

  if (!renderHomepageSplitPosts(posts)) {
    renderPosts(limit ? posts.slice(0, limit) : posts.slice(0, 3), 'latestPosts');
  }
}

// =========================================
// LOAD ALL POSTS (for blog page)
// =========================================

let allPostsCache = [];
let displayedCount = 9;
let currentFilter = 'all';

async function loadAllPosts() {
  console.log('Loading all posts...');
  allPostsCache = filterPostsForSiteLanguage(await fetchBeehiivPosts());
  displayPostsWithPagination();
}

function displayPostsWithPagination() {
  let filteredPosts = allPostsCache;

  if (currentFilter !== 'all') {
    filteredPosts = allPostsCache.filter((post) => getPostType(post) === currentFilter);
  }

  const postsToShow = filteredPosts.slice(0, displayedCount);
  renderPosts(postsToShow, 'allPosts');

  const loadMoreWrap = document.querySelector('.load-more-wrap');
  if (loadMoreWrap) {
    loadMoreWrap.style.display = displayedCount < filteredPosts.length ? 'block' : 'none';
  }

  console.log(`Showing ${postsToShow.length} of ${filteredPosts.length} posts`);
}

// =========================================
// FILTER FUNCTIONALITY
// =========================================

function setupFilters() {
  const filterButtons = document.querySelectorAll('.ftab');

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      filterButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');

      currentFilter = button.dataset.filter;
      displayedCount = 9;
      displayPostsWithPagination();
    });
  });

  console.log('Filters initialized');
}

// =========================================
// LOAD MORE FUNCTIONALITY
// =========================================

document.addEventListener('DOMContentLoaded', () => {
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      displayedCount += 9;
      displayPostsWithPagination();
    });
  }
});

// =========================================
// AUTO-INITIALIZE ON HOMEPAGE
// =========================================

if (document.getElementById('latestPosts') || document.getElementById('latestInterviews')) {
  console.log('Homepage detected - loading latest posts');
  document.addEventListener('DOMContentLoaded', () => {
    loadLatestPosts();
  });
}

// =========================================
// SEARCH FUNCTIONALITY (Optional Enhancement)
// =========================================

function setupSearch() {
  const searchInput = document.getElementById('searchInput');

  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();

    if (query.length === 0) {
      displayPostsWithPagination();
      return;
    }

    const searchResults = allPostsCache.filter((post) => {
      const searchText = `${post.title} ${post.description}`.toLowerCase();
      return searchText.includes(query);
    });

    renderPosts(searchResults, 'allPosts');
  });
}

// =========================================
// ERROR HANDLING & DEBUGGING
// =========================================

window.addEventListener('error', (e) => {
  console.error('JavaScript Error:', e.message);
});

console.log('Beehiiv Configuration:', {
  publication: BEEHIIV_CONFIG.publicationName,
  feedUrl: BEEHIIV_CONFIG.feedUrl,
  cacheDuration: `${CACHE_DURATION / 1000 / 60} minutes`
});
