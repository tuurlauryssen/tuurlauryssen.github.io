/*
  File role: Loads local post data and renders posts on the homepage and archive page.
  Project relation: Reads posts.json, fills index.html and blog.html,
  and links those cards to the processed article files inside /posts.
*/

// =========================================
// LOCAL POST DATA INTEGRATION
// =========================================

const PAGE_CONFIG = window.INSPIRE_PAGE_CONFIG || {};
const PAGE_STRINGS = {
  siteLocale: PAGE_CONFIG.locale || 'en-US',
  today: 'Today',
  yesterday: 'Yesterday',
  daysAgo: '{count} days ago',
  interview: 'Interview',
  thingsILearned: 'Things I Learned',
  readEdition: 'Read edition',
  metricReadTime: 'Read',
  metricLikes: 'Likes',
  metricReads: 'Reads',
  noInterviewsTitle: 'No interviews found yet.',
  noInterviewsDesc: 'Check back soon for the next conversation.',
  noEssaysTitle: 'No essays found yet.',
  noEssaysDesc: 'Check back soon for the next idea worth understanding.',
  noPostsTitle: 'No posts found',
  noPostsDesc: 'Check back soon for new editions!'
};
Object.assign(PAGE_STRINGS, PAGE_CONFIG.beehiivStrings || {});

const BEEHIIV_CONFIG = {
  localPostsUrl: PAGE_CONFIG.postsDataUrl || 'assets/data/posts.json',
  siteLanguage: PAGE_CONFIG.language || 'en',
  postLinkPrefix: PAGE_CONFIG.postLinkPrefix || '',
  languageCategoryMap: {
    en: ['en', 'english'],
    nl: ['nl', 'dutch', 'nederlands']
  }
};

// =========================================
// CACHE CONFIGURATION
// =========================================

const CACHE_DURATION = 10 * 60 * 1000;
let cachedPosts = null;
let cacheTime = null;
const POST_COMMUNITY_CACHE = new Map();
const POST_READ_SUMMARY_CACHE = new Map();

// =========================================
// FETCH POSTS FROM LOCAL DATA
// =========================================

async function fetchBeehiivPosts(limit = null) {
  if (cachedPosts && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
    return limit ? cachedPosts.slice(0, limit) : cachedPosts;
  }

  try {
    const posts = await fetchLocalPosts();
    cachedPosts = posts;
    cacheTime = Date.now();

    return limit ? posts.slice(0, limit) : posts;
  } catch (error) {
    console.error('Error fetching local posts:', error);

    if (cachedPosts) {
      return limit ? cachedPosts.slice(0, limit) : cachedPosts;
    }

    return [];
  }
}

async function fetchLocalPosts() {
  if (Array.isArray(window.INSPIRE_LOCAL_POSTS)) {
    return window.INSPIRE_LOCAL_POSTS
      .map(mapLocalPost)
      .filter(Boolean)
      .sort(comparePosts);
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
    .sort(comparePosts);
}

function mapLocalPost(entry) {
  if (!entry || !entry.title || !entry.slug || !entry.language || !entry.type || !entry.pubDate) {
    return null;
  }

  const typeDirectory = entry.type === 'interview' ? 'interviews' : 'ideas';
  const path = resolvePostLink(entry.path || `posts/${typeDirectory}/${entry.language}/${entry.slug}.html`);
  const categories = Array.isArray(entry.categories) ? entry.categories : [];
  const normalizedCategories = [...new Set([entry.language, ...categories])];
  const excerpt = entry.excerpt || entry.description || '';
  const image = entry.image || '';
  const visibility = normalizePostVisibility(entry);

  return {
    title: entry.title,
    slug: entry.slug,
    link: path,
    articlePath: path,
    articleTitle: entry.title,
    pubDate: entry.pubDate,
    updatedAt: entry.updatedAt || '',
    description: excerpt,
    content: excerpt,
    categories: normalizedCategories,
    thumbnail: image,
    enclosure: image ? { link: image } : null,
    type: entry.type,
    language: entry.language,
    author: entry.author || '',
    sourceUrl: entry.sourceUrl || '',
    readTime: entry.readTime || '',
    likes: typeof entry.likes === 'number' ? entry.likes : null,
    reads: entry.reads || '',
    // visibility:
    // - public: show in homepage/archive
    // - hidden: keep direct URL working, but exclude from homepage/archive
    visibility
  };
}

function getPostMetrics(post) {
  return {
    readTime: typeof post.readTime === 'string' ? post.readTime.trim() : '',
    likes: typeof post.likes === 'number' ? String(post.likes) : ''
  };
}

function normalizeArticlePath(path) {
  if (typeof path !== 'string' || !path.trim()) {
    return '';
  }

  const trimmed = path.trim();
  if (/^(?:https?:)?\/\//.test(trimmed)) {
    try {
      return new URL(trimmed).pathname;
    } catch (error) {
      return '';
    }
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\.?\//, '')}`;
}

function createPostMetricsHtml(post, classNamePrefix) {
  const metrics = getPostMetrics(post);
  const items = [];
  const articlePath = normalizeArticlePath(post.articlePath || post.link);
  const articleTitle = typeof post.articleTitle === 'string' ? post.articleTitle.trim() : '';

  if (metrics.readTime) {
    items.push(`<div class="${classNamePrefix}-stat"><span>${PAGE_STRINGS.metricReadTime}</span> <strong>${metrics.readTime}</strong></div>`);
  }

  if (post.slug) {
    items.push(`<div class="${classNamePrefix}-stat" data-post-like-stat hidden><span>${PAGE_STRINGS.metricLikes}</span> <strong data-post-like-count></strong></div>`);
  }

  if (articlePath) {
    items.push(`<div class="${classNamePrefix}-stat" data-post-read-stat hidden><span>${PAGE_STRINGS.metricReads}</span> <strong data-post-read-count></strong></div>`);
  }

  if (items.length === 0) {
    return '';
  }

  const slugAttribute = post.slug ? ` data-post-slug="${post.slug}"` : '';
  const pathAttribute = articlePath ? ` data-post-path="${articlePath}"` : '';
  const titleAttribute = articleTitle ? ` data-post-title="${escapeHtml(articleTitle)}"` : '';
  return `<div class="${classNamePrefix}-stats" aria-label="Article metrics"${slugAttribute}${pathAttribute}${titleAttribute}>${items.join('')}</div>`;
}

async function fetchPostCommunitySummary(articleSlug) {
  if (!articleSlug) {
    return null;
  }

  if (POST_COMMUNITY_CACHE.has(articleSlug)) {
    return POST_COMMUNITY_CACHE.get(articleSlug);
  }

  const siteConfig = window.INSPIRE_SITE_CONFIG || {};
  const endpoint = siteConfig.communitySummaryEndpoint;
  if (!endpoint) {
    return null;
  }

  const request = fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      articleSlug
    })
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Community summary HTTP error: ${response.status}`);
      }

      return response.json();
    })
    .catch((error) => {
      POST_COMMUNITY_CACHE.delete(articleSlug);
      throw error;
    });

  POST_COMMUNITY_CACHE.set(articleSlug, request);
  return request;
}

async function fetchPostReadSummaries(articlePaths) {
  const normalizedEntries = [...new Map(
    (Array.isArray(articlePaths) ? articlePaths : [])
      .map((entry) => {
        const path = normalizeArticlePath(entry && entry.articlePath);
        const title = typeof entry?.articleTitle === 'string' ? entry.articleTitle.trim() : '';
        if (!path || !title) {
          return null;
        }

        return [path, { articlePath: path, articleTitle: title }];
      })
      .filter(Boolean)
  ).values()];

  if (normalizedEntries.length === 0) {
    return new Map();
  }

  const siteConfig = window.INSPIRE_SITE_CONFIG || {};
  const endpoint = siteConfig.readSummaryEndpoint;
  if (!endpoint) {
    return new Map();
  }

  const uncachedEntries = normalizedEntries.filter((entry) => !POST_READ_SUMMARY_CACHE.has(entry.articlePath));
  if (uncachedEntries.length > 0) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          articles: uncachedEntries
        })
      });

      if (!response.ok) {
        throw new Error(`Read summary HTTP error: ${response.status}`);
      }

      const payload = await response.json();
      const counts = payload && typeof payload === 'object' && payload.readCounts && typeof payload.readCounts === 'object'
        ? payload.readCounts
        : {};

      uncachedEntries.forEach(({ articlePath }) => {
        const value = Number(counts[articlePath]);
        POST_READ_SUMMARY_CACHE.set(articlePath, Number.isFinite(value) && value >= 0 ? value : null);
      });
    } catch (error) {
      uncachedEntries.forEach(({ articlePath }) => {
        POST_READ_SUMMARY_CACHE.set(articlePath, null);
      });
      throw error;
    }
  }

  return new Map(normalizedEntries.map(({ articlePath }) => [articlePath, POST_READ_SUMMARY_CACHE.get(articlePath)]));
}

async function hydratePostMetrics(root = document) {
  const metricGroups = [...root.querySelectorAll('[data-post-slug]')];
  if (metricGroups.length === 0) {
    return;
  }

  const articleEntries = metricGroups
    .map((group) => ({
      articlePath: group.getAttribute('data-post-path'),
      articleTitle: group.getAttribute('data-post-title')
    }))
    .filter((entry) => entry.articlePath && entry.articleTitle);

  let readCounts = new Map();
  try {
    readCounts = await fetchPostReadSummaries(articleEntries);
  } catch (error) {
    console.error('Unable to hydrate read counts', error);
  }

  await Promise.all(metricGroups.map(async (group) => {
    const articleSlug = group.getAttribute('data-post-slug');
    const articlePath = normalizeArticlePath(group.getAttribute('data-post-path') || '');
    const likeStatNode = group.querySelector('[data-post-like-stat]');
    const likeCountNode = group.querySelector('[data-post-like-count]');
    const readCountNode = group.querySelector('[data-post-read-count]');
    const readStatNode = group.querySelector('[data-post-read-stat]');
    if (!articleSlug || !likeCountNode) {
      return;
    }

    try {
      const summary = await fetchPostCommunitySummary(articleSlug);
      if (!summary || typeof summary.likeCount !== 'number') {
        return;
      }

      likeCountNode.textContent = String(summary.likeCount);
      if (likeStatNode) {
        likeStatNode.hidden = false;
      }
    } catch (error) {
      console.error(`Unable to hydrate metrics for ${articleSlug}`, error);
    }

    if (articlePath && readCountNode && readStatNode && readCounts.has(articlePath)) {
      const readCount = readCounts.get(articlePath);
      if (typeof readCount === 'number' && Number.isFinite(readCount)) {
        readCountNode.textContent = String(readCount);
        readStatNode.hidden = false;
      }
    }
  }));
}

function normalizePostVisibility(entry) {
  if (!entry || typeof entry !== 'object') {
    return 'public';
  }

  if (typeof entry.visibility === 'string') {
    const normalized = entry.visibility.trim().toLowerCase();
    if (normalized === 'hidden') return 'hidden';
    if (normalized === 'public') return 'public';
  }

  if (typeof entry.public_visibility === 'boolean') {
    return entry.public_visibility ? 'public' : 'hidden';
  }

  if (typeof entry.publicVisibility === 'boolean') {
    return entry.publicVisibility ? 'public' : 'hidden';
  }

  return 'public';
}

function resolvePostLink(path) {
  if (!path) return path;
  if (/^(?:https?:)?\/\//.test(path) || path.startsWith('/')) {
    return path;
  }

  return `${BEEHIIV_CONFIG.postLinkPrefix}${path}`;
}

function getInterviewNumber(post) {
  const title = String(post?.title || '').trim();
  const match = title.match(/^(\d+)\.\s*/);
  return match ? Number(match[1]) : null;
}

function comparePosts(a, b) {
  const dateDifference = new Date(b.pubDate) - new Date(a.pubDate);
  if (dateDifference !== 0) {
    return dateDifference;
  }

  const updatedAtDifference = new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  if (updatedAtDifference !== 0) {
    return updatedAtDifference;
  }

  const aType = getPostType(a);
  const bType = getPostType(b);
  const aInterviewNumber = aType === 'interview' ? getInterviewNumber(a) : null;
  const bInterviewNumber = bType === 'interview' ? getInterviewNumber(b) : null;

  if (aType === 'interview' && bType === 'interview' && aInterviewNumber !== null && bInterviewNumber !== null && aInterviewNumber !== bInterviewNumber) {
    return bInterviewNumber - aInterviewNumber;
  }

  return String(a.title || '').localeCompare(String(b.title || ''));
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
  return posts.filter((post) => (
    detectPostLanguage(post) === BEEHIIV_CONFIG.siteLanguage
    && (post.visibility || 'public') === 'public'
  ));
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
    return PAGE_STRINGS.today;
  }

  if (diffDays === 1) {
    return PAGE_STRINGS.yesterday;
  }

  if (diffDays < 7) {
    return PAGE_STRINGS.daysAgo.replace('{count}', diffDays);
  }

  return date.toLocaleDateString(PAGE_STRINGS.siteLocale, {
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

  return getPostType(post) === 'interview' ? PAGE_STRINGS.interview : PAGE_STRINGS.thingsILearned;
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
    ? { class: 's-badge-i', label: PAGE_STRINGS.interview }
    : { class: 's-badge-l', label: PAGE_STRINGS.thingsILearned };

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
      ${createPostMetricsHtml(post, 's')}
      <div class="s-read">
        ${PAGE_STRINGS.readEdition} &rarr;
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
  const badgeLabel = type === 'interview' ? PAGE_STRINGS.interview : PAGE_STRINGS.thingsILearned;

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
        ${createPostMetricsHtml(post, 'ih-post')}
        <div class="ih-post-read">${PAGE_STRINGS.readEdition} &rarr;</div>
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

  const sortPostsForDisplay = (items) => items
    .slice()
    .sort(comparePosts);

  const interviews = sortPostsForDisplay(posts.filter((post) => getPostType(post) === 'interview'));
  const learned = sortPostsForDisplay(posts.filter((post) => getPostType(post) === 'learned'));

  const interviewPreview = interviews.slice(0, 2);
  const learnedPreview = learned.slice(0, 2);

  interviewsContainer.innerHTML = interviewPreview.length > 0
    ? interviewPreview.map((post) => createHomepageSplitCard(post, 'compact')).join('')
    : `
      <div class="ih-latest-empty">
        ${PAGE_STRINGS.noInterviewsTitle} ${PAGE_STRINGS.noInterviewsDesc}
      </div>
    `;

  learnedContainer.innerHTML = learnedPreview.length > 0
    ? learnedPreview.map((post) => createHomepageSplitCard(post, 'compact')).join('')
    : `
      <div class="ih-latest-empty">
        ${PAGE_STRINGS.noEssaysTitle} ${PAGE_STRINGS.noEssaysDesc}
      </div>
    `;

  hydratePostMetrics(interviewsContainer);
  hydratePostMetrics(learnedContainer);
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
        <p class="no-posts-title">${PAGE_STRINGS.noPostsTitle}</p>
        <p class="no-posts-desc">${PAGE_STRINGS.noPostsDesc}</p>
      </div>
    `;
    return;
  }

  const postsHTML = posts.map((post) => createPostCard(post)).join('');
  container.innerHTML = postsHTML;

  hydratePostMetrics(container);
  console.log(`Rendered ${posts.length} posts to #${containerId}`);
}

// =========================================
// LOAD LATEST POSTS (for homepage)
// =========================================

async function loadLatestPosts(limit = null) {
  console.log('Loading latest posts...');
  const posts = filterPostsForSiteLanguage(await fetchBeehiivPosts());

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

      if (window.siteUtils && typeof window.siteUtils.trackAnalyticsEvent === 'function') {
        window.siteUtils.trackAnalyticsEvent('archive_filter_selected', {
          filter_name: currentFilter
        });
      }
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
  document.addEventListener('DOMContentLoaded', () => {
    loadLatestPosts();
  });
}

if (document.getElementById('allPosts')) {
  document.addEventListener('DOMContentLoaded', () => {
    loadAllPosts();
    setupFilters();
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

console.log('Local post configuration:', {
  localPostsUrl: BEEHIIV_CONFIG.localPostsUrl,
  cacheDuration: `${CACHE_DURATION / 1000 / 60} minutes`,
  siteLanguage: BEEHIIV_CONFIG.siteLanguage
});
