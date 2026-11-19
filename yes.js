var defaultProducts = [
  { id: "turon", name: "Turon", description: "Banana turon — each piece", price: 10, category: "Snacks", emoji: "🍌", style: "sides", active: true },
  { id: "siomai", name: "Siomai", description: "3 pieces per order", price: 10, category: "Snacks", emoji: "🥟", style: "sides", active: true },
  { id: "flying-saucer", name: "Flying Saucer", description: "Toasted flying saucer sandwich", price: 20, category: "Snacks", emoji: "🥪", style: "sides", active: true },
  { id: "lumpia", name: "Lumpia", description: "Crispy lumpia", price: 10, category: "Snacks", emoji: "🥟", style: "sides", active: true },
  { id: "fishball", name: "Fishball", description: "8 pieces per order", price: 10, category: "Street Food", emoji: "🍡", style: "sides", active: true },
  { id: "kikiam", name: "Kikiam", description: "5 pieces per order", price: 10, category: "Street Food", emoji: "🍢", style: "sides", active: true },
  { id: "footlong-burger", name: "Footlong Burger", description: "Footlong burger sandwich", price: 30, category: "Meals", emoji: "🍔", style: "sides", active: true },
  { id: "champurrado", name: "Champurrado", description: "Warm chocolate rice porridge", price: 35, category: "Meals", emoji: "🍫", style: "sides", active: true },
  { id: "lugaw", name: "Lugaw", description: "Warm Filipino rice porridge", price: 35, category: "Meals", emoji: "🍲", style: "sides", active: true },
  { id: "spaghetti", name: "Spaghetti", description: "Filipino-style spaghetti", price: 25, category: "Meals", emoji: "🍝", style: "sides", active: true },
  { id: "coke", name: "Coke", description: "Chilled Coca-Cola", price: 25, category: "Drinks", emoji: "🥤", style: "sides", active: true },
  { id: "sprite", name: "Sprite", description: "Chilled Sprite", price: 25, category: "Drinks", emoji: "🥤", style: "sides", active: true },
  { id: "water", name: "Water", description: "Bottled drinking water", price: 15, category: "Drinks", emoji: "💧", style: "sides", active: true },
  { id: "piattos", name: "Piattos", description: "Pack of Piattos", price: 25, category: "Snacks", emoji: "🥔", style: "sides", active: true },
  { id: "chippy", name: "Chippy", description: "Pack of Chippy", price: 10, category: "Snacks", emoji: "🌽", style: "sides", active: true },
  { id: "loaded", name: "Loaded", description: "Pack of Loaded snack", price: 10, category: "Snacks", emoji: "🍘", style: "sides", active: true },
  { id: "pillows", name: "Pillows", description: "Pack of Pillows snack", price: 10, category: "Snacks", emoji: "🍠", style: "sides", active: true },
  { id: "moby", name: "Moby", description: "Pack of Moby snack", price: 10, category: "Snacks", emoji: "🍿", style: "sides", active: true }
];

const addedDefaultProductIds = new Set();

const storageKeys = {
  products: "click2eat-products",
  cart: "click2eat-cart",
  orders: "click2eat-orders",
};

Click2EatCurrency.migrateLegacyPrices();

// Replace the old sample menu once with the updated school canteen menu.
const menuVersionKey = "click2eat-menu-version";
const currentMenuVersion = "neust-canteen-menu-2026-11";
try {
  if (localStorage.getItem(menuVersionKey) !== currentMenuVersion) {
    localStorage.setItem("click2eat-products", JSON.stringify(defaultProducts));
    localStorage.setItem(menuVersionKey, currentMenuVersion);
  }
} catch (error) {
  console.error("Unable to update the canteen menu.", error);
}


function readStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch (error) {
    console.error(`Unable to load ${key} from local storage.`, error);
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Unable to save ${key} to local storage.`, error);
    const message = document.querySelector("#storage-error");
    if (message) {
      message.hidden = false;
      message.textContent = "Your browser could not save this change. Check your browser storage settings.";
    }
    return false;
  }
}

function normalizeProducts(saved) {
  if (!Array.isArray(saved)) return defaultProducts.map((item) => ({ ...item }));
  const savedById = new Map(saved.filter((item) => item && typeof item.id === "string").map((item) => [item.id, item]));
  const base = defaultProducts
    .filter((item) => savedById.has(item.id) || addedDefaultProductIds.has(item.id))
    .map((item) => ({ ...item, ...savedById.get(item.id) }));
  const builtInIds = new Set(defaultProducts.map((item) => item.id));
  const custom = saved.filter((item) => item && typeof item.id === "string" && !builtInIds.has(item.id));
  return [...base, ...custom];
}

let products = normalizeProducts(readStorage(storageKeys.products, null));
let orders = readStorage(storageKeys.orders, []);
if (!Array.isArray(orders)) orders = [];
let cartData = readStorage(storageKeys.cart, {});
if (!cartData || typeof cartData !== "object" || Array.isArray(cartData)) cartData = {};
const cart = new Map(Object.entries(cartData).filter(([id, quantity]) =>
  products.some((product) => product.id === id) && Number.isInteger(quantity) && quantity > 0
));
let activeCategory = "All";
let searchTerm = "";

const productGrid = document.querySelector("#product-grid");
const categoryNav = document.querySelector("#categories");
const backToTopButton = document.querySelector("#back-to-top");
const cartItems = document.querySelector("#cart-items");
const cartCount = document.querySelector("#cart-count");
const subtotal = document.querySelector("#subtotal");
const checkoutTotal = document.querySelector("#checkout-total");
const checkoutButton = document.querySelector("#checkout-button");
const orderDetails = document.querySelector("#order-details");
const orderDetailsForm = document.querySelector("#order-details-form");
const customerNameInput = document.querySelector("#customer-name");
const editOrderButton = document.querySelector("#edit-order");
const orderConfirmStep = document.querySelector("#order-confirm-step");
const orderConfirmName = document.querySelector("#order-confirm-name");
const orderConfirmTotal = document.querySelector("#order-confirm-total");
const orderConfirmError = document.querySelector("#order-confirm-error");
const orderConfirmBackButton = document.querySelector("#order-confirm-back");
const confirmPlaceOrderButton = document.querySelector("#confirm-place-order");
const orderFinalStep = document.querySelector("#order-final-step");
const orderFinalName = document.querySelector("#order-final-name");
const orderFinalTotal = document.querySelector("#order-final-total");
const orderFinalError = document.querySelector("#order-final-error");
const orderFinalBackButton = document.querySelector("#order-final-back");
const finalPlaceOrderButton = document.querySelector("#final-place-order");
const confirmation = document.querySelector("#confirmation");
const backdrop = document.querySelector("#dialog-backdrop");
let preserveCustomerName = false;

const money = Click2EatCurrency.money;
const categoryImages = {
  "rice meals": "images/chicken-adobo.jpg",
  noodles: "images/pancit.jpg",
  snacks: "images/sandwich.jpg",
  drinks: "images/tea.jpg",
  sides: "images/rice.jpg",
};
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

function imageForProduct(product) {
  const image = typeof product.image === "string" &&
    (/^images\/[^/\\]+\.jpe?g$/i.test(product.image) || /^data:image\/jpeg;base64,/i.test(product.image))
    ? product.image
    : "";
  return image || categoryImages[String(product.category).toLowerCase()] || "images/chicken-adobo.jpg";
}

function persistCart() {
  saveStorage(storageKeys.cart, Object.fromEntries(cart));
}

function persistOrders() {
  saveStorage(storageKeys.orders, orders);
}

function categories() {
  return ["All", ...new Set(products.map((product) => product.category).filter(Boolean))];
}

function renderCategories() {
  const allCategories = categories();
  if (!allCategories.includes(activeCategory)) activeCategory = "All";
  categoryNav.innerHTML = allCategories.map((category) => `
    <button class="category-button${category === activeCategory ? " active" : ""}" type="button"
      data-category="${escapeHTML(category)}" aria-pressed="${category === activeCategory}">
      ${escapeHTML(category)}
    </button>
  `).join("");
}

function renderProducts() {
  const matchingProducts = products.filter((product) => {
    const matchesCategory = activeCategory === "All" || product.category === activeCategory;
    const matchesSearch = `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(searchTerm);
    return product.active !== false && matchesCategory && matchesSearch;
  });

  if (matchingProducts.length === 0) {
    productGrid.innerHTML = '<p class="empty-menu">No meals found. Try another category or search.</p>';
    return;
  }

  productGrid.innerHTML = matchingProducts.map((product) => `
    <article class="product-card">
      <div class="product-art ${escapeHTML(product.style || "lunch")}">
        <img src="${escapeHTML(imageForProduct(product))}" alt="${escapeHTML(product.name)}" loading="lazy" decoding="async" />
        <span class="product-art-fallback" hidden aria-hidden="true">${escapeHTML(product.emoji || "🍽️")}</span>
      </div>
      <div class="product-info">
        <h3 class="product-name">${escapeHTML(product.name)}</h3>
        <p class="product-description">${escapeHTML(product.description)}</p>
        <div class="product-footer">
          <span class="product-price">${money(product.price)}</span>
          <button class="add-button" type="button" data-add="${escapeHTML(product.id)}" aria-label="Add ${escapeHTML(product.name)} to basket">+</button>
        </div>
      </div>
    </article>
  `).join("");

  productGrid.querySelectorAll(".product-art img").forEach((image) => {
    image.addEventListener("error", () => {
      image.hidden = true;
      image.nextElementSibling.hidden = false;
    }, { once: true });
  });
}

function renderCart() {
  const entries = [...cart.entries()].filter(([id]) => products.some((item) => item.id === id));
  const itemCount = entries.reduce((sum, [, quantity]) => sum + quantity, 0);
  const total = entries.reduce((sum, [id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return sum + product.price * quantity;
  }, 0);

  cartCount.textContent = itemCount;
  subtotal.textContent = money(total);
  checkoutTotal.textContent = money(total);
  checkoutButton.disabled = itemCount === 0;
  if (entries.length === 0) {
    cartItems.innerHTML = `
      <div class="cart-empty">
        <span class="cart-empty-icon" aria-hidden="true">🧺</span>
        <strong>Your basket is ready when you are</strong>
        <p>Tap + on anything that catches your eye.</p>
      </div>
    `;
    return;
  }

  cartItems.innerHTML = entries.map(([id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return `
      <div class="cart-line">
        <div>
          <p class="cart-line-name">${escapeHTML(product.name)}</p>
          <span class="cart-line-price">${money(product.price * quantity)}</span>
        </div>
        <div class="quantity" aria-label="${escapeHTML(product.name)} quantity">
          <button type="button" data-change="${escapeHTML(id)}" data-delta="-1" aria-label="Remove one ${escapeHTML(product.name)}">−</button>
          <span>${quantity}</span>
          <button type="button" data-change="${escapeHTML(id)}" data-delta="1" aria-label="Add one ${escapeHTML(product.name)}">+</button>
        </div>
      </div>
    `;
  }).join("");
}

function changeQuantity(id, amount) {
  const product = products.find((item) => item.id === id);
  if (!product || product.active === false) return;
  const quantity = (cart.get(id) || 0) + amount;
  if (quantity <= 0) cart.delete(id);
  else cart.set(id, quantity);
  persistCart();
  renderCart();
}

function renderCustomerPage() {
  document.querySelector(".layout").hidden = false;
  renderCart();
  renderCategories();
  renderProducts();
}

categoryNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderCategories();
  renderProducts();
});

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (button) changeQuantity(button.dataset.add, 1);
});

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-change]");
  if (button) changeQuantity(button.dataset.change, Number(button.dataset.delta));
});

document.querySelector("#menu-search").addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderProducts();
});

backToTopButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
});

function closeConfirmation() {
  confirmation.close();
  backdrop.classList.remove("visible");
}

function resetOrderDetailsStep() {
  orderDetails.classList.remove("is-confirming");
  orderDetailsForm.hidden = false;
  orderConfirmStep.hidden = true;
  orderConfirmError.hidden = true;
  orderFinalStep.hidden = true;
  orderFinalError.hidden = true;
}

checkoutButton.addEventListener("click", () => {
  if (cart.size === 0) return;
  if (!preserveCustomerName) customerNameInput.value = "";
  preserveCustomerName = false;
  resetOrderDetailsStep();
  backdrop.classList.add("visible");
  orderDetails.showModal();
});

function placeOrder(customerName) {
  const entries = [...cart.entries()];
  if (entries.length === 0) return;
  const items = entries.map(([id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return { id, name: product.name, price: product.price, quantity };
  });
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = {
    id: `C2E-${Date.now().toString(36).toUpperCase()}`,
    role: "Customer",
    items,
    total,
    status: "Preparing",
    createdAt: new Date().toISOString(),
    ...(customerName ? { customerName } : {}),
  };
  orders.push(order);
  persistOrders();
  cart.clear();
  persistCart();
  renderCart();
  renderReceipt(order);
  document.querySelector("#confirmation-message").textContent =
    `Order ${order.id} is being prepared. Show this receipt to the canteen team to complete your order.`;
  backdrop.classList.add("visible");
  confirmation.showModal();
}

orderDetailsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const customerName = customerNameInput.value.trim();
  if (!customerName) {
    customerNameInput.setCustomValidity("Please enter your name.");
    customerNameInput.reportValidity();
    return;
  }
  customerNameInput.setCustomValidity("");
  orderConfirmName.textContent = `Order for ${customerName}`;
  orderConfirmTotal.textContent = `Total: ${subtotal.textContent}`;
  orderConfirmError.hidden = cart.size > 0;
  orderDetails.classList.add("is-confirming");
  orderDetailsForm.hidden = true;
  orderConfirmStep.hidden = false;
  orderConfirmBackButton.focus();
});

customerNameInput.addEventListener("input", () => customerNameInput.setCustomValidity(""));

function closeOrderDetails(preserveName = false) {
  orderDetails.close();
  resetOrderDetailsStep();
  backdrop.classList.remove("visible");
  preserveCustomerName = preserveName;
}

editOrderButton.addEventListener("click", () => closeOrderDetails(true));
document.querySelector("#order-details-close").addEventListener("click", () => closeOrderDetails());
orderConfirmBackButton.addEventListener("click", () => {
  resetOrderDetailsStep();
  customerNameInput.focus();
});
confirmPlaceOrderButton.addEventListener("click", () => {
  const customerName = customerNameInput.value.trim();
  if (!customerName) {
    resetOrderDetailsStep();
    customerNameInput.setCustomValidity("Please enter your name.");
    customerNameInput.reportValidity();
    return;
  }
  if (cart.size === 0) {
    orderConfirmTotal.textContent = `Total: ${subtotal.textContent}`;
    orderConfirmError.hidden = false;
    return;
  }
  orderConfirmError.hidden = true;
  orderFinalName.textContent = `Order for ${customerName}`;
  orderFinalTotal.textContent = `Total: ${subtotal.textContent}`;
  orderFinalError.hidden = true;
  orderFinalStep.hidden = false;
  orderConfirmStep.hidden = true;
  orderFinalBackButton.focus();
});
orderFinalBackButton.addEventListener("click", () => {
  orderFinalStep.hidden = true;
  orderFinalError.hidden = true;
  orderConfirmStep.hidden = false;
  confirmPlaceOrderButton.focus();
});
finalPlaceOrderButton.addEventListener("click", () => {
  const customerName = customerNameInput.value.trim();
  if (!customerName) {
    resetOrderDetailsStep();
    customerNameInput.setCustomValidity("Please enter your name.");
    customerNameInput.reportValidity();
    return;
  }
  if (cart.size === 0) {
    orderFinalTotal.textContent = `Total: ${subtotal.textContent}`;
    orderFinalError.hidden = false;
    return;
  }
  orderDetails.close();
  resetOrderDetailsStep();
  placeOrder(customerName);
});
orderDetails.addEventListener("cancel", () => {
  resetOrderDetailsStep();
  backdrop.classList.remove("visible");
});

function renderReceipt(order) {
  const receipt = document.querySelector("#receipt");
  receipt.innerHTML = `
    <h3>Click2Eat · Order receipt</h3>
    <p>Order: <strong>${escapeHTML(order.id)}</strong></p>
    ${order.customerName ? `<p>Name: <strong>${escapeHTML(order.customerName)}</strong></p>` : ""}
    <p>${escapeHTML(new Date(order.createdAt).toLocaleString())} · ${escapeHTML(order.role)}</p>
    ${order.items.map((item) => `
      <div class="receipt-line"><span>${item.quantity} × ${escapeHTML(item.name)}</span><strong>${money(item.price * item.quantity)}</strong></div>
    `).join("")}
    <p class="receipt-total">Total <strong>${money(order.total)}</strong></p>
    <p>Status: ${escapeHTML(order.status)}</p>
  `;
}

document.querySelector("#print-receipt").addEventListener("click", () => window.print());
document.querySelector("#dialog-close").addEventListener("click", closeConfirmation);
document.querySelector("#done-button").addEventListener("click", () => {
  closeConfirmation();
  renderCart();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
backdrop.addEventListener("click", () => {
  if (orderDetails.open) closeOrderDetails();
  else closeConfirmation();
});

window.addEventListener("storage", (event) => {
  if (!["click2eat-products", "click2eat-orders", null].includes(event.key)) return;
  products = normalizeProducts(readStorage(storageKeys.products, null));
  orders = readStorage(storageKeys.orders, []);
  if (!Array.isArray(orders)) orders = [];
  for (const [id] of cart) {
    const product = products.find((item) => item.id === id);
    if (!product || product.active === false) cart.delete(id);
  }
  renderCustomerPage();
});

renderCustomerPage();
