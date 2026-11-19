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

const keys = {
  products: "click2eat-products",
  orders: "click2eat-orders",
  feedback: "click2eat-feedback",
};

const authKeys = {
  credential: "click2eat-admin-credential",
  session: "click2eat-admin-authenticated",
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

const roleOptions = ["Preparing", "Now Serving", "Completed"];
let products = loadProducts();
let orders = readArray(keys.orders);
let feedback = readArray(keys.feedback);
let activeEditId = null;
let adminAuthenticated = false;

const menuList = document.querySelector("#admin-menu-list");
const ordersList = document.querySelector("#admin-orders");
const menuFilter = document.querySelector("#menu-category-filter");
const menuSearch = document.querySelector("#menu-search");
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));
const money = Click2EatCurrency.money;
const categoryImages = {
  "rice meals": "images/chicken-adobo.jpg",
  noodles: "images/pancit.jpg",
  snacks: "images/sandwich.jpg",
  drinks: "images/tea.jpg",
  sides: "images/rice.jpg",
};

const loginForm = document.querySelector("#admin-login-form");
const loginUsername = document.querySelector("#admin-username");
const loginPassword = document.querySelector("#admin-password");
const confirmLabel = document.querySelector("#admin-confirm-label");
const confirmPassword = document.querySelector("#admin-confirm-password");
const loginError = document.querySelector("#admin-login-error");

function configureLogin(isFirstUse) {
  confirmLabel.hidden = !isFirstUse;
  confirmPassword.required = isFirstUse;
  loginPassword.autocomplete = isFirstUse ? "new-password" : "current-password";
  document.querySelector("#admin-login-title").textContent =
    isFirstUse ? "Set up admin access" : "Admin portal sign in";
  document.querySelector("#admin-login-help").textContent = isFirstUse
    ? 'Create a password for the username "canteen". You will use it to sign in on this browser.'
    : 'Sign in with the username "canteen" and your admin password.';
  loginForm.querySelector('button[type="submit"]').textContent = isFirstUse ? "Set password & sign in" : "Sign in";
}

function showLoginError(message) {
  loginError.textContent = message;
  loginError.hidden = false;
}

async function passwordHash(password, salt) {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error("Secure browser hashing is unavailable.");
  }
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function setAuthenticated(authenticated) {
  adminAuthenticated = authenticated;
  document.querySelector("#admin-console").hidden = !authenticated;
  document.querySelector(".admin-login-main").hidden = authenticated;
  if (authenticated) renderAll();
}

function initializeLogin() {
  loginUsername.readOnly = true;
  try {
    const hasCredential = localStorage.getItem(authKeys.credential) !== null;
    configureLogin(!hasCredential);
    if (sessionStorage.getItem(authKeys.session) === "true" && hasCredential) {
      setAuthenticated(true);
      return;
    }
    sessionStorage.removeItem(authKeys.session);
    setAuthenticated(false);
  } catch (error) {
    console.error("Unable to initialize the admin login.", error);
    configureLogin(true);
    showLoginError("Browser storage is unavailable. Enable storage for this page and reload.");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  const username = loginUsername.value.trim().toLowerCase();
  const password = loginPassword.value;
  if (username !== "canteen") {
    showLoginError("Incorrect username or password.");
    return;
  }

  try {
    let credential;
    const savedCredential = localStorage.getItem(authKeys.credential);
    if (savedCredential === null) {
      if (password.length < 8) {
        showLoginError("Choose a password with at least 8 characters.");
        return;
      }
      if (password !== confirmPassword.value) {
        showLoginError("The passwords do not match.");
        return;
      }
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      const salt = [...saltBytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      credential = { username, salt, hash: await passwordHash(password, salt) };
      localStorage.setItem(authKeys.credential, JSON.stringify(credential));
    } else {
      credential = JSON.parse(savedCredential);
      if (credential.username !== username ||
          await passwordHash(password, credential.salt) !== credential.hash) {
        showLoginError("Incorrect username or password.");
        return;
      }
    }

    sessionStorage.setItem(authKeys.session, "true");
    loginForm.reset();
    loginUsername.value = "canteen";
    setAuthenticated(true);
  } catch (error) {
    console.error("Unable to authenticate to the admin portal.", error);
    showLoginError("Could not verify or save login details in this browser. Check browser storage and try again.");
  }
});

document.querySelector("#admin-logout").addEventListener("click", () => {
  let logoutError = "";
  try {
    sessionStorage.removeItem(authKeys.session);
  } catch (error) {
    console.error("Unable to clear the admin login session.", error);
    logoutError = "Could not clear the login session. Close this tab to sign out.";
  }
  loginForm.reset();
  loginUsername.value = "canteen";
  loginError.textContent = logoutError;
  loginError.hidden = !logoutError;
  configureLogin(false);
  setAuthenticated(false);
});

document.querySelector("#admin-reset-all").addEventListener("click", () => {
  const confirmed = window.confirm(
    "Reset all Click2Eat data in this browser? This permanently deletes orders, reviews, cart contents, menu changes, accessibility settings, and the admin password. The default menu will be restored, and you will need to set up a new admin password. This cannot be undone."
  );
  if (!confirmed) return;

  try {
    [
      keys.products,
      keys.orders,
      keys.feedback,
      "click2eat-cart",
      "click2eat-accessibility",
      `${keys.products}-php-migrated-v1`,
      `${keys.orders}-php-migrated-v1`,
      authKeys.credential,
    ].forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem(authKeys.session);
    window.location.reload();
  } catch (error) {
    console.error("Unable to reset all Click2Eat data.", error);
    const message = document.querySelector("#admin-storage-error");
    message.textContent = "Could not reset all data. Check browser storage settings and try again.";
    message.hidden = false;
  }
});

function readArray(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Unable to read ${key} from local storage.`, error);
    return [];
  }
}

function loadProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(keys.products) || "null");
    if (!Array.isArray(saved)) return defaultProducts.map((product) => ({ ...product }));
    const savedById = new Map(saved.filter((item) => item && typeof item.id === "string").map((item) => [item.id, item]));
    const base = defaultProducts
      .filter((product) => savedById.has(product.id) || addedDefaultProductIds.has(product.id))
      .map((product) => ({ ...product, ...savedById.get(product.id) }));
    const builtInIds = new Set(defaultProducts.map((product) => product.id));
    const customProducts = saved.filter((item) => item && typeof item.id === "string" && !builtInIds.has(item.id));
    return [...base, ...customProducts];
  } catch (error) {
    console.error("Unable to load the canteen menu.", error);
    return defaultProducts.map((product) => ({ ...product }));
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    document.querySelector("#admin-storage-error").hidden = true;
    return true;
  } catch (error) {
    console.error(`Unable to save ${key} to local storage.`, error);
    const message = document.querySelector("#admin-storage-error");
    message.textContent = "Could not save your change. Check browser storage settings and try again.";
    message.hidden = false;
    return false;
  }
}

function categories() {
  return [...new Set(products.map((product) => product.category).filter(Boolean))];
}

async function imageFileToDataURL(file) {
  if (!file || !/\.(jpe?g)$/i.test(file.name) || (file.type && file.type !== "image/jpeg")) {
    throw new Error("Choose a JPG or JPEG image.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Choose a JPG or JPEG image smaller than 15 MB.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("The selected photo could not be processed.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("The selected photo could not be processed.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("The selected photo could not be read.")));
    reader.readAsDataURL(blob);
  });
}

function renderReports() {
  const totalSales = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const itemCount = orders.reduce((sum, order) => sum + (Array.isArray(order.items)
    ? order.items.reduce((count, item) => count + Number(item.quantity || 0), 0)
    : 0), 0);
  const activeOrders = orders.filter((order) => order.status !== "Completed" && !order.archived).length;
  const averageRating = feedback.length
    ? (feedback.reduce((sum, item) => sum + Number(item.rating || 0), 0) / feedback.length).toFixed(1)
    : "—";
  document.querySelector("#admin-report-cards").innerHTML = [
    ["Active orders", activeOrders],
    ["All-time sales", money(totalSales)],
    ["Meals ordered", itemCount],
    ["Average rating", averageRating],
  ].map(([label, value]) => `<div class="report-card"><span>${label}</span><strong>${value}</strong></div>`).join("");
  document.querySelector("#queue-count").textContent = `${activeOrders} active`;
}

function renderOrders() {
  if (orders.length === 0) {
    ordersList.innerHTML = '<p class="empty-admin">No customer orders yet. New orders will appear here.</p>';
    return;
  }

  const sortedOrders = orders.slice().reverse();
  const activeOrders = sortedOrders.filter((order) => order.status !== "Completed" && !order.archived);
  const completedOrders = sortedOrders.filter((order) => order.status === "Completed" && !order.archived && !order.kept);
  const keptOrders = sortedOrders.filter((order) => order.status === "Completed" && !order.archived && order.kept);
  const archivedOrders = sortedOrders.filter((order) => order.archived);

  function orderCard(order, section) {
    const items = Array.isArray(order.items) ? order.items : [];
    const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const itemSummary = items.map((item) => `${Number(item.quantity) || 0} × ${escapeHTML(item.name)}`).join(" · ");
    const createdAt = new Date(order.createdAt);
    const timestamp = Number.isNaN(createdAt.getTime()) ? "Time unavailable" : createdAt.toLocaleString();
    const status = order.status === "Ready"
      ? "Now Serving"
      : roleOptions.includes(order.status) ? order.status : "Preparing";
    return `
      <article class="admin-order-row${order.kept ? " is-kept" : ""}">
        <div class="admin-order-head">
          <strong>${escapeHTML(order.id || "Order")} · ${money(order.total || 0)}</strong>
          <span class="status-pill" data-status="${status}">${status}</span>
        </div>
        <p class="order-customer-name">Ordered by: <strong>${escapeHTML(String(order.customerName || "").trim() || "Name not provided")}</strong></p>
        <small>${escapeHTML(order.role || "Customer")} · ${itemCount} items · ${escapeHTML(timestamp)}</small>
        <p class="order-items-copy">${itemSummary || "No item details"}</p>
        ${section !== "archived" ? `
          <label>Update customer status
            <select data-order-status="${escapeHTML(order.id)}" aria-label="Update status for order ${escapeHTML(order.id)}">
              ${roleOptions.map((option) => `<option value="${option}"${status === option ? " selected" : ""}>${option}</option>`).join("")}
            </select>
          </label>
        ` : ""}
        ${section === "completed" ? `
          <div class="order-actions">
            <button type="button" class="keep-order-button" data-order-action="keep" data-order-id="${escapeHTML(order.id)}">Keep</button>
            <button type="button" class="remove-order-button" data-order-action="archive" data-order-id="${escapeHTML(order.id)}">Remove from list</button>
          </div>
        ` : ""}
        ${section === "kept" ? `
          <div class="kept-order-note">Kept in your completed orders</div>
          <div class="order-actions">
            <button type="button" class="remove-order-button" data-order-action="archive" data-order-id="${escapeHTML(order.id)}">Remove from list</button>
            <button type="button" data-order-action="unkeep" data-order-id="${escapeHTML(order.id)}">Move to review</button>
          </div>
        ` : ""}
        ${section === "archived" ? `
          <div class="kept-order-note">Archived · included in reports</div>
          <div class="order-actions">
            <button type="button" class="keep-order-button" data-order-action="restore" data-order-id="${escapeHTML(order.id)}">Restore to list</button>
            <button type="button" class="remove-order-button" data-order-action="delete" data-order-id="${escapeHTML(order.id)}">Delete permanently</button>
          </div>
        ` : ""}
      </article>
    `;
  }

  const orderGroup = (title, items, section, emptyMessage) => `
    <details class="orders-group"${section === "active" ? " open" : ""}>
      <summary>${title} <span>${items.length}</span></summary>
      ${items.length ? items.map((order) => orderCard(order, section)).join("") : `<p class="empty-admin">${emptyMessage}</p>`}
    </details>
  `;

  ordersList.innerHTML = `
    ${orderGroup("Preparing & now serving", activeOrders, "active", "No active orders right now.")}
    ${orderGroup("Completed · needs review", completedOrders, "completed", "No completed orders need review.")}
    ${orderGroup("Kept orders", keptOrders, "kept", "No orders have been kept yet.")}
    ${orderGroup("Removed from list · archived", archivedOrders, "archived", "Archived orders will appear here.")}
  `;
}

function renderMenuFilters() {
  const selected = menuFilter.value || "All";
  const availableCategories = ["All", ...categories()];
  menuFilter.innerHTML = availableCategories.map((category) =>
    `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
  ).join("");
  menuFilter.value = availableCategories.includes(selected) ? selected : "All";
  document.querySelector("#category-options").innerHTML = categories().map((category) =>
    `<option value="${escapeHTML(category)}"></option>`
  ).join("");
}

function renderMenu() {
  renderMenuFilters();
  const category = menuFilter.value;
  const search = menuSearch.value.trim().toLowerCase();
  const matches = products.filter((product) =>
    (category === "All" || product.category === category) &&
    `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(search)
  );
  if (matches.length === 0) {
    menuList.innerHTML = '<p class="empty-admin">No menu items match your search.</p>';
    return;
  }

  menuList.innerHTML = matches.map((product) => `
    <article class="admin-menu-row">
      <div>
        <strong>${escapeHTML(product.emoji || "🍽️")} ${escapeHTML(product.name)}</strong>
        <small>${escapeHTML(product.category)} · ${money(product.price)} · ${product.active === false ? "Unavailable" : "On menu"}</small>
      </div>
      <div class="admin-menu-actions">
        <button type="button" data-edit-product="${escapeHTML(product.id)}">Edit</button>
        <button type="button" data-toggle-product="${escapeHTML(product.id)}">${product.active === false ? "Show" : "Hide"}</button>
        <button type="button" data-delete-product="${escapeHTML(product.id)}">Remove</button>
      </div>
      ${activeEditId === product.id ? `
        <form class="admin-menu-edit-form" data-edit-form="${escapeHTML(product.id)}">
          <label>Item name<input name="name" value="${escapeHTML(product.name)}" required maxlength="60" /></label>
          <label>Description<input name="description" value="${escapeHTML(product.description)}" required maxlength="120" /></label>
          <label>Price (PHP)<input name="price" type="number" min="0.01" step="0.01" value="${Number(product.price)}" required /></label>
          <label>Category<input name="category" list="category-options" value="${escapeHTML(product.category)}" required maxlength="30" /></label>
          <label>Emoji<input name="emoji" value="${escapeHTML(product.emoji || "🍽️")}" maxlength="4" /></label>
          <label>Attach a photo (JPG/JPEG)<input name="image" type="file" accept=".jpg,.jpeg,image/jpeg" /></label>
          ${product.image ? '<small>Current photo will be kept unless you choose another.</small>' : ""}
          <button class="checkout-button" type="submit">Save changes</button>
          <button class="cancel-edit" type="button" data-cancel-edit>Cancel</button>
        </form>
      ` : ""}
    </article>
  `).join("");
}

function renderAll() {
  renderReports();
  renderOrders();
  renderMenu();
}

document.querySelector("#refresh-data").addEventListener("click", () => {
  products = loadProducts();
  orders = readArray(keys.orders);
  feedback = readArray(keys.feedback);
  renderAll();
});

menuFilter.addEventListener("change", renderMenu);
menuSearch.addEventListener("input", renderMenu);
document.querySelector("#add-product-form").elements.image.addEventListener("change", (event) => {
  event.currentTarget.setCustomValidity("");
});

menuList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-product]");
  const toggleButton = event.target.closest("[data-toggle-product]");
  const deleteButton = event.target.closest("[data-delete-product]");
  if (editButton) {
    activeEditId = activeEditId === editButton.dataset.editProduct ? null : editButton.dataset.editProduct;
    renderMenu();
    return;
  }
  if (event.target.closest("[data-cancel-edit]")) {
    activeEditId = null;
    renderMenu();
    return;
  }
  if (toggleButton) {
    const product = products.find((item) => item.id === toggleButton.dataset.toggleProduct);
    if (!product) return;
    const nextProducts = products.map((item) => item.id === product.id
      ? { ...item, active: item.active === false }
      : item);
    if (!save(keys.products, nextProducts)) return;
    products = nextProducts;
    renderMenu();
  }
  if (deleteButton) {
    const product = products.find((item) => item.id === deleteButton.dataset.deleteProduct);
    if (!product || !window.confirm(`Remove "${product.name}" from the menu? Existing order receipts will be kept.`)) return;
    const nextProducts = products.filter((item) => item.id !== product.id);
    if (!save(keys.products, nextProducts)) return;
    products = nextProducts;
    activeEditId = null;
    renderMenu();
  }
});

menuList.addEventListener("change", (event) => {
  if (event.target.name === "image") event.target.setCustomValidity("");
});

menuList.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-edit-form]");
  if (!form) return;
  event.preventDefault();
  const product = products.find((item) => item.id === form.dataset.editForm);
  if (!product) return;
  const data = new FormData(form);
  const name = String(data.get("name")).trim();
  const description = String(data.get("description")).trim();
  const category = String(data.get("category")).trim();
  const price = Number(data.get("price"));
  const emoji = String(data.get("emoji")).trim() || "🍽️";
  const imageFile = data.get("image");
  if (!name || !description || !category || !Number.isFinite(price) || price <= 0) return;
  let image = product.image || categoryImages[category.toLowerCase()] || "";
  if (imageFile.size > 0) {
    try {
      image = await imageFileToDataURL(imageFile);
    } catch (error) {
      form.elements.image.setCustomValidity(error.message);
      form.elements.image.reportValidity();
      return;
    }
  }
  form.elements.image.setCustomValidity("");
  const nextProducts = products.map((item) => item.id === product.id
    ? { ...item, name, description, category, price, emoji, image }
    : item);
  if (!save(keys.products, nextProducts)) return;
  products = nextProducts;
  activeEditId = null;
  renderAll();
});

ordersList.addEventListener("change", (event) => {
  const select = event.target.closest("[data-order-status]");
  if (!select || !roleOptions.includes(select.value)) return;
  const nextOrders = orders.map((order) => order.id === select.dataset.orderStatus
    ? { ...order, status: select.value, updatedAt: new Date().toISOString() }
    : order);
  if (!save(keys.orders, nextOrders)) return;
  orders = nextOrders;
  renderReports();
  renderOrders();
});

ordersList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-order-action]");
  if (!button) return;
  const order = orders.find((item) => item.id === button.dataset.orderId);
  if (!order) return;

  const action = button.dataset.orderAction;
  if (action === "delete" && order.archived) {
    if (!window.confirm(`Permanently delete order "${order.id}"? This cannot be undone and will remove it from reports.`)) return;
    const nextOrders = orders.filter((item) => item.id !== order.id);
    if (!save(keys.orders, nextOrders)) return;
    orders = nextOrders;
    renderReports();
    renderOrders();
    return;
  }
  if (action === "keep" && order.status === "Completed" && !order.archived) {
    order.kept = true;
  } else if (action === "unkeep" && order.status === "Completed" && !order.archived) {
    order.kept = false;
  } else if (action === "archive" && order.status === "Completed" && !order.archived) {
    order.archived = true;
    order.kept = false;
    order.archivedAt = new Date().toISOString();
  } else if (action === "restore" && order.archived) {
    order.archived = false;
    order.archivedAt = null;
  } else {
    return;
  }

  if (!save(keys.orders, orders)) return;
  renderReports();
  renderOrders();
});

document.querySelector("#add-product-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = String(data.get("name")).trim();
  const description = String(data.get("description")).trim();
  const category = String(data.get("category")).trim();
  const price = Number(data.get("price"));
  const emoji = String(data.get("emoji")).trim() || "🍽️";
  const imageFile = data.get("image");
  if (!name || !description || !category || !Number.isFinite(price) || price <= 0) return;
  let image = categoryImages[category.toLowerCase()] || "";
  if (imageFile.size > 0) {
    try {
      image = await imageFileToDataURL(imageFile);
    } catch (error) {
      form.elements.image.setCustomValidity(error.message);
      form.elements.image.reportValidity();
      return;
    }
  }
  form.elements.image.setCustomValidity("");
  const newProduct = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    description,
    category,
    price,
    emoji,
    image: image || categoryImages[category.toLowerCase()] || "",
    style: "lunch",
    active: true,
  };
  const nextProducts = [...products, newProduct];
  if (!save(keys.products, nextProducts)) return;
  products = nextProducts;
  form.reset();
  form.elements.emoji.value = "🍽️";
  renderAll();
});

window.addEventListener("storage", (event) => {
  if (![keys.products, keys.orders, keys.feedback].includes(event.key)) return;
  products = loadProducts();
  orders = readArray(keys.orders);
  feedback = readArray(keys.feedback);
  if (adminAuthenticated) renderAll();
});

initializeLogin();
