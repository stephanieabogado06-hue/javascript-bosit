const accessibilityStorageKey = "click2eat-accessibility";
const defaultAccessibilitySettings = {
  textSize: 100,
  lineHeight: 100,
  readableFont: false,
  bigCursor: false,
  letterSpacing: false,
  alignText: false,
  boldText: false,
  highContrast: false,
  underlineLinks: false,
};

function readAccessibilitySettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(accessibilityStorageKey) || "null");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
      return { ...defaultAccessibilitySettings };
    }

    return {
      textSize: Number.isInteger(saved.textSize) ? Math.min(150, Math.max(100, saved.textSize)) : 100,
      lineHeight: Number.isInteger(saved.lineHeight) ? Math.min(150, Math.max(100, saved.lineHeight)) : 100,
      readableFont: saved.readableFont === true,
      bigCursor: saved.bigCursor === true,
      letterSpacing: saved.letterSpacing === true,
      alignText: saved.alignText === true,
      boldText: saved.boldText === true,
      highContrast: saved.highContrast === true,
      underlineLinks: saved.underlineLinks === true,
    };
  } catch (error) {
    console.error("Unable to load accessibility settings from local storage.", error);
    return { ...defaultAccessibilitySettings };
  }
}

let accessibilitySettings = readAccessibilitySettings();

const accessibilityWidget = document.querySelector(".accessibility-widget");
if (!accessibilityWidget) throw new Error("The accessibility widget requires a site header.");
accessibilityWidget.insertAdjacentHTML("beforeend", `
  <section class="accessibility-panel" id="accessibility-panel" aria-labelledby="accessibility-title"
    aria-describedby="accessibility-help" hidden>
    <header class="accessibility-header">
      <button class="accessibility-close" type="button" aria-label="Close accessibility options">×</button>
      <span class="accessibility-person" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <circle cx="16" cy="5" r="3"></circle>
          <path d="M7 11h18M16 9v8m-7 12 3-10m11 10-3-10m-9-8-4 9m14-9 4 9"></path>
        </svg>
      </span>
      <h2 id="accessibility-title">Accessibility Adjustments</h2>
      <p id="accessibility-help">Adjust how Click2Eat looks and feels.</p>
    </header>
    <div class="accessibility-content">
      <h3>Content Modules</h3>
      <div class="accessibility-modules">
        <section class="accessibility-module accessibility-module-wide" aria-label="Font size">
          <span class="accessibility-module-title">Font Size</span>
          <div class="accessibility-stepper">
            <button type="button" data-text-size="-10" aria-label="Decrease font size">−</button>
            <output id="accessibility-text-size-value" aria-live="polite"></output>
            <button type="button" data-text-size="10" aria-label="Increase font size">+</button>
          </div>
        </section>
        <button class="accessibility-module accessibility-module-feature" type="button" data-setting="readableFont" aria-pressed="false">
          <span class="accessibility-module-icon" aria-hidden="true">Ⓐ</span><span>Readable Font</span>
        </button>
        <section class="accessibility-module accessibility-module-wide" aria-label="Line height">
          <span class="accessibility-module-title">Line Height</span>
          <div class="accessibility-stepper">
            <button type="button" data-line-height="10" aria-label="Increase line height">+</button>
            <output id="accessibility-line-height-value" aria-live="polite"></output>
            <button type="button" data-line-height="-10" aria-label="Decrease line height">−</button>
          </div>
        </section>
        <button class="accessibility-module accessibility-module-feature" type="button" data-setting="bigCursor" aria-pressed="false">
          <span class="accessibility-module-icon" aria-hidden="true">↖</span><span>Big Cursor</span>
        </button>
        <button class="accessibility-module accessibility-module-feature" type="button" data-setting="letterSpacing" aria-pressed="false">
          <span class="accessibility-module-icon" aria-hidden="true">↔</span><span>Letter Spacing</span>
        </button>
        <button class="accessibility-module accessibility-module-feature" type="button" data-setting="alignText" aria-pressed="false">
          <span class="accessibility-module-icon" aria-hidden="true">☰</span><span>Align Text Left</span>
        </button>
        <button class="accessibility-module accessibility-module-feature" type="button" data-setting="boldText" aria-pressed="false">
          <span class="accessibility-module-icon" aria-hidden="true">B</span><span>Font Weight</span>
        </button>
        <button class="accessibility-module accessibility-module-feature" type="button" data-setting="highContrast" aria-pressed="false">
          <span class="accessibility-module-icon" aria-hidden="true">◐</span><span>High Contrast</span>
        </button>
        <button class="accessibility-module accessibility-module-feature" type="button" data-setting="underlineLinks" aria-pressed="false">
          <span class="accessibility-module-icon" aria-hidden="true"><u>A</u></span><span>Underline Links</span>
        </button>
      </div>
      <button class="accessibility-reset" type="button" data-reset>Reset all settings</button>
    </div>
  </section>
`);

const accessibilityToggle = accessibilityWidget.querySelector(".accessibility-toggle");
const accessibilityPanel = accessibilityWidget.querySelector(".accessibility-panel");
const accessibilityClose = accessibilityWidget.querySelector(".accessibility-close");
const accessibilityTextSizeValue = accessibilityWidget.querySelector("#accessibility-text-size-value");
const accessibilityLineHeightValue = accessibilityWidget.querySelector("#accessibility-line-height-value");
const accessibilityTextSizes = new WeakMap();
const accessibilityLineHeights = new WeakMap();

function getTextElements(root) {
  const elements = new Set();
  if (root.nodeType === Node.ELEMENT_NODE && root.matches("input, select, textarea")) {
    elements.add(root);
  }
  root.querySelectorAll("input, select, textarea").forEach((element) => elements.add(element));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode;
    if (text.textContent.trim() && !accessibilityWidget.contains(text.parentElement)) {
      elements.add(text.parentElement);
    }
  }
  return elements;
}

function applyTextSize(elements) {
  const scale = accessibilitySettings.textSize / 100;
  for (const element of elements) {
    let original = accessibilityTextSizes.get(element);
    if (!original) {
      let fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
      const parent = element.parentElement;
      if (scale !== 1 && parent &&
          Math.abs(fontSize - Number.parseFloat(getComputedStyle(parent).fontSize)) < 0.01) {
        fontSize /= scale;
      }
      original = { fontSize, inlineFontSize: element.style.fontSize };
      accessibilityTextSizes.set(element, original);
    }
    element.style.fontSize = scale === 1 ? original.inlineFontSize : `${original.fontSize * scale}px`;
  }
}

function applyLineHeight(elements) {
  const scale = accessibilitySettings.lineHeight / 100;
  for (const element of elements) {
    let original = accessibilityLineHeights.get(element);
    if (!original) {
      const style = getComputedStyle(element);
      const lineHeight = Number.parseFloat(style.lineHeight);
      original = {
        lineHeight: Number.isFinite(lineHeight) ? lineHeight : Number.parseFloat(style.fontSize) * 1.2,
        inlineLineHeight: element.style.lineHeight,
      };
      accessibilityLineHeights.set(element, original);
    }
    element.style.lineHeight = scale === 1 ? original.inlineLineHeight : `${original.lineHeight * scale}px`;
  }
}

function applyAccessibilitySettings() {
  const textElements = getTextElements(document.body);
  applyTextSize(textElements);
  applyLineHeight(textElements);
  for (const setting of ["readableFont", "bigCursor", "letterSpacing", "alignText", "boldText"]) {
    document.body.classList.toggle(`accessibility-${setting.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, accessibilitySettings[setting]);
  }
  document.body.classList.toggle("accessibility-high-contrast", accessibilitySettings.highContrast);
  document.body.classList.toggle("accessibility-underline-links", accessibilitySettings.underlineLinks);
  accessibilityTextSizeValue.value = `${accessibilitySettings.textSize}%`;
  accessibilityLineHeightValue.value = `${accessibilitySettings.lineHeight}%`;
  for (const [setting, enabled] of Object.entries(accessibilitySettings)) {
    const button = accessibilityWidget.querySelector(`[data-setting="${setting}"]`);
    if (button) button.setAttribute("aria-pressed", String(enabled));
  }
  accessibilityWidget.querySelector('[data-text-size="-10"]').disabled = accessibilitySettings.textSize <= 100;
  accessibilityWidget.querySelector('[data-text-size="10"]').disabled = accessibilitySettings.textSize >= 150;
  accessibilityWidget.querySelector('[data-line-height="-10"]').disabled = accessibilitySettings.lineHeight <= 100;
  accessibilityWidget.querySelector('[data-line-height="10"]').disabled = accessibilitySettings.lineHeight >= 150;
}

function saveAccessibilitySettings() {
  applyAccessibilitySettings();
  try {
    localStorage.setItem(accessibilityStorageKey, JSON.stringify(accessibilitySettings));
  } catch (error) {
    console.error("Unable to save accessibility settings to local storage.", error);
  }
}

function setAccessibilityPanelOpen(isOpen) {
  accessibilityPanel.hidden = !isOpen;
  accessibilityWidget.classList.toggle("is-open", isOpen);
  accessibilityToggle.setAttribute("aria-expanded", String(isOpen));
  accessibilityToggle.setAttribute("aria-label", isOpen ? "Close accessibility options" : "Open accessibility options");
  if (isOpen) accessibilityClose.focus();
}

accessibilityToggle.addEventListener("click", () => {
  setAccessibilityPanelOpen(accessibilityPanel.hidden);
});

accessibilityClose.addEventListener("click", () => {
  setAccessibilityPanelOpen(false);
  accessibilityToggle.focus();
});

accessibilityPanel.addEventListener("click", (event) => {
  const textSizeButton = event.target.closest("[data-text-size]");
  if (textSizeButton) {
    accessibilitySettings.textSize = Math.min(150, Math.max(100, accessibilitySettings.textSize + Number(textSizeButton.dataset.textSize)));
    saveAccessibilitySettings();
    return;
  }

  const lineHeightButton = event.target.closest("[data-line-height]");
  if (lineHeightButton) {
    accessibilitySettings.lineHeight = Math.min(150, Math.max(100, accessibilitySettings.lineHeight + Number(lineHeightButton.dataset.lineHeight)));
    saveAccessibilitySettings();
    return;
  }

  const settingButton = event.target.closest("[data-setting]");
  if (settingButton) {
    const setting = settingButton.dataset.setting;
    accessibilitySettings[setting] = !accessibilitySettings[setting];
    saveAccessibilitySettings();
    return;
  }

  if (event.target.closest("[data-reset]")) {
    accessibilitySettings = { ...defaultAccessibilitySettings };
    saveAccessibilitySettings();
  }
});

accessibilityPanel.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setAccessibilityPanelOpen(false);
    accessibilityToggle.focus();
  }
});

document.addEventListener("click", (event) => {
  if (!accessibilityWidget.contains(event.target)) setAccessibilityPanelOpen(false);
});

window.addEventListener("storage", (event) => {
  if (event.key !== accessibilityStorageKey) return;
  accessibilitySettings = readAccessibilitySettings();
  applyAccessibilitySettings();
});

applyAccessibilitySettings();
new MutationObserver((records) => {
  const addedElements = new Set();
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        for (const element of getTextElements(node)) addedElements.add(element);
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() &&
          !accessibilityWidget.contains(node.parentElement)) {
        addedElements.add(node.parentElement);
      }
    }
  }
  applyLineHeight(addedElements);
  applyTextSize(addedElements);
}).observe(document.body, { childList: true, subtree: true });
