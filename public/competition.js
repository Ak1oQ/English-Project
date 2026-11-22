const themeToggle = document.getElementById('theme-toggle');
const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)');
const themeKey = 'fashion-check-theme';
let selectedTheme;
try { selectedTheme = localStorage.getItem(themeKey); } catch {}

function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeToggle.setAttribute('aria-pressed', String(dark));
}
applyTheme(selectedTheme || (preferredTheme.matches ? 'dark' : 'light'));
themeToggle.hidden = false;
themeToggle.addEventListener('click', () => {
  selectedTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(selectedTheme);
  try { localStorage.setItem(themeKey, selectedTheme); } catch {}
});
preferredTheme.addEventListener('change', event => {
  if (!selectedTheme) applyTheme(event.matches ? 'dark' : 'light');
});

const views = [...document.querySelectorAll('[data-view]')];
const navLinks = [...document.querySelectorAll('[data-part]')];
function showPart(moveFocus = false) {
  const id = location.hash.slice(1);
  const target = id && document.getElementById(id);
  const part = target?.closest?.('[data-view]')?.dataset.view || 'problem';
  const current = views.find(view => view.dataset.view === part);
  for (const view of views) view.hidden = view !== current;
  for (const link of navLinks) {
    if (link.dataset.part === part) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (target && current.contains(target) && target !== current && id !== part) {
    for (let parent = target.parentElement; parent && parent !== current; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
    target.scrollIntoView({ behavior: 'instant' });
  } else if (id !== 'main') {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  if (moveFocus) {
    const heading = (target && current.contains(target) ? target.querySelector('h1, h2, h3') : null) || current.querySelector('h1, h2');
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}
window.addEventListener('hashchange', () => showPart(location.hash !== '#main'));
showPart();
document.querySelector('.skip').addEventListener('click', event => {
  event.preventDefault();
  document.getElementById('main').focus();
});

