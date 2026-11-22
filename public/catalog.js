import { categories, products, styleNames } from './catalog-data.js';

const get = id => document.getElementById(id);
const search = get('product-search');
const sort = get('product-sort');
const grid = get('product-grid');
const filterDialog = get('filters-dialog');
const comparisonDialog = get('comparison-dialog');
const category = get('product-category');
const brand = get('product-brand');
const styleOptions = get('style-options');
const minSlider = get('price-min');
const maxSlider = get('price-max');
const fromInput = get('price-from');
const toInput = get('price-to');
const budgetButton = get('budget-shortcut');
const compareButton = get('open-comparison');
const priceCeiling = Math.ceil(Math.max(...products.map(item => item.price)) / 1000) * 1000;
const budgetCeiling = 4000;
const compareLimit = 4;
const priceFormat = new Intl.NumberFormat('ru-RU');
const productByUrl = new Map(products.map(item => [item.url, item]));
const selected = new Set();
let active = defaultFilters();
let budgetUndo = null;

function defaultFilters() {
  return { category: '', brand: '', styles: [], min: 0, max: priceCeiling };
}
function rubles(value) {
  return `${priceFormat.format(value)} ₽`;
}
function normalize(value) {
  return value.toLocaleLowerCase('ru').replaceAll('ё', 'е').replace(/[’']/g, '');
}
function node(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;
  return element;
}
function matchingProducts(filters) {
  const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
  const matches = products.filter(item => {
    const searchable = normalize(`${item.title} ${item.brand} ${categories[item.category]} ${item.color || ''}`);
    return (!filters.category || item.category === filters.category) &&
      (!filters.brand || item.brand === filters.brand) &&
      item.price >= filters.min && item.price <= filters.max &&
      (!filters.styles.length || filters.styles.some(style => item.styles.includes(style))) &&
      terms.every(term => searchable.includes(term));
  });
  if (sort.value === 'low') matches.sort((a, b) => a.price - b.price);
  if (sort.value === 'high') matches.sort((a, b) => b.price - a.price);
  return matches;
}

for (const [key, title] of Object.entries(categories)) category.add(new Option(title, key));
for (const name of [...new Set(products.map(item => item.brand))].sort((a, b) => a.localeCompare(b, 'ru'))) brand.add(new Option(name, name));
for (const [key, title] of Object.entries(styleNames)) {
  const label = node('label', 'style-option');
  const input = node('input');
  input.type = 'checkbox';
  input.value = key;
  label.append(input, node('span', '', title));
  styleOptions.append(label);
}
for (const input of [minSlider, maxSlider, fromInput, toInput]) input.max = String(priceCeiling);

function applyDraftValues(filters) {
  category.value = filters.category;
  brand.value = filters.brand;
  for (const input of styleOptions.querySelectorAll('input')) input.checked = filters.styles.includes(input.value);
  updatePriceControls(filters.min, filters.max);
}
function updatePriceControls(min, max, editingInput) {
  minSlider.value = String(min);
  maxSlider.value = String(max);
  if (editingInput !== fromInput) fromInput.value = minSlider.value;
  if (editingInput !== toInput) toInput.value = maxSlider.value;
  minSlider.setAttribute('aria-valuetext', rubles(min));
  maxSlider.setAttribute('aria-valuetext', rubles(max));
  get('price-min-value').value = rubles(min);
  get('price-max-value').value = rubles(max);
  get('price-range').style.setProperty('--start', `${min / priceCeiling * 100}%`);
  get('price-range').style.setProperty('--end', `${max / priceCeiling * 100}%`);
  minSlider.classList.toggle('range-front', max === priceCeiling && min > priceCeiling * 0.75);
}
function readDraft() {
  return {
    category: category.value,
    brand: brand.value,
    styles: [...styleOptions.querySelectorAll('input:checked')].map(input => input.value),
    min: Number(minSlider.value),
    max: Number(maxSlider.value),
  };
}
function previewCount() {
  get('apply-filters').textContent = `Показать товары (${matchingProducts(readDraft()).length})`;
}
function clampPrice(value, fallback) {
  return Number.isFinite(value) ? Math.max(0, Math.min(priceCeiling, Math.round(value))) : fallback;
}
function updateFromInput(input, editingInput) {
  const min = clampPrice(fromInput.valueAsNumber, Number(minSlider.value));
  const max = clampPrice(toInput.valueAsNumber, Number(maxSlider.value));
  if (input === fromInput) updatePriceControls(Math.min(min, max), max, editingInput);
  else updatePriceControls(min, Math.max(min, max), editingInput);
  previewCount();
}
minSlider.addEventListener('input', () => {
  updatePriceControls(Math.min(Number(minSlider.value), Number(maxSlider.value)), Number(maxSlider.value));
  previewCount();
});
maxSlider.addEventListener('input', () => {
  updatePriceControls(Number(minSlider.value), Math.max(Number(minSlider.value), Number(maxSlider.value)));
  previewCount();
});
for (const input of [fromInput, toInput]) {
  input.addEventListener('input', () => updateFromInput(input, input));
  input.addEventListener('blur', () => updateFromInput(input));
}
for (const control of [category, brand, styleOptions]) control.addEventListener('change', previewCount);

function openFilterDialog(focusStyle = false) {
  applyDraftValues(active);
  previewCount();
  filterDialog.showModal();
  if (focusStyle) styleOptions.querySelector('input').focus();
}
get('open-filters').addEventListener('click', () => openFilterDialog());
get('style-shortcut').addEventListener('click', () => openFilterDialog(true));
get('reset-filters').addEventListener('click', () => {
  applyDraftValues(defaultFilters());
  previewCount();
});
get('catalog-filters').addEventListener('submit', event => {
  event.preventDefault();
  updateFromInput(toInput);
  const draft = readDraft();
  if (draft.min !== active.min || draft.max !== active.max) budgetUndo = null;
  active = draft;
  filterDialog.close();
  renderCatalog();
});
budgetButton.addEventListener('click', () => {
  if (active.min === 0 && active.max === budgetCeiling) {
    const { min, max } = budgetUndo || defaultFilters();
    active = { ...active, min, max };
    budgetUndo = null;
  } else {
    budgetUndo = { min: active.min, max: active.max };
    active = { ...active, min: 0, max: budgetCeiling };
  }
  renderCatalog();
});
for (const dialog of [filterDialog, comparisonDialog]) {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
}

function productMedia(item) {
  const media = node('div', 'product-media');
  media.setAttribute('aria-hidden', 'true');
  media.append(node('span', '', categories[item.category]));
  if (item.image) {
    const image = node('img');
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => image.remove(), { once: true });
    image.src = item.image;
    media.append(image);
  }
  return media;
}
function productLink(item, className, label) {
  const link = node('a', className, label);
  link.href = item.url;
  return link;
}
function productCard(item) {
  const card = node('article', 'product-card');
  const link = productLink(item, 'product-link');
  const info = node('div', 'product-info');
  info.append(node('span', 'product-brand', item.brand), node('h2', '', item.title),
    node('span', 'product-brand', item.color || categories[item.category]),
    node('span', 'product-price', rubles(item.price)), node('span', 'product-cta', item.store === 'Lamoda' ? 'Смотреть на Lamoda' : 'Смотреть в магазине'));
  link.append(productMedia(item), info);
  const toggle = node('button', 'product-compare', 'Сравнить');
  toggle.type = 'button';
  toggle.dataset.compare = item.url;
  toggle.setAttribute('aria-label', `Сравнить: ${item.brand} ${item.title}${item.color ? `, ${item.color}` : ''}`);
  card.append(link, toggle);
  return card;
}
function updateComparisonControls() {
  get('comparison-dock').hidden = !selected.size;
  get('comparison-count').textContent = `Выбрано ${selected.size} из ${compareLimit}`;
  get('comparison-hint').textContent = selected.size === 1 ? 'Добавь ещё одну вещь' : 'Товары можно открыть в магазинах';
  compareButton.disabled = selected.size < 2;
  for (const button of grid.querySelectorAll('[data-compare]')) {
    const chosen = selected.has(button.dataset.compare);
    button.setAttribute('aria-pressed', String(chosen));
    button.textContent = chosen ? 'В сравнении' : 'Сравнить';
  }
}
grid.addEventListener('click', event => {
  const button = event.target.closest('[data-compare]');
  if (!button) return;
  const item = productByUrl.get(button.dataset.compare);
  let status;
  if (selected.delete(item.url)) status = `${item.title} убран из сравнения.`;
  else if (selected.size < compareLimit) {
    selected.add(item.url);
    status = `${item.title} добавлен в сравнение.`;
  } else status = 'Можно сравнить до четырёх вещей. Убери одну, чтобы добавить новую.';
  updateComparisonControls();
  if (status.startsWith('Можно')) get('comparison-hint').textContent = status;
  get('comparison-status').textContent = status;
});
get('clear-comparison').addEventListener('click', () => {
  selected.clear();
  updateComparisonControls();
  get('open-filters').focus();
  get('comparison-status').textContent = 'Сравнение очищено.';
});
compareButton.addEventListener('click', () => {
  const items = [...selected].map(url => productByUrl.get(url));
  if (items.length < 2) return;
  const lowest = Math.min(...items.map(item => item.price));
  const highest = Math.max(...items.map(item => item.price));
  const notice = node('p', 'comparison-summary', lowest === highest ? 'У выбранных товаров одинаковая цена.' : `Разница между самой низкой и самой высокой ценой: ${rubles(highest - lowest)}.`);
  const container = node('div', 'compare-scroll');
  container.tabIndex = 0;
  container.setAttribute('aria-label', 'Таблица сравнения. Прокручивается по горизонтали');
  container.setAttribute('role', 'region');
  const table = node('table', 'compare-table');
  const head = table.createTHead().insertRow();
  head.append(node('th', '', 'Товар'));
  for (const item of items) {
    const cell = node('th', 'compare-product');
    cell.scope = 'col';
    cell.append(productMedia(item), node('span', '', item.title));
    head.append(cell);
  }
  const body = table.createTBody();
  const rows = [
    ['Цена', item => node('strong', item.price === lowest ? 'lowest-price' : '', rubles(item.price))],
    ['Бренд', item => item.brand],
    ['Категория', item => categories[item.category]],
    ['Стиль', item => item.styles.map(key => styleNames[key]).join(', ')],
    ['Цвет', item => item.color || 'См. карточку'],
    ['Магазин', item => productLink(item, 'comparison-link', item.store)],
  ];
  for (const [label, value] of rows) {
    const row = body.insertRow();
    const rowTitle = node('th', '', label);
    rowTitle.scope = 'row';
    row.append(rowTitle);
    for (const item of items) row.insertCell().append(value(item));
  }
  container.append(table);
  get('comparison-content').replaceChildren(notice, container);
  comparisonDialog.showModal();
});

function renderCatalog() {
  const matches = matchingProducts(active);
  const labels = [categories[active.category], active.brand, ...active.styles.map(key => styleNames[key])].filter(Boolean);
  if (active.min > 0 || active.max < priceCeiling) labels.push(`${rubles(active.min)} — ${rubles(active.max)}`);
  const filterCount = get('filter-count');
  filterCount.hidden = labels.length === 0;
  filterCount.textContent = String(labels.length);
  const activeFilters = get('active-filters');
  activeFilters.hidden = labels.length === 0;
  activeFilters.textContent = labels.join(' · ');
  budgetButton.setAttribute('aria-pressed', String(active.min === 0 && active.max === budgetCeiling));
  get('product-count').textContent = `Найдено ${matches.length} из ${products.length}`;
  get('empty-products').hidden = matches.length > 0;
  grid.replaceChildren(...matches.map(productCard));
  updateComparisonControls();
}
search.addEventListener('input', renderCatalog);
sort.addEventListener('change', renderCatalog);
get('clear-results-filters').addEventListener('click', () => {
  active = defaultFilters();
  budgetUndo = null;
  search.value = '';
  renderCatalog();
  search.focus();
});
renderCatalog();
