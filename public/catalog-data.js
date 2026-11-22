import { catalogStock } from './catalog-stock.js';
import { expandedProducts } from './catalog-expansion.js';

export const categories = {
  jackets: 'Куртки',
  tees: 'Футболки и лонгсливы',
  jeans: 'Джинсы',
  sweats: 'Худи и свитшоты',
  shirts: 'Рубашки',
  trousers: 'Брюки',
  sneakers: 'Кроссовки и кеды',
};

function befree(title, category, price, article, color) {
  return {
    title, category, price, brand: 'Befree',
    url: `https://befree.ru/muzhskaya/product/${article}/${color}`,
    image: `https://imgcdn.befree.ru/rest/V1/images/1024/product/images/${article}/${article}_${color}_1.jpg`,
  };
}

function zarina(title, category, price, article, image) {
  return {
    title, category, price, brand: 'ZARINA',
    url: `https://zarina.ru/catalog/product/${article}/`,
    image: `https://imgcdn.zarina.ru/upload/images/${image}`,
  };
}

const originalProducts = [
  befree('Джинсовая куртка с отложным воротником', 'jackets', 3599, 'BF2633101009', 106),
  zarina('Утеплённая куртка на кулиске', 'jackets', 5599, 'zr2611102204-50', 'zr261/thumb/900_9999/zr2611102204_50_1.webp?t=1794410592'),
  befree('Цветная джинсовая куртка', 'jackets', 2999, 'BF2633101032', 70),
  zarina('Базовая футболка из хлопка', 'tees', 699, 'regular0326-1', 'regul/thumb/900_9999/regular0326_1_1.webp?t=1767179527'),
  befree('Джинсы багги с вышивкой', 'jeans', 1999, 'BF2633109008', 106),
  befree('Лонгслив в полоску', 'tees', 1999, 'BF2633122008', 5),
  zarina('Куртка с воротником-стойкой', 'jackets', 6999, 'zr2611102215-178', 'zr261/thumb/900_9999/zr2611102215_178_1.webp?t=1789372919'),
  befree('Утеплённая джинсовая куртка на молнии', 'jackets', 2999, 'BF2633101022', 103),
  befree('Джинсовая куртка с капюшоном и принтом', 'jackets', 4999, 'BF2633101016', 35),
  zarina('Стёганая куртка с капюшоном', 'jackets', 7999, 'zr2611102211-169', 'zr261/thumb/900_9999/zr2611102211_169_1.webp?t=1789372906'),
  befree('Рубашка из модала с вышивкой', 'shirts', 1599, 'BF2633117012', 20),
  befree('Утеплённая куртка с отложным воротником', 'jackets', 6599, 'BF2633101018', 50),
  zarina('Стёганая куртка со съёмным жилетом', 'jackets', 7999, 'zr2610102225-60', 'zr261/thumb/900_9999/zr2610102225_60_1.webp?t=1788962048'),
  befree('Джинсовый бомбер с отложным воротником', 'jackets', 4999, 'BF2613101013', 104),
  zarina('Куртка с широким меховым воротником', 'jackets', 5599, 'zr2611102208-61', 'zr261/thumb/900_9999/zr2611102208_61_1.webp?t=1791813592'),
  befree('Утеплённая джинсовая куртка без капюшона', 'jackets', 6599, 'BF2623101002', 62),
];

export const styleNames = {
  casual: 'Повседневный',
  business: 'Деловой',
  grunge: 'Гранж',
  street: 'Стритвир',
  sport: 'Спортивный',
  minimal: 'Минимализм',
};

function editorialStyles({ title, category }) {
  const name = title.toLowerCase();
  if (category === 'jackets') {
    if (name.includes('джинсов')) return ['casual', 'street', 'grunge'];
    return name.includes('бомбер') ? ['casual', 'street'] : ['casual', 'minimal'];
  }
  if (category === 'jeans') return ['casual', 'street', 'grunge'];
  if (category === 'shirts') {
    if (name.includes('клетк') || name.includes('джинсов')) return ['casual', 'grunge', 'street'];
    return ['casual', 'business', 'minimal'];
  }
  if (category === 'trousers') {
    if (/джоггер|карго|спортив|футер/.test(name)) return ['casual', 'sport', 'street'];
    return ['casual', 'business', 'minimal'];
  }
  if (category === 'sneakers') return ['casual', 'sport', 'street'];
  if (category === 'sweats') return ['casual', 'sport', 'street'];
  if (/принт|полоск|вышивк/.test(name)) return ['casual', 'street'];
  return ['casual', 'minimal'];
}

const originals = originalProducts.map(product => ({ ...product, store: product.brand }));
const additions = expandedProducts.map(product => ({ ...product, store: 'Lamoda' }));
const byUrl = new Map();
for (const product of [...originals, ...additions, ...catalogStock]) {
  byUrl.set(product.url.toLowerCase(), {
    ...product,
    styles: product.styles ?? editorialStyles(product),
  });
}

// Mix stores and categories in the featured order. Price sorting is handled separately.
const groups = new Map();
for (const product of byUrl.values()) {
  const key = `${product.store}/${product.category}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(product);
}

export const products = [];
const longestGroup = Math.max(...Array.from(groups.values(), group => group.length));
for (let rank = 0; rank < longestGroup; rank++) {
  for (const group of groups.values()) {
    if (group[rank]) products.push(group[rank]);
  }
}
