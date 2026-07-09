import { games } from "./data/games.js?v=20260709-fa3";
import { DEFAULT_ADVANCED_FILTERS } from "./data/constants.js?v=20260709-fa3";
import {
  AppShell,
  FilterSheet,
  RandomGameResult,
  RandomGameSetup,
  StartGameSheet
} from "./components/components.js?v=20260709-fa3";
import {
  DetailScreen,
  DiscoverScreen,
  ExploreScreen,
  ProfileScreen,
  SavedScreen
} from "./components/screens.js?v=20260709-fa3";
import {
  filterGames,
  normalizeFilters,
  pickRandomGame,
  sortGames
} from "./services/filtering.js?v=20260709-fa3";
import {
  getLastFilters,
  getPreferences,
  getSavedGameIds,
  saveLastFilters,
  savePreferences,
  toggleSavedGame
} from "./services/storage.js?v=20260709-fa3";
import {
  applyDocumentLanguage,
  getLanguage,
  localizeGames,
  translateDom,
  translateText
} from "./services/i18n.js?v=20260709-fa3";

const app = document.querySelector("#app");

const state = {
  route: parseRoute(),
  discover: {
    search: "",
    requirement: "all",
    quickFilters: []
  },
  explore: {
    search: "",
    requirement: "all",
    sort: "recommended"
  },
  saved: {
    search: "",
    requirement: "all"
  },
  advancedFilters: normalizeFilters(getLastFilters(DEFAULT_ADVANCED_FILTERS)),
  filterSheet: {
    open: false,
    scope: "discover",
    draftFilters: normalizeFilters(DEFAULT_ADVANCED_FILTERS)
  },
  random: {
    openSetup: false,
    constraints: {
      playerCount: "",
      duration: "",
      requirement: "",
      environment: "",
      activityLevel: ""
    },
    result: null
  },
  starterGameId: "",
  savedIds: new Set(getSavedGameIds()),
  preferences: getPreferences(),
  onlineAvailable: navigator.onLine
};

let lastRouteKey = routeKey(state.route);

render();

window.addEventListener("hashchange", () => {
  state.route = parseRoute();
  const nextKey = routeKey(state.route);
  if (nextKey !== lastRouteKey) {
    closeTransientOverlays();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
  lastRouteKey = nextKey;
  render();
});

window.addEventListener("online", () => {
  state.onlineAvailable = true;
  render();
});

window.addEventListener("offline", () => {
  state.onlineAvailable = false;
  render();
});

window.addEventListener("scroll", syncTopBar, { passive: true });

app.addEventListener("click", async (event) => {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;

  const action = actionTarget.dataset.action;
  const scope = actionTarget.dataset.scope;
  const value = actionTarget.dataset.value;
  const key = actionTarget.dataset.key;

  if (["toggle-save", "select-requirement", "toggle-quick-filter"].includes(action)) {
    event.preventDefault();
  }

  switch (action) {
    case "notify":
      showToast("Notifications are ready as a product hook.");
      break;
    case "go-profile":
      location.hash = "#/profile";
      break;
    case "share-current":
      event.preventDefault();
      await shareCurrentPage();
      break;
    case "select-requirement":
      updateScope(scope, { requirement: value });
      render();
      break;
    case "toggle-quick-filter":
      toggleQuickFilter(value);
      render();
      break;
    case "open-filter":
      state.filterSheet = {
        open: true,
        scope: scope || activeScope(),
        draftFilters: cloneFilters(state.advancedFilters)
      };
      render();
      break;
    case "close-filter":
      state.filterSheet.open = false;
      render();
      break;
    case "toggle-advanced-filter":
      toggleAdvancedFilter(key, value);
      render();
      break;
    case "apply-filters":
      state.advancedFilters = cloneFilters(state.filterSheet.draftFilters);
      state.filterSheet.open = false;
      saveLastFilters(state.advancedFilters);
      render();
      break;
    case "reset-filters":
      resetFilters();
      render();
      break;
    case "remove-advanced-filter":
      state.advancedFilters[key] = state.advancedFilters[key].filter((item) => item !== value);
      saveLastFilters(state.advancedFilters);
      render();
      break;
    case "toggle-save":
      state.savedIds = new Set(toggleSavedGame(actionTarget.dataset.gameId));
      render();
      showToast(state.savedIds.has(actionTarget.dataset.gameId) ? "Saved for later." : "Removed from saved games.");
      break;
    case "clear-saved-search":
      state.saved.search = "";
      state.saved.requirement = "all";
      render();
      break;
    case "open-random":
      state.random.openSetup = true;
      state.random.result = null;
      render();
      break;
    case "close-random":
      state.random.openSetup = false;
      render();
      break;
    case "close-random-result":
      state.random.result = null;
      render();
      break;
    case "pick-random":
      pickRandom();
      break;
    case "start-game":
      state.starterGameId = actionTarget.dataset.gameId;
      render();
      break;
    case "close-starter":
      state.starterGameId = "";
      render();
      break;
    case "starter-ready":
      showToast("Round shell started. Add a game engine here when ready.");
      break;
    case "mock-timer":
      showToast("60-second timer shell queued.");
      break;
    case "mock-first-player":
      showToast("First player selected: youngest player starts.");
      break;
    case "mock-prompt":
      showToast("Prompt shell ready: generate the next clue here.");
      break;
    case "preference-choice":
      updatePreferenceChoice(key, actionTarget.dataset.mode, value);
      render();
      break;
    default:
      break;
  }
});

app.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;

  if (target.dataset.action === "search") {
    updateScope(target.dataset.scope, { search: target.value });
    render();
  }

  if (target.dataset.action === "preference-name") {
    state.preferences = savePreferences({ ...state.preferences, name: target.value });
  }
});

app.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement) && !(target instanceof HTMLInputElement)) return;

  if (target.dataset.action === "change-sort") {
    state.explore.sort = target.value;
    render();
  }

  if (target.dataset.action === "random-constraint") {
    state.random.constraints[target.dataset.name] = target.value;
    render();
  }

  if (target.dataset.action === "preference-toggle") {
    state.preferences = savePreferences({
      ...state.preferences,
      [target.dataset.key]: target.checked
    });
    render();
  }

  if (target.dataset.action === "language-change") {
    state.preferences = savePreferences({
      ...state.preferences,
      language: target.value
    });
    closeTransientOverlays();
    render();
  }
});

function render() {
  const focusState = captureFocus();
  const route = state.route;
  const savedIds = state.savedIds;
  const preferences = state.preferences;
  const language = getLanguage(preferences);
  const displayGames = localizeGames(games, language);
  let content = "";
  let activeNav = "discover";
  let showNav = true;

  if (route.name === "explore") {
    activeNav = "explore";
    content = ExploreScreen({ state, games: displayGames, savedIds, preferences });
  } else if (route.name === "saved") {
    activeNav = "saved";
    content = SavedScreen({ state, games: displayGames, savedIds });
  } else if (route.name === "profile") {
    activeNav = "profile";
    content = ProfileScreen({ preferences, savedIds });
  } else if (route.name === "game") {
    activeNav = "discover";
    showNav = false;
    content = DetailScreen({
      slug: route.params.slug,
      games: displayGames,
      savedIds,
      onlineAvailable: state.onlineAvailable
    });
  } else {
    activeNav = "discover";
    content = DiscoverScreen({ state, games: displayGames, savedIds, preferences });
  }

  app.innerHTML = AppShell({
    activeNav,
    content,
    showNav,
    modals: renderModals(displayGames)
  });

  translateDom(app, language);
  document.body.dataset.language = language;
  document.body.classList.toggle(
    "no-scroll",
    state.filterSheet.open || state.random.openSetup || Boolean(state.random.result) || Boolean(state.starterGameId)
  );
  restoreFocus(focusState);
  syncTopBar();
}

function renderModals(displayGames) {
  const draft = state.filterSheet.draftFilters;
  const scopeCriteria = getCriteriaForScope(state.filterSheet.scope);
  const applyCount = filterGames(displayGames, {
    ...scopeCriteria,
    advancedFilters: draft
  }).length;
  const randomMatchCount = getRandomMatchCount(displayGames);
  const starterGame = state.starterGameId ? displayGames.find((game) => game.id === state.starterGameId) : null;

  return `
    ${FilterSheet({
      open: state.filterSheet.open,
      scope: state.filterSheet.scope,
      draftFilters: draft,
      applyCount
    })}
    ${RandomGameSetup({
      open: state.random.openSetup,
      constraints: state.random.constraints,
      matchCount: randomMatchCount
    })}
    ${RandomGameResult({
      result: state.random.result,
      savedIds: state.savedIds
    })}
    ${StartGameSheet({
      game: starterGame,
      onlineAvailable: state.onlineAvailable
    })}
  `;
}

function parseRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);

  if (parts[0] === "explore") return { name: "explore", params: {} };
  if (parts[0] === "saved") return { name: "saved", params: {} };
  if (parts[0] === "profile") return { name: "profile", params: {} };
  if (parts[0] === "game" && parts[1]) return { name: "game", params: { slug: parts[1] } };

  return { name: "discover", params: {} };
}

function routeKey(route) {
  return `${route.name}:${route.params.slug || ""}`;
}

function activeScope() {
  if (state.route.name === "explore") return "explore";
  if (state.route.name === "saved") return "saved";
  return "discover";
}

function getCriteriaForScope(scope) {
  if (scope === "explore") {
    return {
      search: state.explore.search,
      requirement: state.explore.requirement,
      quickFilters: [],
      advancedFilters: state.advancedFilters
    };
  }

  if (scope === "saved") {
    return {
      search: state.saved.search,
      requirement: state.saved.requirement,
      quickFilters: [],
      advancedFilters: DEFAULT_ADVANCED_FILTERS
    };
  }

  return {
    search: state.discover.search,
    requirement: state.discover.requirement,
    quickFilters: state.discover.quickFilters,
    advancedFilters: state.advancedFilters
  };
}

function updateScope(scope, patch) {
  if (!state[scope]) return;
  state[scope] = { ...state[scope], ...patch };
}

function toggleQuickFilter(value) {
  const current = new Set(state.discover.quickFilters);
  if (current.has(value)) {
    current.delete(value);
  } else {
    current.add(value);
  }
  state.discover.quickFilters = [...current];
}

function toggleAdvancedFilter(key, value) {
  const draft = cloneFilters(state.filterSheet.draftFilters);
  const values = new Set(draft[key] || []);
  if (values.has(value)) {
    values.delete(value);
  } else {
    values.add(value);
  }
  draft[key] = [...values];
  state.filterSheet.draftFilters = draft;
}

function resetFilters() {
  state.advancedFilters = cloneFilters(DEFAULT_ADVANCED_FILTERS);
  state.filterSheet.draftFilters = cloneFilters(DEFAULT_ADVANCED_FILTERS);
  state.filterSheet.open = false;
  state.discover.quickFilters = [];
  state.discover.requirement = "all";
  state.explore.requirement = "all";
  state.saved.requirement = "all";
  saveLastFilters(state.advancedFilters);
}

function closeTransientOverlays() {
  state.filterSheet.open = false;
  state.random.openSetup = false;
  state.random.result = null;
  state.starterGameId = "";
}

function updatePreferenceChoice(key, mode, value) {
  const next = { ...state.preferences };
  if (mode === "multiple") {
    const values = new Set(next[key] || []);
    if (values.has(value)) values.delete(value);
    else values.add(value);
    next[key] = [...values];
  } else {
    next[key] = value;
  }
  state.preferences = savePreferences(next);
}

function pickRandom() {
  const displayGames = currentGames();
  const result = pickRandomGame(
    displayGames,
    state.random.constraints,
    getCriteriaForScope("discover"),
    state.preferences
  );

  if (!result.game) {
    showToast("No games match those constraints.");
    return;
  }

  state.random.openSetup = false;
  state.random.result = result;
  render();
}

function getRandomMatchCount(displayGames = currentGames()) {
  const constraints = state.random.constraints;
  const activeAdvanced = cloneFilters(state.advancedFilters);
  if (constraints.playerCount) activeAdvanced.playerCounts = [constraints.playerCount];
  if (constraints.duration) activeAdvanced.durations = [constraints.duration];
  if (constraints.activityLevel) activeAdvanced.activityLevels = [constraints.activityLevel];
  if (constraints.environment) activeAdvanced.environments = [constraints.environment];

  const criteria = {
    ...getCriteriaForScope("discover"),
    requirement: constraints.requirement || state.discover.requirement || "all",
    advancedFilters: activeAdvanced
  };
  return sortGames(filterGames(displayGames, criteria), "recommended", state.preferences).length;
}

function currentGames() {
  return localizeGames(games, getLanguage(state.preferences));
}

function cloneFilters(filters) {
  return normalizeFilters(filters);
}

function captureFocus() {
  const active = document.activeElement;
  if (!active || !["INPUT", "SELECT"].includes(active.tagName)) return null;

  return {
    name: active.getAttribute("name"),
    action: active.dataset.action,
    dataName: active.dataset.name,
    value: active.value,
    start: active.selectionStart,
    end: active.selectionEnd
  };
}

function restoreFocus(focusState) {
  if (!focusState) return;
  const selector = focusState.name
    ? `[name="${CSS.escape(focusState.name)}"]`
    : `[data-action="${CSS.escape(focusState.action || "")}"][data-name="${CSS.escape(focusState.dataName || "")}"]`;
  const next = app.querySelector(selector);
  if (!next) return;
  next.focus({ preventScroll: true });
  if (typeof next.setSelectionRange === "function" && focusState.start !== null) {
    next.setSelectionRange(focusState.start, focusState.end);
  }
}

function syncTopBar() {
  const topBar = document.querySelector("[data-top-app-bar]");
  if (!topBar) return;
  topBar.classList.toggle("is-scrolled", window.scrollY > 8);
}

async function shareCurrentPage() {
  const url = window.location.href;
  const title = document.title;

  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    showToast("Link copied.");
  } catch {
    showToast("Sharing was cancelled.");
  }
}

function showToast(message) {
  const region = document.querySelector("#toast-region");
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = translateText(message, getLanguage(state.preferences));
  region.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

applyDocumentLanguage(getLanguage(state.preferences));

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
