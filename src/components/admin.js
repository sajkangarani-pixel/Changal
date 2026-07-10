import { GAME_TYPES } from "../data/constants.js?v=20260710-steps1";
import {
  ADMIN_CATEGORY_OPTIONS,
  ADMIN_DIFFICULTY_OPTIONS,
  ADMIN_ENERGY_LEVEL_OPTIONS,
  emptyGameForm,
  hasUsefulQuickGuide,
  normalizeGameRow,
  payloadFromForm
} from "../services/gamesApi.js?v=20260710-steps1";
import { escapeAttr, escapeHtml } from "./components.js?v=20260710-steps1";
import { icon } from "./icons.js?v=20260710-steps1";

export function AdminRouteScreen({ admin }) {
  if (admin.authLoading) {
    return AdminShell({
      title: "Admin",
      subtitle: "Checking session...",
      body: `<div class="admin-state-card"><span class="admin-spinner"></span><p>Loading admin session.</p></div>`
    });
  }

  if (!admin.session) {
    return AdminLoginScreen(admin);
  }

  if (admin.accessLoading) {
    return AdminShell({
      title: "Admin",
      subtitle: "Checking access...",
      body: `<div class="admin-state-card"><span class="admin-spinner"></span><p>Verifying admin access.</p></div>`,
      actions: logoutButton(admin)
    });
  }

  if (!admin.isAdmin) {
    return AdminAccessDenied(admin);
  }

  return AdminPanel(admin);
}

export function AdminLoginScreen(admin) {
  return AdminShell({
    title: "Admin login",
    subtitle: "Use your Supabase Auth email and password.",
    body: `
      <form class="admin-auth-card" data-action="admin-login-submit">
        <label class="admin-field">
          <span>Email</span>
          <input
            type="email"
            name="admin-email"
            value="${escapeAttr(admin.login.email)}"
            autocomplete="email"
            inputmode="email"
            data-action="admin-login-input"
            data-field="email"
            required
          />
        </label>
        <label class="admin-field">
          <span>Password</span>
          <input
            type="password"
            name="admin-password"
            value="${escapeAttr(admin.login.password)}"
            autocomplete="current-password"
            data-action="admin-login-input"
            data-field="password"
            required
          />
        </label>
        ${admin.login.error ? `<p class="admin-error-text">${escapeHtml(admin.login.error)}</p>` : ""}
        <button class="primary-button" type="submit" ${admin.login.loading ? "disabled" : ""}>
          ${admin.login.loading ? `<span class="admin-spinner"></span>` : icon("user", 18)}
          ${admin.login.loading ? "Signing in..." : "Login"}
        </button>
      </form>
    `
  });
}

export function AdminAccessDenied(admin) {
  return AdminShell({
    title: "Access denied",
    subtitle: "Your account is signed in but is not listed as an admin.",
    actions: logoutButton(admin),
    body: `
      <div class="admin-state-card">
        <div class="empty-icon">${icon("offline", 24)}</div>
        <h2>No admin access</h2>
        <p>${escapeHtml(admin.accessError || "Ask the project owner to add your user id or email to public.admin_users.")}</p>
        <button class="secondary-button" type="button" data-action="admin-refresh-access">Check Again</button>
      </div>
    `
  });
}

export function AdminPanel(admin) {
  const categories = adminCategories(admin.games);
  const body =
    admin.view === "form"
      ? GameForm({ admin, categories })
      : `
        ${Dashboard(admin)}
        ${GameManagement(admin, categories)}
      `;
  const importModal = admin.jsonImport?.open ? ImportJsonModal(admin.jsonImport) : "";

  return AdminShell({
    title: admin.view === "form" ? (admin.editingId ? "Edit game" : "Add game") : "Admin panel",
    subtitle: admin.userEmail || "Game library management",
    actions: `
      <a class="secondary-button admin-small-action" href="#/">${icon("back", 16)} App</a>
      ${logoutButton(admin)}
    `,
    body: `${body}${importModal}`
  });
}

function AdminShell({ title, subtitle = "", actions = "", body }) {
  return `
    <section class="admin-shell">
      <header class="top-app-bar admin-top-bar" data-top-app-bar>
        <div class="top-leading">
          <div class="top-copy">
            <h1>${escapeHtml(title)}</h1>
            ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
          </div>
        </div>
        <div class="top-actions">${actions}</div>
      </header>
      ${body}
    </section>
  `;
}

function Dashboard(admin) {
  const active = admin.games.filter((game) => game.is_active).length;
  const featured = admin.games.filter((game) => game.is_featured).length;
  const categories = countBy(admin.games, "category");

  return `
    <section class="admin-dashboard screen-section">
      ${MetricCard("Total games", admin.games.length, "grid")}
      ${MetricCard("Active games", active, "check")}
      ${MetricCard("Featured games", featured, "sparkles")}
      <article class="admin-card admin-category-card">
        <div class="admin-card-icon">${icon("cards", 18)}</div>
        <div>
          <p>Games by category</p>
          <div class="admin-category-stack">
            ${
              Object.keys(categories).length
                ? Object.entries(categories)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, count]) => `<span><strong>${escapeHtml(category || "Uncategorized")}</strong>${count}</span>`)
                    .join("")
                : "<em>No games yet</em>"
            }
          </div>
        </div>
      </article>
    </section>
  `;
}

function MetricCard(label, value, iconName) {
  return `
    <article class="admin-card admin-metric-card">
      <div class="admin-card-icon">${icon(iconName, 18)}</div>
      <p>${escapeHtml(label)}</p>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function GameManagement(admin, categories) {
  const games = filterAdminGames(admin);
  return `
    <section class="admin-card admin-management screen-section">
      <div class="admin-section-heading">
        <div>
          <p>${admin.loading ? "Refreshing..." : `${games.length} visible`}</p>
          <h2>Games</h2>
        </div>
        <div class="admin-heading-actions">
          <button class="secondary-button admin-small-action" type="button" data-action="admin-refresh-games">
            ${admin.loading ? `<span class="admin-spinner"></span>` : icon("reset", 16)}
            Refresh
          </button>
          <button class="secondary-button admin-small-action" type="button" data-action="admin-open-import-json">${icon("share", 16)} Import JSON</button>
          <button class="primary-button admin-small-action" type="button" data-action="admin-new-game">${icon("plus", 16)} Add</button>
        </div>
      </div>
      ${admin.error ? `<p class="admin-error-text">${escapeHtml(admin.error)}</p>` : ""}
      <div class="admin-filter-grid">
        <label class="admin-field">
          <span>Search by title</span>
          <input
            type="search"
            name="admin-search"
            value="${escapeAttr(admin.filters.search)}"
            data-action="admin-filter-change"
            data-field="search"
            placeholder="Search title or slug"
          />
        </label>
        ${SelectField({
          label: "Category",
          name: "admin-category-filter",
          value: admin.filters.category,
          action: "admin-filter-change",
          field: "category",
          options: [{ id: "all", label: "All categories" }, ...categories.map((category) => ({ id: category, label: category || "Uncategorized" }))]
        })}
        ${SelectField({
          label: "Status",
          name: "admin-status-filter",
          value: admin.filters.status,
          action: "admin-filter-change",
          field: "status",
          options: [
            { id: "all", label: "All statuses" },
            { id: "active", label: "Active" },
            { id: "inactive", label: "Inactive" }
          ]
        })}
        ${SelectField({
          label: "Featured",
          name: "admin-featured-filter",
          value: admin.filters.featured,
          action: "admin-filter-change",
          field: "featured",
          options: [
            { id: "all", label: "All games" },
            { id: "featured", label: "Featured" },
            { id: "regular", label: "Not featured" }
          ]
        })}
      </div>
      <div class="admin-game-list">
        ${
          games.length
            ? games.map((game, index) => GameRow({ game, index, total: games.length, busyId: admin.busyId })).join("")
            : `<div class="admin-state-card"><p>No games match these filters.</p></div>`
        }
      </div>
    </section>
  `;
}

function GameRow({ game, index, total, busyId }) {
  const busy = busyId === String(game.id);
  return `
    <article class="admin-game-row ${game.is_active ? "" : "is-muted"}">
      <div class="admin-game-row-main">
        <span class="admin-game-sort">${escapeHtml(game.sort_order ?? 0)}</span>
        <div>
          <h3>${escapeHtml(game.title || "Untitled game")}</h3>
          <p>${escapeHtml(game.slug || "no-slug")} · ${escapeHtml(game.category || "uncategorized")}</p>
        </div>
      </div>
      <div class="admin-game-badges">
        <span class="badge ${game.is_active ? "badge-primary" : "badge-dark"}">${game.is_active ? "Active" : "Inactive"}</span>
        ${game.is_featured ? `<span class="badge badge-dark">Featured</span>` : ""}
      </div>
      <div class="admin-row-actions">
        <button class="icon-button" type="button" data-action="admin-move-game" data-id="${escapeAttr(game.id)}" data-direction="up" aria-label="Move up" ${index === 0 || busy ? "disabled" : ""}>${icon("back", 16)}</button>
        <button class="icon-button" type="button" data-action="admin-move-game" data-id="${escapeAttr(game.id)}" data-direction="down" aria-label="Move down" ${index === total - 1 || busy ? "disabled" : ""}>${icon("arrow", 16)}</button>
        <button class="secondary-button admin-row-button" type="button" data-action="admin-toggle-active" data-id="${escapeAttr(game.id)}" ${busy ? "disabled" : ""}>
          ${game.is_active ? "Deactivate" : "Activate"}
        </button>
        <button class="secondary-button admin-row-button" type="button" data-action="admin-toggle-featured" data-id="${escapeAttr(game.id)}" ${busy ? "disabled" : ""}>
          ${game.is_featured ? "Unfeature" : "Feature"}
        </button>
        <button class="secondary-button admin-row-button" type="button" data-action="admin-edit-game" data-id="${escapeAttr(game.id)}">Edit</button>
        <button class="secondary-button admin-row-button" type="button" data-action="admin-duplicate-game" data-id="${escapeAttr(game.id)}" ${busy ? "disabled" : ""}>Duplicate</button>
        <button class="secondary-button admin-row-button is-danger" type="button" data-action="admin-delete-game" data-id="${escapeAttr(game.id)}" ${busy ? "disabled" : ""}>Delete</button>
      </div>
    </article>
  `;
}

function GameForm({ admin, categories }) {
  const form = admin.form || emptyGameForm();
  const errors = admin.formErrors || {};
  const preview = previewGameFromForm(form);

  return `
    <section class="admin-form-layout screen-section">
      <div class="admin-form-main">
        <div class="admin-card admin-form-card">
          <div class="admin-section-heading">
            <div>
              <p>${admin.editingId ? "Editing existing game" : "New game"}</p>
              <h2>Game details</h2>
            </div>
            <button class="secondary-button admin-small-action" type="button" data-action="admin-cancel-form">Cancel</button>
          </div>
          ${admin.saveStatus ? `<p class="admin-status-text">${escapeHtml(admin.saveStatus)}</p>` : ""}
          ${FormGrid([
            TextField({ label: "Title", name: "title", value: form.title, error: errors.title, required: true }),
            TextField({ label: "Subtitle", name: "subtitle", value: form.subtitle }),
            TextField({ label: "Slug", name: "slug", value: form.slug, error: errors.slug, required: true, actionButton: "Generate" }),
            SelectField({ label: "Category", name: "category", value: form.category, action: "admin-form-field", options: ADMIN_CATEGORY_OPTIONS, error: errors.category }),
            TextField({ label: "Short description", name: "short_description", value: form.short_description, wide: true }),
            TextArea({ label: "Full description", name: "description", value: form.description, wide: true, rows: 4 }),
            NumberField({ label: "Minimum players", name: "min_players", value: form.min_players, min: 1, error: errors.min_players }),
            NumberField({ label: "Maximum players", name: "max_players", value: form.max_players, min: 1, error: errors.max_players }),
            NumberField({ label: "Duration minutes", name: "duration_minutes", value: form.duration_minutes, min: 1 }),
            NumberField({ label: "Minimum age", name: "age_min", value: form.age_min, min: 0 }),
            SelectField({ label: "Difficulty", name: "difficulty", value: form.difficulty, action: "admin-form-field", options: ADMIN_DIFFICULTY_OPTIONS, error: errors.difficulty }),
            SelectField({ label: "Energy level", name: "energy_level", value: form.energy_level, action: "admin-form-field", options: ADMIN_ENERGY_LEVEL_OPTIONS, error: errors.energy_level }),
            NumberField({ label: "Sort order", name: "sort_order", value: form.sort_order }),
            ToggleField({ label: "Featured", name: "is_featured", checked: form.is_featured }),
            ToggleField({ label: "Active", name: "is_active", checked: form.is_active })
          ])}
        </div>

        <div class="admin-card admin-form-card">
          <div class="admin-section-heading">
            <div>
              <p>Media</p>
              <h2>Image</h2>
            </div>
          </div>
          ${FormGrid([
            TextField({ label: "Image URL", name: "image_url", value: form.image_url, wide: true }),
            TextField({ label: "Image alt text", name: "image_alt", value: form.image_alt, wide: true })
          ])}
          <div class="admin-upload-row">
            <label class="admin-field admin-file-field">
              <span>Upload to game-images bucket</span>
              <input type="file" name="admin-image-upload" accept="image/*" data-action="admin-image-file" />
            </label>
            <button class="secondary-button" type="button" data-action="admin-upload-image" ${admin.upload.file ? "" : "disabled"}>
              ${admin.upload.loading ? `<span class="admin-spinner"></span>` : icon("share", 16)}
              Upload
            </button>
          </div>
          <p class="admin-help-text">Images must be 2 MB or smaller. Storage policies must allow this authenticated admin upload.</p>
          ${admin.upload.error ? `<p class="admin-error-text">${escapeHtml(admin.upload.error)}</p>` : ""}
          ${admin.upload.status ? `<p class="admin-status-text">${escapeHtml(admin.upload.status)}</p>` : ""}
        </div>

        <div class="admin-card admin-form-card">
          <div class="admin-section-heading">
            <div>
              <p>Lists</p>
              <h2>Metadata</h2>
            </div>
          </div>
          ${ListBuilder({ label: "Equipment list", name: "equipment", items: form.equipment })}
          ${ListBuilder({ label: "Tags list", name: "tags", items: form.tags })}
          ${ListBuilder({ label: "Game type list", name: "game_type", items: form.game_type, suggestions: GAME_TYPES })}
        </div>

        <div class="admin-card admin-form-card">
          <div class="admin-section-heading">
            <div>
              <p>Gameplay</p>
              <h2>Instructions</h2>
            </div>
          </div>
          ${TextArea({ label: "Setup text", name: "setup", value: form.setup, rows: 4 })}
          ${StepBuilder(form.steps)}
          ${ListBuilder({ label: "Rules builder", name: "rules", items: form.rules, multiline: true })}
          ${ListBuilder({ label: "Tips builder", name: "tips", items: form.tips, multiline: true })}
          ${ListBuilder({ label: "Suitable for builder", name: "suitable_for", items: form.suitable_for, multiline: true })}
          ${ListBuilder({ label: "Not suitable for builder", name: "not_suitable_for", items: form.not_suitable_for, multiline: true })}
        </div>

        <div class="admin-card admin-form-card">
          <div class="admin-section-heading">
            <div>
              <p>Optional experienced-player reference</p>
              <h2>Quick guide</h2>
            </div>
          </div>
          ${TextArea({
            label: "Quick guide JSON",
            name: "quick_guide",
            value: quickGuideTextareaValue(form.quick_guide),
            rows: 10,
            wide: true,
            error: errors.quick_guide
          })}
          <p class="admin-help-text">Leave empty to save null. Use a JSON object with keys like summary, objective, quick_setup, flow, key_rules, scoring, special_cards_or_roles, edge_cases, common_mistakes, and agreement_before_play.</p>
        </div>
      </div>

      <aside class="admin-form-side">
        <div class="admin-card admin-preview-card">
          <div class="admin-section-heading">
            <div>
              <p>Preview</p>
              <h2>Card preview</h2>
            </div>
          </div>
          ${AdminPreviewCard(preview)}
        </div>
        <div class="admin-save-panel">
          <button class="primary-button" type="button" data-action="admin-save-game" ${admin.saving ? "disabled" : ""}>
            ${admin.saving ? `<span class="admin-spinner"></span>` : icon("check", 17)}
            ${admin.saving ? "Saving..." : "Save game"}
          </button>
          <button class="secondary-button" type="button" data-action="admin-cancel-form">Cancel</button>
        </div>
      </aside>
    </section>
  `;
}

function FormGrid(fields) {
  return `<div class="admin-form-grid">${fields.join("")}</div>`;
}

function ImportJsonModal(importer) {
  const form = importer.form;
  const formErrors = importer.formErrors || {};
  const hasForm = Boolean(form);
  const hasExistingGame = Boolean(importer.existingGame);
  const validationErrors = Object.entries(formErrors).map(([field, message]) => `${field}: ${message}`);

  return `
    <section class="admin-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="admin-import-title">
      <div class="admin-card admin-import-modal">
        <div class="admin-section-heading">
          <div>
            <p>Create a game from JSON</p>
            <h2 id="admin-import-title">Import JSON</h2>
          </div>
          <button class="icon-button" type="button" data-action="admin-close-import-json" aria-label="Close import JSON">${icon("x", 18)}</button>
        </div>

        <div class="admin-import-actions">
          <label class="admin-field admin-file-field">
            <span>Choose .json file</span>
            <input type="file" accept=".json,application/json" data-action="admin-import-json-file" />
          </label>
          <button class="secondary-button" type="button" data-action="admin-download-sample-json">${icon("share", 16)} Download sample JSON</button>
        </div>

        ${
          importer.fileName
            ? `<p class="admin-help-text">Selected file: ${escapeHtml(importer.fileName)}</p>`
            : `<p class="admin-help-text">Supported formats: a direct game object, or an object with <code>game</code> and optional <code>filters</code>.</p>`
        }
        <p class="admin-help-text">For best results, use the full sample JSON format. Minimal JSON is supported, but full JSON creates a complete game detail page.</p>
        ${importer.status ? `<p class="admin-status-text">${escapeHtml(importer.status)}</p>` : ""}
        ${importer.error ? `<p class="admin-error-text">${escapeHtml(importer.error)}</p>` : ""}
        ${
          hasExistingGame
            ? `<div class="admin-import-message"><span>A game with this slug already exists.</span><span>Existing game found. You can update it.</span></div>`
            : ""
        }
        ${validationErrors.length ? `<div class="admin-import-message is-error">${validationErrors.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
        ${
          importer.warnings?.length
            ? `<div class="admin-import-message">${importer.warnings.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`
            : ""
        }

        ${
          hasForm
            ? `
              <div class="admin-import-edit-grid">
                ${TextField({ label: "Title", name: "import-title", field: "title", value: form.title, error: formErrors.title, required: true, action: "admin-import-field" })}
                ${TextField({ label: "Slug", name: "import-slug", field: "slug", value: form.slug, error: formErrors.slug, required: true, action: "admin-import-field" })}
                ${SelectField({ label: "Category", name: "admin-import-category", value: form.category, action: "admin-import-field", field: "category", options: ADMIN_CATEGORY_OPTIONS, error: formErrors.category })}
                ${NumberField({ label: "Minimum players", name: "import-min-players", field: "min_players", value: form.min_players, min: 1, error: formErrors.min_players, action: "admin-import-field" })}
              </div>
              ${ImportPreview({ form, filters: importer.filters || [] })}
            `
            : `<div class="admin-state-card"><p>Choose a JSON file to preview the game before saving it.</p></div>`
        }

        ${ImportFooter({ hasForm, hasExistingGame, saving: importer.saving })}
      </div>
    </section>
  `;
}

function ImportFooter({ hasForm, hasExistingGame, saving }) {
  if (hasExistingGame) {
    return `
      <div class="admin-import-footer admin-import-footer-conflict">
        <button class="primary-button" type="button" data-action="admin-update-existing-import" ${hasForm && !saving ? "" : "disabled"}>
          ${saving ? `<span class="admin-spinner"></span>` : icon("check", 17)}
          ${saving ? "Updating..." : "Update existing game"}
        </button>
        <button class="secondary-button" type="button" data-action="admin-import-edit-slug-create" ${hasForm && !saving ? "" : "disabled"}>Edit slug and create new</button>
        <button class="secondary-button" type="button" data-action="admin-import-cancel-conflict" ${saving ? "disabled" : ""}>Cancel</button>
      </div>
    `;
  }

  return `
    <div class="admin-import-footer">
      <button class="secondary-button" type="button" data-action="admin-load-import-form" ${hasForm ? "" : "disabled"}>Load into full form</button>
      <button class="primary-button" type="button" data-action="admin-save-imported-game" ${hasForm && !saving ? "" : "disabled"}>
        ${saving ? `<span class="admin-spinner"></span>` : icon("check", 17)}
        ${saving ? "Saving..." : "Save imported game"}
      </button>
    </div>
  `;
}

function ImportPreview({ form, filters }) {
  const image = form.image_url
    ? `<img src="${escapeAttr(form.image_url)}" alt="${escapeAttr(form.image_alt || form.title)}" />`
    : `<div class="admin-preview-art">${icon("dice", 34)}</div>`;
  const filterCount = filters.reduce((total, filter) => total + filter.options.length, 0);
  const quickGuideItem = hasUsefulQuickGuide(form.quick_guide) ? PreviewItem("Quick guide", "available") : "";

  return `
    <section class="admin-import-preview">
      <div class="admin-preview-media">${image}</div>
      <div class="admin-import-preview-body">
        <div>
          <p>Preview</p>
          <h3>${escapeHtml(form.title || "Untitled game")}</h3>
          ${form.subtitle ? `<span>${escapeHtml(form.subtitle)}</span>` : ""}
          ${form.short_description ? `<small>${escapeHtml(form.short_description)}</small>` : ""}
        </div>
        <div class="admin-import-preview-grid">
          ${PreviewItem("Category", form.category || "Missing")}
          ${PreviewItem("Players", playerSummary(form))}
          ${PreviewItem("Duration", form.duration_minutes ? `${form.duration_minutes} min` : "Not set")}
          ${PreviewItem("Difficulty", form.difficulty || "Not set")}
          ${PreviewItem("Energy", form.energy_level || "Not set")}
          ${PreviewItem("Steps", form.steps.length)}
          ${PreviewItem("Rules", form.rules.length)}
          ${quickGuideItem}
          ${PreviewItem("Filters", filterCount)}
        </div>
      </div>
    </section>
  `;
}

function PreviewItem(label, value) {
  return `<span><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></span>`;
}

function playerSummary(form) {
  if (!form.min_players) return "Missing";
  return form.max_players ? `${form.min_players}-${form.max_players}` : `${form.min_players}+`;
}

function TextField({ label, name, value, error = "", required = false, wide = false, list = "", actionButton = "", action = "admin-form-field", field = name }) {
  return `
    <label class="admin-field ${wide ? "is-wide" : ""}">
      <span>${escapeHtml(label)}${required ? " *" : ""}</span>
      <div class="admin-input-with-action">
        <input
          type="text"
          name="admin-${escapeAttr(name)}"
          value="${escapeAttr(value)}"
          data-action="${escapeAttr(action)}"
          data-field="${escapeAttr(field)}"
          ${list ? `list="${escapeAttr(list)}"` : ""}
        />
        ${actionButton ? `<button type="button" data-action="admin-generate-slug">${escapeHtml(actionButton)}</button>` : ""}
      </div>
      ${error ? `<small class="admin-error-text">${escapeHtml(error)}</small>` : ""}
    </label>
  `;
}

function NumberField({ label, name, value, min = "", error = "", action = "admin-form-field", field = name }) {
  return `
    <label class="admin-field">
      <span>${escapeHtml(label)}</span>
      <input
        type="number"
        name="admin-${escapeAttr(name)}"
        value="${escapeAttr(value)}"
        ${min !== "" ? `min="${escapeAttr(min)}"` : ""}
        data-action="${escapeAttr(action)}"
        data-field="${escapeAttr(field)}"
      />
      ${error ? `<small class="admin-error-text">${escapeHtml(error)}</small>` : ""}
    </label>
  `;
}

function TextArea({ label, name, value, rows = 3, wide = false, error = "" }) {
  return `
    <label class="admin-field ${wide ? "is-wide" : ""}">
      <span>${escapeHtml(label)}</span>
      <textarea
        name="admin-${escapeAttr(name)}"
        rows="${escapeAttr(rows)}"
        data-action="admin-form-field"
        data-field="${escapeAttr(name)}"
      >${escapeHtml(value)}</textarea>
      ${error ? `<small class="admin-error-text">${escapeHtml(error)}</small>` : ""}
    </label>
  `;
}

function quickGuideTextareaValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function SelectField({ label, name, value, action, field = "", options, error = "" }) {
  return `
    <label class="admin-field">
      <span>${escapeHtml(label)}</span>
      <select name="${escapeAttr(name)}" data-action="${escapeAttr(action)}" data-field="${escapeAttr(field || name)}">
        ${options
          .map((option) => `<option value="${escapeAttr(option.id)}" ${value === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
          .join("")}
      </select>
      ${error ? `<small class="admin-error-text">${escapeHtml(error)}</small>` : ""}
    </label>
  `;
}

function ToggleField({ label, name, checked }) {
  return `
    <label class="admin-toggle-field">
      <span>${escapeHtml(label)}</span>
      <input
        type="checkbox"
        name="admin-${escapeAttr(name)}"
        ${checked ? "checked" : ""}
        data-action="admin-form-field"
        data-field="${escapeAttr(name)}"
      />
    </label>
  `;
}

function ListBuilder({ label, name, items, multiline = false, suggestions = [] }) {
  const listId = suggestions.length ? `admin-${name}-suggestions` : "";
  return `
    <section class="admin-builder">
      <div class="admin-builder-heading">
        <h3>${escapeHtml(label)}</h3>
        <button class="secondary-button admin-small-action" type="button" data-action="admin-list-add" data-list="${escapeAttr(name)}">${icon("plus", 15)} Add</button>
      </div>
      <div class="admin-builder-list">
        ${(items.length ? items : [""])
          .map((item, index) => {
            const input = multiline
              ? `<textarea name="admin-${escapeAttr(name)}-${index}" rows="2" data-action="admin-list-field" data-list="${escapeAttr(name)}" data-index="${index}">${escapeHtml(item)}</textarea>`
              : `<input name="admin-${escapeAttr(name)}-${index}" value="${escapeAttr(item)}" data-action="admin-list-field" data-list="${escapeAttr(name)}" data-index="${index}" ${listId ? `list="${escapeAttr(listId)}"` : ""} />`;
            return `
              <div class="admin-builder-row">
                ${input}
                <div class="admin-builder-actions">
                  <button class="icon-button" type="button" data-action="admin-list-move" data-list="${escapeAttr(name)}" data-index="${index}" data-direction="up" aria-label="Move item up" ${index === 0 ? "disabled" : ""}>${icon("back", 15)}</button>
                  <button class="icon-button" type="button" data-action="admin-list-move" data-list="${escapeAttr(name)}" data-index="${index}" data-direction="down" aria-label="Move item down" ${index === items.length - 1 ? "disabled" : ""}>${icon("arrow", 15)}</button>
                  <button class="icon-button" type="button" data-action="admin-list-remove" data-list="${escapeAttr(name)}" data-index="${index}" aria-label="Remove item">${icon("x", 15)}</button>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
      ${
        suggestions.length
          ? `<datalist id="${escapeAttr(listId)}">${suggestions.map((item) => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.label)}</option>`).join("")}</datalist>`
          : ""
      }
    </section>
  `;
}

function StepBuilder(steps) {
  return `
    <section class="admin-builder">
      <div class="admin-builder-heading">
        <h3>Steps builder</h3>
        <button class="secondary-button admin-small-action" type="button" data-action="admin-step-add">${icon("plus", 15)} Add</button>
      </div>
      <div class="admin-builder-list">
        ${(steps.length ? steps : [{ title: "", description: "" }])
          .map(
            (step, index) => `
            <div class="admin-step-row">
              <label class="admin-field">
                <span>Step title</span>
                <input name="admin-step-${index}-title" value="${escapeAttr(step.title)}" data-action="admin-step-field" data-index="${index}" data-field="title" />
              </label>
              <label class="admin-field">
                <span>Step description</span>
                <textarea name="admin-step-${index}-description" rows="3" data-action="admin-step-field" data-index="${index}" data-field="description">${escapeHtml(step.description)}</textarea>
              </label>
              <div class="admin-builder-actions">
                <button class="icon-button" type="button" data-action="admin-step-move" data-index="${index}" data-direction="up" aria-label="Move step up" ${index === 0 ? "disabled" : ""}>${icon("back", 15)}</button>
                <button class="icon-button" type="button" data-action="admin-step-move" data-index="${index}" data-direction="down" aria-label="Move step down" ${index === steps.length - 1 ? "disabled" : ""}>${icon("arrow", 15)}</button>
                <button class="icon-button" type="button" data-action="admin-step-remove" data-index="${index}" aria-label="Remove step">${icon("x", 15)}</button>
              </div>
            </div>
          `
          )
          .join("")}
      </div>
    </section>
  `;
}

function AdminPreviewCard(game) {
  const image = game.imageUrl
    ? `<img src="${escapeAttr(game.imageUrl)}" alt="${escapeAttr(game.imageAlt)}" />`
    : `<div class="admin-preview-art">${icon("dice", 34)}</div>`;
  return `
    <article class="admin-preview-game">
      <div class="admin-preview-media">${image}</div>
      <div class="admin-preview-body">
        <p>${escapeHtml(game.gameTypes[0] || "game")}</p>
        <h3>${escapeHtml(game.title)}</h3>
        <span>${escapeHtml(game.shortDescription)}</span>
      </div>
    </article>
  `;
}

function previewGameFromForm(form) {
  const safeForm = {
    ...form,
    id: "preview",
    slug: form.slug || "preview",
    title: form.title || "Game title",
    category: form.category || "no-equipment"
  };
  return normalizeGameRow({
    id: "preview",
    created_at: new Date().toISOString(),
    ...payloadFromForm(safeForm)
  });
}

function filterAdminGames(admin) {
  const search = admin.filters.search.trim().toLowerCase();
  return admin.games.filter((game) => {
    if (search && ![game.title, game.slug].join(" ").toLowerCase().includes(search)) return false;
    if (admin.filters.category !== "all" && game.category !== admin.filters.category) return false;
    if (admin.filters.status === "active" && !game.is_active) return false;
    if (admin.filters.status === "inactive" && game.is_active) return false;
    if (admin.filters.featured === "featured" && !game.is_featured) return false;
    if (admin.filters.featured === "regular" && game.is_featured) return false;
    return true;
  });
}

function adminCategories(games) {
  return games
    .map((game) => game.category)
    .filter(Boolean)
    .filter(unique)
    .sort((a, b) => a.localeCompare(b));
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "Uncategorized";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function logoutButton(admin) {
  return `
    <button class="secondary-button admin-small-action" type="button" data-action="admin-logout" ${admin.logoutLoading ? "disabled" : ""}>
      ${admin.logoutLoading ? `<span class="admin-spinner"></span>` : icon("x", 16)}
      Logout
    </button>
  `;
}

function unique(value, index, array) {
  return array.indexOf(value) === index;
}
