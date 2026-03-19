/*
  File role: Stores runtime configuration for the public site.
  Project relation: Keeps private backend endpoints configurable without hardcoding
  them into shared logic files.
*/

window.INSPIRE_SITE_CONFIG = {
  gaMeasurementId: "G-06BN0LL37Q",
  analyticsConsentStorageKey: "inspire_analytics_consent",
  analyticsConsentVersion: "2026-03-18",
  subscribeEndpoint: "https://jnhygvustbwwzfqrpklr.supabase.co/functions/v1/subscribe",
  subscribeSource: "website",
  subscribeLanguage: "en",
  contactEndpoint: "https://jnhygvustbwwzfqrpklr.supabase.co/functions/v1/contact-message",
  contactSource: "website-contact",
  communitySummaryEndpoint: "https://jnhygvustbwwzfqrpklr.supabase.co/functions/v1/article-community-summary",
  communityLikeEndpoint: "https://jnhygvustbwwzfqrpklr.supabase.co/functions/v1/article-like-toggle",
  communityCommentEndpoint: "https://jnhygvustbwwzfqrpklr.supabase.co/functions/v1/article-comment-submit",
  communityCommentsEndpoint: "https://jnhygvustbwwzfqrpklr.supabase.co/functions/v1/article-comments-list"
};
