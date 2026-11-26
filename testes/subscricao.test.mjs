// Testes da validação da subscrição de avisos (lib/subscricao.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { subscricaoValida } from "../lib/subscricao.js";

const boa = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" },
};

test("subscricaoValida: aceita a forma que o browser devolve", () => {
  assert.equal(subscricaoValida(boa), true);
});

test("subscricaoValida: recusa o resto", () => {
  assert.equal(subscricaoValida(null), false);
  assert.equal(subscricaoValida({ ...boa, endpoint: "http://exemplo.pt" }), false); // sem https
  assert.equal(subscricaoValida({ ...boa, endpoint: "https://" + "a".repeat(1000) }), false);
  assert.equal(subscricaoValida({ ...boa, keys: null }), false);
  assert.equal(subscricaoValida({ ...boa, keys: { p256dh: "<script>", auth: "x" } }), false);
  assert.equal(subscricaoValida({ endpoint: boa.endpoint }), false);
});
