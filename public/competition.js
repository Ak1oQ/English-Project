import { products, categories } from './catalog-data.js';

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

const filterForm = document.getElementById('catalog-filters');
const search = document.getElementById('product-search');
const brand = document.getElementById('product-brand');
const budget = document.getElementById('product-budget');
const sort = document.getElementById('product-sort');
const categoryBar = document.getElementById('categories');
const grid = document.getElementById('product-grid');
const productCount = document.getElementById('product-count');
const empty = document.getElementById('empty-products');
const rubles = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
let category = '';

for (const name of [...new Set(products.map(product => product.brand))].sort()) {
  brand.add(new Option(name, name));
}
for (const [key, title] of [['', 'Вся одежда'], ...Object.entries(categories)]) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = title;
  button.dataset.category = key;
  categoryBar.append(button);
}

function productCard(product) {
  const card = document.createElement('a');
  card.className = 'product-card';
  card.href = product.url;
  const media = document.createElement('div');
  media.className = 'product-media';
  const fallback = document.createElement('span');
  fallback.textContent = categories[product.category];
  media.append(fallback);
  if (product.image) {
    const image = document.createElement('img');
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => image.remove(), { once: true });
    image.src = product.image;
    media.append(image);
  }
  media.setAttribute('aria-hidden', 'true');
  const info = document.createElement('div');
  info.className = 'product-info';
  const maker = document.createElement('span');
  maker.className = 'product-brand';
  maker.textContent = product.brand;
  const title = document.createElement('h2');
  title.textContent = product.title;
  const price = document.createElement('span');
  price.className = 'product-price';
  price.textContent = `${rubles.format(product.price)} ₽`;
  const action = document.createElement('span');
  action.className = 'product-cta';
  action.textContent = 'Открыть в магазине';
  info.append(maker, title, price, action);
  card.append(media, info);
  return card;
}

function normalize(value) {
  return value.toLocaleLowerCase('ru').replaceAll('ё', 'е');
}
function renderProducts() {
  const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
  const limit = Number(budget.value);
  const matches = products.filter(product => {
    const description = normalize(`${product.title} ${product.brand} ${categories[product.category]}`);
    return (!category || product.category === category) && (!brand.value || brand.value === product.brand) &&
      (!limit || product.price <= limit) && terms.every(term => description.includes(term));
  });
  if (sort.value === 'low') matches.sort((a, b) => a.price - b.price);
  if (sort.value === 'high') matches.sort((a, b) => b.price - a.price);
  for (const button of categoryBar.children) {
    button.setAttribute('aria-pressed', String(button.dataset.category === category));
  }
  productCount.textContent = `Найдено: ${matches.length} из ${products.length}`;
  empty.hidden = matches.length > 0;
  grid.replaceChildren(...matches.map(productCard));
}
categoryBar.addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  category = button.dataset.category;
  renderProducts();
});
filterForm.addEventListener('submit', event => event.preventDefault());
search.addEventListener('input', renderProducts);
for (const filter of [brand, budget, sort]) filter.addEventListener('change', renderProducts);
document.getElementById('reset-filters').addEventListener('click', () => {
  filterForm.reset();
  category = '';
  renderProducts();
});
renderProducts();
