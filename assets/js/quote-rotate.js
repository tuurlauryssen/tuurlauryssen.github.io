/*
  File role: Types out the rotating quote in the [data-quote-rotate] element.
  Project relation: Used by the homepages (quotes from INSPIRE_HOME_CONTENT)
  and the archive pages (quotes from blog-quotes*.js). Kept in a file rather
  than inline so the Content-Security-Policy can forbid inline scripts.
*/

(function () {
  var content = window.INSPIRE_HOME_CONTENT;
  var quotes = Array.isArray(window.INSPIRE_QUOTES)
    ? window.INSPIRE_QUOTES
    : (content && content.quote && Array.isArray(content.quote.quotes) ? content.quote.quotes : null);
  if (!quotes || quotes.length < 2) return;
  var el = document.querySelector('[data-quote-rotate]');
  if (!el) return;
  var index = 0;

  function typeQuote(text, onDone) {
    el.textContent = '';
    var i = 0;
    function next() {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
        setTimeout(next, 32);
      } else if (onDone) {
        onDone();
      }
    }
    next();
  }

  function cycle() {
    index = (index + 1) % quotes.length;
    typeQuote(quotes[index], function () { setTimeout(cycle, 5000); });
  }

  typeQuote(quotes[0], function () { setTimeout(cycle, 5000); });
})();
