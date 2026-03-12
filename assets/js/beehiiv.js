// =========================================
// BEEHIIV RSS FEED INTEGRATION
// =========================================

const BEEHIIV_CONFIG = {
  // Replace with your actual Beehiiv publication name
  publicationName: 'tuurlauryssen',
  
  // RSS feed URL
  get feedUrl() {
    return `https://${this.publicationName}.beehiiv.com/feed`;
  },
  
  // Use RSS to JSON API service (free, no API key needed)
  get apiUrl() {
    return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(this.feedUrl)}`;
  }
};

// =========================================
// FETCH POSTS FROM BEEHIIV RSS
// =========================================
async function fetchBeehiivPosts(limit = null) {
  try {
    const response = await fetch(BEEHIIV_CONFIG.apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'ok') {
      throw new Error('RSS feed error');
    }
    
    let posts = data.items || [];
    
    // Limit posts if specified
    if (limit) {
      posts = posts.slice(0, limit);
    }
    
    return posts;
  } catch (error) {
    console.error('Error fetching Beehiiv posts:', error);
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
  const interviewKeywords = ['interview', 'conversation', 'gesprek', '🎙'];
  
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
  
  // Try to extract first image from description/content
  const imgRegex = /<img[^>]+src="([^">]+)"/;
  const match = post.description.match(imgRegex) || post.content?.match(imgRegex);
  
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
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// =========================================
// CREATE POST CARD HTML
// =========================================
function createPostCard(post) {
  const type = getPostType(post);
  const image = extractFeaturedImage(post);
  const cleanExcerpt = cleanHTML(post.description).substring(0, 150) + '...';
  const postDate = new Date(post.pubDate);
  const formattedDate = postDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  // Badge configuration
  const badge = type === 'interview' 
    ? { class: 's-badge-i', icon: '🎙', label: 'Interview' }
    : { class: 's-badge-l', icon: '📖', label: 'Things I Learned' };
  
  return `
    <div class="s-card" data-type="${type}" data-date="${post.pubDate}">
      <div class="s-img-wrap">
        <div class="s-badge ${badge.class}">${badge.icon} ${badge.label}</div>
        <img class="s-img" src="${image}" alt="${post.title}" loading="lazy">
      </div>
      <div class="s-meta">
        <div class="s-date">${formattedDate}</div>
      </div>
      <h3 class="s-title">${post.title}</h3>
      <p class="s-excerpt">${cleanExcerpt}</p>
      <a class="s-read" href="${post.link}" target="_blank" rel="noopener">
        Read edition →
      </a>
    </div>
  `;
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
        <p>No posts found. Check back soon!</p>
      </div>
    `;
    return;
  }
  
  const postsHTML = posts.map(post => createPostCard(post)).join('');
  container.innerHTML = postsHTML;
}

// =========================================
// LOAD LATEST POSTS (for homepage)
// =========================================
async function loadLatestPosts(limit = 3) {
  const posts = await fetchBeehiivPosts(limit);
  renderPosts(posts, 'latestPosts');
}

// =========================================
// LOAD ALL POSTS (for blog page)
// =========================================
let allPostsCache = [];
let displayedCount = 9;

async function loadAllPosts() {
  allPostsCache = await fetchBeehiivPosts();
  displayPostsWithPagination();
}

function displayPostsWithPagination() {
  const postsToShow = allPostsCache.slice(0, displayedCount);
  renderPosts(postsToShow, 'allPosts');
  
  // Show/hide "Load More" button
  const loadMoreWrap = document.querySelector('.load-more-wrap');
  if (loadMoreWrap) {
    loadMoreWrap.style.display = displayedCount < allPostsCache.length ? 'block' : 'none';
  }
}

// =========================================
// FILTER FUNCTIONALITY
// =========================================
function setupFilters() {
  const filterButtons = document.querySelectorAll('.ftab');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Update active state
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Get filter type
      const filterType = button.dataset.filter;
      
      // Filter posts
      const cards = document.querySelectorAll('.s-card');
      cards.forEach(card => {
        if (filterType === 'all' || card.dataset.type === filterType) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
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
if (document.getElementById('latestPosts')) {
  loadLatestPosts(3);
}