/* ==========================================================================
   Data
   ========================================================================== */
const extensionsData = [
  { logo: "./assets/images/logo-devlens.svg", name: "DevLens", description: "Quickly inspect page layouts and visualize element boundaries.", isActive: true },
  { logo: "./assets/images/logo-style-spy.svg", name: "StyleSpy", description: "Instantly analyze and copy CSS from any webpage element.", isActive: true },
  { logo: "./assets/images/logo-speed-boost.svg", name: "SpeedBoost", description: "Optimizes browser resource usage to accelerate page loading.", isActive: false },
  { logo: "./assets/images/logo-json-wizard.svg", name: "JSONWizard", description: "Formats, validates, and prettifies JSON responses in-browser.", isActive: true },
  { logo: "./assets/images/logo-tab-master-pro.svg", name: "TabMaster Pro", description: "Organizes browser tabs into groups and sessions.", isActive: true },
  { logo: "./assets/images/logo-viewport-buddy.svg", name: "ViewportBuddy", description: "Simulates various screen resolutions directly within the browser.", isActive: false },
  { logo: "./assets/images/logo-markup-notes.svg", name: "Markup Notes", description: "Enables annotation and notes directly onto webpages for collaborative debugging.", isActive: true },
  { logo: "./assets/images/logo-grid-guides.svg", name: "GridGuides", description: "Overlay customizable grids and alignment guides on any webpage.", isActive: false },
  { logo: "./assets/images/logo-palette-picker.svg", name: "Palette Picker", description: "Instantly extracts color palettes from any webpage.", isActive: true },
  { logo: "./assets/images/logo-link-checker.svg", name: "LinkChecker", description: "Scans and highlights broken links on any page.", isActive: true },
  { logo: "./assets/images/logo-dom-snapshot.svg", name: "DOM Snapshot", description: "Capture and export DOM structures quickly.", isActive: false },
  { logo: "./assets/images/logo-console-plus.svg", name: "ConsolePlus", description: "Enhanced developer console with advanced filtering and logging.", isActive: true },
];

/* ==========================================================================
   State
   Every extension gets a unique id, because names can't be trusted as keys.
   ========================================================================== */
const state = {
  extensions: extensionsData.map((extension, index) => ({ id: index, ...extension })),
  filter: "all",
};

const filterRules = {
  all: () => true,
  active: (extension) => extension.isActive,
  inactive: (extension) => !extension.isActive,
};

/* ==========================================================================
   DOM references
   ========================================================================== */
const cardsList = document.querySelector("#cards");
const cardTemplate = document.querySelector("#card-template");
const emptyMessage = document.querySelector("#empty-message");
const filterButtons = document.querySelectorAll(".filter-btn");
const themeToggle = document.querySelector(".theme-toggle");

/* ==========================================================================
   Rendering
   ========================================================================== */
function createCard(extension, index) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);

  card.dataset.id = extension.id;
  card.style.setProperty("--i", index); // used by the CSS entrance stagger
  card.querySelector(".card__logo").src = extension.logo;
  card.querySelector(".card__title").textContent = extension.name;
  card.querySelector(".card__desc").textContent = extension.description;

  card
    .querySelector(".card__remove")
    .setAttribute("aria-label", `Remove ${extension.name}`);

  const switchInput = card.querySelector(".switch__input");
  switchInput.checked = extension.isActive;
  switchInput.setAttribute("aria-label", `Toggle ${extension.name}`);

  return card;
}

function updateEmptyState() {
  emptyMessage.hidden = cardsList.children.length > 0;
}

function render() {
  const visible = state.extensions.filter(filterRules[state.filter]);
  cardsList.replaceChildren(...visible.map(createCard));
  updateEmptyState();
}

/* ==========================================================================
   Animated DOM updates
   Cards get a unique view-transition-name only while a transition runs, so
   the browser can match the same card before and after the change:
   - card in both states  -> slides to its new position
   - card only in old     -> fades out
   - card only in new     -> fades in
   ========================================================================== */
let latestTransition = 0;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function nameCards(name) {
  cardsList.querySelectorAll(".card").forEach((card) => {
    card.style.viewTransitionName = name ? `card-${card.dataset.id}` : "";
  });
}

function runTransition(update) {
  if (!document.startViewTransition || prefersReducedMotion()) {
    update();
    return;
  }

  const id = ++latestTransition;

  nameCards(true); // name the cards as they are now (old state)

  const transition = document.startViewTransition(() => {
    update();
    nameCards(true); // name the cards as they will be (new state)
  });

  // Clean up, unless a newer transition has already started
  transition.finished.finally(() => {
    if (id === latestTransition) nameCards(false);
  });
}

/* ==========================================================================
   Filters
   ========================================================================== */
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;

    filterButtons.forEach((btn) => {
      const isSelected = btn === button;
      btn.classList.toggle("active", isSelected);
      btn.setAttribute("aria-pressed", String(isSelected));
    });

    runTransition(render);
  });
});

/* ==========================================================================
   Remove and toggle (event delegation: one listener for all cards)
   ========================================================================== */
cardsList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".card__remove");
  if (!removeButton) return;

  const card = removeButton.closest(".card");
  const id = Number(card.dataset.id);

  runTransition(() => {
    state.extensions = state.extensions.filter((extension) => extension.id !== id);
    card.remove();
    updateEmptyState();
  });
});

cardsList.addEventListener("change", (event) => {
  const switchInput = event.target.closest(".switch__input");
  if (!switchInput) return;

  const card = switchInput.closest(".card");
  const extension = state.extensions.find(
    (item) => item.id === Number(card.dataset.id)
  );

  extension.isActive = switchInput.checked;

  // If the card no longer matches the current filter, take it out of view
  if (!filterRules[state.filter](extension)) {
    runTransition(() => {
      card.remove();
      updateEmptyState();
    });
  }
});

/* ==========================================================================
   Theme
   ========================================================================== */
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));

  try {
    localStorage.setItem("theme", theme);
  } catch (error) {
    /* storage can be blocked (private mode); the theme still works */
  }
}

themeToggle.setAttribute(
  "aria-pressed",
  String(document.documentElement.dataset.theme === "dark")
);

themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.dataset.theme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  // Fallback: browser doesn't support View Transitions, or the user wants no motion
  if (!document.startViewTransition || prefersReducedMotion()) {
    setTheme(nextTheme);
    return;
  }

  // The browser snapshots the old page, runs the callback, then cross-fades to the new one
  document.startViewTransition(() => setTheme(nextTheme));
});

/* ==========================================================================
   Init
   ========================================================================== */
// .cards--intro turns on the staggered entrance for the first render only
cardsList.classList.add("cards--intro");
render();
setTimeout(() => cardsList.classList.remove("cards--intro"), 1800);