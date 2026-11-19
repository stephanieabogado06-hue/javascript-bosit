const ordersKey = "click2eat-orders";
const feedbackKey = "click2eat-feedback";

function readArray(key) {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return [];
    const value = JSON.parse(stored);
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error(`Unable to load ${key} from local storage.`, error);
    showStorageError();
    return [];
  }
}

function showStorageError() {
  const message = document.querySelector("#reviews-storage-error");
  message.hidden = false;
  message.textContent = "Your browser could not access saved data. Check your browser storage settings.";
}

function saveFeedback(value) {
  try {
    localStorage.setItem(feedbackKey, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Unable to save ${feedbackKey} to local storage.`, error);
    const message = document.querySelector("#reviews-storage-error");
    message.hidden = false;
    message.textContent = "Your review could not be saved. Check your browser storage settings and try again.";
    return false;
  }
}

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

let orders = readArray(ordersKey);
let feedback = readArray(feedbackKey);

function renderReviews() {
  const completedOrders = orders.filter((order) => order && order.status === "Completed" && order.id);
  const reviewedOrderIds = new Set(feedback.map((entry) => entry && entry.orderId));
  const eligibleOrders = completedOrders.filter((order) => !reviewedOrderIds.has(order.id));
  const orderSelect = document.querySelector("#review-order");
  const form = document.querySelector("#review-form");
  const eligibilityMessage = document.querySelector("#review-eligibility");

  orderSelect.innerHTML = eligibleOrders.map((order) => {
    const date = new Date(order.createdAt);
    const orderDate = Number.isNaN(date.getTime()) ? "" : ` · ${date.toLocaleDateString()}`;
    return `<option value="${escapeHTML(order.id)}">Order ${escapeHTML(order.id)}${orderDate}</option>`;
  }).join("");
  form.querySelectorAll("select, textarea, button").forEach((element) => {
    element.disabled = eligibleOrders.length === 0;
  });
  eligibilityMessage.textContent = eligibleOrders.length
    ? "You can review an order after it has been marked completed."
    : "No unrated completed orders yet. Once your order is completed, you can review it here.";

  const validReviews = feedback.filter((entry) => entry && Number.isInteger(Number(entry.rating)) &&
    Number(entry.rating) >= 1 && Number(entry.rating) <= 5);
  const average = validReviews.length
    ? (validReviews.reduce((sum, entry) => sum + Number(entry.rating), 0) / validReviews.length).toFixed(1)
    : "—";
  document.querySelector("#average-rating").textContent = validReviews.length ? `${average} ★` : "—";
  document.querySelector("#review-count").textContent =
    `${validReviews.length} ${validReviews.length === 1 ? "review" : "reviews"}`;

  const reviewsList = document.querySelector("#reviews-list");
  reviewsList.innerHTML = validReviews.length
    ? validReviews.slice().reverse().map((entry) => {
      const date = new Date(entry.createdAt);
      const reviewDate = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
      const rating = Number(entry.rating);
      return `
        <article class="review-card">
          <div class="review-card-head">
            <strong class="review-stars" aria-label="${rating} out of 5 stars">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</strong>
            <span class="review-meta">${reviewDate ? `${escapeHTML(reviewDate)} · ` : ""}Order ${escapeHTML(entry.orderId || "")}</span>
          </div>
          <p>${escapeHTML(entry.comment || "No comment provided.")}</p>
        </article>
      `;
    }).join("")
    : '<p class="empty-admin">No reviews yet. Be the first to share your experience after a completed order.</p>';
}

document.querySelector("#review-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const orderId = document.querySelector("#review-order").value;
  const rating = Number(document.querySelector("#review-rating").value);
  const comment = document.querySelector("#review-comment").value.trim();
  const isEligible = orders.some((order) => order && order.id === orderId && order.status === "Completed");
  const alreadyReviewed = feedback.some((entry) => entry && entry.orderId === orderId);
  if (!isEligible || alreadyReviewed || !Number.isInteger(rating) || rating < 1 || rating > 5) return;

  const nextFeedback = [...feedback, { orderId, rating, comment, createdAt: new Date().toISOString() }];
  if (!saveFeedback(nextFeedback)) return;
  feedback = nextFeedback;
  document.querySelector("#review-message").textContent = "Thank you! Your review has been saved.";
  event.currentTarget.reset();
  renderReviews();
});

window.addEventListener("storage", (event) => {
  if (![ordersKey, feedbackKey, null].includes(event.key)) return;
  orders = readArray(ordersKey);
  feedback = readArray(feedbackKey);
  renderReviews();
});

renderReviews();
