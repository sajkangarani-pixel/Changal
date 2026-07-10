import { SUPABASE_URL, supabase } from "./supabaseClient.js?v=20260710-hokm-online2";

const PUBLIC_GAME_CACHE_KEY = "changal.publicGames.v1";
export const IMAGE_MAX_SIZE_BYTES = 2 * 1024 * 1024;

export const ADMIN_CATEGORY_OPTIONS = [
  { id: "", label: "Choose category" },
  { id: "no-equipment", label: "No equipment" },
  { id: "needs-equipment", label: "Needs equipment" },
  { id: "online", label: "Online" }
];

export const ADMIN_DIFFICULTY_OPTIONS = [
  { id: "", label: "Not selected" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" }
];

export const ADMIN_ENERGY_LEVEL_OPTIONS = [
  { id: "", label: "Not selected" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" }
];

export const GAME_IMPORT_SAMPLE = {
  game: {
    slug: "esm-famil",
    title: "اسم فامیل",
    subtitle: "یک بازی نوستالژیک و سریع برای جمع‌های دوستانه",
    short_description: "با یک حرف شروع کنید و برای هر دسته سریع‌تر از بقیه جواب پیدا کنید.",
    description:
      "اسم فامیل یک بازی گروهی، ساده و فکری است که بازیکنان در آن باید با یک حرف مشخص برای چند دسته مختلف کلمه پیدا کنند. بازی هم برای جمع‌های خانوادگی مناسب است و هم برای دورهمی‌های دوستانه.",
    image_url: null,
    image_alt: "بازی اسم فامیل",
    category: "needs-equipment",
    equipment: ["کاغذ", "خودکار"],
    tags: ["فکری", "دورهمی", "نوستالژیک"],
    min_players: 2,
    max_players: null,
    duration_minutes: 20,
    difficulty: "easy",
    energy_level: "low",
    game_type: ["thinking", "party"],
    age_min: 8,
    is_featured: false,
    is_active: true,
    sort_order: 0,
    setup:
      "برای هر بازیکن یک کاغذ و خودکار آماده کنید. دسته‌های بازی را مشخص کنید و مطمئن شوید همه بازیکنان جدول مشابهی روی کاغذ دارند.",
    steps: [
      {
        title: "دسته‌ها را مشخص کنید",
        description:
          "چند دسته مثل اسم، فامیل، شهر، کشور، غذا، حیوان یا شغل را انتخاب کنید و همه بازیکنان آن‌ها را روی کاغذ بنویسند."
      },
      {
        title: "یک حرف انتخاب کنید",
        description: "یک حرف به صورت تصادفی انتخاب کنید. همه جواب‌ها باید با همان حرف شروع شوند."
      },
      {
        title: "شروع به نوشتن کنید",
        description: "همه بازیکنان هم‌زمان شروع می‌کنند و تلاش می‌کنند برای هر دسته یک جواب معتبر بنویسند."
      },
      {
        title: "دور را متوقف کنید",
        description:
          "وقتی اولین نفر همه خانه‌ها را پر کرد، می‌تواند اعلام پایان کند. بقیه بازیکنان باید نوشتن را متوقف کنند."
      },
      {
        title: "امتیازها را حساب کنید",
        description:
          "جواب‌های هر دسته را با هم مقایسه کنید. جواب‌های درست و غیرتکراری امتیاز کامل می‌گیرند و جواب‌های تکراری امتیاز کمتر."
      }
    ],
    rules: [
      "هر جواب باید با حرف انتخاب‌شده شروع شود.",
      "جواب باید با دسته مربوطه هم‌خوانی داشته باشد.",
      "اگر دو یا چند نفر جواب یکسان نوشته باشند، امتیاز آن جواب کمتر می‌شود.",
      "جواب نامعتبر یا بی‌ربط امتیاز نمی‌گیرد.",
      "بازیکنان قبل از شروع بازی باید روی سیستم امتیازدهی توافق کنند."
    ],
    tips: [
      "برای بازی سریع‌تر، تعداد دسته‌ها را کمتر کنید.",
      "برای بازی سخت‌تر، دسته‌های خاص‌تر مثل برند، فیلم، شخصیت کارتونی یا چیزهای خنده‌دار اضافه کنید.",
      "اگر جمع کودکانه است، دسته‌ها را ساده‌تر انتخاب کنید."
    ],
    suitable_for: [
      "دورهمی‌های خانوادگی",
      "جمع‌های دوستانه",
      "مهمانی‌های خانگی",
      "زمان‌هایی که وسیله زیادی در دسترس نیست"
    ],
    not_suitable_for: [
      "جمع‌هایی که حوصله بازی فکری ندارند",
      "موقعیت‌هایی که کاغذ و خودکار در دسترس نیست",
      "جمع‌های خیلی شلوغ بدون مدیریت زمان"
    ],
    quick_guide: {
      summary: "یک حرف انتخاب می‌شود و همه باید برای چند دسته، جواب‌هایی پیدا کنند که با همان حرف شروع شوند.",
      objective: "در هر دور، با جواب‌های درست، خاص و غیرتکراری امتیاز بیشتری بگیرید.",
      quick_setup: "کاغذ و خودکار بدهید، دسته‌ها را بنویسید، یک حرف و یک زمان محدود انتخاب کنید.",
      flow: [
        "حرف دور را اعلام کنید.",
        "همه هم‌زمان برای هر دسته جواب می‌نویسند.",
        "اولین نفر که جدول را کامل کرد پایان دور را اعلام می‌کند.",
        "جواب‌ها خوانده و امتیازها ثبت می‌شوند."
      ],
      key_rules: [
        "جواب باید با حرف انتخاب‌شده شروع شود.",
        "جواب باید با دسته هم‌خوانی داشته باشد.",
        "جواب تکراری امتیاز کمتری می‌گیرد."
      ],
      scoring: [
        "جواب درست و غیرتکراری: امتیاز کامل.",
        "جواب درست اما تکراری: امتیاز کمتر.",
        "جواب نامعتبر یا خالی: بدون امتیاز."
      ],
      special_cards_or_roles: [],
      edge_cases: [
        "قبل از بازی مشخص کنید اسم‌های خارجی، برندها یا جواب‌های عامیانه قابل قبول هستند یا نه.",
        "اگر روی درستی جواب اختلاف شد، رأی جمع تصمیم نهایی است."
      ],
      common_mistakes: [
        "دسته‌ها را بیش از حد زیاد نکنید.",
        "قبل از شروع، روش امتیازدهی را مبهم نگذارید."
      ],
      agreement_before_play: [
        "مدت هر دور",
        "دسته‌های مجاز",
        "سیستم امتیازدهی",
        "قانون جواب‌های تکراری یا بحث‌برانگیز"
      ]
    }
  },
  filters: [
    {
      group: "نوع بازی",
      options: ["فکری", "دورهمی"]
    },
    {
      group: "وسایل لازم",
      options: ["کاغذ و خودکار"]
    },
    {
      group: "فضا",
      options: ["خانه", "مهمانی"]
    },
    {
      group: "سطح انرژی",
      options: ["کم‌تحرک"]
    }
  ]
};

const ALLOWED_CATEGORIES = new Set(["needs-equipment", "no-equipment", "online"]);
const ALLOWED_DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const ALLOWED_ENERGY_LEVELS = new Set(["low", "medium", "high"]);
const IMPORT_KEY_ALIASES = {
  shortDescription: "short_description",
  imageUrl: "image_url",
  imageAlt: "image_alt",
  minPlayers: "min_players",
  maxPlayers: "max_players",
  durationMinutes: "duration_minutes",
  energyLevel: "energy_level",
  gameType: "game_type",
  gameTypes: "game_type",
  ageMin: "age_min",
  isFeatured: "is_featured",
  isActive: "is_active",
  sortOrder: "sort_order",
  suitableFor: "suitable_for",
  notSuitableFor: "not_suitable_for",
  quickGuide: "quick_guide"
};
const QUICK_GUIDE_FIELDS = [
  "summary",
  "objective",
  "quick_setup",
  "flow",
  "key_rules",
  "scoring",
  "special_cards_or_roles",
  "edge_cases",
  "common_mistakes",
  "agreement_before_play"
];

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

  const games = (data || []).map(fromSupabaseGame).sort(sortPublicGames);
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

export async function fetchGameBySlug(slug) {
  const normalizedSlug = slugify(slug);
  if (!normalizedSlug) return null;

  const { data, error } = await supabase.from("games").select("*").eq("slug", normalizedSlug).limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

export async function saveGame(payload, id = "") {
  const safePayload = normalizeGamePayload(payload);

  const query = id
    ? supabase.from("games").update(safePayload).eq("id", id).select("*").single()
    : supabase.from("games").insert(safePayload).select("*").single();

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function assignImportedFiltersToGame(gameId, importedFilters = []) {
  const filters = normalizeImportedFilters(importedFilters);
  if (!gameId || !filters.length) {
    return { assigned: 0, missing: [], error: "" };
  }

  try {
    const { data: groups, error: groupsError } = await supabase.from("filter_groups").select("*").limit(500);
    if (groupsError) throw new Error(groupsError.message);

    const { data: options, error: optionsError } = await supabase.from("filter_options").select("*").limit(2000);
    if (optionsError) throw new Error(optionsError.message);

    const matchedOptionIds = [];
    const missing = [];

    filters.forEach((filter) => {
      const group = findMatchingFilterGroup(groups || [], filter.group);
      if (!group) {
        missing.push(filter);
        return;
      }

      const missingOptions = [];
      filter.options.forEach((optionLabel) => {
        const option = findMatchingFilterOption(options || [], group, optionLabel);
        if (option?.id) {
          matchedOptionIds.push(option.id);
        } else {
          missingOptions.push(optionLabel);
        }
      });

      if (missingOptions.length) {
        missing.push({ group: filter.group, options: missingOptions });
      }
    });

    const uniqueOptionIds = [...new Set(matchedOptionIds.map(String))];
    if (!uniqueOptionIds.length) {
      return { assigned: 0, missing, error: "" };
    }

    const rows = uniqueOptionIds.map((filterOptionId) => ({
      game_id: gameId,
      filter_option_id: filterOptionId
    }));
    const { error: insertError } = await supabase.from("game_filter_options").insert(rows);
    if (insertError) throw new Error(insertError.message);

    return { assigned: rows.length, missing, error: "" };
  } catch (error) {
    return {
      assigned: 0,
      missing: filters,
      error: error.message || "Filter assignment failed."
    };
  }
}

export async function deleteGame(id) {
  const { error } = await supabase.from("games").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateGameField(id, field, value) {
  const allowedFields = new Set(["is_active", "is_featured", "sort_order"]);
  if (!allowedFields.has(field)) throw new Error("Unsupported game update field.");

  const { error } = await supabase.from("games").update({ [field]: value }).eq("id", id);
  if (error) throw new Error(error.message);
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
    difficulty: "",
    energy_level: "",
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
    not_suitable_for: [""],
    quick_guide: null
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
    category: normalizeCategoryForDatabase(row.category) || "",
    equipment: listForForm(row.equipment),
    tags: listForForm(row.tags),
    min_players: stringNumber(row.min_players, "2"),
    max_players: stringNumber(row.max_players, ""),
    duration_minutes: stringNumber(row.duration_minutes, "15"),
    difficulty: normalizeDifficultyForDatabase(row.difficulty) || "",
    energy_level: normalizeEnergyLevelForDatabase(row.energy_level) || "",
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
    not_suitable_for: listForForm(row.not_suitable_for),
    quick_guide: normalizeQuickGuide(row.quick_guide)
  };
}

export function payloadFromForm(form) {
  return toSupabaseGamePayload(form);
}

export function sampleGameImportJson() {
  return `${JSON.stringify(GAME_IMPORT_SAMPLE, null, 2)}\n`;
}

export function createGameImportDraft(source) {
  const root = unwrapImportSource(source);
  if (!root.game) {
    return {
      form: null,
      filters: [],
      warnings: [],
      error: "JSON must be a game object or an object with a game key."
    };
  }

  const normalized = normalizeImportedGameKeys(root.game);
  const fieldsPresent = Object.keys(normalized);
  const title = stringForImportForm(normalized.title);
  const importedImageUrl = stringForImportForm(normalized.image_url);
  const warnings = [];
  if (/^data:/i.test(importedImageUrl)) {
    warnings.push("Base64/data image_url is not supported. Upload the image separately, then paste its public URL.");
  }

  const form = {
    ...emptyGameForm(0),
    id: "",
    slug: stringForImportForm(normalized.slug) || slugify(title),
    title,
    subtitle: stringForImportForm(normalized.subtitle),
    short_description: stringForImportForm(normalized.short_description),
    description: stringForImportForm(normalized.description),
    image_url: /^data:/i.test(importedImageUrl) ? "" : importedImageUrl,
    image_alt: stringForImportForm(normalized.image_alt),
    category: normalizeCategoryForDatabase(normalized.category) || stringForImportForm(normalized.category),
    equipment: normalizeStringArray(normalized.equipment),
    tags: normalizeStringArray(normalized.tags),
    min_players: numberStringForImportForm(normalized.min_players),
    max_players: numberStringForImportForm(normalized.max_players),
    duration_minutes: numberStringForImportForm(normalized.duration_minutes),
    difficulty: normalizeDifficultyForDatabase(normalized.difficulty) || stringForImportForm(normalized.difficulty),
    energy_level: normalizeEnergyLevelForDatabase(normalized.energy_level) || stringForImportForm(normalized.energy_level),
    game_type: normalizeStringArray(normalized.game_type),
    age_min: numberStringForImportForm(normalized.age_min),
    is_featured: booleanForImportForm(normalized.is_featured, false),
    is_active: booleanForImportForm(normalized.is_active, true),
    sort_order: numberStringForImportForm(normalized.sort_order, "0"),
    setup: stringForImportForm(normalized.setup),
    steps: normalizeSteps(normalized.steps),
    rules: normalizeStringArray(normalized.rules),
    tips: normalizeStringArray(normalized.tips),
    suitable_for: normalizeStringArray(normalized.suitable_for),
    not_suitable_for: normalizeStringArray(normalized.not_suitable_for),
    quick_guide: normalizeQuickGuide(normalized.quick_guide)
  };
  if (!hasUsefulQuickGuide(form.quick_guide)) form.quick_guide = null;
  const filters = normalizeImportedFilters(root.filters);
  if (filters.length) {
    warnings.push("Filter assignments will be matched after saving. Missing groups or options will be skipped.");
  }

  return { form, filters, warnings, fieldsPresent, error: "" };
}

export function toSupabaseGamePayload(form) {
  return normalizeGamePayload({
    slug: form.slug.trim(),
    title: form.title.trim(),
    subtitle: form.subtitle,
    short_description: form.short_description,
    description: form.description,
    image_url: form.image_url,
    image_alt: form.image_alt,
    category: form.category,
    equipment: cleanStringList(form.equipment),
    tags: cleanStringList(form.tags),
    min_players: form.min_players,
    max_players: form.max_players,
    duration_minutes: form.duration_minutes,
    difficulty: form.difficulty,
    energy_level: form.energy_level,
    game_type: cleanStringList(form.game_type),
    age_min: form.age_min,
    is_featured: Boolean(form.is_featured),
    is_active: Boolean(form.is_active),
    sort_order: form.sort_order,
    setup: form.setup,
    steps: cleanSteps(form.steps),
    rules: cleanStringList(form.rules),
    tips: cleanStringList(form.tips),
    suitable_for: cleanStringList(form.suitable_for),
    not_suitable_for: cleanStringList(form.not_suitable_for),
    quick_guide: normalizeQuickGuide(form.quick_guide)
  });
}

export function validateGameForm(form) {
  const errors = {};
  const minPlayers = toNumber(form.min_players, 0);
  const maxPlayers = form.max_players === "" ? null : toNumber(form.max_players, 0);
  const category = normalizeCategoryForDatabase(form.category);
  const difficulty = normalizeDifficultyForDatabase(form.difficulty);
  const energyLevel = normalizeEnergyLevelForDatabase(form.energy_level);

  if (!form.title.trim()) errors.title = "Title is required.";
  if (!form.slug.trim()) errors.slug = "Slug is required.";
  if (!category) errors.category = "Choose no-equipment, needs-equipment, or online.";
  if (form.difficulty && !difficulty) errors.difficulty = "Choose easy, medium, hard, or leave it empty.";
  if (form.energy_level && !energyLevel) errors.energy_level = "Choose low, medium, high, or leave it empty.";
  if (!quickGuideInputIsValid(form.quick_guide)) {
    errors.quick_guide = "Quick guide must be empty or a valid JSON object.";
  }
  if (minPlayers < 1) errors.min_players = "Minimum players must be at least 1.";
  if (maxPlayers !== null && maxPlayers < minPlayers) {
    errors.max_players = "Maximum players must be empty or greater than minimum players.";
  }

  return errors;
}

export function normalizeGameRows(rows = []) {
  return rows.map(fromSupabaseGame);
}

export function fromSupabaseGame(row = {}) {
  const title = row.title || "Untitled game";
  const equipment = normalizeEquipment(row.equipment, row.category);
  const gameTypes = normalizeStringArray(row.game_type).length ? normalizeStringArray(row.game_type) : inferGameTypes(row.category);
  const requirementCategory = normalizeRequirementCategory(row.category, equipment, gameTypes);
  const duration = toNumber(row.duration_minutes, 15);
  const ageMin = toNumber(row.age_min, 0);
  const sortOrder = toNumber(row.sort_order, 0);
  const steps = normalizeSteps(row.steps);
  const setup = normalizeInstructionList(row.setup);
  const slug = normalizeGameSlug(row, title);

  return {
    id: String(row.id),
    slug,
    title,
    subtitle: row.subtitle || "",
    shortDescription: row.short_description || row.subtitle || row.description || "A group game ready to play.",
    description: row.description || row.short_description || row.subtitle || "Gather the group and follow the steps to play.",
    imageUrl: normalizeImageUrl(row.image_url),
    imageAlt: row.image_alt || `${title} cover`,
    category: row.category || requirementCategory,
    coverImage: slug,
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
    difficulty: difficultyForPublic(row.difficulty),
    activityLevel: activityLevelFromEnergyLevel(row.energy_level),
    environments: environmentsFromCategory(requirementCategory),
    playStyles: playStylesFromTypes(gameTypes),
    setupInstructions: setup.length ? setup : ["Gather players and review the rules."],
    playInstructions: steps.length ? steps.map(formatStepForPublic) : ["Follow the rules and play through each round."],
    rules: normalizeStringArray(row.rules),
    winCondition: "",
    tips: normalizeStringArray(row.tips),
    quickGuide: normalizeQuickGuide(row.quick_guide),
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

export const normalizeGameRow = fromSupabaseGame;

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

export function normalizeGameSlug(row = {}, title = "") {
  const slug = String(row.slug || "").trim();
  if (slug) return slugify(slug) || slug;
  return slugify(title) || String(row.id || "").trim();
}

export function normalizeImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const googleDriveImageUrl = normalizeGoogleDriveImageUrl(raw);
  if (googleDriveImageUrl) return googleDriveImageUrl;

  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (/^(\.?\.?\/|\/)/.test(raw)) return raw;
  if (/^(src|assets|images)\//i.test(raw)) return raw;

  const storagePath = raw.replace(/^game-images\//, "").replace(/^\/+/, "");
  return `${SUPABASE_URL}/storage/v1/object/public/game-images/${encodeStoragePath(storagePath)}`;
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

export function normalizeGamePayload(payload = {}) {
  const minPlayers = Math.max(1, toNumber(payload.min_players, 1));
  const rawMaxPlayers = nullableNumber(payload.max_players);
  const maxPlayers = rawMaxPlayers === null || rawMaxPlayers >= minPlayers ? rawMaxPlayers : null;
  const { quick_guide: rawQuickGuide, quickGuide: rawQuickGuideCamel, ...restPayload } = payload;
  const quickGuide = normalizeQuickGuide(rawQuickGuide ?? rawQuickGuideCamel);

  const normalized = {
    ...restPayload,
    slug: requiredString(payload.slug),
    title: requiredString(payload.title),
    subtitle: nullableString(payload.subtitle),
    short_description: nullableString(payload.short_description),
    description: nullableString(payload.description),
    image_url: nullableString(payload.image_url),
    image_alt: nullableString(payload.image_alt),
    category: normalizeCategoryForDatabase(payload.category),
    min_players: minPlayers,
    max_players: maxPlayers,
    duration_minutes: nullableNumber(payload.duration_minutes),
    difficulty: normalizeDifficultyForDatabase(payload.difficulty),
    energy_level: normalizeEnergyLevelForDatabase(payload.energy_level),
    age_min: nullableNumber(payload.age_min),
    sort_order: nullableNumber(payload.sort_order),
    setup: nullableString(payload.setup)
  };

  normalized.quick_guide = hasUsefulQuickGuide(quickGuide) ? quickGuide : null;

  return normalized;
}

export function normalizeImportedFilters(value = []) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const group = String(item.group || item.key || item.label || item.name || item.title || "").trim();
      const optionsSource = Array.isArray(item.options)
        ? item.options
        : [item.option || item.value || item.label_value].filter(Boolean);
      const options = normalizeStringArray(optionsSource);
      return group && options.length ? { group, options } : null;
    })
    .filter(Boolean);
}

export function normalizeQuickGuide(value) {
  const parsed = typeof value === "string" ? parseJson(value) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const guide = {};
  QUICK_GUIDE_FIELDS.forEach((field) => {
    const raw = parsed[field] ?? parsed[quickGuideCamelKey(field)];
    const normalized = normalizeQuickGuideField(raw);
    if (quickGuideValueHasContent(normalized)) {
      guide[field] = normalized;
    }
  });

  return quickGuideObjectHasContent(guide) ? guide : null;
}

export function hasUsefulQuickGuide(value) {
  const guide = normalizeQuickGuide(value);
  return quickGuideObjectHasContent(guide);
}

export function normalizeCategoryForDatabase(value) {
  const normalized = normalizeEnumValue(value);
  const aliases = {
    "needs-equipment": "needs-equipment",
    "need-equipment": "needs-equipment",
    "simple-equipment": "needs-equipment",
    equipment: "needs-equipment",
    "custom-equipment": "needs-equipment",
    "no-equipment": "no-equipment",
    none: "no-equipment",
    "no equipment": "no-equipment",
    online: "online",
    remote: "online"
  };
  const mapped = aliases[normalized] || normalized;
  return ALLOWED_CATEGORIES.has(mapped) ? mapped : "";
}

export function normalizeDifficultyForDatabase(value) {
  const normalized = normalizeEnumValue(value);
  if (!normalized) return null;
  const aliases = {
    "very-easy": "easy",
    beginner: "easy",
    advanced: "hard",
    difficult: "hard"
  };
  const mapped = aliases[normalized] || normalized;
  return ALLOWED_DIFFICULTIES.has(mapped) ? mapped : null;
}

export function normalizeEnergyLevelForDatabase(value) {
  const normalized = normalizeEnumValue(value);
  if (!normalized) return null;
  const aliases = {
    calm: "low",
    light: "low",
    active: "medium",
    "high-energy": "high"
  };
  const mapped = aliases[normalized] || normalized;
  return ALLOWED_ENERGY_LEVELS.has(mapped) ? mapped : null;
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
  if (category === "needs-equipment" || category === "simple-equipment") return "simple-equipment";
  if (["no-equipment", "online"].includes(category)) return category;
  const haystack = [category, ...equipment.map((item) => item.id), ...equipment.map((item) => item.name), ...gameTypes]
    .join(" ")
    .toLowerCase();

  if (haystack.includes("online") || haystack.includes("internet") || haystack.includes("remote")) return "online";
  if (haystack.includes("no-equipment") || haystack.includes("no equipment")) return "no-equipment";
  return equipment.some((item) => item.id !== "no-equipment") ? "simple-equipment" : "no-equipment";
}

function encodeStoragePath(path) {
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function normalizeGoogleDriveImageUrl(value) {
  const fileMatch = value.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const idMatch = value.match(/[?&]id=([^&]+)/i);
  const id = fileMatch?.[1] || idMatch?.[1];

  if (!id) return "";
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`;
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

function requiredString(value) {
  return String(value ?? "").trim();
}

function nullableString(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function nullableNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toNumber(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeEnumValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function normalizeQuickGuideField(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return normalizeStringArray(value);
  if (typeof value === "object") return normalizeStringArray(Object.values(value));
  return String(value).trim();
}

function quickGuideObjectHasContent(guide) {
  return Boolean(guide) && QUICK_GUIDE_FIELDS.some((field) => quickGuideValueHasContent(guide[field]));
}

function quickGuideValueHasContent(value) {
  if (Array.isArray(value)) return value.some((item) => String(item || "").trim());
  return Boolean(String(value || "").trim());
}

function quickGuideCamelKey(field) {
  return field.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
}

function quickGuideInputIsValid(value) {
  if (value === "" || value === null || value === undefined) return true;
  if (typeof value === "object" && !Array.isArray(value)) return true;
  if (typeof value !== "string") return false;
  const parsed = parseJson(value);
  return Boolean(parsed) && typeof parsed === "object" && !Array.isArray(parsed);
}

function unwrapImportSource(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return { game: null, filters: [] };
  if (source.game && typeof source.game === "object" && !Array.isArray(source.game)) {
    return {
      game: source.game,
      filters: Array.isArray(source.filters) ? source.filters : []
    };
  }

  return {
    game: source,
    filters: Array.isArray(source.filters) ? source.filters : []
  };
}

function normalizeImportedGameKeys(game) {
  return Object.entries(game || {}).reduce((acc, [key, value]) => {
    if (key === "filters") return acc;
    const alias = IMPORT_KEY_ALIASES[key] || camelToSnake(key);
    acc[alias] = value;
    return acc;
  }, {});
}

function camelToSnake(value) {
  return String(value || "").replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function stringForImportForm(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function numberStringForImportForm(value, fallback = "") {
  if (value === "" || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : String(value).trim();
}

function booleanForImportForm(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined || value === "") return fallback;
  const normalized = normalizeEnumValue(value);
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return fallback;
}

function findMatchingFilterGroup(groups, groupLabel) {
  const target = normalizeMatchValue(groupLabel);
  return groups.find((group) => filterRowIdentities(group).includes(target));
}

function findMatchingFilterOption(options, group, optionLabel) {
  const target = normalizeMatchValue(optionLabel);
  const groupIdentities = filterRowIdentities(group);
  return options.find((option) => {
    if (!filterRowIdentities(option).includes(target)) return false;
    const optionGroups = filterOptionGroupIdentities(option);
    return !optionGroups.length || optionGroups.some((identity) => groupIdentities.includes(identity));
  });
}

function filterRowIdentities(row = {}) {
  return [
    row.id,
    row.key,
    row.slug,
    row.label,
    row.name,
    row.title,
    row.value,
    row.label_fa,
    row.name_fa,
    row.title_fa
  ]
    .map(normalizeMatchValue)
    .filter(Boolean);
}

function filterOptionGroupIdentities(row = {}) {
  return [
    row.filter_group_id,
    row.group_id,
    row.groupId,
    row.group_key,
    row.group,
    row.group_label,
    row.group_name,
    row.filter_group_key,
    row.filter_group_slug
  ]
    .map(normalizeMatchValue)
    .filter(Boolean);
}

function normalizeMatchValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function difficultyForPublic(value) {
  const difficulty = normalizeDifficultyForDatabase(value);
  if (difficulty === "hard") return "advanced";
  return difficulty || "easy";
}

function activityLevelFromEnergyLevel(value) {
  const energyLevel = normalizeEnergyLevelForDatabase(value);
  if (energyLevel === "low") return "light";
  if (energyLevel === "medium") return "active";
  if (energyLevel === "high") return "high-energy";
  return "light";
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
  if (step && typeof step === "object") {
    const title = String(step.title || "").trim();
    const description = String(step.description || "").trim();
    if (title || description) return { title, description };
  }

  const text = String(step || "").trim();
  return text || `Step ${index + 1}`;
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
