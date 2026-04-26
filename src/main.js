/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  const totalBeforeDiscount = purchase.sale_price * purchase.quantity;
  return totalBeforeDiscount * (1 - purchase.discount / 100);
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

  // 2. Проверка на ПУСТЫЕ массивы (исправляет ваши упавшие тесты)
  if (
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Данные не могут быть пустыми");
  }

  // 3. Проверка наличия функций расчета в options
  if (!options || !options.calculateRevenue || !options.calculateBonus) {
    throw new Error("Отсутствуют функции расчета");
  }

  const { calculateRevenue, calculateBonus } = options;
  const productIndex = Object.fromEntries(data.products.map((p) => [p.sku, p]));

  // Подготовка данных продавцов
  const sellerStats = data.sellers.map((seller) => ({
    id: String(seller.id),
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  const sellerIndex = Object.fromEntries(sellerStats.map((s) => [s.id, s]));

  // Обработка записей о продажах
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

  // Округляем показатели ПЕРЕД сортировкой для точности рейтинга
  sellerStats.forEach((s) => {
    s.profit = +s.profit.toFixed(2);
    s.revenue = +s.revenue.toFixed(2);
  });

  // Сортировка: сначала по прибыли, если она равна — по ID (для стабильности тестов)
  sellerStats.sort((a, b) => b.profit - a.profit || a.id.localeCompare(b.id));

  // Формирование итогового массива
  return sellerStats.map((seller, index, array) => {
    const bonusAmount = calculateBonus(index, array.length, seller);

    const topProducts = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({
        sku: sku, // Убираем Number(), оставляем как есть (строку "SKU_023")
        quantity: quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity || a.sku.localeCompare(b.sku))
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
