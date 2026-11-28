// Testes das regras de receção de e-mails (lib/email/receberRegras.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  eAnexoAGuardar,
  emailDoRemetente,
  ePrimeiraImportacao,
  escolherLead,
  htmlParaTexto,
  idDaMensagem,
  inicioDaImportacao,
  uidsParaTratar,
} from "../lib/email/receberRegras.js";

test("emailDoRemetente: endereço do envelope em minúsculas", () => {
  assert.equal(emailDoRemetente([{ name: "Marta", address: " Marta@Exemplo.PT " }]), "marta@exemplo.pt");
  assert.equal(emailDoRemetente([]), "");
  assert.equal(emailDoRemetente(undefined), "");
});

test("escolherLead: compara sem maiúsculas e fica com o mais recente", () => {
  const leads = [
    { id: "a", email: "marta@x.pt", criado_em: "2026-01-01T00:00:00Z" },
    { id: "b", email: "MARTA@x.pt", criado_em: "2026-06-01T00:00:00Z" },
    { id: "c", email: "outra@x.pt", criado_em: "2026-12-01T00:00:00Z" },
  ];
  assert.equal(escolherLead(leads, "Marta@X.pt").id, "b");
  assert.equal(escolherLead(leads, "ninguem@x.pt"), null);
  assert.equal(escolherLead(leads, ""), null);
});

test("ePrimeiraImportacao: nunca sincronizou ou a caixa mudou", () => {
  assert.equal(ePrimeiraImportacao({ imap_ultimo_uid: null, imap_uid_validade: null }, "5"), true);
  assert.equal(ePrimeiraImportacao({ imap_ultimo_uid: 10, imap_uid_validade: 5 }, "5"), false);
  assert.equal(ePrimeiraImportacao({ imap_ultimo_uid: 10, imap_uid_validade: 5 }, "6"), true);
});

test("inicioDaImportacao: 30 dias para trás", () => {
  const agora = new Date("2026-11-30T12:00:00Z");
  assert.equal(inicioDaImportacao(agora).toISOString(), "2026-10-31T12:00:00.000Z");
});

test("uidsParaTratar: só os novos, por ordem, no máximo N", () => {
  assert.deepEqual(uidsParaTratar([12, 10, 11, 9], 10), [11, 12]);
  assert.deepEqual(uidsParaTratar([3, 1, 2], null), [1, 2, 3]);
  // o "N:*" do IMAP devolve a última mesmo que já vista
  assert.deepEqual(uidsParaTratar([10], 10), []);
  assert.deepEqual(uidsParaTratar([1, 2, 3, 4], null, 2), [1, 2]);
});

test("htmlParaTexto: tira etiquetas e mantém as mudanças de linha", () => {
  const html = "<style>p{}</style><p>Olá&nbsp;Rui,</p><p>Sim, <b>aceito</b>.<br>Obrigada</p>";
  assert.equal(htmlParaTexto(html), "Olá Rui,\nSim, aceito.\nObrigada");
  assert.equal(htmlParaTexto(null), "");
});

test("idDaMensagem: usa o Message-ID ou cria um estável", () => {
  assert.equal(idDaMensagem("<abc@x>", "5", 7), "<abc@x>");
  assert.equal(idDaMensagem("", "5", 7), "<uid-5-7@flowcrm>");
});

test("eAnexoAGuardar: imagens da assinatura (inline) ficam de fora", () => {
  assert.equal(eAnexoAGuardar({ filename: "proposta.pdf", contentDisposition: "attachment" }), true);
  assert.equal(eAnexoAGuardar({ filename: "logo.png", contentDisposition: "inline", cid: "x" }), false);
  assert.equal(eAnexoAGuardar({ filename: "logo.png", related: true }), false);
});
