/**
 * Функция для расчета выручки
 * @param purchase запись о покупке (item из чека)
 * @param _product карточка товара из каталога
 * @returns {number} выручка с учетом скидки
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount, sale_price, quantity } = purchase;
  const discountCoefficient = 1 - discount / 100;
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
  } else if (index === total - 1) {
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

  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  const sellerIndex = Object.fromEntries(
    sellerStats.map((seller) => [seller.id, seller]),
  );
  const productIndex = Object.fromEntries(
    data.products.map((product) => [product.sku, product]),
  );

  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];

    seller.sales_count += 1;

    seller.revenue += record.total_amount;

    record.items.forEach((item) => {
      const product = productIndex[item.sku];

      const cost = product.purchase_price * item.quantity;

      const revenue = calculateRevenue(item, product);

      const itemProfit = revenue - cost;

      seller.profit += itemProfit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  sellerStats.sort((a, b) => b.profit - a.profit);

  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({
        sku: sku,
        quantity: quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}
