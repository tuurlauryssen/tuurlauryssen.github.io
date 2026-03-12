// =========================================
// BEEHIIV RSS FEED INTEGRATION
// =========================================

const BEEHIIV_CONFIG = {
  // IMPORTANT: Replace 'tuurlauryssen' with your actual Beehiiv publication name
  publicationName: 'tuurlauryssen',

  get feedUrl() {
    return `https://${this.publicationName}.beehiiv.com/feed`;
  },

  // RSS to JSON proxy
  get apiUrl() {
    return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(this.feedUrl)}&api_key=YOUR_API_KEY_HERE`;
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
    const response = await fetch(BEEHIIV_CONFIG.apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'ok') {
      throw new Error(`RSS feed error: ${data.message || 'Unknown error'}`);
    }

    const posts = data.items || [];
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

// =========================================
// DETERMINE POST TYPE (Interview vs Learned)
// =========================================

function getPostType(post) {
  const title = (post.title || '').toLowerCase();
  const description = (post.description || '').toLowerCase();
  const content = `${title} ${description}`;

  const interviewKeywords = [
    'interview',
    'conversation',
    'gesprek',
    'sit down with',
    'talking with'
  ];

  for (const keyword of interviewKeywords) {
    if (content.includes(keyword)) {
      return 'interview';
    }
  }

  return 'learned';
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
    return post.categories.join(' · ');
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
    <article class="s-card" data-type="${type}" data-date="${post.pubDate}">
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
      <a class="s-read" href="${post.link}" target="_blank" rel="noopener noreferrer">
        Read edition &rarr;
      </a>
    </article>
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
    <a class="ih-post-card ${variant}" href="${post.link}" target="_blank" rel="noopener noreferrer">
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
  const posts = await fetchBeehiivPosts(limit);

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
  allPostsCache = await fetchBeehiivPosts();
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
