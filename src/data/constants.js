export const REQUIREMENT_CATEGORIES = [
  { id: "all", label: "All Games", icon: "sparkles" },
  { id: "no-equipment", label: "No Equipment", icon: "hand" },
  { id: "simple-equipment", label: "Simple Equipment", icon: "cards" },
  { id: "online", label: "Online", icon: "globe" }
];

export const GAME_TYPES = [
  { id: "brain", label: "Brain and Puzzle" },
  { id: "physical", label: "Physical and Movement" },
  { id: "social", label: "Social and Party" },
  { id: "word", label: "Word Game" },
  { id: "card", label: "Card Game" },
  { id: "strategy", label: "Strategy" },
  { id: "trivia", label: "Trivia" },
  { id: "creative", label: "Creative" },
  { id: "role-playing", label: "Role Playing" },
  { id: "social-deduction", label: "Social Deduction" },
  { id: "luck", label: "Luck Based" },
  { id: "icebreaker", label: "Icebreaker" }
];

export const EQUIPMENT_REQUIREMENTS = [
  { id: "no-equipment", label: "No Equipment" },
  { id: "pen-paper", label: "Pen and Paper" },
  { id: "playing-cards", label: "Playing Cards" },
  { id: "dice", label: "Dice" },
  { id: "ball", label: "Ball" },
  { id: "board-pieces", label: "Board or Pieces" },
  { id: "mobile-phone", label: "Mobile Phone" },
  { id: "internet", label: "Internet Connection" },
  { id: "console-computer", label: "Console or Computer" },
  { id: "custom-equipment", label: "Custom Equipment" }
];

export const PLAYER_RANGES = [
  { id: "1", label: "1 Player", min: 1, max: 1 },
  { id: "2", label: "2 Players", min: 2, max: 2 },
  { id: "3-4", label: "3-4 Players", min: 3, max: 4 },
  { id: "5-8", label: "5-8 Players", min: 5, max: 8 },
  { id: "9-plus", label: "9+ Players", min: 9, max: 99 }
];

export const DURATION_RANGES = [
  { id: "under-5", label: "Under 5 Minutes", min: 0, max: 5 },
  { id: "5-15", label: "5-15 Minutes", min: 5, max: 15 },
  { id: "15-30", label: "15-30 Minutes", min: 15, max: 30 },
  { id: "30-60", label: "30-60 Minutes", min: 30, max: 60 },
  { id: "60-plus", label: "More Than 1 Hour", min: 60, max: 240 }
];

export const ACTIVITY_LEVELS = [
  { id: "calm", label: "Calm" },
  { id: "light", label: "Light Movement" },
  { id: "active", label: "Active" },
  { id: "high-energy", label: "High Energy" }
];

export const ENVIRONMENTS = [
  { id: "indoor", label: "Indoor" },
  { id: "outdoor", label: "Outdoor" },
  { id: "either", label: "Either" },
  { id: "remote-online", label: "Remote or Online" },
  { id: "small-space", label: "Small Space" },
  { id: "large-space", label: "Large Space" }
];

export const PLAY_STYLES = [
  { id: "competitive", label: "Competitive" },
  { id: "cooperative", label: "Cooperative" },
  { id: "team-based", label: "Team Based" },
  { id: "individual", label: "Individual" },
  { id: "elimination", label: "Elimination" },
  { id: "turn-based", label: "Turn Based" },
  { id: "real-time", label: "Real Time" }
];

export const DIFFICULTIES = [
  { id: "very-easy", label: "Very Easy" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "advanced", label: "Advanced" }
];

export const AGE_GROUPS = [
  { id: "kids", label: "Kids" },
  { id: "teenagers", label: "Teenagers" },
  { id: "adults", label: "Adults" },
  { id: "family", label: "Family Friendly" },
  { id: "all-ages", label: "All Ages" }
];

export const QUICK_FILTERS = [
  { id: "brain", label: "Brain" },
  { id: "physical", label: "Physical" },
  { id: "social", label: "Social" },
  { id: "funny", label: "Funny" },
  { id: "strategy", label: "Strategy" },
  { id: "creative", label: "Creative" },
  { id: "competitive", label: "Competitive" },
  { id: "cooperative", label: "Cooperative" },
  { id: "quick", label: "Quick" },
  { id: "outdoor", label: "Outdoor" }
];

export const SORT_OPTIONS = [
  { id: "recommended", label: "Recommended" },
  { id: "popular", label: "Most Popular" },
  { id: "recent", label: "Recently Added" },
  { id: "shortest", label: "Shortest First" },
  { id: "most-players", label: "Most Players" },
  { id: "no-equipment", label: "No Equipment First" }
];

export const DEFAULT_ADVANCED_FILTERS = {
  gameTypes: [],
  requirements: [],
  playerCounts: [],
  durations: [],
  activityLevels: [],
  environments: [],
  playStyles: [],
  difficulties: [],
  ageGroups: []
};

export const DEFAULT_PREFERENCES = {
  name: "Alex Morgan",
  language: "fa",
  groupSize: "3-4",
  styles: ["social", "creative"],
  activityLevel: "light",
  environment: "either",
  notifications: false
};

export const FILTER_GROUPS = [
  { key: "gameTypes", title: "Game Type", options: GAME_TYPES },
  { key: "requirements", title: "Requirements", options: EQUIPMENT_REQUIREMENTS },
  { key: "playerCounts", title: "Player Count", options: PLAYER_RANGES },
  { key: "durations", title: "Duration", options: DURATION_RANGES },
  { key: "activityLevels", title: "Activity Level", options: ACTIVITY_LEVELS },
  { key: "environments", title: "Environment", options: ENVIRONMENTS },
  { key: "playStyles", title: "Play Style", options: PLAY_STYLES },
  { key: "difficulties", title: "Difficulty", options: DIFFICULTIES },
  { key: "ageGroups", title: "Age Group", options: AGE_GROUPS }
];
