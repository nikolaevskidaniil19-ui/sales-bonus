/**
 * Функция для расчета выручки
 * @param purchase запись о покупке (item из чека)
 * @param _product карточка товара из каталога
 * @returns {number} выручка с учетом скидки
 */
function calculateSimpleRevenue(purchase, _product) {
  // Расчет выручки от операции: цена * количество * (1 - скидка_в_процентах)
  const discountCoefficient = 1 - purchase.discount / 100;
  const res = purchase.sale_price * purchase.quantity * discountCoefficient;

  // Округляем до копеек каждую позицию для точности расчетов
  return Math.round(res * 100) / 100;
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
    !Array.isArray(data.products) ||
    data.products.length === 0 ||
    !Array.isArray(data.purchase_records) ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  // Проверка наличия опций: функции расчета обязательны
  const { calculateRevenue, calculateBonus } = options;
  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Не переданы функции для расчёта");
  }

  // Индексация товаров для быстрого доступа по SKU
  const productIndex = Object.fromEntries(data.products.map((p) => [p.sku, p]));

  // Подготовка промежуточных данных для сбора статистики по продавцам
  const sellerStats = data.sellers.map((seller) => ({
    id: String(seller.id),
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  // Индексация продавцов для быстрого обновления их статистики
  const sellerMap = Object.fromEntries(sellerStats.map((s) => [s.id, s]));

  // Расчет выручки и прибыли для каждого продавца на основе чеков
  data.purchase_records.forEach((record) => {
    const seller = sellerMap[String(record.seller_id)];
    if (!seller) return;

    // Увеличиваем счетчик продаж и общую выручку из чека
    seller.sales_count += 1;
    seller.revenue =
      Math.round((seller.revenue + record.total_amount) * 100) / 100;

    // Перебор купленных товаров в чеке
    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (product) {
        // Расчет прибыли по позиции: выручка минус себестоимость
        const itemRevenue = calculateRevenue(item, product);
        const itemCost = product.purchase_price * item.quantity;
        const itemProfit = Math.round((itemRevenue - itemCost) * 100) / 100;

        // Накопление прибыли продавца с защитой от ошибок плавающей точки
        seller.profit = Math.round((seller.profit + itemProfit) * 100) / 100;

        // Учет количества проданных конкретных товаров
        if (!seller.products_sold[item.sku]) {
          seller.products_sold[item.sku] = 0;
        }
        seller.products_sold[item.sku] += item.quantity;
      }
    });
  });

  // Сортировка продавцов по прибыли (от большей к меньшей)
  sellerStats.sort(
    (a, b) =>
      b.profit - a.profit ||
      a.id.localeCompare(b.id, undefined, { numeric: true }),
  );

  // Формирование итоговой коллекции и расчет премий на основе рейтинга
  return sellerStats.map((seller, index, array) => {
    // Назначение бонуса
    const bonus = calculateBonus(index, array.length, seller);

    // Подготовка Топ-10 товаров (сортировка по количеству, затем по SKU в алфавитном порядке)
    const top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity || a.sku.localeCompare(b.sku))
      .slice(0, 10);

    // Возврат объекта в итоговом формате
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
