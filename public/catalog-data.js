export const categories = {
  jackets: 'Куртки',
  tees: 'Футболки и лонгсливы',
  jeans: 'Джинсы',
  sweats: 'Худи и свитшоты',
  shirts: 'Рубашки',
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

function ostin(title, category, price, slug, id) {
  return { title, category, price, brand: 'O’STIN', url: `https://ostin.com/product/${slug}/${id}` };
}

export const products = [
  befree('Джинсовая куртка с отложным воротником', 'jackets', 3599, 'BF2633101009', 106),
  zarina('Утеплённая куртка на кулиске', 'jackets', 5599, 'zr2611102204-50', 'zr261/thumb/900_9999/zr2611102204_50_1.webp?t=1794410592'),
  befree('Цветная джинсовая куртка', 'jackets', 2999, 'BF2633101032', 70),
  zarina('Базовая футболка из хлопка', 'tees', 699, 'regular0326-1', 'regul/thumb/900_9999/regular0326_1_1.webp?t=1767179527'),
  befree('Джинсы багги с вышивкой', 'jeans', 1999, 'BF2633109008', 106),
  befree('Лонгслив в полоску', 'tees', 1999, 'BF2633122008', 5),
  ostin('Бомбер на молнии', 'jackets', 2399, 'bomber-na-molnii', '39369890299'),
  zarina('Куртка с воротником-стойкой', 'jackets', 6999, 'zr2611102215-178', 'zr261/thumb/900_9999/zr2611102215_178_1.webp?t=1789372919'),
  befree('Утеплённая джинсовая куртка на молнии', 'jackets', 2999, 'BF2633101022', 103),
  ostin('Базовая футболка', 'tees', 799, 'bazovaya-futbolka', '11525020299'),
  ostin('Свободные джинсы', 'jeans', 3679, 'svobodnye-dzhinsy', '39764890299'),
  ostin('Базовый свитшот', 'sweats', 2599, 'bazovyj-svitshot', '39811290299'),
  befree('Джинсовая куртка с капюшоном и принтом', 'jackets', 4999, 'BF2633101016', 35),
  zarina('Стёганая куртка с капюшоном', 'jackets', 7999, 'zr2611102211-169', 'zr261/thumb/900_9999/zr2611102211_169_1.webp?t=1789372906'),
  ostin('Утеплённая куртка с воротником-стойкой', 'jackets', 5599, 'uteplyonnaya-kurtka-s-vorotnikom-stojkoj', '40622550299'),
  befree('Рубашка из модала с вышивкой', 'shirts', 1599, 'BF2633117012', 20),
  ostin('Толстовка на молнии с капюшоном', 'sweats', 3999, 'tolstovka-na-molnii-s-kapyushonom', '39186930299'),
  ostin('Зауженные джинсы', 'jeans', 1599, 'zauzhennye-dzhinsy', '30295270299'),
  befree('Утеплённая куртка с отложным воротником', 'jackets', 6599, 'BF2633101018', 50),
  zarina('Стёганая куртка со съёмным жилетом', 'jackets', 7999, 'zr2610102225-60', 'zr261/thumb/900_9999/zr2610102225_60_1.webp?t=1788962048'),
  ostin('Утеплённая куртка из вельвета', 'jackets', 6399, 'uteplyonnaya-kurtka-iz-velveta', '40659710299'),
  ostin('Базовая приталенная рубашка', 'shirts', 1599, 'bazovaya-rubashka-slim', '25619890299'),
  befree('Джинсовый бомбер с отложным воротником', 'jackets', 4999, 'BF2613101013', 104),
  zarina('Куртка с широким меховым воротником', 'jackets', 5599, 'zr2611102208-61', 'zr261/thumb/900_9999/zr2611102208_61_1.webp?t=1791813592'),
  befree('Утеплённая джинсовая куртка без капюшона', 'jackets', 6599, 'BF2623101002', 62),
];
