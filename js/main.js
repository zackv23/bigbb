// ── Toast ──────────────────────────────────────────────────────────────────
let _toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── FAQ accordion ──────────────────────────────────────────────────────────
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const wasOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-q').forEach(q => q.classList.remove('open'));
  if (!wasOpen) {
    answer.classList.add('open');
    btn.classList.add('open');
  }
}

// ── Scroll-triggered fade-in ───────────────────────────────────────────────
const fadeObserver = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.1 }
);
document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

// ── Animated stat counters ─────────────────────────────────────────────────
function animateCounter(el, end, prefix = '', suffix = '', duration = 1200) {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.floor(eased * end);
    el.textContent = prefix + value.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statsObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    statsObserver.unobserve(e.target);
    const earningsEl = document.getElementById('stat-earnings');
    const dealsEl    = document.getElementById('stat-deals');
    if (earningsEl) animateCounter(earningsEl, 4700, '$', '+');
    if (dealsEl)    animateCounter(dealsEl, 217, '', '+');
  });
}, { threshold: 0.5 });

const statsSection = document.getElementById('stats');
if (statsSection) statsObserver.observe(statsSection);

// ── Sticky nav shadow on scroll ────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.querySelector('nav').style.boxShadow =
    window.scrollY > 10 ? '0 4px 32px rgba(0,0,0,.4)' : 'none';
}, { passive: true });
