# INSPIRE Newsletter Website

A professional GitHub Pages blog that automatically integrates with your Beehiiv newsletter.

## 🚀 Quick Start

### 1. Setup Repository
```bash
# Create a new repository on GitHub named: username.github.io
# Clone it to your computer
git clone https://github.com/YOUR-USERNAME/YOUR-USERNAME.github.io.git
cd YOUR-USERNAME.github.io
```

### 2. Add Project Files

Copy these files into your repository:

```
your-repo/
├── index.html
├── blog.html
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── main.js
│   │   └── beehiiv.js
│   └── images/
│       ├── favicon.png
│       └── post-placeholder.jpg
└── README.md
```

### 3. Configure Beehiiv Integration

**CRITICAL:** Edit `assets/js/beehiiv.js`:

```javascript
const BEEHIIV_CONFIG = {
  publicationName: 'YOUR-PUBLICATION-NAME', // ⚠️ CHANGE THIS!
  // ...
};
```

Find your publication name:
1. Go to your Beehiiv dashboard
2. Look at your URL: `https://[YOUR-NAME].beehiiv.com`
3. Use the `[YOUR-NAME]` part

### 4. Get RSS2JSON API Key (Optional but Recommended)

1. Go to [rss2json.com](https://rss2json.com/)
2. Sign up for free account
3. Get your API key
4. Add it to `beehiiv.js`:

```javascript
get apiUrl() {
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(this.feedUrl)}&api_key=YOUR_API_KEY_HERE`;
}
```

**Free tier:** 10,000 requests/day (more than enough for most sites)

### 5. Customize Your Content

#### Update Personal Information

**In `index.html`:**
- Replace Beehiiv subscription URLs
- Update stats (subscribers, editions, etc.)
- Change Tally form embed
- Update social links
- Modify hero image URL

**Example:**
```html
<!-- Find and replace -->
<form action="https://YOUR-PUBLICATION.beehiiv.com/subscribe" method="post">
```

#### Update Contact Form

Get a free Tally.so form:
1. Go to [tally.so](https://tally.so)
2. Create free account
3. Build form: Name, Email, Subject, Message
4. Get embed code
5. Replace in `index.html` contact section

### 6. Deploy to GitHub Pages

```bash
git add .
git commit -m "Initial setup"
git push origin main
```

### 7. Enable GitHub Pages

1. Go to repository **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **/ (root)**
4. Click **Save**

### 8. Wait for Deployment

- Visit `https://YOUR-USERNAME.github.io`
- First deployment: 1-5 minutes
- Subsequent updates: 1-2 minutes

---

## ⚙️ Configuration Checklist

### Essential Updates

- [ ] Update `BEEHIIV_CONFIG.publicationName` in `beehiiv.js`
- [ ] Add RSS2JSON API key (optional but recommended)
- [ ] Replace Beehiiv subscription form URLs
- [ ] Update Tally contact form embed
- [ ] Change hero image URL
- [ ] Update stats numbers
- [ ] Customize footer links
- [ ] Add favicon image

### Optional Enhancements

- [ ] Add custom domain (see guide below)
- [ ] Set up Google Analytics
- [ ] Add social media meta tags
- [ ] Create 404 error page
- [ ] Add robots.txt and sitemap.xml

---

## 📁 File Structure Explained

### Core HTML Files

**`index.html`** - Homepage
- Hero section
- About section
- Format cards (Interview / Learned)
- Latest 3 posts from Beehiiv
- Pull quote
- Contact form
- Footer

**`blog.html`** - Full Archive
- All posts from Beehiiv
- Filter by type (Interview / Learned)
- Pagination ("Load More")
- Search functionality (optional)

### JavaScript Files

**`assets/js/beehiiv.js`** - Beehiiv Integration
- Fetches posts from RSS feed
- Caches posts (10-minute duration)
- Determines post type
- Renders post cards
- Handles filtering and pagination

**`assets/js/main.js`** - Site Functionality
- Custom cursor animation
- Scroll progress bar
- Scroll reveal animations
- Parallax effects
- Smooth scrolling
- Form validation
- Lazy loading

### CSS Files

**`assets/css/style.css`** - All Styles
- Design system variables
- Component styles
- Responsive breakpoints
- Animations

---

## 🔧 Customization Guide

### Change Color Scheme

Edit CSS variables in `style.css`:

```css
:root {
  --navy:   #1B2C45;  /* Primary color */
  --beige:  #F5F0E8;  /* Background */
  --beige2: #EAE3D5;  /* Secondary background */
  --muted:  #6B7280;  /* Text muted */
  /* ... */
}
```

### Add Custom Fonts

1. Get font from Google Fonts
2. Add to `<head>` in HTML files
3. Update font-family in CSS

### Modify Post Card Layout

Edit `createPostCard()` function in `beehiiv.js`

### Change Posts Per Page

```javascript
// In beehiiv.js
let displayedCount = 9; // Change this number
```

---

## 🌐 Custom Domain Setup

### Option 1: Using GitHub Pages + Custom Domain

1. Buy domain (Namecheap, Google Domains, etc.)
2. Create file `CNAME` in repository root:
   ```
   yourdomain.com
   ```
3. Add DNS records in your domain provider:
   ```
   Type: A
   Host: @
   Value: 185.199.108.153
   
   Type: A
   Host: @
   Value: 185.199.109.153
   
   Type: A
   Host: @
   Value: 185.199.110.153
   
   Type: A
   Host: @
   Value: 185.199.111.153
   ```
4. Wait 24-48 hours for DNS propagation
5. Enable HTTPS in Settings → Pages

### Option 2: Using Subdomain

```
Type: CNAME
Host: blog
Value: your-username.github.io
```

Access at: `blog.yourdomain.com`

---

## 🎨 Adding Images

### Post Placeholder Image

Create `assets/images/post-placeholder.jpg`:
- Recommended size: 1200 x 800px
- Used when Beehiiv posts lack images

### Favicon

Create `assets/images/favicon.png`:
- Size: 32 x 32px or 512 x 512px
- Format: PNG with transparency

### Hero Image

Replace hero image URL in `index.html`:
```html
<img src="YOUR-IMAGE-URL" alt="Description">
```

---

## 🔍 SEO Optimization

### Add Meta Tags

Already included in `index.html` and `blog.html`:
- Title tags
- Description meta tags
- Open Graph tags for social sharing

### Create sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://your-site.github.io/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://your-site.github.io/blog.html</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Create robots.txt

```
User-agent: *
Allow: /

Sitemap: https://your-site.github.io/sitemap.xml
```

---

## 📊 Analytics Setup

### Google Analytics 4

1. Create GA4 property
2. Get measurement ID
3. Add to `<head>` in HTML files:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Plausible Analytics (Privacy-friendly)

```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

---

## 🐛 Troubleshooting

### Posts Not Loading

**Check browser console (F12):**
- Look for errors
- Verify API calls are successful

**Verify configuration:**
```javascript
// In beehiiv.js - check this is correct
publicationName: 'your-actual-publication-name'
```

**Test RSS feed directly:**
- Visit: `https://your-publication.beehiiv.com/feed`
- Should show XML content

### Images Not Showing

- Ensure Beehiiv post images are publicly accessible
- Check placeholder image exists: `assets/images/post-placeholder.jpg`
- Verify image URLs in posts

### Site Not Updating

- GitHub Pages updates in 1-2 minutes
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Check Actions tab in GitHub for deployment status

### RSS2JSON Limit Reached

Free tier: 10,000 requests/day

If exceeded:
- Wait for reset (daily)
- Upgrade to paid plan
- Implement server-side RSS parser

### Mobile Issues

- Test responsive design
- Check viewport meta tag
- Verify touch events work
- Test on actual devices

---

## 🚀 Performance Tips

### Optimize Images

1. Use modern formats (WebP)
2. Compress images (TinyPNG, Squoosh)
3. Use appropriate sizes
4. Enable lazy loading (already included)

### Minimize JavaScript

Already optimized:
- Deferred loading
- Caching (10 minutes)
- Debounced scroll events

### Enable Caching

Already implemented in `beehiiv.js`:
```javascript
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
```

Adjust as needed:
```javascript
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
```

---

## 📱 Mobile Responsiveness

All breakpoints already configured:

- Desktop: > 960px
- Tablet: 768px - 960px
- Mobile: < 768px

Test on:
- Chrome DevTools (F12 → Device Toolbar)
- Real devices
- BrowserStack / Responsively App

---

## 🔐 Security Best Practices

### HTTPS

- Automatically enabled on GitHub Pages
- Required for custom domains
- Enable in Settings → Pages

### External Links

Already configured:
- `target="_blank"`
- `rel="noopener noreferrer"`

### Content Security

- Sanitize user input (if adding forms)
- Validate email addresses
- Use HTTPS for all resources

---

## 📝 Content Management

### Publishing Workflow

1. Write post in Beehiiv editor
2. Publish on Beehiiv
3. Post appears in RSS feed automatically
4. Your site fetches and displays it (cached for 10 min)
5. No manual updates needed!

### Post Types

Automatically detected by keywords:
- **Interview**: "interview", "conversation", "gesprek", "🎙"
- **Things I Learned**: Everything else

Custom detection in `beehiiv.js`:
```javascript
function getPostType(post) {
  const interviewKeywords = ['interview', 'conversation', ...];
  // Add more keywords here
}
```

---

## 🎯 Future Enhancements

### Planned Features

- [ ] Search functionality
- [ ] Categories/tags from Beehiiv
- [ ] Newsletter archive by year/month
- [ ] Reading time estimator
- [ ] Dark mode toggle
- [ ] EN/NL language switcher
- [ ] Comments (Disqus/Utterances)
- [ ] Related posts

### Implementation Ideas

**Search:**
```javascript
// Add to beehiiv.js
function searchPosts(query) {
  return allPostsCache.filter(post => {
    const searchText = (post.title + post.description).toLowerCase();
    return searchText.includes(query.toLowerCase());
  });
}
```

**Dark Mode:**
```css
/* Add to style.css */
[data-theme="dark"] {
  --navy: #F5F0E8;
  --beige: #1B2C45;
  /* Invert colors */
}
```

---

## 📞 Support & Resources

### Documentation

- **GitHub Pages**: https://docs.github.com/en/pages
- **Beehiiv Help**: https://support.beehiiv.com
- **RSS2JSON**: https://rss2json.com/docs
- **Tally Forms**: https://tally.so/help

### Community

- GitHub Discussions (in your repo)
- Beehiiv Community
- Stack Overflow (tag: github-pages)

### Updates

Check for updates to this template:
- Watch this repository
- Star for bookmarking
- Fork to customize

---

## 📄 License

MIT License - Feel free to use and modify for your own projects.

---

## ✅ Launch Checklist

Before going live:

**Technical**
- [ ] All files uploaded to GitHub
- [ ] Beehiiv integration configured
- [ ] RSS2JSON API key added
- [ ] GitHub Pages enabled
- [ ] Site loads at username.github.io
- [ ] All links working
- [ ] Forms tested
- [ ] Mobile responsive

**Content**
- [ ] Personal info updated
- [ ] Stats accurate
- [ ] Images optimized
- [ ] Contact form working
- [ ] Social links correct
- [ ] About section written
- [ ] Latest posts showing

**SEO & Analytics**
- [ ] Meta tags complete
- [ ] Favicon added
- [ ] Sitemap created
- [ ] Robots.txt added
- [ ] Analytics installed
- [ ] Social sharing tested

**Polish**
- [ ] Spell check
- [ ] Cross-browser testing
- [ ] Accessibility check
- [ ] Performance audit
- [ ] Final review

---

**You're ready to launch! 🎉**

Questions? Open an issue or check the troubleshooting section.
