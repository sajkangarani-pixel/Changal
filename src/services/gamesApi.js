import { supabase } from "./supabaseClient.js?v=20260709-admin1";

const PUBLIC_GAME_CACHE_KEY = "changal.publicGames.v1";
export const IMAGE_MAX_SIZE_BYTES = 2 * 1024 * 1024;

export function getCachedPublicGames() {
  try {
    const raw = window.localStorage.getItem(PUBLIC_GAME_CACHE_KEY);
    if (!raw) return [];
    const cache = JSON.parse(raw);
    return Array.isArray(cache.games) ? cache.games : [];
  } catch {
    return [];
  }
}

export async function fetchPublicGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const games = normalizeGameRows(data || []).sort(sortPublicGames);
  cachePublicGames(games);
  return games;
}

export async function fetchAdminGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export function onAuthChanged(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function loginWithEmailPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.session;
}

export async function logoutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function checkAdminAccess(user) {
  if (!user) return { allowed: false, error: "" };

  const { data, error } = await supabase.from("admin_users").select("*").limit(200);

  if (error) {
    return { allowed: false, error: error.message };
  }

  const email = String(user.email || "").toLowerCase();
  const allowed = (data || []).some((row) => {
    const rowEmail = String(row.email || row.user_email || row.admin_email || "").toLowerCase();
    return (
      row.user_id === user.id ||
      row.uid === user.id ||
      row.auth_user_id === user.id ||
      row.user_uuid === user.id ||
      row.profile_id === user.id ||
      row.id === user.id ||
      (email && rowEmail === email)
    );
  });

  return { allowed, error: "" };
}

export async function isSlugUnique(slug, currentId = "") {
  const { data, error } = await supabase.from("games").select("id, slug").eq("slug", slug).limit(1);

  if (error) throw new Error(error.message);
  if (!data?.length) return true;
  return String(data[0].id) === String(currentId);
}

export async function saveGame(payload, id = "") {
  const query = id
    ? supabase.from("games").update(payload).eq("id", id).select("*").single()
    : supabase.from("games").insert(payload).select("*").single();

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteGame(id) {
  const { error } = await supabase.from("games").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateGameField(id, field, value) {
  const { data, error } = await supabase.from("games").update({ [field]: value }).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateGameSortOrder(updates) {
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from("games").update({ sort_order }).eq("id", id).then(({ error }) => {
        if (error) throw new Error(error.message);
      })
    )
  );
}

export async function uploadGameImage(file, slug) {
  if (!file) throw new Error("Choose an image file first.");
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
  if (file.size > IMAGE_MAX_SIZE_BYTES) throw new Error("Image must be 2 MB or smaller.");

  const safeName = `${Date.now()}-${slugify(slug || file.name) || "game-image"}`;
  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg";
  const path = `games/${safeName}.${extension}`;
  const { error } = await supabase.storage.from("game-images").upload(path, file, {
    contentType: file.type,
    upsert: false
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("game-images").getPublicUrl(path);
  return data.publicUrl;
}

export function emptyGameForm(nextSortOrder = 10) {
  return {
    id: "",
    slug: "",
    title: "",
    subtitle: "",
    short_description: "",
    description: "",
    image_url: "",
    image_alt: "",
    category: "",
    equipment: [""],
    tags: [""],
    min_players: "2",
    max_players: "",
    duration_minutes: "15",
    difficulty: "easy",
    energy_level: "light",
    game_type: [""],
    age_min: "8",
    is_featured: false,
    is_active: true,
    sort_order: String(nextSortOrder),
    setup: "",
    steps: [{ title: "", description: "" }],
    rules: [""],
    tips: [""],
    suitable_for: [""],
    not_suitable_for: [""]
  };
}

export function formFromGameRow(row = {}) {
  return {
    ...emptyGameForm(Number(row.sort_order ?? 10)),
    id: row.id || "",
    slug: row.slug || "",
    title: row.title || "",
    subtitle: row.subtitle || "",
    short_description: row.short_description || "",
    description: row.description || "",
    image_url: row.image_url || "",
    image_alt: row.image_alt || "",
    category: row.category || "",
    equipment: listForForm(row.equipment),
    tags: listForForm(row.tags),
    min_players: stringNumber(row.min_players, "2"),
    max_players: stringNumber(row.max_players, ""),
    duration_minutes: stringNumber(row.duration_minutes, "15"),
    difficulty: row.difficulty || "easy",
    energy_level: row.energy_level || "light",
    game_type: listForForm(row.game_type),
    age_min: stringNumber(row.age_min, "8"),
    is_featured: Boolean(row.is_featured),
    is_active: row.is_active !== false,
    sort_order: stringNumber(row.sort_order, "10"),
    setup: setupForForm(row.setup),
    steps: stepsForForm(row.steps),
    rules: listForForm(row.rules),
    tips: listForForm(row.tips),
    suitable_for: listForForm(row.suitable_for),
    not_suitable_for: listForForm(row.not_suitable_for)
  };
}

export function payloadFromForm(form) {
  return {
    slug: form.slug.trim(),
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || null,
    short_description: form.short_description.trim() || null,
    description: form.description.trim() || null,
    image_url: form.image_url.trim() || null,
    image_alt: form.image_alt.trim() || null,
    category: form.category.trim(),
    equipment: cleanStringList(form.equipment),
    tags: cleanStringList(form.tags),
    min_players: toNumber(form.min_players, 1),
    max_players: form.max_players === "" ? null : toNumber(form.max_players, null),
    duration_minutes: toNumber(form.duration_minutes, 15),
    difficulty: form.difficulty || "easy",
    energy_level: form.energy_level || "light",
    game_type: cleanStringList(form.game_type),
    age_min: toNumber(form.age_min, 0),
    is_featured: Boolean(form.is_featured),
    is_active: Boolean(form.is_active),
    sort_order: toNumber(form.sort_order, 0),
    setup: form.setup.trim() || null,
    steps: cleanSteps(form.steps),
    rules: cleanStringList(form.rules),
    tips: cleanStringList(form.tips),
    suitable_for: cleanStringList(form.suitable_for),
    not_suitable_for: cleanStringList(form.not_suitable_for)
  };
}

export function validateGameForm(form) {
  const errors = {};
  const minPlayers = toNumber(form.min_players, 0);
  const maxPlayers = form.max_players === "" ? null : toNumber(form.max_players, 0);

  if (!form.title.trim()) errors.title = "Title is required.";
  if (!form.slug.trim()) errors.slug = "Slug is required.";
  if (!form.category.trim()) errors.category = "Category is required.";
  if (minPlayers < 1) errors.min_players = "Minimum players must be at least 1.";
  if (maxPlayers !== null && maxPlayers < minPlayers) {
    errors.max_players = "Maximum players must be empty or greater than minimum players.";
  }

  return errors;
}

export function normalizeGameRows(rows = []) {
  return rows.map(normalizeGameRow);
}

export function normalizeGameRow(row = {}) {
  const title = row.title || "Untitled game";
  const equipment = normalizeEquipment(row.equipment, row.category);
  const gameTypes = normalizeStringArray(row.game_type).length ? normalizeStringArray(row.game_type) : inferGameTypes(row.category);
  const requirementCategory = normalizeRequirementCategory(row.category, equipment, gameTypes);
  const duration = toNumber(row.duration_minutes, 15);
  const ageMin = toNumber(row.age_min, 0);
  const sortOrder = toNumber(row.sort_order, 0);
  const steps = normalizeSteps(row.steps);
  const setup = normalizeInstructionList(row.setup);

  return {
    id: String(row.id),
    slug: row.slug || slugify(title),
    title,
    subtitle: row.subtitle || "",
    shortDescription: row.short_description || row.subtitle || row.description || "A group game ready to play.",
    description: row.description || row.short_description || row.subtitle || "Gather the group and follow the steps to play.",
    imageUrl: row.image_url || "",
    imageAlt: row.image_alt || `${title} cover`,
    category: row.category || requirementCategory,
    coverImage: row.slug || slugify(title),
    artwork: artworkFromRow(row, sortOrder),
    featured: Boolean(row.is_featured),
    trending: Boolean(row.is_featured),
    isActive: row.is_active !== false,
    requirementCategory,
    equipment,
    gameTypes,
    tags: normalizeStringArray(row.tags),
    skills: normalizeStringArray(row.tags),
    playerMin: Math.max(1, toNumber(row.min_players, 1)),
    playerMax: row.max_players ? toNumber(row.max_players, null) : null,
    durationMin: duration,
    durationMax: duration,
    ageMin,
    ageGroups: ageGroupsFromMinimum(ageMin),
    difficulty: row.difficulty || "easy",
    activityLevel: row.energy_level || "light",
    environments: environmentsFromCategory(requirementCategory),
    playStyles: playStylesFromTypes(gameTypes),
    setupInstructions: setup.length ? setup : ["Gather players and review the rules."],
    playInstructions: steps.length ? steps.map(formatStepForPublic) : ["Follow the rules and play through each round."],
    rules: normalizeStringArray(row.rules),
    winCondition: "",
    tips: normalizeStringArray(row.tips),
    suitableFor: normalizeStringArray(row.suitable_for),
    notSuitableFor: normalizeStringArray(row.not_suitable_for),
    variations: [],
    relatedGameIds: [],
    popularityScore: row.is_featured ? 95 : Math.max(20, 90 - sortOrder),
    sortOrder,
    addedAt: row.created_at || row.updated_at || "1970-01-01",
    updatedAt: row.updated_at || ""
  };
}

export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function nextSortOrder(rows = []) {
  const max = rows.reduce((highest, row) => Math.max(highest, toNumber(row.sort_order, 0)), 0);
  return max + 10;
}

export function duplicatePayload(row, existingRows = []) {
  const form = formFromGameRow(row);
  const baseSlug = slugify(`${form.slug || form.title}-copy`);
  const existingSlugs = new Set(existingRows.map((item) => item.slug));
  let slug = baseSlug || "game-copy";
  let index = 2;

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  form.id = "";
  form.slug = slug;
  form.title = `${form.title} Copy`;
  form.is_active = false;
  form.sort_order = String(nextSortOrder(existingRows));
  return payloadFromForm(form);
}

function cachePublicGames(games) {
  try {
    window.localStorage.setItem(
      PUBLIC_GAME_CACHE_KEY,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        games
      })
    );
  } catch {
    // localStorage can be unavailable in private contexts; the live response is still usable.
  }
}

function sortPublicGames(a, b) {
  return a.sortOrder - b.sortOrder || new Date(b.addedAt) - new Date(a.addedAt);
}

function normalizeEquipment(value, category = "") {
  const items = Array.isArray(value) ? value : normalizeStringArray(value);
  const normalized = items
    .map((item) => {
      if (item && typeof item === "object") {
        const name = item.name || item.label || item.title || "";
        return name
          ? {
              id: item.id || slugify(name) || "custom-equipment",
              name,
              quantity: item.quantity || "",
              optional: Boolean(item.optional)
            }
          : null;
      }

      const name = String(item || "").trim();
      return name
        ? {
            id: slugify(name) || "custom-equipment",
            name
          }
        : null;
    })
    .filter(Boolean);

  if (normalized.length) return normalized;

  if (category === "online") return [{ id: "internet", name: "Internet connection" }];
  return [{ id: "no-equipment", name: "No equipment needed" }];
}

function normalizeRequirementCategory(category, equipment, gameTypes) {
  if (["no-equipment", "simple-equipment", "online"].includes(category)) return category;
  const haystack = [category, ...equipment.map((item) => item.id), ...equipment.map((item) => item.name), ...gameTypes]
    .join(" ")
    .toLowerCase();

  if (haystack.includes("online") || haystack.includes("internet") || haystack.includes("remote")) return "online";
  if (haystack.includes("no-equipment") || haystack.includes("no equipment")) return "no-equipment";
  return equipment.some((item) => item.id !== "no-equipment") ? "simple-equipment" : "no-equipment";
}

function normalizeStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object") return item.name || item.label || item.title || item.value || "";
        return String(item || "");
      })
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const parsed = parseJson(value);
    if (parsed) return normalizeStringArray(parsed);
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeSteps(value) {
  const parsed = typeof value === "string" ? parseJson(value) : value;
  const source = Array.isArray(parsed) ? parsed : normalizeStringArray(value);

  return source
    .map((step) => {
      if (step && typeof step === "object") {
        return {
          title: String(step.title || "").trim(),
          description: String(step.description || step.body || step.text || "").trim()
        };
      }
      return { title: "", description: String(step || "").trim() };
    })
    .filter((step) => step.title || step.description);
}

function normalizeInstructionList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeStringArray(value);
  const parsed = parseJson(value);
  if (parsed) return normalizeStringArray(parsed);
  return String(value)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function setupForForm(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return normalizeInstructionList(value).join("\n");
}

function stepsForForm(value) {
  const steps = normalizeSteps(value);
  return steps.length ? steps : [{ title: "", description: "" }];
}

function listForForm(value) {
  const items = normalizeStringArray(value);
  return items.length ? items : [""];
}

function cleanStringList(value) {
  return normalizeStringArray(value);
}

function cleanSteps(value = []) {
  return normalizeSteps(value);
}

function stringNumber(value, fallback) {
  return value === null || value === undefined ? fallback : String(value);
}

function toNumber(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseJson(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function formatStepForPublic(step, index) {
  if (step.title && step.description) return `${step.title}: ${step.description}`;
  return step.title || step.description || `Step ${index + 1}`;
}

function ageGroupsFromMinimum(ageMin) {
  if (ageMin <= 0) return ["all-ages"];
  if (ageMin <= 7) return ["kids", "family", "all-ages"];
  if (ageMin <= 12) return ["kids", "teenagers", "family"];
  if (ageMin <= 17) return ["teenagers", "adults"];
  return ["adults"];
}

function environmentsFromCategory(category) {
  if (category === "online") return ["remote-online", "indoor"];
  return ["indoor", "outdoor", "either", "small-space"];
}

function inferGameTypes(category) {
  if (category === "online") return ["brain"];
  if (category === "no-equipment") return ["social"];
  return ["creative"];
}

function playStylesFromTypes(gameTypes = []) {
  const styles = new Set(["turn-based"]);
  if (gameTypes.includes("physical")) styles.add("real-time");
  if (gameTypes.includes("social") || gameTypes.includes("social-deduction")) styles.add("team-based");
  if (gameTypes.includes("strategy")) styles.add("competitive");
  return [...styles];
}

function artworkFromRow(row, sortOrder) {
  const palettes = [
    ["#d0ff4f", "#67442f", "#171916"],
    ["#ffc95b", "#758d3f", "#10120f"],
    ["#a5a99f", "#232521", "#67442f"],
    ["#7fd1ae", "#59663a", "#0a0b09"]
  ];
  const motifs = ["dice", "cards", "spark", "grid", "pencil", "question", "trophy"];
  const seed = Math.abs((row.slug || row.title || "").length + sortOrder) % palettes.length;
  const [a, b, c] = palettes[seed];
  return {
    a,
    b,
    c,
    motif: motifs[Math.abs(sortOrder) % motifs.length]
  };
}
