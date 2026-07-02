/* ─────────────────────────────────────────────────────────────────────
   js/api.js — Shared backend plumbing. SINGLE SOURCE OF TRUTH.
   Loaded in <head> by index.html and command-center.html so the API base,
   CSRF headers, and credentialed fetch wrapper can never drift apart again.
   Must load BEFORE any inline page script (it shadows window.fetch).
   ───────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var _isLocal = ['localhost', '127.0.0.1', 'destruct-same-wildness.ngrok-free.dev'].includes(window.location.hostname);
  window.BBB_API = (window.BBB_API_BASE
    || (_isLocal ? 'http://localhost:8000' : 'https://api-production-dac3.up.railway.app')
  ).replace(/\/$/, '');

  // CSRF double-submit + active-player headers.
  // For authenticated calls pass { Authorization: `Bearer ${token}` } as `extra`.
  window._csrfHeaders = function (extra) {
    var row = document.cookie.split('; ').find(function (r) { return r.startsWith('csrf_token='); });
    var token = row ? row.split('=')[1] : '';
    var activePlayer = localStorage.getItem('bbb_active_player') || '1';
    return Object.assign(
      { 'Content-Type': 'application/json', 'X-CSRF-Token': token, 'X-BBB-Player': activePlayer },
      extra || {}
    );
  };

  window._rawFetch = window.fetch.bind(window);

  // ── Token refresh ──────────────────────────────────────────────────────
  // Single in-flight refresh promise prevents concurrent 401 storms.
  var _refreshPromise = null;

  function _doRefresh() {
    if (_refreshPromise) return _refreshPromise;
    var rt = localStorage.getItem('bbb_refresh_token');
    if (!rt) return Promise.resolve(null);
    _refreshPromise = window._rawFetch(window.BBB_API + '/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
      credentials: 'include',
    }).then(function (r) {
      _refreshPromise = null;
      if (!r.ok) {
        localStorage.removeItem('bbb_access_token');
        localStorage.removeItem('bbb_refresh_token');
        return null;
      }
      return r.json().then(function (tokens) {
        localStorage.setItem('bbb_access_token', tokens.access_token);
        if (tokens.refresh_token) localStorage.setItem('bbb_refresh_token', tokens.refresh_token);
        return tokens.access_token;
      });
    }).catch(function () {
      _refreshPromise = null;
      return null;
    });
    return _refreshPromise;
  }

  // ── _apiFetch ──────────────────────────────────────────────────────────
  // Always sends credentials cross-origin (5500 → 8000) so CSRF double-submit
  // works. On 401, silently refreshes tokens once then retries the request.
  window._apiFetch = function (url, opts) {
    opts = opts || {};
    var isRetry = opts._isRetry;
    var activePlayer = localStorage.getItem('bbb_active_player') || '1';
    if (!opts.headers) opts.headers = {};
    if (opts.headers instanceof Headers) {
      if (!opts.headers.has('X-BBB-Player')) opts.headers.set('X-BBB-Player', activePlayer);
    } else if (!('X-BBB-Player' in opts.headers)) {
      opts.headers['X-BBB-Player'] = activePlayer;
    }

    return window._rawFetch(url, Object.assign({ credentials: 'include' }, opts)).then(function (response) {
      // Only intercept 401s; never retry twice; skip if no refresh token stored.
      if (response.status !== 401 || isRetry || !localStorage.getItem('bbb_refresh_token')) {
        return response;
      }
      return _doRefresh().then(function (newToken) {
        if (!newToken) return response; // refresh failed — bubble original 401
        var retryOpts = Object.assign({}, opts, { _isRetry: true });
        // If the original request had an Authorization header, update it.
        if (retryOpts.headers) {
          var h = retryOpts.headers;
          if (h instanceof Headers) {
            if (h.has('Authorization')) h.set('Authorization', 'Bearer ' + newToken);
          } else if ('Authorization' in h) {
            retryOpts.headers = Object.assign({}, h, { Authorization: 'Bearer ' + newToken });
          }
        }
        return window._apiFetch(url, retryOpts);
      });
    });
  };

  // Shadow fetch so existing call sites are covered without per-site edits.
  window.fetch = window._apiFetch;

  // Prime the csrf_token cookie with a GET on load (best-effort; ignore network/CORS failures).
  try { window._apiFetch(window.BBB_API + '/api/v1/banks').catch(function () {}); } catch (e) { /* noop */ }
})();
