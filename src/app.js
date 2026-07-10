import { DEFAULT_ADVANCED_FILTERS } from "./data/constants.js?v=20260710-json2";
import {
  AppShell,
  EmptyState,
  FilterSheet,
  LoadingSkeleton,
  RandomGameResult,
  RandomGameSetup,
  TopAppBar
} from "./components/components.js?v=20260710-json2";
import { AdminRouteScreen } from "./components/admin.js?v=20260710-json2";
import {
  DetailScreen,
  DiscoverScreen,
  ExploreScreen,
  ProfileScreen,
  SavedScreen
} from "./components/screens.js?v=20260710-json2";
import {
  filterGames,
  normalizeFilters,
  pickRandomGame,
  sortGames
} from "./services/filtering.js?v=20260710-json2";
import {
  getLastFilters,
  getPreferences,
  getSavedGameIds,
  saveLastFilters,
  savePreferences,
  toggleSavedGame
} from "./services/storage.js?v=20260710-json2";
import {
  applyDocumentLanguage,
  getLanguage,
  localizeGames,
  translateDom,
  translateText
} from "./services/i18n.js?v=20260710-json2";
import {
  assignImportedFiltersToGame,
  checkAdminAccess,
  createGameImportDraft,
  deleteGame,
  duplicatePayload,
  emptyGameForm,
  fetchAdminGames,
  fetchPublicGames,
  formFromGameRow,
  getCachedPublicGames,
  getCurrentSession,
  isSlugUnique,
  loginWithEmailPassword,
  logoutAdmin,
  nextSortOrder,
  onAuthChanged,
  payloadFromForm,
  sampleGameImportJson,
  saveGame,
  slugify,
  updateGameField,
  updateGameSortOrder,
  uploadGameImage,
  validateGameForm
} from "./services/gamesApi.js?v=20260710-json2";

const app = document.querySelector("#app");
const cachedPublicGames = getCachedPublicGames();

const state = {
  route: parseRoute(),
  publicGames: {
    items: cachedPublicGames,
    loading: true,
    loaded: false,
    error: "",
    usingCache: cachedPublicGames.length > 0
  },
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
  savedIds: new Set(getSavedGameIds()),
  preferences: getPreferences(),
  onlineAvailable: navigator.onLine,
  admin: {
    authLoading: true,
    accessLoading: false,
    session: null,
    userEmail: "",
    isAdmin: false,
    accessError: "",
    loading: false,
    error: "",
    games: [],
    view: "list",
    editingId: "",
    busyId: "",
    saving: false,
    saveStatus: "",
    form: emptyGameForm(),
    formErrors: {},
    formDirty: false,
    slugTouched: false,
    filters: {
      search: "",
      category: "all",
      status: "all",
      featured: "all"
    },
    login: {
      email: "",
      password: "",
      loading: false,
      error: ""
    },
    upload: {
      file: null,
      loading: false,
      status: "",
      error: ""
    },
    jsonImport: emptyAdminJsonImportState(),
    logoutLoading: false
  }
};

let lastRouteKey = routeKey(state.route);

render();
bootstrapPublicGames();
bootstrapAdminAuth();

window.addEventListener("hashchange", () => {
  const nextRoute = parseRoute();
  if (state.admin.formDirty && state.admin.view === "form" && !isAdminRoute(nextRoute)) {
    const shouldLeave = window.confirm("Discard unsaved game changes?");
    if (!shouldLeave) {
      window.location.hash = routeToHash(state.route);
      return;
    }
    state.admin.formDirty = false;
  }

  state.route = nextRoute;
  const nextKey = routeKey(nextRoute);
  if (nextKey !== lastRouteKey) {
    closeTransientOverlays();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
  lastRouteKey = nextKey;
  if (isAdminRoute(nextRoute)) {
    ensureAdminReady();
  }
  render();
});

window.addEventListener("beforeunload", (event) => {
  if (!state.admin.formDirty || state.admin.view !== "form") return;
  event.preventDefault();
  event.returnValue = "";
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
  const isFileInputAction = actionTarget instanceof HTMLInputElement && actionTarget.type === "file";

  if (
    ["toggle-save", "select-requirement", "toggle-quick-filter"].includes(action) ||
    (action.startsWith("admin-") && !isFileInputAction)
  ) {
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
    case "preference-choice":
      updatePreferenceChoice(key, actionTarget.dataset.mode, value);
      render();
      break;
    case "refresh-public-games":
      refreshPublicGames();
      break;
    case "admin-logout":
      handleAdminLogout();
      break;
    case "admin-login-submit":
      handleAdminLogin();
      break;
    case "admin-refresh-access":
      ensureAdminReady(true);
      break;
    case "admin-refresh-games":
      loadAdminGames();
      break;
    case "admin-open-import-json":
      openAdminJsonImport();
      break;
    case "admin-close-import-json":
      closeAdminJsonImport();
      break;
    case "admin-download-sample-json":
      downloadAdminImportSample();
      break;
    case "admin-load-import-form":
      loadAdminImportIntoForm();
      break;
    case "admin-save-imported-game":
      handleAdminImportSave();
      break;
    case "admin-new-game":
      openAdminForm();
      break;
    case "admin-edit-game":
      openAdminForm(actionTarget.dataset.id);
      break;
    case "admin-cancel-form":
      closeAdminForm();
      break;
    case "admin-save-game":
      handleAdminSave();
      break;
    case "admin-delete-game":
      handleAdminDelete(actionTarget.dataset.id);
      break;
    case "admin-duplicate-game":
      handleAdminDuplicate(actionTarget.dataset.id);
      break;
    case "admin-toggle-active":
      handleAdminToggle(actionTarget.dataset.id, "is_active");
      break;
    case "admin-toggle-featured":
      handleAdminToggle(actionTarget.dataset.id, "is_featured");
      break;
    case "admin-move-game":
      handleAdminMove(actionTarget.dataset.id, actionTarget.dataset.direction);
      break;
    case "admin-generate-slug":
      state.admin.form.slug = slugify(state.admin.form.title);
      state.admin.slugTouched = true;
      markAdminFormDirty();
      render();
      break;
    case "admin-list-add":
      addAdminListItem(actionTarget.dataset.list);
      break;
    case "admin-list-remove":
      removeAdminListItem(actionTarget.dataset.list, Number(actionTarget.dataset.index));
      break;
    case "admin-list-move":
      moveAdminListItem(actionTarget.dataset.list, Number(actionTarget.dataset.index), actionTarget.dataset.direction);
      break;
    case "admin-step-add":
      addAdminStep();
      break;
    case "admin-step-remove":
      removeAdminStep(Number(actionTarget.dataset.index));
      break;
    case "admin-step-move":
      moveAdminStep(Number(actionTarget.dataset.index), actionTarget.dataset.direction);
      break;
    case "admin-upload-image":
      handleAdminImageUpload();
      break;
    default:
      break;
  }
});

app.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-action]");
  if (!form) return;
  if (form.dataset.action === "admin-login-submit") {
    event.preventDefault();
    handleAdminLogin();
  }
});

app.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;

  if (target.dataset.action === "search") {
    updateScope(target.dataset.scope, { search: target.value });
    render();
  }

  if (target.dataset.action === "preference-name") {
    state.preferences = savePreferences({ ...state.preferences, name: target.value });
  }

  if (target.dataset.action === "admin-login-input") {
    state.admin.login[target.dataset.field] = target.value;
  }

  if (target.dataset.action === "admin-filter-change") {
    updateAdminFilter(target.dataset.field, target.value);
  }

  if (target.dataset.action === "admin-form-field") {
    updateAdminFormField(target.dataset.field, target.value, target);
  }

  if (target.dataset.action === "admin-import-field") {
    updateAdminImportField(target.dataset.field, target.value, target);
  }

  if (target.dataset.action === "admin-list-field") {
    updateAdminListField(target.dataset.list, Number(target.dataset.index), target.value);
  }

  if (target.dataset.action === "admin-step-field") {
    updateAdminStepField(Number(target.dataset.index), target.dataset.field, target.value);
  }
});

app.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement) && !(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;

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

  if (target.dataset.action === "admin-filter-change") {
    updateAdminFilter(target.dataset.field, target.value);
  }

  if (target.dataset.action === "admin-form-field") {
    updateAdminFormField(target.dataset.field, target.type === "checkbox" ? target.checked : target.value, target);
  }

  if (target.dataset.action === "admin-import-field") {
    updateAdminImportField(target.dataset.field, target.type === "checkbox" ? target.checked : target.value, target);
  }

  if (target.dataset.action === "admin-import-json-file") {
    handleAdminImportFile(target.files?.[0] || null);
  }

  if (target.dataset.action === "admin-image-file") {
    state.admin.upload.file = target.files?.[0] || null;
    state.admin.upload.status = state.admin.upload.file ? state.admin.upload.file.name : "";
    state.admin.upload.error = "";
    render();
  }
});

function render() {
  const focusState = captureFocus();
  const route = state.route;
  const savedIds = state.savedIds;
  const preferences = state.preferences;
  const language = getLanguage(preferences);
  const adminRoute = isAdminRoute(route);
  const displayGames = localizeGames(state.publicGames.items, language);
  let content = "";
  let activeNav = "discover";
  let showNav = !adminRoute;

  if (adminRoute) {
    activeNav = "";
    content = AdminRouteScreen({ admin: state.admin });
  } else if (publicDataNeedsBlockingState()) {
    content = renderPublicDataState();
  } else if (route.name === "explore") {
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
    modals: adminRoute ? "" : renderModals(displayGames)
  });

  translateDom(app, adminRoute ? "en" : language);
  document.body.dataset.language = adminRoute ? "en" : language;
  document.body.classList.toggle(
    "no-scroll",
    adminRoute
      ? Boolean(state.admin.jsonImport.open)
      : state.filterSheet.open || state.random.openSetup || Boolean(state.random.result)
  );
  restoreFocus(focusState);
  syncTopBar();
}

function publicDataNeedsBlockingState() {
  return (
    (state.publicGames.loading && !state.publicGames.items.length) ||
    (state.publicGames.error && !state.publicGames.items.length)
  );
}

function renderPublicDataState() {
  const title = state.publicGames.error ? "Could not load games" : "Loading games";
  const subtitle = state.publicGames.error ? "Supabase is the source for this library." : "Fetching the latest active games.";
  const body = state.publicGames.error
    ? EmptyState({
        title: "Could not load games.",
        message: state.publicGames.error,
        action: `<button class="primary-button" type="button" data-action="refresh-public-games">Try Again</button>`
      })
    : LoadingSkeleton({ count: 6 });

  return `
    ${TopAppBar({ title, subtitle })}
    <section class="screen-section">${body}</section>
  `;
}

function renderModals(displayGames) {
  const draft = state.filterSheet.draftFilters;
  const scopeCriteria = getCriteriaForScope(state.filterSheet.scope);
  const applyCount = filterGames(displayGames, {
    ...scopeCriteria,
    advancedFilters: draft
  }).length;
  const randomMatchCount = getRandomMatchCount(displayGames);

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
  `;
}

function parseRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);

  if (parts[0] === "explore") return { name: "explore", params: {} };
  if (parts[0] === "saved") return { name: "saved", params: {} };
  if (parts[0] === "profile") return { name: "profile", params: {} };
  if (parts[0] === "game" && parts[1]) return { name: "game", params: { slug: safeDecode(parts[1]) } };
  if (parts[0] === "admin" && parts[1] === "login") return { name: "adminLogin", params: {} };
  if (parts[0] === "admin") return { name: "admin", params: {} };

  return { name: "discover", params: {} };
}

function routeKey(route) {
  return `${route.name}:${route.params.slug || ""}`;
}

function isAdminRoute(route) {
  return route.name === "admin" || route.name === "adminLogin";
}

function routeToHash(route) {
  if (route.name === "explore") return "#/explore";
  if (route.name === "saved") return "#/saved";
  if (route.name === "profile") return "#/profile";
  if (route.name === "game") return `#/game/${encodeURIComponent(route.params.slug || "")}`;
  if (route.name === "adminLogin") return "#/admin/login";
  if (route.name === "admin") return "#/admin";
  return "#/";
}

function activeScope() {
  if (state.route.name === "explore") return "explore";
  if (state.route.name === "saved") return "saved";
  return "discover";
}

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
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

async function bootstrapPublicGames() {
  await refreshPublicGames({ silent: true });
}

async function refreshPublicGames({ silent = false } = {}) {
  state.publicGames.loading = true;
  state.publicGames.error = "";
  if (!silent) render();

  try {
    const games = await fetchPublicGames();
    state.publicGames = {
      items: games,
      loading: false,
      loaded: true,
      error: "",
      usingCache: false
    };
  } catch (error) {
    state.publicGames.loading = false;
    state.publicGames.loaded = true;
    state.publicGames.error = error.message || "Unable to load games from Supabase.";
    state.publicGames.usingCache = state.publicGames.items.length > 0;
    if (state.publicGames.items.length && !silent) {
      showToast("Showing the latest cached games.");
    }
  }

  render();
}

async function bootstrapAdminAuth() {
  try {
    const session = await getCurrentSession();
    await applyAdminSession(session);
  } catch (error) {
    state.admin.authLoading = false;
    state.admin.accessError = error.message || "Unable to read Supabase Auth session.";
    render();
  }

  onAuthChanged((session) => {
    applyAdminSession(session);
  });
}

async function applyAdminSession(session) {
  state.admin.session = session;
  state.admin.userEmail = session?.user?.email || "";
  state.admin.authLoading = false;

  if (!session) {
    state.admin.isAdmin = false;
    state.admin.accessLoading = false;
    state.admin.games = [];
    state.admin.view = "list";
    state.admin.formDirty = false;
    render();
    return;
  }

  await ensureAdminReady();
}

async function ensureAdminReady(force = false) {
  if (!state.admin.session) {
    state.admin.authLoading = false;
    state.admin.isAdmin = false;
    render();
    return;
  }

  if (state.admin.accessLoading && !force) return;

  state.admin.accessLoading = true;
  state.admin.accessError = "";
  render();

  const result = await checkAdminAccess(state.admin.session.user);
  state.admin.isAdmin = result.allowed;
  state.admin.accessError = result.error;
  state.admin.accessLoading = false;

  if (result.allowed) {
    await loadAdminGames({ silent: true });
  } else {
    render();
  }
}

async function loadAdminGames({ silent = false } = {}) {
  if (!state.admin.session || !state.admin.isAdmin) return;
  state.admin.loading = true;
  state.admin.error = "";
  if (!silent) render();

  try {
    state.admin.games = await fetchAdminGames();
  } catch (error) {
    state.admin.error = error.message || "Unable to load admin games.";
  } finally {
    state.admin.loading = false;
    render();
  }
}

async function handleAdminLogin() {
  if (state.admin.login.loading) return;
  state.admin.login.loading = true;
  state.admin.login.error = "";
  render();

  try {
    const session = await loginWithEmailPassword(state.admin.login.email.trim(), state.admin.login.password);
    state.admin.login.password = "";
    state.admin.session = session;
    location.hash = "#/admin";
    await ensureAdminReady(true);
  } catch (error) {
    state.admin.login.error = error.message || "Login failed.";
  } finally {
    state.admin.login.loading = false;
    render();
  }
}

async function handleAdminLogout() {
  if (state.admin.formDirty && !window.confirm("Discard unsaved game changes?")) return;
  state.admin.logoutLoading = true;
  render();

  try {
    await logoutAdmin();
    state.admin.session = null;
    state.admin.isAdmin = false;
    state.admin.games = [];
    state.admin.view = "list";
    state.admin.formDirty = false;
    location.hash = "#/admin/login";
  } catch (error) {
    showToast(error.message || "Logout failed.");
  } finally {
    state.admin.logoutLoading = false;
    render();
  }
}

function openAdminForm(id = "") {
  if (state.admin.formDirty && !window.confirm("Discard unsaved game changes?")) return;

  const row = id ? state.admin.games.find((game) => String(game.id) === String(id)) : null;
  state.admin.editingId = row ? String(row.id) : "";
  state.admin.form = row ? formFromGameRow(row) : emptyGameForm(nextSortOrder(state.admin.games));
  state.admin.formErrors = {};
  state.admin.saveStatus = "";
  state.admin.upload = { file: null, loading: false, status: "", error: "" };
  state.admin.formDirty = false;
  state.admin.slugTouched = Boolean(row?.slug);
  state.admin.view = "form";
  render();
}

function closeAdminForm() {
  if (state.admin.formDirty && !window.confirm("Discard unsaved game changes?")) return;
  state.admin.view = "list";
  state.admin.editingId = "";
  state.admin.formDirty = false;
  state.admin.formErrors = {};
  state.admin.saveStatus = "";
  render();
}

async function handleAdminSave() {
  const errors = validateGameForm(state.admin.form);
  state.admin.formErrors = errors;
  state.admin.saveStatus = "";

  if (Object.keys(errors).length) {
    state.admin.saveStatus = "Fix the validation errors before saving.";
    render();
    return;
  }

  state.admin.saving = true;
  state.admin.saveStatus = "Saving...";
  render();

  try {
    const slugAvailable = await isSlugUnique(state.admin.form.slug.trim(), state.admin.editingId);
    if (!slugAvailable) {
      state.admin.formErrors = { ...state.admin.formErrors, slug: "Slug is already used by another game." };
      state.admin.saveStatus = "Fix the validation errors before saving.";
      return;
    }

    const saved = await saveGame(payloadFromForm(state.admin.form), state.admin.editingId);
    state.admin.editingId = String(saved.id);
    state.admin.form = formFromGameRow(saved);
    state.admin.formDirty = false;
    state.admin.slugTouched = true;
    state.admin.saveStatus = "Saved.";
    await loadAdminGames({ silent: true });
    await refreshPublicGames({ silent: true });
  } catch (error) {
    state.admin.saveStatus = `Failed: ${error.message || "Could not save game."}`;
  } finally {
    state.admin.saving = false;
    render();
  }
}

async function handleAdminDelete(id) {
  const row = state.admin.games.find((game) => String(game.id) === String(id));
  if (!row) return;
  if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return;

  state.admin.busyId = String(id);
  render();

  try {
    await deleteGame(id);
    await loadAdminGames({ silent: true });
    await refreshPublicGames({ silent: true });
    showToast("Game deleted.");
  } catch (error) {
    showToast(error.message || "Delete failed.");
  } finally {
    state.admin.busyId = "";
    render();
  }
}

async function handleAdminDuplicate(id) {
  const row = state.admin.games.find((game) => String(game.id) === String(id));
  if (!row) return;

  state.admin.busyId = String(id);
  render();

  try {
    await saveGame(duplicatePayload(row, state.admin.games));
    await loadAdminGames({ silent: true });
    showToast("Game duplicated as inactive.");
  } catch (error) {
    showToast(error.message || "Duplicate failed.");
  } finally {
    state.admin.busyId = "";
    render();
  }
}

async function handleAdminToggle(id, field) {
  const row = state.admin.games.find((game) => String(game.id) === String(id));
  if (!row) return;
  const nextValue = !Boolean(row[field]);

  state.admin.busyId = String(id);
  render();

  try {
    await updateGameField(id, field, nextValue);
    state.admin.games = state.admin.games.map((game) =>
      String(game.id) === String(id) ? { ...game, [field]: nextValue } : game
    );
    await loadAdminGames({ silent: true });
    if (field === "is_active" || row.is_active) {
      await refreshPublicGames({ silent: true });
    }
  } catch (error) {
    showToast(error.message || "Update failed.");
  } finally {
    state.admin.busyId = "";
    render();
  }
}

async function handleAdminMove(id, direction) {
  const sorted = state.admin.games
    .map((game, index) => ({
      ...game,
      resolvedSort: Number.isFinite(Number(game.sort_order)) ? Number(game.sort_order) : (index + 1) * 10
    }))
    .sort((a, b) => a.resolvedSort - b.resolvedSort || new Date(b.created_at) - new Date(a.created_at));
  const index = sorted.findIndex((game) => String(game.id) === String(id));
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;

  const current = sorted[index];
  const target = sorted[targetIndex];
  state.admin.busyId = String(id);
  render();

  try {
    await updateGameSortOrder([
      { id: current.id, sort_order: target.resolvedSort },
      { id: target.id, sort_order: current.resolvedSort }
    ]);
    await loadAdminGames({ silent: true });
    await refreshPublicGames({ silent: true });
  } catch (error) {
    showToast(error.message || "Reorder failed.");
  } finally {
    state.admin.busyId = "";
    render();
  }
}

async function handleAdminImageUpload() {
  state.admin.upload.loading = true;
  state.admin.upload.error = "";
  state.admin.upload.status = "Uploading...";
  render();

  try {
    const url = await uploadGameImage(state.admin.upload.file, state.admin.form.slug || state.admin.form.title);
    state.admin.form.image_url = url;
    state.admin.upload.status = "Uploaded. Save the game to keep this image URL.";
    markAdminFormDirty();
  } catch (error) {
    state.admin.upload.error = error.message || "Upload failed.";
  } finally {
    state.admin.upload.loading = false;
    render();
  }
}

function openAdminJsonImport() {
  state.admin.jsonImport = emptyAdminJsonImportState({ open: true });
  render();
}

function closeAdminJsonImport() {
  if (state.admin.jsonImport.saving) return;
  state.admin.jsonImport = emptyAdminJsonImportState();
  render();
}

async function handleAdminImportFile(file) {
  if (!file) return;

  state.admin.jsonImport = emptyAdminJsonImportState({
    open: true,
    fileName: file.name || "game.json",
    status: "Reading JSON file..."
  });
  render();

  try {
    if (!isJsonFile(file)) {
      throw new Error("Choose a .json file.");
    }

    const raw = await readFileAsText(file);
    const parsed = JSON.parse(raw);
    const draft = createGameImportDraft(parsed);

    if (draft.error) {
      throw new Error(draft.error);
    }

    const formErrors = validateGameForm(draft.form);
    state.admin.jsonImport = {
      ...state.admin.jsonImport,
      raw,
      form: draft.form,
      filters: draft.filters,
      warnings: draft.warnings,
      formErrors,
      status: Object.keys(formErrors).length
        ? "JSON loaded. Fix validation errors before saving."
        : "JSON loaded. Review the preview before saving.",
      error: ""
    };
  } catch (error) {
    state.admin.jsonImport = {
      ...state.admin.jsonImport,
      form: null,
      filters: [],
      warnings: [],
      formErrors: {},
      status: "",
      error: error.message || "Could not import this JSON file."
    };
  }

  render();
}

function updateAdminImportField(field, value, target) {
  if (!field || !state.admin.jsonImport.form) return;
  const form = { ...state.admin.jsonImport.form };

  if (target?.type === "checkbox") {
    form[field] = Boolean(value);
  } else if (field === "slug") {
    form.slug = slugify(value);
  } else {
    form[field] = value;
  }

  state.admin.jsonImport.form = form;
  state.admin.jsonImport.formErrors = validateGameForm(form);
  state.admin.jsonImport.status = Object.keys(state.admin.jsonImport.formErrors).length
    ? "Fix validation errors before saving."
    : "Ready to save.";
  state.admin.jsonImport.error = "";
  render();
}

function loadAdminImportIntoForm() {
  const importer = state.admin.jsonImport;
  if (!importer.form) return;
  if (state.admin.formDirty && !window.confirm("Discard unsaved game changes?")) return;

  const formErrors = validateGameForm(importer.form);
  state.admin.editingId = "";
  state.admin.form = cloneGameForm(importer.form);
  state.admin.formErrors = formErrors;
  state.admin.saveStatus = Object.keys(formErrors).length
    ? "Imported JSON loaded. Fix validation errors before saving."
    : "Imported JSON loaded. Review and save.";
  state.admin.upload = { file: null, loading: false, status: "", error: "" };
  state.admin.formDirty = true;
  state.admin.slugTouched = Boolean(state.admin.form.slug);
  state.admin.view = "form";
  state.admin.jsonImport = emptyAdminJsonImportState();
  render();
}

async function handleAdminImportSave() {
  const importer = state.admin.jsonImport;
  if (!importer.form || importer.saving) return;

  const formErrors = validateGameForm(importer.form);
  state.admin.jsonImport.formErrors = formErrors;
  if (Object.keys(formErrors).length) {
    state.admin.jsonImport.status = "Fix validation errors before saving.";
    render();
    return;
  }

  state.admin.jsonImport.saving = true;
  state.admin.jsonImport.status = "Saving imported game...";
  state.admin.jsonImport.error = "";
  render();

  let toastMessage = "";

  try {
    const slugAvailable = await isSlugUnique(importer.form.slug.trim());
    if (!slugAvailable) {
      state.admin.jsonImport.formErrors = {
        ...state.admin.jsonImport.formErrors,
        slug: "Slug is already used by another game."
      };
      state.admin.jsonImport.status = "Fix validation errors before saving.";
      return;
    }

    const saved = await saveGame(payloadFromForm(importer.form));
    const filterResult = await assignImportedFiltersToGame(saved.id, importer.filters);
    await loadAdminGames({ silent: true });
    await refreshPublicGames({ silent: true });
    state.admin.view = "list";
    state.admin.jsonImport = emptyAdminJsonImportState();

    const filterMessage = summarizeFilterImportResult(filterResult);
    toastMessage = filterMessage ? `Imported game saved. ${filterMessage}` : "Imported game saved.";
  } catch (error) {
    state.admin.jsonImport.error = error.message || "Could not save imported game.";
  } finally {
    state.admin.jsonImport.saving = false;
    render();
    if (toastMessage) showToast(toastMessage);
  }
}

function downloadAdminImportSample() {
  const blob = new Blob([sampleGameImportJson()], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "changal-game-import-sample.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function emptyAdminJsonImportState(patch = {}) {
  return {
    open: false,
    fileName: "",
    raw: "",
    form: null,
    filters: [],
    warnings: [],
    formErrors: {},
    saving: false,
    status: "",
    error: "",
    ...patch
  };
}

function isJsonFile(file) {
  if (!file) return false;
  const name = String(file.name || "").toLowerCase();
  return name.endsWith(".json") || file.type === "application/json" || file.type === "text/json";
}

async function readFileAsText(file) {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(new Error("Could not read this file.")));
    reader.readAsText(file);
  });
}

function cloneGameForm(form) {
  return {
    ...form,
    equipment: [...(form.equipment || [])],
    tags: [...(form.tags || [])],
    game_type: [...(form.game_type || [])],
    steps: (form.steps || []).map((step) => ({ ...step })),
    rules: [...(form.rules || [])],
    tips: [...(form.tips || [])],
    suitable_for: [...(form.suitable_for || [])],
    not_suitable_for: [...(form.not_suitable_for || [])]
  };
}

function summarizeFilterImportResult(result) {
  if (!result) return "";
  if (result.error) return "Filter assignment was skipped; create matching filters and assign them manually.";
  if (result.missing?.length) {
    return "Some filters do not exist yet. Create them in the Filters section, then assign them manually.";
  }
  if (result.assigned) return `${result.assigned} filter assignment${result.assigned === 1 ? "" : "s"} added.`;
  return "";
}

function updateAdminFilter(field, value) {
  state.admin.filters[field] = value;
  render();
}

function updateAdminFormField(field, value, target) {
  if (!field) return;

  if (target?.type === "checkbox") {
    state.admin.form[field] = Boolean(value);
  } else if (field === "slug") {
    state.admin.form.slug = slugify(value);
    state.admin.slugTouched = true;
  } else {
    state.admin.form[field] = value;
    if (field === "title" && !state.admin.slugTouched) {
      state.admin.form.slug = slugify(value);
    }
  }

  markAdminFormDirty();
  render();
}

function updateAdminListField(list, index, value) {
  if (!state.admin.form[list]) return;
  state.admin.form[list][index] = value;
  markAdminFormDirty();
  render();
}

function addAdminListItem(list) {
  if (!state.admin.form[list]) return;
  state.admin.form[list] = [...state.admin.form[list], ""];
  markAdminFormDirty();
  render();
}

function removeAdminListItem(list, index) {
  if (!state.admin.form[list]) return;
  state.admin.form[list] = state.admin.form[list].filter((_item, itemIndex) => itemIndex !== index);
  if (!state.admin.form[list].length) state.admin.form[list] = [""];
  markAdminFormDirty();
  render();
}

function moveAdminListItem(list, index, direction) {
  if (!state.admin.form[list]) return;
  state.admin.form[list] = moveItem(state.admin.form[list], index, direction);
  markAdminFormDirty();
  render();
}

function updateAdminStepField(index, field, value) {
  if (!state.admin.form.steps[index]) return;
  state.admin.form.steps[index] = {
    ...state.admin.form.steps[index],
    [field]: value
  };
  markAdminFormDirty();
  render();
}

function addAdminStep() {
  state.admin.form.steps = [...state.admin.form.steps, { title: "", description: "" }];
  markAdminFormDirty();
  render();
}

function removeAdminStep(index) {
  state.admin.form.steps = state.admin.form.steps.filter((_step, stepIndex) => stepIndex !== index);
  if (!state.admin.form.steps.length) state.admin.form.steps = [{ title: "", description: "" }];
  markAdminFormDirty();
  render();
}

function moveAdminStep(index, direction) {
  state.admin.form.steps = moveItem(state.admin.form.steps, index, direction);
  markAdminFormDirty();
  render();
}

function moveItem(items, index, direction) {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(targetIndex, 0, item);
  return next;
}

function markAdminFormDirty() {
  state.admin.formDirty = true;
  state.admin.saveStatus = "";
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
  return localizeGames(state.publicGames.items, getLanguage(state.preferences));
}

function cloneFilters(filters) {
  return normalizeFilters(filters);
}

function captureFocus() {
  const active = document.activeElement;
  if (!active || !["INPUT", "SELECT", "TEXTAREA"].includes(active.tagName)) return null;

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
