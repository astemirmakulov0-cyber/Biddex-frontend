// Where the pages find the API. Loaded as config.js?v=N by index.html, bid.html, verify.html and reset-password.html before
// their own scripts; bump N when this file changes (GitHub Pages caches for 10 minutes).
//
//   - on any real domain (app.biddex.online, biddex.online, anything else): the production API, always;
//   - when the page is opened from this computer (localhost, 127.0.0.1, [::1]): the local backend, port 4000 (the backend's
//     default PORT) — or the port given as ?api=http://localhost:4010 . That parameter is read ONLY on a local host and only
//     for a local address, so a link such as https://app.biddex.online/?api=https://evil.example changes nothing.
// See README.md ("Локальный запуск"). The production address is written here and nowhere else (test/api-base.test.js).
(function () {
  var PRODUCTION_API = 'https://b2b-procurement-backend-production.up.railway.app';
  var LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
  var LOCAL_API = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d{2,5}$/;

  function apiBase(loc) {
    loc = loc || window.location;
    if (LOCAL_HOSTS.indexOf(loc.hostname) < 0) return PRODUCTION_API;
    var m = /[?&]api=([^&#]*)/.exec(loc.search || '');
    if (m) {
      var wanted = '';
      try { wanted = decodeURIComponent(m[1]); } catch (e) { wanted = ''; }
      if (LOCAL_API.test(wanted)) return wanted;
    }
    return 'http://' + loc.hostname + ':4000';
  }

  window.biddexApiBase = apiBase;
  window.BIDDEX_API = apiBase();
})();
