// =========================================
// BEEHIIV RSS FEED INTEGRATION
// =========================================

const BEEHIIV_CONFIG = {
  // ⚠️ IMPORTANT: Replace 'tuurlauryssen' with your actual Beehiiv publication name
  // Find this in your Beehiiv dashboard URL: https://[YOUR-NAME].beehiiv.com
  publicationName: 'tuurlauryssen',
  
  // RSS feed URL
  get feedUrl() {
    return `https://${this.publicationName}.beehiiv.com/feed`;
  },
  
  // Use RSS to JSON API service (free, no API key needed)
  get apiUrl() {
    return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(this.feedUrl)}&api_key=YOUR_API_KEY_HERE`;
  }
};

// =========================================
// CACHE CONFIGURATION
// =========================================
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
let cachedPosts = null;
let cacheTime = null;

// =========================================
// FETCH POSTS FROM BEEHIIV RSS
// =========================================
async function fetchBeehiivPosts(limit = null) {
  // Check cache first
  if (cachedPosts && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
    console.log('📦 Using cached posts');
    return limit ? cachedPosts.slice(0, limit) : cachedPosts;
  }
  
  try {
    console.log('🔄 Fetching posts from Beehiiv...');
    const response = await fetch(BEEHIIV_CONFIG.apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'ok') {
      throw new Error('RSS feed error: ' + (data.message || 'Unknown error'));
    }
    
    let posts = data.items || [];
    console.log(`✅ Fetched ${posts.length} posts`);
    
    // Update cache
    cachedPosts = posts;
    cacheTime = Date.now();
    
    // Limit posts if specified
    return limit ? posts.slice(0, limit) : posts;
    
  } catch (error) {
    console.error('❌ Error fetching Beehiiv posts:', error);
    
    // Return cached posts if available, even if expired
    if (cachedPosts) {
      console.log('⚠️ Using stale cache due to error');
      return limit ? cachedPosts.slice(0, limit) : cachedPosts;
    }
    
    return [];
  }
}

// =========================================
// DETERMINE POST TYPE (Interview vs Learned)
// =========================================
function getPostType(post) {
  const title = post.title.toLowerCase();
  const description = post.description.toLowerCase();
  const content = (title + ' ' + description);
  
  // Keywords that indicate an interview
  const interviewKeywords = [
    'interview',
    'conversation',
    'gesprek',
    'sit down with',
    'talking with',
    '🎙'
  ];
  
  for (let keyword of interviewKeywords) {
    if (content.includes(keyword)) {
      return 'interview';
    }
  }
  
  return 'learned'; // Default to "Things I Learned"
}

// =========================================
// EXTRACT FEATURED IMAGE FROM POST
// =========================================
function extractFeaturedImage(post) {
  // Try to get image from enclosure (RSS standard)
  if (post.enclosure && post.enclosure.link) {
    return post.enclosure.link;
  }
  
  // Try to get from thumbnail
  if (post.thumbnail) {
    return post.thumbnail;
  }
  
  // Try to extract first image from description/content
  const imgRegex = /<img[^>]+src=["']([^"'>]+)["']/;
  const match = post.description.match(imgRegex) || (post.content && post.content.match(imgRegex));
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Fallback placeholder
  return 'assets/images/post-placeholder.jpg';
}

// =========================================
// CLEAN HTML FROM DESCRIPTION
// =========================================
function cleanHTML(html) {
  if (!html) return '';
  
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  
  // Remove script and style tags
  const scripts = tmp.querySelectorAll('script, style');
  scripts.forEach(el => el.remove());
  
  // Get text content
  let text = tmp.textContent || tmp.innerText || '';
  
  // Clean up whitespace
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
  
  // If less than 7 days ago, show relative time
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  
  // Otherwise show formatted date
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
  // Try to get categories from RSS
  if (post.categories && post.categories.length > 0) {
    return post.categories.join(' · ');
  }
  
  // Fallback: try to extract from title or description
  const type = getPostType(post);
  return type === 'interview' ? 'Interview' : 'Things I Learned';
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
  
  // Badge configuration
  const badge = type === 'interview' 
    ? { class: 's-badge-i', icon: '🎙', label: 'Interview' }
    : { class: 's-badge-l', icon: '📖', label: 'Things I Learned' };
  
  return `
    <article class="s-card" data-type="${type}" data-date="${post.pubDate}">
      <div class="s-img-wrap">
        <div class="s-badge ${badge.class}">${badge.icon} ${badge.label}</div>
        <img class="s-img" src="${image}" alt="${post.title}" loading="lazy" onerror="this.src='assets/images/post-placeholder.jpg'">
      </div>
      <div class="s-meta">
        <div class="s-tag">${tags}</div>
        <div class="s-date">${formattedDate}</div>
      </div>
      <h3 class="s-title">${post.title}</h3>
      <p class="s-excerpt">${cleanExcerpt}</p>
      <a class="s-read" href="${post.link}" target="_blank" rel="noopener noreferrer">
        Read edition →
      </a>
    </article>
  `;
}

// =========================================
// RENDER POSTS TO PAGE
// =========================================
function renderPosts(posts, containerId) {
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.error(`❌ Container #${containerId} not found`);
    return;
  }
  
  if (posts.length === 0) {
    container.innerHTML = `
      <div class="no-posts">
        <p class="no-posts-icon">📭</p>
        <p class="no-posts-title">No posts found</p>
        <p class="no-posts-desc">Check back soon for new editions!</p>
      </div>
    `;
    return;
  }
  
  const postsHTML = posts.map(post => createPostCard(post)).join('');
  container.innerHTML = postsHTML;
  
  console.log(`✅ Rendered ${posts.length} posts to #${containerId}`);
}

// =========================================
// LOAD LATEST POSTS (for homepage)
// =========================================
async function loadLatestPosts(limit = 3) {
  console.log(`📖 Loading latest ${limit} posts...`);
  const posts = await fetchBeehiivPosts(limit);
  renderPosts(posts, 'latestPosts');
}

// =========================================
// LOAD ALL POSTS (for blog page)
// =========================================
let allPostsCache = [];
let displayedCount = 9;
let currentFilter = 'all';

async function loadAllPosts() {
  console.log('📖 Loading all posts...');
  allPostsCache = await fetchBeehiivPosts();
  displayPostsWithPagination();
}

function displayPostsWithPagination() {
  // Filter posts based on current filter
  let filteredPosts = allPostsCache;
  
  if (currentFilter !== 'all') {
    filteredPosts = allPostsCache.filter(post => getPostType(post) === currentFilter);
  }
  
  // Get posts to show
  const postsToShow = filteredPosts.slice(0, displayedCount);
  renderPosts(postsToShow, 'allPosts');
  
  // Show/hide "Load More" button
  const loadMoreWrap = document.querySelector('.load-more-wrap');
  if (loadMoreWrap) {
    loadMoreWrap.style.display = displayedCount < filteredPosts.length ? 'block' : 'none';
  }
  
  console.log(`📊 Showing ${postsToShow.length} of ${filteredPosts.length} posts`);
}

// =========================================
// FILTER FUNCTIONALITY
// =========================================
function setupFilters() {
  const filterButtons = document.querySelectorAll('.ftab');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      console.log(`🔍 Filter clicked: ${button.dataset.filter}`);
      
      // Update active state
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update current filter
      currentFilter = button.dataset.filter;
      
      // Reset displayed count
      displayedCount = 9;
      
      // Re-render with new filter
      displayPostsWithPagination();
    });
  });
  
  console.log('✅ Filters initialized');
}

// =========================================
// LOAD MORE FUNCTIONALITY
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      console.log('➕ Load more clicked');
      displayedCount += 9;
      displayPostsWithPagination();
    });
  }
});

// =========================================
// AUTO-INITIALIZE ON HOMEPAGE
// =========================================
if (document.getElementById('latestPosts')) {
  console.log('🏠 Homepage detected - loading latest posts');
  document.addEventListener('DOMContentLoaded', () => {
    loadLatestPosts(3);
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
    
    const searchResults = allPostsCache.filter(post => {
      const searchText = (post.title + ' ' + post.description).toLowerCase();
      return searchText.includes(query);
    });
    
    renderPosts(searchResults, 'allPosts');
  });
}

// =========================================
// ERROR HANDLING & DEBUGGING
// =========================================
window.addEventListener('error', (e) => {
  console.error('❌ JavaScript Error:', e.message);
});

// Log configuration on load
console.log('⚙️ Beehiiv Configuration:', {
  publication: BEEHIIV_CONFIG.publicationName,
  feedUrl: BEEHIIV_CONFIG.feedUrl,
  cacheDuration: `${CACHE_DURATION / 1000 / 60} minutes`
});
