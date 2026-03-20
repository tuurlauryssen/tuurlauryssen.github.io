/*
  File role: Handles shared site interactions, analytics, and article community UI.
  Project relation: Used by public pages and article pages across the site.
*/

const INSPIRE_ANALYTICS = {
  scriptLoaded: false,
  initialized: false,
  measurementId: "",
};

const INSPIRE_RUNTIME = {
  visitorToken: "",
};

const INSPIRE_TRACKED_SCROLL_THRESHOLDS = [25, 50, 75, 90];
const INSPIRE_READ_COMPLETE_SCROLL_THRESHOLD = 90;
const INSPIRE_READ_COMPLETE_MIN_ACTIVE_SECONDS = 30;

function getSiteConfig() {
  return window.INSPIRE_SITE_CONFIG || {};
}

function getPageStrings() {
  const defaults = {
    subscribe: {
      missingEmail: "Please enter your email address.",
      invalidEmail: "Please enter a valid email address.",
      endpointMissing: "Subscription endpoint is not configured yet.",
      submitting: "Saving your subscription...",
      failed: "Subscription failed. Please try again.",
      success: "Subscription received.",
      submitLabel: "Subscribe Free",
    },
    contact: {
      missingName: "Please enter your name.",
      invalidEmail: "Please enter a valid email address.",
      shortMessage: "Please enter a message with a bit more detail.",
      endpointMissing: "Contact endpoint is not configured yet.",
      submitting: "Sending your message...",
      failed: "Message failed to send. Please try again.",
      success: "Your message is on its way.",
      submitLabel: "Send message",
    },
    meta: {
      locale: "en-US",
      lastUpdatedPrefix: "Last updated at",
    },
    community: {
      heading: "Join the conversation",
      intro: "Leave an anonymous like or send me a private response about this article.",
      like: "Like this article",
      liked: "Liked",
      commentButton: "Comment",
      contactTitle: "Send me a private note",
      contactIntro: "Got a thought, a disagreement, or someone I should interview next? Send it straight to me.",
      contactPromptInterview: "Suggest a guest",
      contactPromptIdea: "Share an idea",
      contactPromptReply: "Reply to this article",
      namePlaceholder: "Your name",
      emailPlaceholder: "Your email address",
      contactMessagePlaceholder: "Write your message...",
      contactNote: "This goes directly to my inbox through the website backend.",
      likeError: "Unable to update your like right now.",
    },
  };

  const pageConfig = window.INSPIRE_PAGE_CONFIG || {};
  const pageStrings = pageConfig.strings || {};

  return {
    subscribe: { ...defaults.subscribe, ...(pageStrings.subscribe || {}) },
    contact: { ...defaults.contact, ...(pageStrings.contact || {}) },
    meta: { ...defaults.meta, ...(pageStrings.meta || {}) },
    community: { ...defaults.community, ...(pageStrings.community || {}) },
  };
}

function getMeasurementId() {
  const config = getSiteConfig();
  const measurementId = typeof config.gaMeasurementId === "string"
    ? config.gaMeasurementId.trim()
    : "";
  return measurementId && measurementId !== "G-XXXXXXXXXX" ? measurementId : "";
}

function isArticlePage() {
  return Boolean(document.querySelector(".article-shell"));
}

function getArticleMetadata() {
  if (!isArticlePage()) {
    return null;
  }

  const title = (document.querySelector(".article-page-title")?.textContent || "").trim();
  const pathMatch = window.location.pathname.match(/\/posts\/(interviews|ideas)\/(en|nl)\/([^/]+)\.html$/i);
  const typeDirectory = pathMatch ? pathMatch[1].toLowerCase() : "";
  const articleType = typeDirectory === "interviews" ? "interview" : "learned";
  const articleLanguage = pathMatch ? pathMatch[2].toLowerCase() : ((document.documentElement.lang || "en").toLowerCase());
  const articleSlug = pathMatch ? pathMatch[3] : window.location.pathname.split("/").pop()?.replace(/\.html$/, "") || "";

  return {
    article_slug: articleSlug,
    article_title: title,
    article_language: articleLanguage,
    article_type: articleType,
  };
}

function getSharedContactSectionCopy() {
  const language = (window.INSPIRE_PAGE_CONFIG?.language || document.documentElement.lang || "en").toLowerCase();
  const isDutch = language.startsWith("nl");
  const homeContact = window.INSPIRE_HOME_CONTENT?.contact || {};

  const defaults = isDutch ? {
    eyebrow: "Contact",
    leftTitleHtml: "Ken je iemand<br><em>opmerkelijks?</em>",
    description: "Heb je een tip, een onderwerp, of iemand met wie ik echt moet gaan praten? Hieronder kan je rechtstreeks een bericht sturen.",
    interviewKicker: "Interview",
    interviewTitle: "Suggest an interview guest",
    interviewSubtitle: "Someone doing something worth knowing about",
    ideaKicker: "Idee",
    ideaTitle: "Share a topic or idea",
    ideaSubtitle: "Something you'd like me to explore or explain clearly",
    messageKicker: "Bericht",
    messageTitle: "Just say hello",
    messageSubtitle: "Feedback, thoughts, or the start of a good conversation",
    rightLabel: "Stuur een bericht",
    rightTitleHtml: "Schrijf direct,<br><em>via de site</em>",
    namePlaceholder: "Je naam",
    emailPlaceholder: "Je e-mailadres",
    subjectPlaceholder: "Onderwerp",
    messagePlaceholder: "Je bericht",
    note: "Dit wordt rechtstreeks verzonden via de website-backend.",
    submitLabel: "Bericht verzenden",
  } : {
    eyebrow: "Get in touch",
    leftTitleHtml: "Know someone<br><em>remarkable?</em>",
    description: "Got a tip, a topic, or someone you think I should sit down with? Use the form below and each path will open a ready-made message.",
    interviewKicker: "Interview",
    interviewTitle: "Suggest an interview guest",
    interviewSubtitle: "Someone doing something worth knowing about",
    ideaKicker: "Idea",
    ideaTitle: "Share a topic or idea",
    ideaSubtitle: "Something you'd like me to explore or explain clearly",
    messageKicker: "Message",
    messageTitle: "Just say hello",
    messageSubtitle: "Feedback, thoughts, or the start of a good conversation",
    rightLabel: "Send a message",
    rightTitleHtml: "Write directly,<br><em>through the site</em>",
    namePlaceholder: "Your name",
    emailPlaceholder: "Your email address",
    subjectPlaceholder: "Subject",
    messagePlaceholder: "Your message",
    note: "This sends directly through the website backend.",
    submitLabel: "Send message",
  };

  return {
    ...defaults,
    description: homeContact.description || defaults.description,
  };
}

function buildContactPrompt(basePrompt, articleMetadata) {
  if (!articleMetadata) {
    return basePrompt;
  }

  return `${basePrompt}%0A%0AArticle: ${escapeHtml(articleMetadata.article_title)}%0ALink: ${escapeHtml(window.location.pathname)}%0A`;
}

function buildSharedContactSectionHtml(options = {}) {
  const copy = getSharedContactSectionCopy();
  const sectionId = options.sectionId || "contact";
  const extraClass = options.extraClass ? ` ${options.extraClass}` : "";
  const articleMetadata = options.articleMetadata || null;
  const subjectValue = articleMetadata
    ? `Reply to article: ${escapeHtml(articleMetadata.article_title)}`
    : "";

  return `
    <section class="ih-ct-wrap${extraClass}" id="${sectionId}">
      <div class="ih-ct-grid">
        <div class="ih-ct-left ih-sr6">
          <div class="ih-ct-eyebrow">${copy.eyebrow}</div>
          <h2 class="ih-ct-title">${copy.leftTitleHtml}</h2>
          <p class="ih-ct-desc">${copy.description}</p>

          <div class="ih-ct-rows">
            <button class="ih-ct-row ih-contact-trigger" type="button" data-contact-trigger data-contact-subject="Interview guest suggestion" data-contact-prompt="${buildContactPrompt("Hi Tuur,%0A%0AI want to suggest this person for an interview:%0A%0AName:%0AWhy they are worth learning from:%0ARelevant links:%0A", articleMetadata)}">
              <div class="ih-ct-kicker">${copy.interviewKicker}</div>
              <strong class="ih-ct-row-title">${copy.interviewTitle}</strong>
              <span class="ih-ct-row-sub">${copy.interviewSubtitle}</span>
            </button>

            <button class="ih-ct-row ih-contact-trigger" type="button" data-contact-trigger data-contact-subject="Topic or idea suggestion" data-contact-prompt="${buildContactPrompt("Hi Tuur,%0A%0AI want to share this topic or idea:%0A%0ATopic:%0AWhy it matters:%0AUseful links or context:%0A", articleMetadata)}">
              <div class="ih-ct-kicker">${copy.ideaKicker}</div>
              <strong class="ih-ct-row-title">${copy.ideaTitle}</strong>
              <span class="ih-ct-row-sub">${copy.ideaSubtitle}</span>
            </button>

            <button class="ih-ct-row ih-contact-trigger" type="button" data-contact-trigger data-contact-subject="${articleMetadata ? subjectValue : "Hello Tuur"}" data-contact-prompt="${articleMetadata ? `Hi Tuur,%0A%0AI\'m responding to this article:%0A${escapeHtml(articleMetadata.article_title)}%0A${escapeHtml(window.location.pathname)}%0A%0AMy thoughts:%0A` : "Hi Tuur,%0A%0A"}">
              <div class="ih-ct-kicker">${copy.messageKicker}</div>
              <strong class="ih-ct-row-title">${copy.messageTitle}</strong>
              <span class="ih-ct-row-sub">${copy.messageSubtitle}</span>
            </button>
          </div>
        </div>

        <div class="ih-ct-right ih-sr6">
          <div class="ih-ct-card">
            <div class="ih-tally-label">${copy.rightLabel}</div>
            <h2 class="ih-ct-title">${copy.rightTitleHtml}</h2>
            <form class="ih-contact-form" data-contact-form>
              <div class="ih-contact-form-grid">
                <input type="text" name="name" placeholder="${copy.namePlaceholder}" required>
                <input type="email" name="email" placeholder="${copy.emailPlaceholder}" required>
              </div>
              <input type="text" name="subject" placeholder="${copy.subjectPlaceholder}" value="${subjectValue}" ${articleMetadata ? "" : "required"}>
              <textarea name="message" placeholder="${copy.messagePlaceholder}" required></textarea>
              <div class="ih-contact-form-actions">
                <div>
                  <div class="ih-contact-form-note">${copy.note}</div>
                  <div class="ih-contact-form-feedback" data-contact-feedback aria-live="polite"></div>
                </div>
                <button class="ih-ct-button primary" type="submit">${copy.submitLabel}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `;
}

function initSharedHomeContactSections() {
  const targets = document.querySelectorAll("[data-shared-contact-home]");
  targets.forEach((target) => {
    if (target.dataset.sharedContactRendered === "true") return;
    target.innerHTML = buildSharedContactSectionHtml({ sectionId: "contact" });
    target.dataset.sharedContactRendered = "true";
  });
}

function getAnalyticsBaseParams() {
  return {
    page_path: window.location.pathname,
    page_lang: (document.documentElement.lang || "en").toLowerCase(),
  };
}

function getAnalyticsParams(extraParams = {}) {
  return {
    ...getAnalyticsBaseParams(),
    ...(getArticleMetadata() || {}),
    ...extraParams,
  };
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.dataset.src = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

async function initializeAnalytics() {
  const measurementId = getMeasurementId();
  if (!measurementId || INSPIRE_ANALYTICS.initialized) {
    return;
  }

  await loadScriptOnce(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`);

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  // Session-scoped ID only — not persisted anywhere, resets on every page load.
  const sessionClientId = window.crypto && typeof window.crypto.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    storage: "none",         // No cookies written
    client_id: sessionClientId,
    anonymize_ip: true,
    send_page_view: false,
  });

  INSPIRE_ANALYTICS.scriptLoaded = true;
  INSPIRE_ANALYTICS.initialized = true;
  INSPIRE_ANALYTICS.measurementId = measurementId;

  trackAnalyticsEvent("page_view");
  if (isArticlePage()) {
    trackAnalyticsEvent("article_view");
  }
}

function trackAnalyticsEvent(eventName, params = {}) {
  if (!INSPIRE_ANALYTICS.initialized || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, getAnalyticsParams(params));
}

function getVisitorToken() {
  if (INSPIRE_RUNTIME.visitorToken) {
    return INSPIRE_RUNTIME.visitorToken;
  }

  let token = "";
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    token = window.crypto.randomUUID();
  } else {
    token = `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  INSPIRE_RUNTIME.visitorToken = token;
  return token;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCommunityDate(dateString) {
  const metaStrings = getPageStrings().meta;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(metaStrings.locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data && data.error ? data.error : "Request failed");
  }

  return data;
}

async function initArticleCommunity() {
  const articleMetadata = getArticleMetadata();
  const siteConfig = getSiteConfig();
  const communityStrings = getPageStrings().community;
  const articleEndcap = document.querySelector(".article-endcap");

  if (
    !articleMetadata ||
    !articleEndcap ||
    !siteConfig.communitySummaryEndpoint ||
    !siteConfig.communityLikeEndpoint ||
    !siteConfig.contactEndpoint
  ) {
    return;
  }

  const visitorToken = getVisitorToken();
  const actionSection = document.createElement("section");
  actionSection.className = "article-community";
  actionSection.innerHTML = `
    <div class="article-community__actions">
      <button type="button" class="article-community__like" data-like-button aria-label="${communityStrings.like}">
        <span class="article-community__like-icon" aria-hidden="true">&#128077;</span>
        <span class="article-community__like-count" data-like-count>0</span>
      </button>
      <button
        type="button"
        class="article-community__comment-button"
        data-scroll-contact
        aria-label="${communityStrings.commentButton}"
        title="${communityStrings.commentButton}"
      >
        <span class="article-community__comment-icon" aria-hidden="true">&#128172;</span>
      </button>
    </div>
  `;

  const contactSectionHost = document.createElement("div");
  contactSectionHost.innerHTML = buildSharedContactSectionHtml({
    sectionId: "article-contact",
    extraClass: "article-contact-section",
    articleMetadata,
  });
  const contactSection = contactSectionHost.firstElementChild;

  articleEndcap.parentNode.insertBefore(actionSection, articleEndcap);
  articleEndcap.insertAdjacentElement("afterend", contactSection);

  const likeButton = actionSection.querySelector("[data-like-button]");
  const likeCount = actionSection.querySelector("[data-like-count]");
  const commentButton = actionSection.querySelector("[data-scroll-contact]");

  async function refreshCommunity() {
    try {
      const summary = await postJson(siteConfig.communitySummaryEndpoint, {
        articleSlug: articleMetadata.article_slug,
        visitorToken,
      });

      likeCount.textContent = String(summary.likeCount || 0);
      likeButton.dataset.liked = summary.likedByCurrentVisitor ? "true" : "false";
      likeButton.setAttribute("aria-label", summary.likedByCurrentVisitor ? communityStrings.liked : communityStrings.like);
      likeButton.setAttribute("aria-pressed", summary.likedByCurrentVisitor ? "true" : "false");
    } catch (error) {
      console.error("Unable to refresh article community", error);
    }
  }

  likeButton.addEventListener("click", async () => {
    likeButton.disabled = true;

    try {
      const response = await postJson(siteConfig.communityLikeEndpoint, {
        articleSlug: articleMetadata.article_slug,
        articleTitle: articleMetadata.article_title,
        articleLanguage: articleMetadata.article_language,
        articleType: articleMetadata.article_type,
        visitorToken,
        source: "website-article",
        metadata: {
          page: window.location.pathname,
        },
      });

      likeCount.textContent = String(response.likeCount || 0);
      likeButton.dataset.liked = response.likedByCurrentVisitor ? "true" : "false";
      likeButton.setAttribute("aria-label", response.likedByCurrentVisitor ? communityStrings.liked : communityStrings.like);
      likeButton.setAttribute("aria-pressed", response.likedByCurrentVisitor ? "true" : "false");
      trackAnalyticsEvent("article_like", {
        liked: response.likedByCurrentVisitor ? "true" : "false",
      });
    } catch (error) {
      console.error("Unable to update like", error);
      const form = contactSection.querySelector("[data-contact-form]");
      if (form) {
        setContactFeedback(form, error && error.message ? error.message : communityStrings.likeError, true);
      }
    } finally {
      likeButton.disabled = false;
    }
  });

  if (commentButton && contactSection) {
    commentButton.addEventListener("click", () => {
      contactSection.scrollIntoView({ behavior: "smooth", block: "start" });
      const messageField = contactSection.querySelector('textarea[name="message"]');
      if (messageField) {
        window.setTimeout(() => messageField.focus(), 250);
      }
    });
  }

  initContactForm();
  await refreshCommunity();
}

function initArticleAnalytics() {
  const articleMetadata = getArticleMetadata();
  if (!articleMetadata) {
    return;
  }

  const trackedThresholds = new Set();
  let readCompleteTracked = false;
  let activeSeconds = 0;

  window.setInterval(() => {
    if (!document.hidden) {
      activeSeconds += 1;
      maybeTrackReadComplete();
    }
  }, 1000);

  function getScrollProgress() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) {
      return 100;
    }

    return Math.min(100, Math.max(0, (window.scrollY / scrollHeight) * 100));
  }

  function maybeTrackReadComplete() {
    if (readCompleteTracked) {
      return;
    }

    const scrollProgress = getScrollProgress();
    if (
      scrollProgress >= INSPIRE_READ_COMPLETE_SCROLL_THRESHOLD &&
      activeSeconds >= INSPIRE_READ_COMPLETE_MIN_ACTIVE_SECONDS
    ) {
      readCompleteTracked = true;
      trackAnalyticsEvent("article_read_complete", {
        active_seconds: activeSeconds,
        scroll_percent: INSPIRE_READ_COMPLETE_SCROLL_THRESHOLD,
      });
    }
  }

  const handleScroll = () => {
    const scrollProgress = getScrollProgress();

    INSPIRE_TRACKED_SCROLL_THRESHOLDS.forEach((threshold) => {
      if (scrollProgress >= threshold && !trackedThresholds.has(threshold)) {
        trackedThresholds.add(threshold);
        trackAnalyticsEvent("scroll_depth", {
          percent_scrolled: threshold,
        });
      }
    });

    maybeTrackReadComplete();
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  document.addEventListener("visibilitychange", maybeTrackReadComplete);
  handleScroll();
}

function initOutboundLinkTracking() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    if (!href || href.startsWith("#")) {
      return;
    }

    try {
      const url = new URL(link.href, window.location.href);
      if (url.hostname !== window.location.hostname) {
        trackAnalyticsEvent("outbound_click", {
          outbound_url: url.href,
        });
      }
    } catch (error) {
      // Ignore malformed URLs
    }
  });
}

function initCursor() {
  const dot = document.getElementById("cursorDot");
  const ring = document.getElementById("cursorRing");

  if (!dot || !ring) return;
  if (window.matchMedia("(pointer: coarse)").matches) return;

  let mouseX = 0;
  let mouseY = 0;
  let ringX = 0;
  let ringY = 0;
  let hasMoved = false;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    hasMoved = true;
    ring.style.opacity = ring.classList.contains("hover") ? "0.9" : "0.55";
  });

  function animateCursor() {
    if (!hasMoved) {
      requestAnimationFrame(animateCursor);
      return;
    }

    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;

    requestAnimationFrame(animateCursor);
  }

  animateCursor();

  const hoverElements = document.querySelectorAll("a, button, .s-card, .ftab, .ih-pill, .ih-ct-row, .ih-post-card, .ih-latest-column, .ih-about-header, .ih-m-item, .ih-subscribe-card, .ih-ct-card");

  hoverElements.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      ring.classList.add("hover");
      ring.style.opacity = "0.9";
    });

    el.addEventListener("mouseleave", () => {
      ring.classList.remove("hover");
      ring.style.opacity = hasMoved ? "0.55" : "0";
    });
  });

  document.addEventListener("mouseleave", () => {
    ring.style.opacity = "0";
  });

  document.addEventListener("mouseenter", () => {
    if (hasMoved) {
      ring.style.opacity = ring.classList.contains("hover") ? "0.9" : "0.55";
    }
  });
}

function initScrollProgress() {
  const progressBar = document.getElementById("progressBar");

  if (!progressBar) return;

  window.addEventListener("scroll", () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;
    const progress = scrollHeight > 0 ? (scrolled / scrollHeight) * 100 : 0;

    progressBar.style.transform = `scaleX(${progress / 100})`;
  }, { passive: true });
}

function initScrollReveal() {
  const revealElements = document.querySelectorAll(".sr");

  if (revealElements.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: "0px 0px -50px 0px",
  });

  revealElements.forEach((el) => observer.observe(el));
}

function initParallax() {
  const orb1 = document.querySelector(".orb1");
  const orb2 = document.querySelector(".orb2");
  const orb3 = document.querySelector(".orb3");

  if (!orb1) return;

  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY;

    if (orb1) orb1.style.transform = `translateY(${scrollY * 0.06}px)`;
    if (orb2) orb2.style.transform = `translateY(${scrollY * -0.04}px)`;
    if (orb3) orb3.style.transform = `translateY(${scrollY * 0.03}px) translateX(${scrollY * 0.02}px)`;
  }, { passive: true });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function onAnchorClick(e) {
      const href = this.getAttribute("href");

      if (href === "#") return;

      const target = document.querySelector(href);

      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        history.pushState(null, null, href);
      }
    });
  });
}

function initNavbarScroll() {
  const nav = document.querySelector("nav");

  if (!nav) return;

  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  }, { passive: true });
}

function initLazyLoad() {
  const images = document.querySelectorAll('img[loading="lazy"]');

  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach((img) => imageObserver.observe(img));
  }
}

function initMobileMenu() {
  const menuToggle = document.getElementById("menuToggle");
  const mobileNav = document.getElementById("mobileNav");

  if (!menuToggle || !mobileNav) return;

  menuToggle.addEventListener("click", () => {
    mobileNav.classList.toggle("active");
    menuToggle.classList.toggle("active");
  });

  document.addEventListener("click", (e) => {
    if (!mobileNav.contains(e.target) && !menuToggle.contains(e.target)) {
      mobileNav.classList.remove("active");
      menuToggle.classList.remove("active");
    }
  });
}

function initFormValidation() {
  const forms = document.querySelectorAll("form:not([data-subscribe-form]):not([data-contact-form]):not([data-comment-form])");

  forms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      const emailInput = form.querySelector('input[type="email"]');

      if (emailInput && !emailInput.value) {
        e.preventDefault();
        alert("Please enter your email address");
        return;
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailInput && !emailPattern.test(emailInput.value)) {
        e.preventDefault();
        alert("Please enter a valid email address");
      }
    });
  });
}

function initStatsCounter() {
  const stats = document.querySelectorAll(".stat-num");

  if (stats.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const targetText = target.textContent;
        const targetNumber = parseInt(targetText.replace(/[^0-9]/g, ""), 10);

        if (Number.isNaN(targetNumber)) return;

        animateCounter(target, 0, targetNumber, 1500, targetText);
        observer.unobserve(target);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach((stat) => observer.observe(stat));
}

function animateCounter(element, start, end, duration, originalText) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;

  const timer = window.setInterval(() => {
    current += increment;

    if (current >= end) {
      window.clearInterval(timer);
      element.textContent = originalText;
    } else {
      const suffix = originalText.match(/[^0-9]+$/)?.[0] || "";
      element.textContent = `${Math.floor(current)}${suffix}`;
    }
  }, 16);
}

function initExternalLinks() {
  const links = document.querySelectorAll('a[href^="http"]');

  links.forEach((link) => {
    if (!link.getAttribute("target")) {
      const linkHost = new URL(link.href).hostname;
      const currentHost = window.location.hostname;

      if (linkHost !== currentHost) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    }
  });
}

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

function isMobile() {
  return window.innerWidth <= 768;
}

function isTablet() {
  return window.innerWidth > 768 && window.innerWidth <= 1024;
}

function initKeyboardNav() {
  if (!document.querySelector(".skip-link")) {
    const skipLink = document.createElement("a");
    skipLink.href = "#main";
    skipLink.className = "skip-link";
    skipLink.textContent = "Skip to main content";
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      document.body.classList.add("keyboard-nav");
    }
  });

  document.addEventListener("mousedown", () => {
    document.body.classList.remove("keyboard-nav");
  });
}

function setSubscribeFeedback(form, message, isError = false) {
  const feedback = form.querySelector("[data-subscribe-feedback]");

  if (!feedback) return;

  feedback.textContent = message || "";
  feedback.style.color = isError ? "#b42318" : "";
}

function initSubscribeForms() {
  const forms = document.querySelectorAll("[data-subscribe-form]");

  if (forms.length === 0) return;

  const config = getSiteConfig();
  const strings = getPageStrings().subscribe;
  const endpoint = typeof config.subscribeEndpoint === "string"
    ? config.subscribeEndpoint.trim()
    : "";

  forms.forEach((form) => {
    if (form.dataset.subscribeBound === "true") return;
    form.dataset.subscribeBound = "true";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const emailInput = form.querySelector('input[type="email"]');
      const submitButton = form.querySelector('button[type="submit"]');
      const email = emailInput ? emailInput.value.trim() : "";
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email) {
        setSubscribeFeedback(form, strings.missingEmail, true);
        if (emailInput) emailInput.focus();
        return;
      }

      if (!emailPattern.test(email)) {
        setSubscribeFeedback(form, strings.invalidEmail, true);
        if (emailInput) emailInput.focus();
        return;
      }

      if (!endpoint) {
        setSubscribeFeedback(form, strings.endpointMissing, true);
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "...";
      }

      setSubscribeFeedback(form, strings.submitting);

      try {
        const payload = await postJson(endpoint, {
          email,
          source: config.subscribeSource || "website",
          language: config.subscribeLanguage || document.documentElement.lang || "en",
          metadata: {
            page: window.location.pathname,
          },
        });

        form.reset();
        setSubscribeFeedback(form, payload.message || strings.success);
        trackAnalyticsEvent("subscribe_success");
      } catch (error) {
        setSubscribeFeedback(form, error && error.message ? error.message : strings.failed, true);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = strings.submitLabel;
        }
      }
    });
  });
}

function setContactFeedback(form, message, isError = false) {
  const feedback = form.querySelector("[data-contact-feedback]");

  if (!feedback) return;

  feedback.textContent = message || "";
  feedback.style.color = isError ? "#b42318" : "";
}

function initContactForm() {
  const config = getSiteConfig();
  const strings = getPageStrings().contact;
  const endpoint = typeof config.contactEndpoint === "string"
    ? config.contactEndpoint.trim()
    : "";
  const form = document.querySelector("[data-contact-form]");

  if (!form || form.dataset.contactBound === "true") return;
  form.dataset.contactBound = "true";

  const triggers = document.querySelectorAll("[data-contact-trigger]");
  const subjectInput = form.querySelector('input[name="subject"]');
  const messageInput = form.querySelector('textarea[name="message"]');
  const nameInput = form.querySelector('input[name="name"]');

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();

      if (subjectInput && trigger.dataset.contactSubject) {
        subjectInput.value = trigger.dataset.contactSubject;
      }

      if (messageInput && trigger.dataset.contactPrompt && !messageInput.value.trim()) {
        messageInput.value = trigger.dataset.contactPrompt.replace(/%0A/g, "\n");
      }

      form.scrollIntoView({ behavior: "smooth", block: "center" });
      if (nameInput) nameInput.focus();
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentNameInput = form.querySelector('input[name="name"]');
    const emailInput = form.querySelector('input[name="email"]');
    const currentSubjectInput = form.querySelector('input[name="subject"]');
    const currentMessageInput = form.querySelector('textarea[name="message"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const name = currentNameInput ? currentNameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const subject = currentSubjectInput ? currentSubjectInput.value.trim() : "";
    const message = currentMessageInput ? currentMessageInput.value.trim() : "";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (name.length < 2) {
      setContactFeedback(form, strings.missingName, true);
      if (currentNameInput) currentNameInput.focus();
      return;
    }

    if (!emailPattern.test(email)) {
      setContactFeedback(form, strings.invalidEmail, true);
      if (emailInput) emailInput.focus();
      return;
    }

    if (message.length < 10) {
      setContactFeedback(form, strings.shortMessage, true);
      if (currentMessageInput) currentMessageInput.focus();
      return;
    }

    if (!endpoint) {
      setContactFeedback(form, strings.endpointMissing, true);
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "...";
    }

    setContactFeedback(form, strings.submitting);

    try {
      const payload = await postJson(endpoint, {
        name,
        email,
        subject: subject || "Website message",
        message,
        source: config.contactSource || "website-contact",
        metadata: {
          page: window.location.pathname,
        },
      });

      form.reset();
      setContactFeedback(form, payload.message || strings.success);
      trackAnalyticsEvent("contact_success");
    } catch (error) {
      setContactFeedback(form, error && error.message ? error.message : strings.failed, true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = strings.submitLabel;
      }
    }
  });
}

function initLastUpdated() {
  const targets = document.querySelectorAll("[data-last-updated]");
  const metaStrings = getPageStrings().meta;

  if (targets.length === 0) return;

  const rawLastModified = document.lastModified;
  const parsed = rawLastModified ? new Date(rawLastModified) : new Date();
  const lastUpdated = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const formatted = lastUpdated.toLocaleString(metaStrings.locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  targets.forEach((target) => {
    target.textContent = `${metaStrings.lastUpdatedPrefix} ${formatted}`;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing site...");

  initializeAnalytics().catch((error) => {
    console.error("Analytics initialization failed", error);
  });
  initSharedHomeContactSections();
  initCursor();
  initScrollProgress();
  initScrollReveal();
  initParallax();
  initSmoothScroll();
  initNavbarScroll();
  initLazyLoad();
  initMobileMenu();
  initFormValidation();
  initSubscribeForms();
  initContactForm();
  initStatsCounter();
  initExternalLinks();
  initKeyboardNav();
  initLastUpdated();
  initOutboundLinkTracking();
  initArticleAnalytics();
  initArticleCommunity().catch((error) => {
    console.error("Article community failed to initialize", error);
  });

  console.log("Site initialized successfully");
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("Page hidden");
  } else {
    console.log("Page visible");
  }
});

window.addEventListener("error", (e) => {
  console.error("Error:", e.message, "at", e.filename, "line", e.lineno);
});

document.addEventListener("components:loaded", () => {
  initSharedHomeContactSections();
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
  initOutboundLinkTracking();
});

window.siteUtils = {
  isMobile,
  isTablet,
  debounce,
  trackAnalyticsEvent,
  getArticleMetadata,
};