/**
 * Функция для расчета выручки
 * @param purchase запись о покупке (item из чека)
 * @param _product карточка товара из каталога
 * @returns {number} выручка с учетом скидки
 */
function calculateSimpleRevenue(purchase, _product) {
  // Расчет выручки от операции: цена * количество * (1 - скидка_в_процентах)
  const discountCoefficient = 1 - purchase.discount / 100;
  // Убираем Math.round, возвращаем точное число
  return purchase.sale_price * purchase.quantity * discountCoefficient;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве (рейтинг)
 * @param total общее число продавцов
 * @param seller карточка продавца с накопленной прибылью
 * @returns {number} итоговая сумма бонуса в рублях
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;

  // Расчет бонуса от позиции в рейтинге:
  if (index === 0) {
    return profit * 0.15; // 15% за первое место
  } else if (index === 1 || index === 2) {
    return profit * 0.1; // 10% за второе и третье места
  } else if (total > 1 && index === total - 1) {
    return 0; // 0% для последнего места
  } else {
    return profit * 0.05; // 5% для всех остальных
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
    data.sellers.length === 0 ||
    !Array.isArray(data.purchase_records)
  ) {
    throw new Error("Некорректные входные данные");
  }

  const { calculateRevenue, calculateBonus } = options;
  const productIndex = Object.fromEntries(data.products.map((p) => [p.sku, p]));

  const sellerStats = data.sellers.map((seller) => ({
    id: String(seller.id),
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  const sellerMap = Object.fromEntries(sellerStats.map((s) => [s.id, s]));

  data.purchase_records.forEach((record) => {
    const seller = sellerMap[String(record.seller_id)];
    if (!seller) return;

    seller.sales_count += 1;
    seller.revenue += record.total_amount; // Суммируем как есть

    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (product) {
        const itemRevenue = calculateRevenue(item, product);
        const itemCost = product.purchase_price * item.quantity;

        // Накапливаем прибыль БЕЗ промежуточного округления
        seller.profit += itemRevenue - itemCost;

        if (!seller.products_sold[item.sku]) {
          seller.products_sold[item.sku] = 0;
        }
        seller.products_sold[item.sku] += item.quantity;
      }
    });
  });

  // Сортировка продавцов
  sellerStats.sort(
    (a, b) =>
      b.profit - a.profit ||
      a.id.localeCompare(b.id, undefined, { numeric: true }),
  );

  return sellerStats.map((seller, index, array) => {
    const bonus = calculateBonus(index, array.length, seller);

    const top_products = Object.entries(seller.products_sold)
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
      top_products,
      bonus: +bonus.toFixed(2),
    };
  });
}
