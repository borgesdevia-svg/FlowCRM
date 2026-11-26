// Validações pequenas usadas por várias Server Actions.
// Funções puras (sem base de dados), para se poderem testar com npm test.

// Um id do Supabase (UUID), ex.: "3f2a9c1e-8b7d-4e6f-9a1b-2c3d4e5f6a7b".
// Tudo o que vem do browser é confirmado aqui antes de ir à base de dados:
// o RLS já impede mexer em dados de outras empresas, mas assim um id estragado
// nem chega a ser enviado.
const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function eUuid(valor) {
  return typeof valor === "string" && REGEX_UUID.test(valor);
}
