/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  const priceWithDiscount = purchase.sale_price * (1 - purchase.discount / 100);
  return priceWithDiscount * purchase.quantity;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  const { profit } = seller;
  if (index === 0) return profit * 0.15; // 1 место
  if (index === 1 || index === 2) return profit * 0.1; // 2 и 3 места
  if (index === total - 1) return 0; // Последнее место
  return profit * 0.05; // Остальные
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных

  // @TODO: Проверка наличия опций

  // @TODO: Подготовка промежуточных данных для сбора статистики

  // @TODO: Индексация продавцов и товаров для быстрого доступа

  // @TODO: Расчет выручки и прибыли для каждого продавца

  // @TODO: Сортировка продавцов по прибыли

  // @TODO: Назначение премий на основе ранжирования

  // @TODO: Подготовка итоговой коллекции с нужными полями
  if (!data || !data.sellers || !data.products || !data.purchase_records) {
    throw new Error("Некорректные входные данные");
  }

  const { calculateRevenue, calculateBonus } = options;
  const productIndex = Object.fromEntries(data.products.map((p) => [p.sku, p]));

  // Сбор статистики
  const sellerStats = data.sellers.map((seller) => ({
    id: String(seller.id), // Сразу делаем строкой
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  const sellerIndex = Object.fromEntries(sellerStats.map((s) => [s.id, s]));

  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[String(record.seller_id)];
    if (!seller) return;

    seller.sales_count += 1;

    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (product) {
        const itemRevenue = calculateRevenue(item, product);
        const cost = product.purchase_price * item.quantity;

        seller.revenue += itemRevenue;
        seller.profit += itemRevenue - cost;

        if (!seller.products_sold[item.sku]) {
          seller.products_sold[item.sku] = 0;
        }
        seller.products_sold[item.sku] += item.quantity;
      }
    });
  });

  // Округляем прибыль ПЕРЕД сортировкой (важно для стабильности рейтинга)
  sellerStats.forEach((s) => {
    s.profit = +s.profit.toFixed(2);
    s.revenue = +s.revenue.toFixed(2);
  });

  // Сортировка по прибыли (от большего к меньшему)
  sellerStats.sort((a, b) => b.profit - a.profit);

  return sellerStats.map((seller, index, array) => {
    const bonusAmount = calculateBonus(index, array.length, seller);

    const topProducts = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({
        sku: Number(sku), // SKU часто должен быть числом
        quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity || a.sku - b.sku) // Доп. сортировка по SKU
      .slice(0, 10);

    return {
      seller_id: seller.id,
      name: seller.name,
      revenue: seller.revenue,
      profit: seller.profit,
      sales_count: seller.sales_count,
      top_products: topProducts,
      bonus: +bonusAmount.toFixed(2),
    };
  });
}
