/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  return (
    purchase.sale_price * purchase.quantity * (1 - purchase.discount / 100)
  );
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
  if (total > 1 && index === total - 1) return 0;
  if (index === 0) return profit * 0.15;
  if (index === 1 || index === 2) return profit * 0.1;
  return profit * 0.05;
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

  if (
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Данные не могут быть пустыми");
  }

  const { calculateRevenue, calculateBonus } = options;
  const productIndex = Object.fromEntries(data.products.map((p) => [p.sku, p]));

  // 2. Инициализация статистики продавцов
  const sellerStats = data.sellers.map((seller) => ({
    id: String(seller.id),
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  const sellerIndex = Object.fromEntries(sellerStats.map((s) => [s.id, s]));

  // 3. Сбор данных (накапливаем "сырые" числа для точности)
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

        seller.products_sold[item.sku] =
          (seller.products_sold[item.sku] || 0) + item.quantity;
      }
    });
  });

  // 4. Сортировка продавцов по прибыли (от большего к меньшему)
  sellerStats.sort((a, b) => {
    const diff = b.profit - a.profit;
    if (Math.abs(diff) > 0.01) return diff;
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });

  // 5. Формирование итогового отчета
  return sellerStats.map((seller, index, array) => {
    // Округляем прибыль и выручку ДО расчета бонуса (исправляет копейки Петрова)
    const roundedProfit = Math.round(seller.profit * 100) / 100;
    const roundedRevenue = Math.round(seller.revenue * 100) / 100;

    // Считаем бонус от округленной прибыли
    const bonusAmount = calculateBonus(index, array.length, {
      ...seller,
      profit: roundedProfit,
    });

    // ТОП-10 товаров с алфавитной сортировкой при равном количестве
    const topProducts = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => {
        if (b.quantity !== a.quantity) return b.quantity - a.quantity;
        return a.sku.localeCompare(b.sku); // По возрастанию (SK_004 выше SKU_041)
      })
      .slice(0, 10);

    return {
      seller_id: seller.id,
      name: seller.name,
      revenue: roundedRevenue,
      profit: roundedProfit,
      sales_count: seller.sales_count,
      top_products: topProducts,
      // Микро-добавка для корректного округления .565 -> .57
      bonus: Math.round((bonusAmount + 0.00001) * 100) / 100,
    };
  });
}
