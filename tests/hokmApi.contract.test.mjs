import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const apiSource = readFileSync(new URL("../src/services/hokmApi.js", import.meta.url), "utf8");
const edgeSource = readFileSync(new URL("../supabase/functions/hokm-action/index.ts", import.meta.url), "utf8");
const sqlSource = readFileSync(new URL("../docs/hokm-stable-online.sql", import.meta.url), "utf8");

const requiredActions = [
  "create_room",
  "join_room",
  "get_view",
  "heartbeat",
  "leave_room",
  "start_hand",
  "select_trump",
  "play_card",
  "start_next_round",
  "cancel_room",
  "expire_room"
];

const requiredErrors = [
  "room_not_found",
  "room_expired",
  "room_full",
  "invalid_code",
  "invalid_rounds_target",
  "invalid_player",
  "not_host",
  "not_your_turn",
  "not_hakim",
  "invalid_phase",
  "illegal_card",
  "state_conflict",
  "network_error",
  "code_generation_failed",
  "server_error"
];

for (const action of requiredActions) {
  assert.match(apiSource, new RegExp(`"${action}"`), `frontend exposes ${action}`);
  assert.match(edgeSource, new RegExp(`"${action}"`), `edge handles ${action}`);
}

for (const error of requiredErrors) {
  assert.match(apiSource, new RegExp(`${error}`), `frontend maps ${error}`);
  assert.match(edgeSource, new RegExp(`${error}`), `edge returns ${error}`);
}

assert.match(apiSource, /supabase\.functions\.invoke\("hokm-action"/, "frontend calls Supabase Edge Function");
assert.doesNotMatch(apiSource, /service_role|SUPABASE_SERVICE_ROLE_KEY/i, "frontend does not reference service role");
assert.match(sqlSource, /public\.hokm_private_state/, "SQL creates private state table");
assert.match(sqlSource, /revoke all on public\.hokm_private_state from anon, authenticated/i, "SQL revokes private anon access");
assert.match(sqlSource, /where status in \(/i, "SQL defines active-code partial uniqueness");

console.log("hokm API contract tests passed");
