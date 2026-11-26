// Testes das validações partilhadas (lib/validacao.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { eUuid } from "../lib/validacao.js";

test("eUuid: aceita ids do Supabase e recusa o resto", () => {
  assert.equal(eUuid("3f2a9c1e-8b7d-4e6f-9a1b-2c3d4e5f6a7b"), true);
  assert.equal(eUuid("3F2A9C1E-8B7D-4E6F-9A1B-2C3D4E5F6A7B"), true);
  assert.equal(eUuid("------------------------------------"), false); // 36 traços passavam no regex antigo
  assert.equal(eUuid("3f2a9c1e-8b7d-4e6f-9a1b-2c3d4e5f6a7"), false);
  assert.equal(eUuid("' or 1=1 --"), false);
  assert.equal(eUuid(""), false);
  assert.equal(eUuid(null), false);
  assert.equal(eUuid(123), false);
});
