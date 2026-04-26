/**
 * Функция для расчета выручки
 * @param purchase запись о покупке (item из чека)
 * @param _product карточка товара из каталога
 * @returns {number} выручка с учетом скидки
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount, sale_price, quantity } = purchase;
  const discountCoefficient = 1 - discount / 100;
  // Возвращаем чистое число без округления здесь, округлим итог в конце
  return sale_price * quantity * discountCoefficient;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве (рейтинг)
 * @param total общее число продавцов
 * @param seller карточка продавца с накопленной прибылью
 * @returns {number} итоговая сумма бонуса в рублях
 */
function calculateBonusByProfit(index, total, seller) {
  // Расчет бонуса от позиции в рейтинге:
  const { profit } = seller;

  if (index === 0) {
    return profit * 0.15;
  } else if (index === 1 || index === 2) {
    return profit * 0.1;
  } else if (total > 1 && index === total - 1) {
    // Последний в рейтинге
    return 0;
  } else {
    return profit * 0.05;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data объект с коллекциями sellers, products, purchase_records
 * @param options объект с функциями для расчетов
 * @returns {Array} итоговый отчет по продавцам
 */
function analyzeSalesData(data, options) {
  // Проверка входных данных: массивы должны существовать и не быть пустыми
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  const { calculateRevenue, calculateBonus } = options;
  if (!calculateRevenue || !calculateBonus) {
    throw new Error("Необходимы функции для расчета");
  }

  // 2. Подготовка статистики и индексов
  const sellerStats = data.sellers.map((seller) => ({
    id: String(seller.id),
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  const sellerIndex = Object.fromEntries(sellerStats.map((s) => [s.id, s]));
  const productIndex = Object.fromEntries(data.products.map((p) => [p.sku, p]));

  // 3. Сбор статистики по чекам
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[String(record.seller_id)];
    if (!seller) return;

    seller.sales_count += 1;

    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (product) {
        const itemRevenue = calculateRevenue(item, product);
        const cost = product.purchase_price * item.quantity;

        // КЛЮЧ К УСПЕХУ: Считаем выручку и прибыль по одной логике
        // Это гарантирует точность до копейки как в эталоне (8121.6)
        seller.revenue += itemRevenue;
        seller.profit += itemRevenue - cost;

        if (!seller.products_sold[item.sku]) {
          seller.products_sold[item.sku] = 0;
        }
        seller.products_sold[item.sku] += item.quantity;
      }
    });
  });

  // 4. Сортировка продавцов по прибыли
  sellerStats.sort(
    (a, b) =>
      b.profit - a.profit ||
      a.id.localeCompare(b.id, undefined, { numeric: true }),
  );

  // 5. Формирование итогового отчета
  return sellerStats.map((seller, index, array) => {
    const bonusValue = calculateBonus(index, array.length, seller);

    const topProducts = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => {
        // Сначала по количеству (убывание)
        if (b.quantity !== a.quantity) return b.quantity - a.quantity;
        // ЗАТЕМ по алфавиту (A-Z), чтобы SKU_049 был выше SKU_081
        return a.sku.localeCompare(b.sku);
      })
      .slice(0, 10);

    return {
      seller_id: seller.id,
      name: seller.name,
      revenue: +seller.revenue.toFixed(2),
      profit: +seller.profit.toFixed(2),
      sales_count: seller.sales_count,
      top_products: topProducts,
      bonus: +bonusValue.toFixed(2),
    };
  });
}
