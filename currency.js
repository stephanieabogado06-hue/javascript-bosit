window.Click2EatCurrency = (() => {
  const usdToPhpRate = 63.064627;
  const productsKey = "click2eat-products";
  const ordersKey = "click2eat-orders";
  const money = (amount) => new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(amount));
  const convertUsdToPhp = (amount) =>
    Math.round((Number(amount) * usdToPhpRate + Number.EPSILON) * 100) / 100;
  const hasAmount = (value) =>
    value !== null && value !== "" && Number.isFinite(Number(value));

  function migrateKey(key, convert) {
    const marker = `${key}-php-migrated-v1`;
    if (localStorage.getItem(marker) === "true") return;

    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const data = JSON.parse(stored);
      localStorage.setItem(key, JSON.stringify(convert(data)));
    }
    localStorage.setItem(marker, "true");
  }

  function migrateLegacyPrices() {
    try {
      migrateKey(productsKey, (products) => Array.isArray(products)
        ? products.map((product) => product && hasAmount(product.price)
          ? { ...product, price: convertUsdToPhp(product.price) }
          : product)
        : products);
      migrateKey(ordersKey, (orders) => Array.isArray(orders)
        ? orders.map((order) => {
          if (!order || typeof order !== "object") return order;
          const items = Array.isArray(order.items)
            ? order.items.map((item) => item && hasAmount(item.price)
              ? { ...item, price: convertUsdToPhp(item.price) }
              : item)
            : order.items;
          return {
            ...order,
            ...(hasAmount(order.total) ? { total: convertUsdToPhp(order.total) } : {}),
            items,
          };
        })
        : orders);
    } catch (error) {
      console.error("Unable to convert saved prices to Philippine pesos.", error);
      const message = document.querySelector("#storage-error, #admin-storage-error");
      if (message) {
        message.hidden = false;
        message.textContent = "Could not convert saved prices to Philippine pesos. Check browser storage settings and reload.";
      }
      throw error;
    }
  }

  return { money, convertUsdToPhp, migrateLegacyPrices };
})();
