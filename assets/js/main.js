/*
  File role: Handles shared site interactions like cursor behavior, scroll effects,
  nav behavior, and small UI enhancements.
  Project relation: Used by both index.html and blog.html, and complements the
  content rendering done in beehiiv.js.
*/

// =========================================
// MAIN.JS - General Site Functionality
// =========================================

// =========================================
// CUSTOM CURSOR
// =========================================
function initCursor() {
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  
  if (!dot || !ring) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  
  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;
  let hasMoved = false;
  
  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    hasMoved = true;
    ring.style.opacity = ring.classList.contains('hover') ? '0.9' : '0.55';
  });
  
  // Animate cursor
  function animateCursor() {
    if (!hasMoved) {
      requestAnimationFrame(animateCursor);
      return;
    }

    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';
    
    requestAnimationFrame(animateCursor);
  }
  
  animateCursor();
  
  // Hover effects
  const hoverElements = document.querySelectorAll('a, button, .s-card, .ftab, .ih-pill, .ih-ct-row, .ih-post-card, .ih-latest-column, .ih-about-header, .ih-m-item, .ih-subscribe-card, .ih-ct-card');
  
  hoverElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      ring.classList.add('hover');
      ring.style.opacity = '0.9';
    });
    
    el.addEventListener('mouseleave', () => {
      ring.classList.remove('hover');
      ring.style.opacity = hasMoved ? '0.55' : '0';
    });
  });

  document.addEventListener('mouseleave', () => {
    ring.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    if (hasMoved) {
      ring.style.opacity = ring.classList.contains('hover') ? '0.9' : '0.55';
    }
  });
}

// =========================================
// SCROLL PROGRESS BAR
// =========================================
function initScrollProgress() {
  const progressBar = document.getElementById('progressBar');
  
  if (!progressBar) return;
  
  window.addEventListener('scroll', () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;
    const progress = (scrolled / scrollHeight) * 100;
    
    progressBar.style.transform = `scaleX(${progress / 100})`;
  });
}

// =========================================
// SCROLL REVEAL ANIMATIONS
// =========================================
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.sr');
  
  if (revealElements.length === 0) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -50px 0px'
  });
  
  revealElements.forEach(el => observer.observe(el));
}

// =========================================
// PARALLAX EFFECTS ON PULL QUOTE ORBS
// =========================================
function initParallax() {
  const orb1 = document.querySelector('.orb1');
  const orb2 = document.querySelector('.orb2');
  const orb3 = document.querySelector('.orb3');
  
  if (!orb1) return;
  
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    
    if (orb1) orb1.style.transform = `translateY(${scrollY * 0.06}px)`;
    if (orb2) orb2.style.transform = `translateY(${scrollY * -0.04}px)`;
    if (orb3) orb3.style.transform = `translateY(${scrollY * 0.03}px) translateX(${scrollY * 0.02}px)`;
  });
}

// =========================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// =========================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      
      // Skip if href is just "#"
      if (href === '#') return;
      
      const target = document.querySelector(href);
      
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // Update URL without jumping
        history.pushState(null, null, href);
      }
    });
  });
}

// =========================================
// NAVBAR SCROLL EFFECT
// =========================================
function initNavbarScroll() {
  const nav = document.querySelector('nav');
  
  if (!nav) return;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

// =========================================
// LAZY LOAD IMAGES
// =========================================
function initLazyLoad() {
  const images = document.querySelectorAll('img[loading="lazy"]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          imageObserver.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  }
}

// =========================================
// MOBILE MENU TOGGLE (if needed)
// =========================================
function initMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  
  if (!menuToggle || !mobileNav) return;
  
  menuToggle.addEventListener('click', () => {
    mobileNav.classList.toggle('active');
    menuToggle.classList.toggle('active');
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!mobileNav.contains(e.target) && !menuToggle.contains(e.target)) {
      mobileNav.classList.remove('active');
      menuToggle.classList.remove('active');
    }
  });
}

// =========================================
// FORM VALIDATION (for email subscription)
// =========================================
function initFormValidation() {
  const forms = document.querySelectorAll('form:not([data-subscribe-form])');
  
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      const emailInput = form.querySelector('input[type="email"]');
      
      if (emailInput && !emailInput.value) {
        e.preventDefault();
        alert('Please enter your email address');
        return;
      }
      
      // Additional validation
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailInput && !emailPattern.test(emailInput.value)) {
        e.preventDefault();
        alert('Please enter a valid email address');
        return;
      }
    });
  });
}

// =========================================
// STATS COUNTER ANIMATION
// =========================================
function initStatsCounter() {
  const stats = document.querySelectorAll('.stat-num');
  
  if (stats.length === 0) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const targetText = target.textContent;
        const targetNumber = parseInt(targetText.replace(/[^0-9]/g, ''));
        
        if (isNaN(targetNumber)) return;
        
        animateCounter(target, 0, targetNumber, 1500, targetText);
        observer.unobserve(target);
      }
    });
  }, { threshold: 0.5 });
  
  stats.forEach(stat => observer.observe(stat));
}

function animateCounter(element, start, end, duration, originalText) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    
    if (current >= end) {
      clearInterval(timer);
      element.textContent = originalText;
    } else {
      // Keep the suffix (+ sign, etc.)
      const suffix = originalText.match(/[^0-9]+$/)?.[0] || '';
      element.textContent = Math.floor(current) + suffix;
    }
  }, 16);
}

// =========================================
// HANDLE EXTERNAL LINKS
// =========================================
function initExternalLinks() {
  const links = document.querySelectorAll('a[href^="http"]');
  
  links.forEach(link => {
    // Don't add target="_blank" if it's already set
    if (!link.getAttribute('target')) {
      // Check if link is to a different domain
      const linkHost = new URL(link.href).hostname;
      const currentHost = window.location.hostname;
      
      if (linkHost !== currentHost) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });
}

// =========================================
// PERFORMANCE: DEBOUNCE SCROLL EVENTS
// =========================================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// =========================================
// DETECT MOBILE/TABLET
// =========================================
function isMobile() {
  return window.innerWidth <= 768;
}

function isTablet() {
  return window.innerWidth > 768 && window.innerWidth <= 1024;
}

// =========================================
// ACCESSIBILITY: KEYBOARD NAVIGATION
// =========================================
function initKeyboardNav() {
  // Allow keyboard users to skip to main content
  const skipLink = document.createElement('a');
  skipLink.href = '#main';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to main content';
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  // Focus visible styles for keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  });
  
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
  });
}

function setSubscribeFeedback(form, message, isError = false) {
  const feedback = form.querySelector('[data-subscribe-feedback]');

  if (!feedback) return;

  feedback.textContent = message || '';
  feedback.style.color = isError ? '#b42318' : '';
}

function initSubscribeForms() {
  const forms = document.querySelectorAll('[data-subscribe-form]');

  if (forms.length === 0) return;

  const config = window.INSPIRE_SITE_CONFIG || {};
  const endpoint = typeof config.subscribeEndpoint === 'string'
    ? config.subscribeEndpoint.trim()
    : '';

  forms.forEach((form) => {
    if (form.dataset.subscribeBound === 'true') return;
    form.dataset.subscribeBound = 'true';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = form.querySelector('input[type="email"]');
      const submitButton = form.querySelector('button[type="submit"]');
      const email = emailInput ? emailInput.value.trim() : '';
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email) {
        setSubscribeFeedback(form, 'Please enter your email address.', true);
        if (emailInput) emailInput.focus();
        return;
      }

      if (!emailPattern.test(email)) {
        setSubscribeFeedback(form, 'Please enter a valid email address.', true);
        if (emailInput) emailInput.focus();
        return;
      }

      if (!endpoint) {
        setSubscribeFeedback(form, 'Subscription endpoint is not configured yet.', true);
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
      }

      setSubscribeFeedback(form, 'Saving your subscription...');

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            email,
            source: config.subscribeSource || 'website',
            language: config.subscribeLanguage || document.documentElement.lang || 'en',
            metadata: {
              page: window.location.pathname
            }
          })
        });

        let payload = {};

        try {
          payload = await response.json();
        } catch (parseError) {
          payload = {};
        }

        if (!response.ok) {
          const message = payload && payload.error
            ? payload.error
            : 'Subscription failed. Please try again.';
          throw new Error(message);
        }

        form.reset();
        setSubscribeFeedback(
          form,
          payload && payload.message ? payload.message : 'Subscription received.'
        );
      } catch (error) {
        setSubscribeFeedback(
          form,
          error && error.message ? error.message : 'Subscription failed. Please try again.',
          true
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Subscribe Free';
        }
      }
    });
  });
}

function setContactFeedback(form, message, isError = false) {
  const feedback = form.querySelector('[data-contact-feedback]');

  if (!feedback) return;

  feedback.textContent = message || '';
  feedback.style.color = isError ? '#b42318' : '';
}

function initContactForm() {
  const config = window.INSPIRE_SITE_CONFIG || {};
  const endpoint = typeof config.contactEndpoint === 'string'
    ? config.contactEndpoint.trim()
    : '';
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  if (form.dataset.contactBound === 'true') return;
  form.dataset.contactBound = 'true';

  const triggers = document.querySelectorAll('[data-contact-trigger]');
  const subjectInput = form.querySelector('input[name="subject"]');
  const messageInput = form.querySelector('textarea[name="message"]');
  const nameInput = form.querySelector('input[name="name"]');

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();

      if (subjectInput && trigger.dataset.contactSubject) {
        subjectInput.value = trigger.dataset.contactSubject;
      }

      if (messageInput && trigger.dataset.contactPrompt && !messageInput.value.trim()) {
        messageInput.value = trigger.dataset.contactPrompt.replace(/%0A/g, '\n');
      }

      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (nameInput) nameInput.focus();
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = form.querySelector('input[name="name"]');
    const emailInput = form.querySelector('input[name="email"]');
    const subjectInput = form.querySelector('input[name="subject"]');
    const messageInput = form.querySelector('textarea[name="message"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const subject = subjectInput ? subjectInput.value.trim() : '';
    const message = messageInput ? messageInput.value.trim() : '';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (name.length < 2) {
      setContactFeedback(form, 'Please enter your name.', true);
      if (nameInput) nameInput.focus();
      return;
    }

    if (!emailPattern.test(email)) {
      setContactFeedback(form, 'Please enter a valid email address.', true);
      if (emailInput) emailInput.focus();
      return;
    }

    if (message.length < 10) {
      setContactFeedback(form, 'Please enter a message with a bit more detail.', true);
      if (messageInput) messageInput.focus();
      return;
    }

    if (!endpoint) {
      setContactFeedback(form, 'Contact endpoint is not configured yet.', true);
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }

    setContactFeedback(form, 'Sending your message...');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          subject: subject || 'Website message',
          message,
          source: config.contactSource || 'website-contact',
          metadata: {
            page: window.location.pathname
          }
        })
      });

      let payload = {};

      try {
        payload = await response.json();
      } catch (parseError) {
        payload = {};
      }

      if (!response.ok) {
        const errorMessage = payload && payload.error
          ? payload.error
          : 'Message failed to send. Please try again.';
        throw new Error(errorMessage);
      }

      form.reset();
      setContactFeedback(
        form,
        payload && payload.message ? payload.message : 'Your message is on its way.'
      );
    } catch (error) {
      setContactFeedback(
        form,
        error && error.message ? error.message : 'Message failed to send. Please try again.',
        true
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Send message';
      }
    }
  });
}

// =========================================
// LAST UPDATED TIMESTAMP
// =========================================
function initLastUpdated() {
  const targets = document.querySelectorAll('[data-last-updated]');

  if (targets.length === 0) return;

  const rawLastModified = document.lastModified;
  const parsed = rawLastModified ? new Date(rawLastModified) : new Date();
  const lastUpdated = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const formatted = lastUpdated.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  targets.forEach((target) => {
    target.textContent = `Last updated at ${formatted}`;
  });
}

// =========================================
// INITIALIZE ALL FUNCTIONS
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing site...');
  
  // Core functionality
  initCursor();
  initScrollProgress();
  initScrollReveal();
  initParallax();
  initSmoothScroll();
  initNavbarScroll();
  
  // Enhanced features
  initLazyLoad();
  initMobileMenu();
  initFormValidation();
  initSubscribeForms();
  initContactForm();
  initStatsCounter();
  initExternalLinks();
  initKeyboardNav();
  initLastUpdated();
  
  console.log('✅ Site initialized successfully');
});

// =========================================
// HANDLE PAGE VISIBILITY
// =========================================
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('👋 Page hidden');
  } else {
    console.log('👀 Page visible');
  }
});

// =========================================
// LOG ERRORS
// =========================================
window.addEventListener('error', (e) => {
  console.error('❌ Error:', e.message, 'at', e.filename, 'line', e.lineno);
});

// =========================================
// EXPORT FOR USE IN OTHER SCRIPTS
// =========================================
document.addEventListener('components:loaded', () => {
  initCursor();
  initScrollProgress();
  initScrollReveal();
  initParallax();
  initSmoothScroll();
  initNavbarScroll();
  initLazyLoad();
  initFormValidation();
  initSubscribeForms();
  initContactForm();
  initStatsCounter();
  initExternalLinks();
  initLastUpdated();
});

window.siteUtils = {
  isMobile,
  isTablet,
  debounce
};
