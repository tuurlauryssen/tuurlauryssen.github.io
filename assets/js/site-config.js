/*
  File role: Stores runtime configuration for the public site.
  Project relation: Keeps private backend endpoints configurable without hardcoding
  them into shared logic files.
*/

window.INSPIRE_SITE_CONFIG = {
  subscribeEndpoint: "https://jnhygvustbwwzfqrpklr.supabase.co/functions/v1/subscribe",
  subscribeSource: "website",
  subscribeLanguage: "en",
  contactEndpoint: "https://jnhygvustbwwzfqrpklr.supabase.co/functions/v1/contact-message",
  contactSource: "website-contact"
};
