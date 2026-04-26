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
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records)
  ) {
    throw new Error("Некорректные входные данные");
  }

  const { calculateRevenue, calculateBonus } = options;

  const productIndex = Object.fromEntries(data.products.map((p) => [p.sku, p]));

  // 3. Подготовка промежуточных данных для продавцов
  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {}, // Храним количество проданного по SKU
  }));

  // Быстрый доступ к статистике продавца по его ID
  const sellerIndex = Object.fromEntries(sellerStats.map((s) => [s.id, s]));

  // 4. Бизнес-логика: Перебор чеков и расчет прибыли
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    // Считаем каждый чек как одну продажу
    seller.sales_count += 1;

    // Перебираем товары внутри чека
    record.items.forEach((item) => {
      const product = productIndex[item.sku];

      if (product) {
        // Выручка позиции (со скидкой)
        const itemRevenue = calculateRevenue(item, product);

        // Себестоимость (закупочная цена из каталога * количество)
        const cost = product.purchase_price * item.quantity;

        // Прибыль позиции (Выручка - Закупка)
        const itemProfit = itemRevenue - cost;

        // Накапливаем данные в объект продавца
        seller.revenue += itemRevenue;
        seller.profit += itemProfit;

        // Считаем количество проданных товаров для ТОП-10
        if (!seller.products_sold[item.sku]) {
          seller.products_sold[item.sku] = 0;
        }
        seller.products_sold[item.sku] += item.quantity;
      }
    });
  });

  // 5. Сортировка продавцов по прибыли (от большего к меньшему)
  sellerStats.sort((a, b) => b.profit - a.profit);

  // 6. Формирование итогового отчета
  return sellerStats.map((seller, index, array) => {
    // Расчет бонуса на основе места в рейтинге
    const bonusAmount = calculateBonus(index, array.length, seller);

    // Формирование ТОП-10 самых продаваемых товаров продавца
    const topProducts = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return {
      seller_id: String(seller.id),
      name: seller.name,
      revenue: +seller.revenue.toFixed(2),
      profit: +seller.profit.toFixed(2),
      sales_count: seller.sales_count,
      top_products: topProducts,
      bonus: +bonusAmount.toFixed(2),
    };
  });
}
